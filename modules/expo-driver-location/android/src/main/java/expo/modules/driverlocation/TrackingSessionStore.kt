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
  private const val KEY_LAST_LAT = "last_lat"
  private const val KEY_LAST_LON = "last_lon"
  private const val KEY_LAST_LAT_STR = "last_lat_str"
  private const val KEY_LAST_LON_STR = "last_lon_str"
  private const val KEY_LAST_HEADING = "last_heading"
  private const val KEY_LAST_SPEED = "last_speed"
  private const val KEY_LAST_ACCURACY = "last_accuracy"
  private const val KEY_CAPTURED_AT = "last_captured_at"

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

  /**
   * Published API fix — only written on 15-min / start fresh reads.
   * Scan + periodic API both read from here.
   */
  fun saveLastLocation(context: Context, coord: DriverCoordinate) {
    context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit()
      .putString(KEY_LAST_LAT_STR, coord.latitude.toString())
      .putString(KEY_LAST_LON_STR, coord.longitude.toString())
      // Keep legacy float keys in sync for older readers.
      .putFloat(KEY_LAST_LAT, coord.latitude.toFloat())
      .putFloat(KEY_LAST_LON, coord.longitude.toFloat())
      .putFloat(KEY_LAST_HEADING, (coord.heading ?: 0.0).toFloat())
      .putFloat(KEY_LAST_SPEED, (coord.speed ?: 0.0).toFloat())
      .putFloat(KEY_LAST_ACCURACY, (coord.accuracy ?: 0.0).toFloat())
      .putLong(KEY_CAPTURED_AT, coord.capturedAtMs ?: System.currentTimeMillis())
      .apply()
  }

  fun getLastLocation(context: Context): DriverCoordinate? {
    val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    val lat = prefs.getString(KEY_LAST_LAT_STR, null)?.toDoubleOrNull()
      ?: if (prefs.contains(KEY_LAST_LAT)) prefs.getFloat(KEY_LAST_LAT, 0f).toDouble() else null
    val lon = prefs.getString(KEY_LAST_LON_STR, null)?.toDoubleOrNull()
      ?: if (prefs.contains(KEY_LAST_LON)) prefs.getFloat(KEY_LAST_LON, 0f).toDouble() else null

    if (lat == null || lon == null || (lat == 0.0 && lon == 0.0)) {
      return null
    }

    val capturedAt = prefs.getLong(KEY_CAPTURED_AT, 0L).takeIf { it > 0L }

    return DriverCoordinate(
      latitude = lat,
      longitude = lon,
      heading = prefs.getFloat(KEY_LAST_HEADING, 0f).toDouble().takeIf { it != 0.0 },
      speed = prefs.getFloat(KEY_LAST_SPEED, 0f).toDouble().takeIf { it != 0.0 },
      accuracy = prefs.getFloat(KEY_LAST_ACCURACY, 0f).toDouble().takeIf { it != 0.0 },
      capturedAtMs = capturedAt,
    )
  }

  fun clear(context: Context) {
    context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit().clear().apply()
  }
}
