package expo.modules.driverlocation

import android.util.Log
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import android.Manifest
import android.location.Location
import android.location.LocationManager
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import com.google.android.gms.tasks.CancellationTokenSource

class DriverLocationService : Service() {
  companion object {
    const val ACTION_START = "expo.modules.driverlocation.START"
    const val ACTION_UPDATE = "expo.modules.driverlocation.UPDATE"
    const val ACTION_STOP = "expo.modules.driverlocation.STOP"
    /** Restart the 15-min publish timer after a scan fresh GPS publish. */
    const val ACTION_RESCHEDULE_INTERVAL = "expo.modules.driverlocation.RESCHEDULE_INTERVAL"
    private const val TAG = DriverLocLog.TAG
    private const val CHANNEL_ID = "driver_location_tracking"
    private const val NOTIFICATION_ID = 481516
    /** Reject fallback fixes older than this. */
    private const val MAX_LOCATION_AGE_MS = 60_000L
    /** Reject fixes with worse horizontal accuracy (meters). */
    private const val MAX_ACCURACY_METERS = 100f

    @Volatile
    var isRunning: Boolean = false
      private set

    @Volatile
    private var applicationContext: Context? = null

    fun bindApplicationContext(context: Context) {
      applicationContext = context.applicationContext
    }

    fun getApplicationContext(): Context? = applicationContext

    private fun resolveSmallIcon(context: Context): Int {
      val notificationIcon = context.resources.getIdentifier(
        "notification_icon",
        "drawable",
        context.packageName,
      )
      if (notificationIcon != 0) {
        return notificationIcon
      }
      val launcherIcon = context.applicationInfo.icon
      return if (launcherIcon != 0) launcherIcon else android.R.drawable.ic_menu_mylocation
    }

    fun startServiceIntent(context: Context, action: String): Intent {
      return Intent(context, DriverLocationService::class.java).apply {
        this.action = action
      }
    }

    fun launchService(context: Context, action: String) {
      val intent = startServiceIntent(context, action)
      if (isRunning) {
        context.startService(intent)
        return
      }
      ContextCompat.startForegroundService(context, intent)
    }

    /** After scan publishes a fresh fix, reset the 15-min API clock. */
    fun rescheduleApiInterval(context: Context) {
      if (!isRunning) {
        return
      }
      try {
        context.startService(startServiceIntent(context, ACTION_RESCHEDULE_INTERVAL))
      } catch (e: Exception) {
        DriverLocLog.w("timer_reset", "ok=false err=${e.message}")
      }
    }

    fun updateNotification(context: Context, title: String, body: String) {
      val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      ensureChannel(context, manager)
      val notification = buildNotification(context, title, body)
      manager.notify(NOTIFICATION_ID, notification)
    }

    private fun ensureChannel(context: Context, manager: NotificationManager) {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
        return
      }
      val channel = NotificationChannel(
        CHANNEL_ID,
        "Driver location",
        NotificationManager.IMPORTANCE_LOW,
      ).apply {
        description = "Shows when driver location tracking is active"
        setShowBadge(false)
      }
      manager.createNotificationChannel(channel)
    }

