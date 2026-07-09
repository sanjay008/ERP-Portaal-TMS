package expo.modules.driverlocation

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.ServiceInfo
import android.location.Location
import android.location.LocationManager
import android.os.Build
import android.os.IBinder
import android.os.Looper
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority

class DriverLocationService : Service() {
  companion object {
    const val ACTION_START = "expo.modules.driverlocation.START"
    const val ACTION_UPDATE = "expo.modules.driverlocation.UPDATE"
    const val ACTION_STOP = "expo.modules.driverlocation.STOP"
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
  private var locationCallback: LocationCallback? = null
  private var activeConfig: TrackingConfig? = null
  private var userStopped = false

  private val providerReceiver = object : BroadcastReceiver() {
    override fun onReceive(context: Context?, intent: Intent?) {
      if (intent?.action != LocationManager.PROVIDERS_CHANGED_ACTION) {
        return
      }
      if (!isLocationEnabled()) {
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
        if (!isLocationEnabled()) {
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
        if (!isLocationEnabled()) {
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
    // Keep the foreground service running after the user swipes the app from recents.
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
      requestLocationUpdates(config)
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
    requestLocationUpdates(config)
  }

  private fun requestLocationUpdates(config: TrackingConfig) {
    locationCallback?.let { fusedClient.removeLocationUpdates(it) }

    val request = LocationRequest.Builder(Priority.PRIORITY_BALANCED_POWER_ACCURACY, 3000L)
      .setMinUpdateIntervalMillis(3000L)
      .setMinUpdateDistanceMeters(config.distanceThresholdMeters.toFloat())
      .setWaitForAccurateLocation(false)
      .build()

    val callback = object : LocationCallback() {
      override fun onLocationResult(result: LocationResult) {
        val location = result.lastLocation ?: return
        if (!isLocationEnabled()) {
          sendDeactivateAndStop(restartAllowed = false)
          return
        }
        val currentConfig = activeConfig ?: TrackingSessionStore.load(this@DriverLocationService) ?: return
        handleLocation(currentConfig, location)
      }
    }

    locationCallback = callback
    try {
      fusedClient.requestLocationUpdates(request, callback, Looper.getMainLooper())
    } catch (_: SecurityException) {
      sendDeactivateAndStop(restartAllowed = false)
    }
  }

  private fun sendImmediateUpdate(config: TrackingConfig) {
    try {
      fusedClient.lastLocation.addOnSuccessListener { location ->
        if (location != null) {
          handleLocation(config, location, forceSend = true)
        }
      }
    } catch (_: SecurityException) {
      // ignored
    }
  }

  private fun handleLocation(config: TrackingConfig, location: Location, forceSend: Boolean = false) {
    val coord = DriverCoordinate(
      latitude = location.latitude,
      longitude = location.longitude,
      heading = if (location.hasBearing()) location.bearing.toDouble() else null,
      speed = if (location.hasSpeed()) location.speed.toDouble() else null,
      accuracy = if (location.hasAccuracy()) location.accuracy.toDouble() else null,
    )

    TrackingSessionStore.saveLastLocation(this, coord)

    val lastSent = TrackingSessionStore.getLastSentCoord(this)
    val distanceMoved = if (lastSent != null) {
      LocationMath.haversineDistance(lastSent.first, lastSent.second, coord.latitude, coord.longitude)
    } else {
      Double.MAX_VALUE
    }

    if (!forceSend && distanceMoved < config.distanceThresholdMeters) {
      return
    }

    LocationApiClient.sendLocationUpdate(config, coord, 1) { success ->
      if (success) {
        TrackingSessionStore.setLastSentCoord(this, coord.latitude, coord.longitude)
      }
    }
  }

  private fun sendDeactivateAndStop(restartAllowed: Boolean) {
    val config = activeConfig ?: TrackingSessionStore.load(this)
    val lastCoord = TrackingSessionStore.getLastLocation(this)
      ?: DriverCoordinate(0.0, 0.0, null, null, null)

    stopTrackingInternal()
    activeConfig = null
    if (!restartAllowed) {
      TrackingSessionStore.clearLastSentCoord(this)
    }

    if (config != null && lastCoord.latitude != 0.0 && lastCoord.longitude != 0.0) {
      LocationApiClient.sendLocationUpdate(config, lastCoord, 0)
    }

    stopSelf()
  }

  private fun stopTrackingInternal() {
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
