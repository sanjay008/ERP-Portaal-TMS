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
    private const val TAG = "ExpoDriverLocation"
    private const val CHANNEL_ID = "driver_location_tracking"
    private const val NOTIFICATION_ID = 481516

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

  @Volatile
  private var isDeactivating = false

  private val providerReceiver = object : BroadcastReceiver() {
    override fun onReceive(context: Context?, intent: Intent?) {
      if (intent?.action != LocationManager.PROVIDERS_CHANGED_ACTION) {
        return
      }
      if (!canTrackLocation()) {
        Log.w(TAG, "Location unavailable — sending is_active=0 and stopping tracking")
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
        return START_NOT_STICKY
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
        return START_NOT_STICKY
      }
      else -> return START_NOT_STICKY
    }
  }

  override fun onTaskRemoved(rootIntent: Intent?) {
    Log.i(TAG, "App task removed — stopping driver location tracking")
    userStopped = true
    sendDeactivateAndStop(restartAllowed = false)
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
    startApiInterval(config)
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
        // Keep FusedLocation warm only. Do NOT overwrite the published API cache —
        // that updates solely on 15-min / start fresh reads.
        result.lastLocation ?: return
        if (!canTrackLocation()) {
          Log.w(TAG, "Location unavailable during location update — sending is_active=0")
          sendDeactivateAndStop(restartAllowed = false)
        }
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
    val intervalMs = config.apiIntervalSeconds.coerceAtLeast(10) * 1000L
    val runnable = object : Runnable {
      override fun run() {
        if (!isRunning || userStopped) {
          return
        }
        if (!canTrackLocation()) {
          Log.w(TAG, "Location unavailable during API interval — sending is_active=0")
          sendDeactivateAndStop(restartAllowed = false)
          return
        }
        val currentConfig = activeConfig ?: TrackingSessionStore.load(this@DriverLocationService) ?: return
        publishFreshAndSend(currentConfig)
        apiHandler.postDelayed(this, intervalMs)
      }
    }
    apiIntervalRunnable = runnable
    apiHandler.postDelayed(runnable, intervalMs)
    Log.i(TAG, "API interval started — every ${config.apiIntervalSeconds}s")
  }

  private fun stopApiInterval() {
    apiIntervalRunnable?.let { apiHandler.removeCallbacks(it) }
    apiIntervalRunnable = null
  }

  private fun sendImmediateUpdate(config: TrackingConfig) {
    publishFreshAndSend(config)
  }

  /**
   * Forced fresh GPS → publish to API cache → POST.
   * Scans reuse this published cache until the next 15-min tick.
   */
  private fun publishFreshAndSend(config: TrackingConfig) {
    try {
      val cts = CancellationTokenSource()
      fusedClient
        .getCurrentLocation(Priority.PRIORITY_BALANCED_POWER_ACCURACY, cts.token)
        .addOnSuccessListener { location ->
          if (location != null) {
            savePublishedLocation(location)
            Log.i(
              TAG,
              "Published fresh fix lat=${location.latitude} lon=${location.longitude}",
            )
          } else {
            Log.w(TAG, "Fresh GPS null — falling back to last published cache")
          }
          sendActiveApiUpdate(config)
        }
        .addOnFailureListener { error ->
          Log.w(TAG, "Fresh GPS failed — falling back to last published cache: ${error.message}")
          sendActiveApiUpdate(config)
        }
    } catch (_: SecurityException) {
      sendActiveApiUpdate(config)
    }
  }

  private fun savePublishedLocation(location: Location) {
    val coord = DriverCoordinate(
      latitude = location.latitude,
      longitude = location.longitude,
      heading = if (location.hasBearing()) location.bearing.toDouble() else null,
      speed = if (location.hasSpeed()) location.speed.toDouble() else null,
      accuracy = if (location.hasAccuracy()) location.accuracy.toDouble() else null,
      capturedAtMs = location.time.takeIf { it > 0L } ?: System.currentTimeMillis(),
    )
    if (coord.latitude == 0.0 && coord.longitude == 0.0) {
      return
    }
    TrackingSessionStore.saveLastLocation(this, coord)
  }

  private fun sendActiveApiUpdate(config: TrackingConfig) {
    val coord = TrackingSessionStore.getLastLocation(this) ?: run {
      Log.w(TAG, "API skipped — no published location yet")
      return
    }
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
    val lastCoord = TrackingSessionStore.getLastLocation(this)

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
      Log.w(TAG, "Deactivate skipped — missing tracking config")
      return
    }
    val coord = lastCoord ?: run {
      Log.w(TAG, "Deactivate skipped — no last location for is_active=0")
      return
    }
    if (coord.latitude == 0.0 && coord.longitude == 0.0) {
      Log.w(TAG, "Deactivate skipped — invalid last location (0,0)")
      return
    }

    Log.i(TAG, "Sending deactivate API — is_active=0")
    val success = LocationApiClient.sendLocationUpdateBlocking(config, coord, 0)
    if (!success) {
      Log.w(TAG, "Deactivate API failed — is_active=0")
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