    private fun buildNotification(context: Context, title: String, body: String): Notification {
      val builder = NotificationCompat.Builder(context, CHANNEL_ID)
        .setContentTitle(title)
        .setContentText(body)
        .setSmallIcon(resolveSmallIcon(context))
        .setOngoing(true)
        .setCategory(NotificationCompat.CATEGORY_SERVICE)
        .setPriority(NotificationCompat.PRIORITY_LOW)

      val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)?.apply {
        addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP)
      }

      if (launchIntent != null) {
        val pendingIntent = PendingIntent.getActivity(
          context,
          0,
          launchIntent,
          PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        builder.setContentIntent(pendingIntent)
      }

      return builder.build()
    }
  }

  private val fusedClient by lazy { LocationServices.getFusedLocationProviderClient(this) }
  private val apiHandler = Handler(Looper.getMainLooper())
  private var locationCallback: LocationCallback? = null
  private var apiIntervalRunnable: Runnable? = null
  private var activeConfig: TrackingConfig? = null
  private var userStopped = false
  private var apiIntervalGeneration = 0
  private var publishInFlight = false
  private var activePublishToken: CancellationTokenSource? = null

  @Volatile
  private var isDeactivating = false

  private val providerReceiver = object : BroadcastReceiver() {
    override fun onReceive(context: Context?, intent: Intent?) {
      if (intent?.action != LocationManager.PROVIDERS_CHANGED_ACTION) {
        return
      }
      if (!canTrackLocation()) {
        DriverLocLog.w("location_off", "action=deactivate source=provider_receiver")
        sendDeactivateAndStop(restartAllowed = false)
      }
    }
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onCreate() {
    super.onCreate()
    bindApplicationContext(this)
    val filter = IntentFilter(LocationManager.PROVIDERS_CHANGED_ACTION)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      registerReceiver(providerReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
    } else {
      registerReceiver(providerReceiver, filter)
    }
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    when (intent?.action) {
      ACTION_STOP -> {
        userStopped = true
        sendDeactivateAndStop(restartAllowed = false)
        return START_NOT_STICKY
      }
      ACTION_RESCHEDULE_INTERVAL -> {
        val config = activeConfig ?: TrackingSessionStore.load(this)
        if (config != null && isRunning && !userStopped) {
          startApiInterval(config)
          DriverLocLog.i("timer_reset", "source=scan intervalSec=${config.apiIntervalSeconds}")
        }
        return START_STICKY
      }
      ACTION_UPDATE -> {
        userStopped = false
        val config = TrackingSessionStore.load(this) ?: run {
          stopSelf()
          return START_NOT_STICKY
        }
        if (!canTrackLocation()) {
          sendDeactivateAndStop(restartAllowed = false)
          return START_NOT_STICKY
        }
        refreshTracking(config)
        return START_STICKY
      }
      ACTION_START, null -> {
        userStopped = false
        val config = TrackingSessionStore.load(this) ?: run {
          stopSelf()
          return START_NOT_STICKY
        }
        if (!canTrackLocation()) {
          stopSelf()
          return START_NOT_STICKY
        }
        if (isRunning) {
          refreshTracking(config)
        } else {
          startForegroundTracking(config)
        }
        return START_STICKY
      }
      else -> return START_NOT_STICKY
    }
  }

  override fun onTaskRemoved(rootIntent: Intent?) {
    // Trip ON + location ON: keep 15-min tracking after app swipe/kill.
    // Only location-off / explicit stop should deactivate.
    DriverLocLog.i(
      "app_kill",
      "action=continue tracking=1 source=DriverLocationService",
    )
    super.onTaskRemoved(rootIntent)
  }

  private fun startForegroundTracking(config: TrackingConfig) {
    try {
      activeConfig = config
      val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      ensureChannel(this, manager)
      val notification = buildNotification(this, config.notificationTitle, config.notificationBody)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION)
      } else {
        startForeground(NOTIFICATION_ID, notification)
      }
      isRunning = true
      requestLocationUpdates()
      startApiInterval(config)
      sendImmediateUpdate(config)
      DriverLocLog.i(
        "tracking_on",
        "intervalSec=${config.apiIntervalSeconds} region=${config.regionId} planning=${config.planningDate} order=${config.orderId ?: "-"} user=${config.userId}",
      )
    } catch (_: Exception) {
      isRunning = false
      stopSelf()
    }
  }

  private fun refreshTracking(config: TrackingConfig) {
    activeConfig = config
    if (!isRunning) {
      startForegroundTracking(config)
      return
    }

    updateNotification(this, config.notificationTitle, config.notificationBody)
    requestLocationUpdates()
    // Do not restart a healthy interval — avoids double-schedule when JS sends UPDATE.
    if (apiIntervalRunnable == null) {
      startApiInterval(config)
    }
  }

  private fun requestLocationUpdates() {
    locationCallback?.let { fusedClient.removeLocationUpdates(it) }

    val request = LocationRequest.Builder(Priority.PRIORITY_BALANCED_POWER_ACCURACY, 3000L)
      .setMinUpdateIntervalMillis(3000L)
      .setMinUpdateDistanceMeters(10f)
      .setWaitForAccurateLocation(false)
      .build()

    val callback = object : LocationCallback() {
      override fun onLocationResult(result: LocationResult) {
        val location = result.lastLocation ?: return
        if (!canTrackLocation()) {
          DriverLocLog.w("location_off", "action=deactivate source=location_update")
          sendDeactivateAndStop(restartAllowed = false)
          return
        }
        saveWarmLocation(location)
      }
    }

    locationCallback = callback
    try {
      fusedClient.requestLocationUpdates(request, callback, Looper.getMainLooper())
    } catch (_: SecurityException) {
      sendDeactivateAndStop(restartAllowed = false)
    }
  }

  private fun startApiInterval(config: TrackingConfig) {
    stopApiInterval()
    val generation = ++apiIntervalGeneration
    val intervalMs = config.apiIntervalSeconds.coerceAtLeast(10) * 1000L
    val runnable = object : Runnable {
      override fun run() {
        if (generation != apiIntervalGeneration || !isRunning || userStopped) {
          return
        }
        if (!canTrackLocation()) {
          DriverLocLog.w("location_off", "action=deactivate source=api_interval")
          sendDeactivateAndStop(restartAllowed = false)
          return
        }
        val currentConfig = activeConfig ?: TrackingSessionStore.load(this@DriverLocationService) ?: return
        publishFreshAndSend(currentConfig)
        if (generation == apiIntervalGeneration && isRunning && !userStopped) {
          apiHandler.postDelayed(this, intervalMs)
        }
      }
    }
    apiIntervalRunnable = runnable
    apiHandler.postDelayed(runnable, intervalMs)
    DriverLocLog.i(
      "timer_start",
      "intervalSec=${config.apiIntervalSeconds} gen=$generation region=${config.regionId} order=${config.orderId ?: "-"}",
    )
  }

  private fun stopApiInterval() {
    apiIntervalGeneration++
    apiIntervalRunnable?.let { apiHandler.removeCallbacks(it) }
    apiIntervalRunnable = null
  }

  private fun sendImmediateUpdate(config: TrackingConfig) {
    publishFreshAndSend(config)
  }

  /**
   * Force a fresh GPS fix, lock it as the published 15-min cache, then API.
   * Continuous GPS only warms a separate cache and must not overwrite this.
   */
  private fun publishFreshAndSend(config: TrackingConfig) {
    if (publishInFlight) {
      Log.d(TAG, "publish skipped — already in flight")
      return
    }
    publishInFlight = true

    fun finish() {
      try {
        sendActiveApiUpdate(config)
      } finally {
        publishInFlight = false
      }
    }

    try {
      activePublishToken?.cancel()
      val cts = CancellationTokenSource()
      activePublishToken = cts

      fusedClient
        .getCurrentLocation(Priority.PRIORITY_HIGH_ACCURACY, cts.token)
        .addOnSuccessListener { location ->
          if (location != null && tryPublishLocation(location, "getCurrentLocation")) {
            finish()
            return@addOnSuccessListener
          }
          fusedClient.lastLocation
            .addOnSuccessListener { last ->
              if (last != null) {
                tryPublishLocation(last, "lastLocation")
              } else {
                tryPublishWarmOnlyIfNoPublished()
              }
              finish()
            }
            .addOnFailureListener {
              tryPublishWarmOnlyIfNoPublished()
              finish()
            }
        }
        .addOnFailureListener {
          fusedClient.lastLocation
            .addOnSuccessListener { last ->
              if (last != null) {
                tryPublishLocation(last, "lastLocation")
              } else {
                tryPublishWarmOnlyIfNoPublished()
              }
              finish()
            }
            .addOnFailureListener {
              tryPublishWarmOnlyIfNoPublished()
              finish()
            }
        }
    } catch (_: SecurityException) {
      tryPublishWarmOnlyIfNoPublished()
      finish()
    }
  }

  private fun tryPublishWarmOnlyIfNoPublished() {
    if (TrackingSessionStore.getLastLocation(this) != null) {
      Log.d(TAG, "Keeping existing published fix — warm/fallback not used")
      return
    }
    val warm = TrackingSessionStore.getWarmLocation(this) ?: return
    TrackingSessionStore.savePublishedLocation(
      this,
      warm.copy(capturedAtMs = System.currentTimeMillis().toDouble()),
    )
    Log.i(TAG, "Seeded published from warm (first fix) → lat=${warm.latitude} lon=${warm.longitude}")
  }

  private fun tryPublishLocation(location: Location, source: String): Boolean {
    if (!isAcceptableFix(location)) {
      val ageMs = System.currentTimeMillis() - location.time
      val accuracy = if (location.hasAccuracy()) location.accuracy else -1f
      Log.w(TAG, "Rejected $source fix ageMs=$ageMs accuracy=$accuracy")
      return false
    }
    publishLocation(location)
    return true
  }

  private fun isAcceptableFix(location: Location): Boolean {
    if (location.latitude == 0.0 && location.longitude == 0.0) {
      return false
    }
    val ageMs = System.currentTimeMillis() - location.time
    if (ageMs < 0 || ageMs > MAX_LOCATION_AGE_MS) {
      return false
    }
    if (location.hasAccuracy() && location.accuracy > MAX_ACCURACY_METERS) {
      return false
    }
    return true
  }

  private fun saveWarmLocation(location: Location) {
    val coord = locationToCoord(location) ?: return
    TrackingSessionStore.saveWarmLocation(this, coord)
  }

  private fun publishLocation(location: Location) {
    val coord = locationToCoord(location) ?: return
    val published = coord.copy(capturedAtMs = System.currentTimeMillis().toDouble())
    TrackingSessionStore.savePublishedLocation(this, published)
    TrackingSessionStore.saveWarmLocation(this, published)
    DriverLocLog.i(
      "publish",
      "source=interval ${DriverLocLog.coord(published.latitude, published.longitude, published.accuracy, published.capturedAtMs)}",
    )
  }

  private fun locationToCoord(location: Location): DriverCoordinate? {
    val coord = DriverCoordinate(
      latitude = location.latitude,
      longitude = location.longitude,
      heading = if (location.hasBearing()) location.bearing.toDouble() else null,
      speed = if (location.hasSpeed()) location.speed.toDouble() else null,
      accuracy = if (location.hasAccuracy()) location.accuracy.toDouble() else null,
    )
    if (coord.latitude == 0.0 && coord.longitude == 0.0) {
      return null
    }
    return coord
  }

  private fun sendActiveApiUpdate(config: TrackingConfig) {
    val coord = TrackingSessionStore.getLastLocation(this) ?: return
    if (coord.latitude == 0.0 && coord.longitude == 0.0) {
      return
    }
    LocationApiClient.sendLocationUpdate(config, coord, 1) { _ -> }
  }

  private fun sendDeactivateAndStop(restartAllowed: Boolean) {
    if (isDeactivating) {
      return
    }
    isDeactivating = true

    val config = activeConfig ?: TrackingSessionStore.load(this)
    val lastCoord = TrackingSessionStore.getLocationForApiOrDeactivate(this)

    stopTrackingInternal()
    activeConfig = null

    Thread {
      try {
        sendDeactivateApi(config, lastCoord)
      } finally {
        isDeactivating = false
        if (!restartAllowed) {
          stopSelf()
        }
      }
    }.start()
  }

  private fun sendDeactivateApi(config: TrackingConfig?, lastCoord: DriverCoordinate?) {
    if (config == null) {
      DriverLocLog.w("api", "ok=false is_active=0 reason=missing_config")
      return
    }
    val coord = lastCoord ?: run {
      DriverLocLog.w("api", "ok=false is_active=0 reason=no_location")
      return
    }
    if (coord.latitude == 0.0 && coord.longitude == 0.0) {
      DriverLocLog.w("api", "ok=false is_active=0 reason=invalid_coords")
      return
    }

    DriverLocLog.i(
      "api",
      "phase=request is_active=0 action=deactivate ${DriverLocLog.coord(coord.latitude, coord.longitude, coord.accuracy, coord.capturedAtMs)} region=${config.regionId}",
    )
    val success = LocationApiClient.sendLocationUpdateBlocking(config, coord, 0)
    if (!success) {
      DriverLocLog.w("api", "ok=false is_active=0 action=deactivate")
    }
  }

  private fun canTrackLocation(): Boolean {
    return isLocationEnabled() && hasLocationPermission()
  }

  private fun hasLocationPermission(): Boolean {
    val fineGranted = ContextCompat.checkSelfPermission(
      this,
      Manifest.permission.ACCESS_FINE_LOCATION,
    ) == PackageManager.PERMISSION_GRANTED
    val coarseGranted = ContextCompat.checkSelfPermission(
      this,
      Manifest.permission.ACCESS_COARSE_LOCATION,
    ) == PackageManager.PERMISSION_GRANTED
    return fineGranted || coarseGranted
  }

  private fun stopTrackingInternal() {
    stopApiInterval()
    activePublishToken?.cancel()
    activePublishToken = null
    publishInFlight = false
    locationCallback?.let {
      fusedClient.removeLocationUpdates(it)
    }
    locationCallback = null
    isRunning = false
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
      stopForeground(STOP_FOREGROUND_REMOVE)
    } else {
      @Suppress("DEPRECATION")
      stopForeground(true)
    }
  }

  private fun isLocationEnabled(): Boolean {
    val manager = getSystemService(Context.LOCATION_SERVICE) as LocationManager
    return manager.isProviderEnabled(LocationManager.GPS_PROVIDER) ||
      manager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)
  }

  override fun onDestroy() {
    try {
      unregisterReceiver(providerReceiver)
    } catch (_: IllegalArgumentException) {
      // already unregistered
    }
    stopTrackingInternal()
    activeConfig = null
    super.onDestroy()
  }
}
