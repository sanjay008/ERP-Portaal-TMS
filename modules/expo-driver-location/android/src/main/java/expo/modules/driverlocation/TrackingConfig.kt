package expo.modules.driverlocation

import android.content.Context
import android.location.Location
import android.os.Build
import org.json.JSONObject

data class TrackingConfig(
  val apiUrl: String,
  val token: String,
  val role: String,
  val planningDate: String,
  val relatiesId: String,
  val userId: String,
  val regionId: String,
  val apiIntervalSeconds: Int,
  val notificationTitle: String,
  val notificationBody: String,
  val orderId: String? = null,
) {
  companion object {
    fun fromMap(map: Map<String, Any?>): TrackingConfig {
      val interval = when (val raw = map["apiIntervalSeconds"] ?: map["distanceThresholdMeters"]) {
        is Number -> raw.toInt().coerceAtLeast(10)
        else -> 30
      }

      val orderId = when (val raw = map["orderId"]) {
        is String -> raw.trim().takeIf { it.isNotEmpty() }
        is Number -> raw.toString()
        else -> null
      }

      return TrackingConfig(
        apiUrl = map["apiUrl"] as? String ?: throw IllegalArgumentException("apiUrl is required"),
        token = map["token"] as? String ?: throw IllegalArgumentException("token is required"),
        role = map["role"] as? String ?: throw IllegalArgumentException("role is required"),
        planningDate = map["planningDate"] as? String ?: throw IllegalArgumentException("planningDate is required"),
        relatiesId = map["relatiesId"] as? String ?: throw IllegalArgumentException("relatiesId is required"),
        userId = map["userId"] as? String ?: throw IllegalArgumentException("userId is required"),
        regionId = map["regionId"] as? String ?: throw IllegalArgumentException("regionId is required"),
        apiIntervalSeconds = interval,
        notificationTitle = map["notificationTitle"] as? String ?: "ERP TMS Driver",
        notificationBody = map["notificationBody"] as? String ?: "Location tracking is active",
        orderId = orderId,
      )
    }
  }
}

data class DriverCoordinate(
  val latitude: Double,
  val longitude: Double,
  val heading: Double?,
  val speed: Double?,
  val accuracy: Double?,
  /** Epoch ms when GPS fix was measured (from Location.time / CLLocation.timestamp). */
  val capturedAtMs: Double? = null,
  val altitude: Double? = null,
  val altitudeAccuracy: Double? = null,
  val isMock: Boolean? = null,
  /** getCurrentLocation | lastLocation | published_cache | interval */
  val source: String? = null,
  val provider: String? = null,
) {
  companion object {
    /** Max age for POSTing published_cache without a fresh fix (20 min). */
    const val STALE_MAX_AGE_MS = 20L * 60L * 1000L

    fun fromAndroidLocation(
      location: Location,
      source: String,
      provider: String? = location.provider,
    ): DriverCoordinate? {
      if (location.latitude == 0.0 && location.longitude == 0.0) {
        return null
      }
      val fixTime = if (location.time > 0) location.time.toDouble() else null
      return DriverCoordinate(
        latitude = location.latitude,
        longitude = location.longitude,
        heading = if (location.hasBearing()) location.bearing.toDouble() else null,
        speed = if (location.hasSpeed()) location.speed.toDouble() else null,
        accuracy = if (location.hasAccuracy()) location.accuracy.toDouble() else null,
        capturedAtMs = fixTime,
        altitude = if (location.hasAltitude()) location.altitude else null,
        altitudeAccuracy = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && location.hasVerticalAccuracy()) {
          location.verticalAccuracyMeters.toDouble()
        } else {
          null
        },
        isMock = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
          location.isMock
        } else {
          @Suppress("DEPRECATION")
          location.isFromMockProvider
        },
        source = source,
        provider = provider ?: "fused",
      )
    }
  }

  fun ageMs(now: Long = System.currentTimeMillis()): Long? {
    val captured = capturedAtMs ?: return null
    return (now - captured.toLong()).coerceAtLeast(0)
  }

  fun isStale(now: Long = System.currentTimeMillis()): Boolean {
    val age = ageMs(now) ?: return true
    return age > STALE_MAX_AGE_MS
  }

  fun withSource(newSource: String): DriverCoordinate = copy(source = newSource)

  fun toLocationMetaJson(context: Context? = null): String {
    val now = System.currentTimeMillis()
    val timeMs = capturedAtMs?.toLong()?.takeIf { it > 0 } ?: return "{}"
    val appVersion = try {
      val ctx = context ?: DriverLocationService.getApplicationContext()
      if (ctx != null) {
        ctx.packageManager.getPackageInfo(ctx.packageName, 0).versionName ?: ""
      } else {
        ""
      }
    } catch (_: Exception) {
      ""
    }
    val json = JSONObject()
    json.put("source", source ?: "published_cache")
    json.put("provider", provider ?: "fused")
    json.put("location_time_ms", timeMs)
    json.put("age_ms", (now - timeMs).coerceAtLeast(0))
    json.put("is_mock", isMock ?: false)
    json.put("accuracy_m", accuracy)
    json.put("altitude", altitude)
    json.put("bearing", heading)
    json.put("speed_mps", speed)
    json.put("latitude", latitude)
    json.put("longitude", longitude)
    json.put("altitude_accuracy", altitudeAccuracy)
    json.put("platform", "android")
    json.put("app_version", appVersion)
    return json.toString()
  }

  fun toJsMap(): Map<String, Any?> = mapOf(
    "latitude" to latitude,
    "longitude" to longitude,
    "heading" to heading,
    "speed" to speed,
    "accuracy" to accuracy,
    "capturedAtMs" to capturedAtMs,
    "altitude" to altitude,
    "altitudeAccuracy" to altitudeAccuracy,
    "isMock" to isMock,
    "source" to source,
    "provider" to provider,
  )
}
