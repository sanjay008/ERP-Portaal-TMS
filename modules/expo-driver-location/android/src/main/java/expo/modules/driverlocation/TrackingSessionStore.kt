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
  private const val KEY_LAST_ALTITUDE = "last_altitude"
  private const val KEY_LAST_ALTITUDE_ACC = "last_altitude_acc"
  private const val KEY_LAST_IS_MOCK = "last_is_mock"
  private const val KEY_LAST_SOURCE = "last_source"
  private const val KEY_LAST_PROVIDER = "last_provider"

  // Warm GPS (continuous) — never used for API until published
  private const val KEY_WARM_LAT = "warm_lat"
  private const val KEY_WARM_LON = "warm_lon"
  private const val KEY_WARM_HEADING = "warm_heading"
  private const val KEY_WARM_SPEED = "warm_speed"
  private const val KEY_WARM_ACCURACY = "warm_accuracy"
  private const val KEY_WARM_CAPTURED_AT = "warm_captured_at"
  private const val KEY_WARM_ALTITUDE = "warm_altitude"
  private const val KEY_WARM_ALTITUDE_ACC = "warm_altitude_acc"
  private const val KEY_WARM_IS_MOCK = "warm_is_mock"
  private const val KEY_WARM_SOURCE = "warm_source"
  private const val KEY_WARM_PROVIDER = "warm_provider"

  fun save(context: Context, config: TrackingConfig) {
    val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    val prevRegion = prefs.getString(KEY_REGION_ID, null)
    val prevPlanning = prefs.getString(KEY_PLANNING_DATE, null)
    val regionChanged =
      prevRegion != null && prevRegion != config.regionId
    val planningChanged =
      prevPlanning != null && prevPlanning != config.planningDate

    val editor = prefs.edit()
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

    if (config.orderId.isNullOrBlank()) {
      editor.remove(KEY_ORDER_ID)
    } else {
      editor.putString(KEY_ORDER_ID, config.orderId)
    }

    if (regionChanged || planningChanged) {
      clearPublishedKeys(editor)
      clearWarmKeys(editor)
      DriverLocLog.i(
        "cache_clear",
        "reason=region_or_planning_change region=$prevRegion→${config.regionId} planning=$prevPlanning→${config.planningDate}",
      )
    }

    editor.apply()
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
      .putString(KEY_WARM_CAPTURED_AT, (coord.capturedAtMs ?: 0.0).toString())
      .putString(KEY_WARM_ALTITUDE, (coord.altitude ?: 0.0).toString())
      .putString(KEY_WARM_ALTITUDE_ACC, (coord.altitudeAccuracy ?: 0.0).toString())
      .putBoolean(KEY_WARM_IS_MOCK, coord.isMock ?: false)
      .putString(KEY_WARM_SOURCE, coord.source ?: "")
      .putString(KEY_WARM_PROVIDER, coord.provider ?: "")
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
      capturedAtMs = readDouble(prefs, KEY_WARM_CAPTURED_AT)?.takeIf { it > 0 },
      altitude = readDouble(prefs, KEY_WARM_ALTITUDE)?.takeIf { it != 0.0 },
      altitudeAccuracy = readDouble(prefs, KEY_WARM_ALTITUDE_ACC)?.takeIf { it != 0.0 },
      isMock = if (prefs.contains(KEY_WARM_IS_MOCK)) prefs.getBoolean(KEY_WARM_IS_MOCK, false) else null,
      source = prefs.getString(KEY_WARM_SOURCE, null)?.takeIf { it.isNotBlank() },
      provider = prefs.getString(KEY_WARM_PROVIDER, null)?.takeIf { it.isNotBlank() },
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
        (coord.capturedAtMs ?: 0.0).toString(),
      )
      .putString(KEY_LAST_ALTITUDE, (coord.altitude ?: 0.0).toString())
      .putString(KEY_LAST_ALTITUDE_ACC, (coord.altitudeAccuracy ?: 0.0).toString())
      .putBoolean(KEY_LAST_IS_MOCK, coord.isMock ?: false)
      .putString(KEY_LAST_SOURCE, coord.source ?: "published_cache")
      .putString(KEY_LAST_PROVIDER, coord.provider ?: "")
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
      capturedAtMs = readDouble(prefs, KEY_LAST_CAPTURED_AT)?.takeIf { it > 0 },
      altitude = readDouble(prefs, KEY_LAST_ALTITUDE)?.takeIf { it != 0.0 },
      altitudeAccuracy = readDouble(prefs, KEY_LAST_ALTITUDE_ACC)?.takeIf { it != 0.0 },
      isMock = if (prefs.contains(KEY_LAST_IS_MOCK)) prefs.getBoolean(KEY_LAST_IS_MOCK, false) else null,
      source = prefs.getString(KEY_LAST_SOURCE, null)?.takeIf { it.isNotBlank() } ?: "published_cache",
      provider = prefs.getString(KEY_LAST_PROVIDER, null)?.takeIf { it.isNotBlank() },
    )
  }

  fun getLocationForApiOrDeactivate(context: Context): DriverCoordinate? {
    return getLastLocation(context) ?: getWarmLocation(context)
  }

  fun clearPublishedLocation(context: Context) {
    context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit()
      .also { clearPublishedKeys(it); clearWarmKeys(it) }
      .apply()
    DriverLocLog.i("cache_clear", "reason=clear_published")
  }

  fun clear(context: Context) {
    context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit().clear().apply()
  }

  private fun clearPublishedKeys(editor: android.content.SharedPreferences.Editor) {
    editor
      .remove(KEY_LAST_LAT)
      .remove(KEY_LAST_LON)
      .remove(KEY_LAST_HEADING)
      .remove(KEY_LAST_SPEED)
      .remove(KEY_LAST_ACCURACY)
      .remove(KEY_LAST_CAPTURED_AT)
      .remove(KEY_LAST_ALTITUDE)
      .remove(KEY_LAST_ALTITUDE_ACC)
      .remove(KEY_LAST_IS_MOCK)
      .remove(KEY_LAST_SOURCE)
      .remove(KEY_LAST_PROVIDER)
  }

  private fun clearWarmKeys(editor: android.content.SharedPreferences.Editor) {
    editor
      .remove(KEY_WARM_LAT)
      .remove(KEY_WARM_LON)
      .remove(KEY_WARM_HEADING)
      .remove(KEY_WARM_SPEED)
      .remove(KEY_WARM_ACCURACY)
      .remove(KEY_WARM_CAPTURED_AT)
      .remove(KEY_WARM_ALTITUDE)
      .remove(KEY_WARM_ALTITUDE_ACC)
      .remove(KEY_WARM_IS_MOCK)
      .remove(KEY_WARM_SOURCE)
      .remove(KEY_WARM_PROVIDER)
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
