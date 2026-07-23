package expo.modules.driverlocation

import android.Manifest
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
import android.location.Location
import android.location.LocationManager
import android.os.Build
import android.os.IBinder
import android.os.Looper
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority

/**
 * Lightweight shift guard — caches current location only.
 * Sends update_driver_live_location with is_active=0 when GPS is turned off or app is killed.
 * Does NOT send periodic is_active=1 updates.
 */
class ShiftLocationGuardService : Service() {
  companion object {
    const val ACTION_ENABLE = "expo.modules.driverlocation.SHIFT_GUARD_ENABLE"
    const val ACTION_DISABLE = "expo.modules.driverlocation.SHIFT_GUARD_DISABLE"
    private const val TAG = "ShiftLocationGuard"
    private const val CHANNEL_ID = "shift_location_guard"
    private const val NOTIFICATION_ID = 481517

    @Volatile
    var isRunning: Boolean = false
      private set

    @Volatile
    var eventSink: ((String, Map<String, Any?>) -> Unit)? = null

    fun startServiceIntent(context: Context, action: String): Intent {
      return Intent(context, ShiftLocationGuardService::class.java).apply {
        this.action = action
      }
    }

    fun launch(context: Context, action: String) {
      val intent = startServiceIntent(context, action)
      if (action == ACTION_DISABLE) {
        context.startService(intent)
        return
      }
      if (isRunning) {
        context.startService(intent)
        return
      }
      ContextCompat.startForegroundService(context, intent)
    }

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

    private fun ensureChannel(context: Context, manager: NotificationManager) {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
        return
      }
      val channel = NotificationChannel(
        CHANNEL_ID,
        "Shift session",
        NotificationManager.IMPORTANCE_LOW,
      ).apply {
        description = "Keeps shift location ready while shift is active"
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
          1,
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

  @Volatile
  private var isDeactivating = false

  private val providerReceiver = object : BroadcastReceiver() {
    override fun onReceive(context: Context?, intent: Intent?) {
      if (intent?.action != LocationManager.PROVIDERS_CHANGED_ACTION) {
        return
      }
      if (!canUseLocation()) {
        Log.w(TAG, "[Shift] CLOSE trigger reason=location_off")
        sendDeactivateAndStop("location_off")
      }
    }
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onCreate() {
    super.onCreate()
    val filter = IntentFilter(LocationManager.PROVIDERS_CHANGED_ACTION)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      registerReceiver(providerReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
    } else {
      registerReceiver(providerReceiver, filter)
    }
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    when (intent?.action) {
      ACTION_DISABLE -> {
        stopGuardInternal(clearSession = true)
        stopSelf()
        return START_NOT_STICKY
      }
      ACTION_ENABLE, null -> {
        val config = ShiftGuardSessionStore.load(this) ?: run {
          stopSelf()
          return START_NOT_STICKY
        }
        if (!canUseLocation()) {
          // Do not crash / deactivate on first enable without permission —
          // JS will re-enable after permission is granted.
          Log.w(TAG, "Location unavailable on enable — waiting for permission")
          stopSelf()
          return START_NOT_STICKY
        }
        startGuard(config)
        return START_STICKY
      }
      else -> return START_NOT_STICKY
    }
  }

  override fun onTaskRemoved(rootIntent: Intent?) {
    Log.i(TAG, "[Shift] CLOSE trigger reason=app_kill")
    // Wait for APIs to finish before process dies (async Thread alone gets killed).
    val closer = Thread(
      { sendDeactivateAndStop("app_kill", blocking = true) },
      "ShiftGuardAppKillClose",
    )
    closer.start()
    try {
      closer.join(45_000L)
    } catch (_: InterruptedException) {
      // ignore
    }
    super.onTaskRemoved(rootIntent)
  }

  override fun onDestroy() {
    try {
      unregisterReceiver(providerReceiver)
    } catch (_: IllegalArgumentException) {
      // already unregistered
    }
    // Last chance if task-kill skipped onTaskRemoved (some OEMs).
    if (isRunning && !isDeactivating && ShiftGuardSessionStore.load(this) != null) {
      Log.i(TAG, "[Shift] CLOSE trigger reason=app_kill (onDestroy)")
      val closer = Thread(
        { sendDeactivateAndStop("app_kill", blocking = true) },
        "ShiftGuardDestroyClose",
      )
      closer.start()
      try {
        closer.join(20_000L)
      } catch (_: InterruptedException) {
        // ignore
      }
    }
    locationCallback?.let { fusedClient.removeLocationUpdates(it) }
    locationCallback = null
    isRunning = false
    super.onDestroy()
  }

  private fun startGuard(config: TrackingConfig) {
    if (!canUseLocation()) {
      Log.w(TAG, "Cannot start guard — location permission/services missing")
      stopSelf()
      return
    }

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
      seedLastLocation()
      requestLocationUpdates()
      Log.i(TAG, "[Shift] ON guard running (no periodic live API)")
    } catch (e: SecurityException) {
      Log.e(TAG, "SecurityException starting shift guard — permission missing?", e)
      isRunning = false
      stopSelf()
    } catch (e: Exception) {
      Log.e(TAG, "Failed to start shift guard", e)
      isRunning = false
      stopSelf()
    }
  }

  private fun seedLastLocation() {
    try {
      fusedClient.lastLocation.addOnSuccessListener { location ->
        if (location != null) {
          saveLocation(location)
        }
      }
    } catch (_: SecurityException) {
      // ignore
    }
  }

  private fun requestLocationUpdates() {
    locationCallback?.let { fusedClient.removeLocationUpdates(it) }

    val request = LocationRequest.Builder(Priority.PRIORITY_BALANCED_POWER_ACCURACY, 15000L)
      .setMinUpdateIntervalMillis(10000L)
      .setMinUpdateDistanceMeters(25f)
      .setWaitForAccurateLocation(false)
      .build()

    val callback = object : LocationCallback() {
      override fun onLocationResult(result: LocationResult) {
        val location = result.lastLocation ?: return
        if (!canUseLocation()) {
          Log.w(TAG, "[Shift] CLOSE trigger reason=location_off (during update)")
          sendDeactivateAndStop("location_off")
          return
        }
        saveLocation(location)
      }
    }

    locationCallback = callback
    try {
      fusedClient.requestLocationUpdates(request, callback, Looper.getMainLooper())
    } catch (_: SecurityException) {
      Log.w(TAG, "[Shift] CLOSE trigger reason=location_off (security)")
      sendDeactivateAndStop("location_off")
    }
  }

  private fun saveLocation(location: Location) {
    val coord = DriverCoordinate(
      latitude = location.latitude,
      longitude = location.longitude,
      heading = if (location.hasBearing()) location.bearing.toDouble() else null,
      speed = if (location.hasSpeed()) location.speed.toDouble() else null,
      accuracy = if (location.hasAccuracy()) location.accuracy.toDouble() else null,
    )
    if (coord.latitude == 0.0 && coord.longitude == 0.0) {
      return
    }
    ShiftGuardSessionStore.saveLastLocation(this, coord)
  }

  private fun sendDeactivateAndStop(reason: String, blocking: Boolean = false) {
    if (isDeactivating) {
      return
    }
    isDeactivating = true

    val config = activeConfig ?: ShiftGuardSessionStore.load(this)
    val lastCoord = ShiftGuardSessionStore.getLastLocation(this)
    val endTripUrl = ShiftGuardSessionStore.getEndTripApiUrl(this)

    Log.i(
      TAG,
      "[Shift] CLOSE start reason=$reason blocking=$blocking region=${config?.regionId} " +
        "lat=${lastCoord?.latitude} lon=${lastCoord?.longitude}",
    )

    stopGuardInternal(clearSession = false)
    ShiftGuardSessionStore.markPendingClose(this, reason)
    ShiftGuardSessionStore.clear(this)

    val work = Runnable {
      try {
        sendDeactivateApi(config, lastCoord)
        if (config != null) {
          ShiftTripApiClient.sendEndRegionTripBlocking(config, endTripUrl)
        }
        Log.i(TAG, "[Shift] CLOSE finished reason=$reason")
        try {
          eventSink?.invoke(
            "onShiftForceClosed",
            mapOf(
              "reason" to reason,
              "regionId" to (config?.regionId ?: ""),
              "planningDate" to (config?.planningDate ?: ""),
            ),
          )
        } catch (_: Exception) {
          // JS may already be gone on app kill
        }
      } finally {
        isDeactivating = false
        stopSelf()
      }
    }

    if (blocking) {
      // App kill path: block until APIs finish (max ~30s each inside clients).
      try {
        work.run()
      } catch (e: Exception) {
        Log.e(TAG, "[Shift] CLOSE blocking failed", e)
        isDeactivating = false
        stopSelf()
      }
    } else {
      Thread(work, "ShiftGuardClose").start()
    }
  }

  private fun sendDeactivateApi(config: TrackingConfig?, lastCoord: DriverCoordinate?) {
    if (config == null) {
      Log.w(TAG, "[Shift] CLOSE is_active=0 skipped — missing config")
      return
    }
    val coord = lastCoord ?: run {
      Log.w(TAG, "[Shift] CLOSE is_active=0 skipped — no current location")
      return
    }
    if (coord.latitude == 0.0 && coord.longitude == 0.0) {
      Log.w(TAG, "[Shift] CLOSE is_active=0 skipped — invalid location (0,0)")
      return
    }

    Log.i(TAG, "[Shift] CLOSE is_active=0 lat=${coord.latitude} lon=${coord.longitude}")
    val success = LocationApiClient.sendLocationUpdateBlocking(config, coord, 0)
    if (!success) {
      Log.w(TAG, "[Shift] CLOSE is_active=0 API failed")
    } else {
      Log.i(TAG, "[Shift] CLOSE is_active=0 API success")
    }
  }

  private fun stopGuardInternal(clearSession: Boolean) {
    locationCallback?.let { fusedClient.removeLocationUpdates(it) }
    locationCallback = null
    activeConfig = null
    isRunning = false
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
      stopForeground(STOP_FOREGROUND_REMOVE)
    } else {
      @Suppress("DEPRECATION")
      stopForeground(true)
    }
    if (clearSession) {
      ShiftGuardSessionStore.clear(this)
    }
  }

  private fun canUseLocation(): Boolean {
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

  private fun isLocationEnabled(): Boolean {
    val manager = getSystemService(Context.LOCATION_SERVICE) as LocationManager
    return manager.isProviderEnabled(LocationManager.GPS_PROVIDER) ||
      manager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)
  }
}
