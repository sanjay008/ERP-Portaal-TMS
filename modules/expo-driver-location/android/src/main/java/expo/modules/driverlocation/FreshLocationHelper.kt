package expo.modules.driverlocation

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.location.Location
import android.os.Looper
import android.util.Log
import androidx.core.content.ContextCompat
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import com.google.android.gms.tasks.CancellationTokenSource
import java.util.concurrent.CopyOnWriteArrayList
import java.util.concurrent.atomic.AtomicBoolean

/**
 * On-demand fresh GPS for scan → status_update.
 * Writes the published 15-min cache; does not POST live-location (periodic timer owns that).
 */
object FreshLocationHelper {
  private const val TAG = DriverLocLog.TAG
  private const val MAX_LOCATION_AGE_MS = 60_000L
  private const val MAX_ACCURACY_METERS = 100f

  private val inFlight = AtomicBoolean(false)
  private val waiters = CopyOnWriteArrayList<(DriverCoordinate?) -> Unit>()

  fun request(context: Context, callback: (DriverCoordinate?) -> Unit) {
    waiters.add(callback)
    if (!inFlight.compareAndSet(false, true)) {
      return
    }

    val appContext = context.applicationContext
    if (!hasLocationPermission(appContext)) {
      DriverLocLog.w("scan_fresh", "ok=false reason=no_permission")
      finish(null)
      return
    }

    try {
      val fused = LocationServices.getFusedLocationProviderClient(appContext)
      val cts = CancellationTokenSource()

      fused
        .getCurrentLocation(Priority.PRIORITY_HIGH_ACCURACY, cts.token)
        .addOnSuccessListener { location ->
          if (location != null && tryPublish(appContext, location, "scan.getCurrentLocation")) {
            finish(TrackingSessionStore.getLastLocation(appContext))
            return@addOnSuccessListener
          }
          fused.lastLocation
            .addOnSuccessListener { last ->
              if (last != null) {
                tryPublish(appContext, last, "scan.lastLocation")
              }
              finish(TrackingSessionStore.getLastLocation(appContext))
            }
            .addOnFailureListener {
              finish(TrackingSessionStore.getLastLocation(appContext))
            }
        }
        .addOnFailureListener {
          fused.lastLocation
            .addOnSuccessListener { last ->
              if (last != null) {
                tryPublish(appContext, last, "scan.lastLocation")
              }
              finish(TrackingSessionStore.getLastLocation(appContext))
            }
            .addOnFailureListener {
              finish(TrackingSessionStore.getLastLocation(appContext))
            }
        }
    } catch (e: SecurityException) {
      DriverLocLog.w("scan_fresh", "ok=false reason=security err=${e.message}")
      finish(TrackingSessionStore.getLastLocation(appContext))
    } catch (e: Exception) {
      DriverLocLog.w("scan_fresh", "ok=false reason=failed err=${e.message}")
      finish(TrackingSessionStore.getLastLocation(appContext))
    }
  }

  private fun finish(coord: DriverCoordinate?) {
    inFlight.set(false)
    val callbacks = waiters.toList()
    waiters.clear()
    // Deliver on main so Expo Promise resolve is safe.
    android.os.Handler(Looper.getMainLooper()).post {
      for (cb in callbacks) {
        try {
          cb(coord)
        } catch (_: Exception) {
        }
      }
    }
  }

  private fun tryPublish(context: Context, location: Location, source: String): Boolean {
    if (!isAcceptableFix(location)) {
      val ageMs = System.currentTimeMillis() - location.time
      val accuracy = if (location.hasAccuracy()) location.accuracy else -1f
      DriverLocLog.w("scan_fresh", "ok=false reason=rejected source=$source ageMs=$ageMs accuracy=$accuracy")
      return false
    }

    val published = DriverCoordinate(
      latitude = location.latitude,
      longitude = location.longitude,
      heading = if (location.hasBearing()) location.bearing.toDouble() else null,
      speed = if (location.hasSpeed()) location.speed.toDouble() else null,
      accuracy = if (location.hasAccuracy()) location.accuracy.toDouble() else null,
      capturedAtMs = System.currentTimeMillis().toDouble(),
    )
    if (published.latitude == 0.0 && published.longitude == 0.0) {
      return false
    }

    TrackingSessionStore.savePublishedLocation(context, published)
    TrackingSessionStore.saveWarmLocation(context, published)
    DriverLocationService.rescheduleApiInterval(context)
    DriverLocLog.i(
      "scan_fresh",
      "ok=true timerReset=1 ${DriverLocLog.coord(published.latitude, published.longitude, published.accuracy, published.capturedAtMs)}",
    )
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

  private fun hasLocationPermission(context: Context): Boolean {
    val fine = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION)
    val coarse = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION)
    return fine == PackageManager.PERMISSION_GRANTED || coarse == PackageManager.PERMISSION_GRANTED
  }
}
