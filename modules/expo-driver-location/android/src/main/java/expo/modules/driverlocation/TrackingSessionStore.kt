package expo.modules.driverlocation

import android.content.Context

object TrackingSessionStore {
  private const val PREFS_NAME = "expo_driver_location"
  private const val KEY_API_URL = "api_url"
  private const val KEY_TOKEN = "token"
  private const val KEY_ROLE = "role"
  private const val KEY_PLANNING_DATE = "planning_date"
  private const val KEY_RELATIES_ID = "relaties_id"
  private const val KEY_USER_ID = "user_id"
  private const val KEY_REGION_ID = "region_id"
  private const val KEY_API_INTERVAL_SECONDS = "api_interval_seconds"
  private const val KEY_NOTIFICATION_TITLE = "notification_title"
  private const val KEY_NOTIFICATION_BODY = "notification_body"
  private const val KEY_ORDER_ID = "order_id"

  // Published (15-min) cache — used for API + scan
  private const val KEY_LAST_LAT = "last_lat"
  private const val KEY_LAST_LON = "last_lon"
  private const val KEY_LAST_HEADING = "last_heading"
  private const val KEY_LAST_SPEED = "last_speed"
  private const val KEY_LAST_ACCURACY = "last_accuracy"
  private const val KEY_LAST_CAPTURED_AT = "last_captured_at"

  // Warm GPS (continuous) — never used for API until published
  private const val KEY_WARM_LAT = "warm_lat"
  private const val KEY_WARM_LON = "warm_lon"
  private const val KEY_WARM_HEADING = "warm_heading"
  private const val KEY_WARM_SPEED = "warm_speed"
  private const val KEY_WARM_ACCURACY = "warm_accuracy"

  fun save(context: Context, config: TrackingConfig) {
    context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit()
      .putString(KEY_API_URL, config.apiUrl)
      .putString(KEY_TOKEN, config.token)
      .putString(KEY_ROLE, config.role)
      .putString(KEY_PLANNING_DATE, config.planningDate)
      .putString(KEY_RELATIES_ID, config.relatiesId)
      .putString(KEY_USER_ID, config.userId)
      .putString(KEY_REGION_ID, config.regionId)
      .putInt(KEY_API_INTERVAL_SECONDS, config.apiIntervalSeconds)
      .putString(KEY_NOTIFICATION_TITLE, config.notificationTitle)
      .putString(KEY_NOTIFICATION_BODY, config.notificationBody)
      .apply {
        if (config.orderId.isNullOrBlank()) {
          remove(KEY_ORDER_ID)
        } else {
          putString(KEY_ORDER_ID, config.orderId)
        }
      }
      .apply()
  }

  fun load(context: Context): TrackingConfig? {
    val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    val apiUrl = prefs.getString(KEY_API_URL, null) ?: return null
    val token = prefs.getString(KEY_TOKEN, null) ?: return null
    val role = prefs.getString(KEY_ROLE, null) ?: return null
    val planningDate = prefs.getString(KEY_PLANNING_DATE, null) ?: return null
    val relatiesId = prefs.getString(KEY_RELATIES_ID, null) ?: return null
    val userId = prefs.getString(KEY_USER_ID, null) ?: return null
    val regionId = prefs.getString(KEY_REGION_ID, null) ?: return null

    return TrackingConfig(
      apiUrl = apiUrl,
      token = token,
      role = role,
      planningDate = planningDate,
      relatiesId = relatiesId,
      userId = userId,
      regionId = regionId,
      apiIntervalSeconds = prefs.getInt(KEY_API_INTERVAL_SECONDS, 30).coerceAtLeast(10),
      notificationTitle = prefs.getString(KEY_NOTIFICATION_TITLE, "ERP TMS Driver") ?: "ERP TMS Driver",
      notificationBody = prefs.getString(KEY_NOTIFICATION_BODY, "Location tracking is active")
        ?: "Location tracking is active",
      orderId = prefs.getString(KEY_ORDER_ID, null)?.takeIf { it.isNotBlank() },
    )
  }

  fun updateNotificationLabels(context: Context, title: String, body: String) {
    context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit()
      .putString(KEY_NOTIFICATION_TITLE, title)
      .putString(KEY_NOTIFICATION_BODY, body)
      .apply()
  }

  /** Continuous GPS warm cache — does not overwrite published 15-min coords. */
  fun saveWarmLocation(context: Context, coord: DriverCoordinate) {
    context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit()
      .putString(KEY_WARM_LAT, coord.latitude.toString())
      .putString(KEY_WARM_LON, coord.longitude.toString())
      .putString(KEY_WARM_HEADING, (coord.heading ?: 0.0).toString())
      .putString(KEY_WARM_SPEED, (coord.speed ?: 0.0).toString())
      .putString(KEY_WARM_ACCURACY, (coord.accuracy ?: 0.0).toString())
      .apply()
  }

  fun getWarmLocation(context: Context): DriverCoordinate? {
    val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    val lat = readDouble(prefs, KEY_WARM_LAT) ?: return null
    val lon = readDouble(prefs, KEY_WARM_LON) ?: return null
    if (lat == 0.0 && lon == 0.0) {
      return null
    }
    return DriverCoordinate(
      latitude = lat,
      longitude = lon,
      heading = readDouble(prefs, KEY_WARM_HEADING)?.takeIf { it != 0.0 },
      speed = readDouble(prefs, KEY_WARM_SPEED)?.takeIf { it != 0.0 },
      accuracy = readDouble(prefs, KEY_WARM_ACCURACY)?.takeIf { it != 0.0 },
    )
  }

  /** Published 15-min fix — used by API + getLastLocation / scan. */
  fun savePublishedLocation(context: Context, coord: DriverCoordinate) {
    context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit()
      .putString(KEY_LAST_LAT, coord.latitude.toString())
      .putString(KEY_LAST_LON, coord.longitude.toString())
      .putString(KEY_LAST_HEADING, (coord.heading ?: 0.0).toString())
      .putString(KEY_LAST_SPEED, (coord.speed ?: 0.0).toString())
      .putString(KEY_LAST_ACCURACY, (coord.accuracy ?: 0.0).toString())
      .putString(
        KEY_LAST_CAPTURED_AT,
        (coord.capturedAtMs ?: System.currentTimeMillis().toDouble()).toString(),
      )
      .apply()
  }

  /** @deprecated Prefer savePublishedLocation / saveWarmLocation */
  fun saveLastLocation(context: Context, coord: DriverCoordinate) {
    savePublishedLocation(context, coord)
  }

  fun getLastLocation(context: Context): DriverCoordinate? {
    val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    val lat = readDouble(prefs, KEY_LAST_LAT) ?: return null
    val lon = readDouble(prefs, KEY_LAST_LON) ?: return null
    if (lat == 0.0 && lon == 0.0) {
      return null
    }

    return DriverCoordinate(
      latitude = lat,
      longitude = lon,
      heading = readDouble(prefs, KEY_LAST_HEADING)?.takeIf { it != 0.0 },
      speed = readDouble(prefs, KEY_LAST_SPEED)?.takeIf { it != 0.0 },
      accuracy = readDouble(prefs, KEY_LAST_ACCURACY)?.takeIf { it != 0.0 },
      capturedAtMs = readDouble(prefs, KEY_LAST_CAPTURED_AT),
    )
  }

  fun getLocationForApiOrDeactivate(context: Context): DriverCoordinate? {
    return getLastLocation(context) ?: getWarmLocation(context)
  }

  fun clear(context: Context) {
    context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit().clear().apply()
  }

  /**
   * Prefs may hold legacy Float values or new String doubles — never ClassCast crash.
   */
  private fun readDouble(prefs: android.content.SharedPreferences, key: String): Double? {
    if (!prefs.contains(key)) {
      return null
    }
    return try {
      prefs.getString(key, null)?.toDoubleOrNull()
    } catch (_: ClassCastException) {
      try {
        val value = prefs.getFloat(key, Float.NaN)
        if (value.isNaN()) null else value.toDouble()
      } catch (_: ClassCastException) {
        try {
          prefs.getLong(key, Long.MIN_VALUE).takeIf { it != Long.MIN_VALUE }?.toDouble()
        } catch (_: ClassCastException) {
          null
        }
      }
    }
  }
}
