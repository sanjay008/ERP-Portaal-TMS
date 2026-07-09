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
  private const val KEY_DISTANCE_THRESHOLD = "distance_threshold"
  private const val KEY_NOTIFICATION_TITLE = "notification_title"
  private const val KEY_NOTIFICATION_BODY = "notification_body"
  private const val KEY_LAST_LAT = "last_lat"
  private const val KEY_LAST_LON = "last_lon"
  private const val KEY_LAST_HEADING = "last_heading"
  private const val KEY_LAST_SPEED = "last_speed"
  private const val KEY_LAST_ACCURACY = "last_accuracy"
  private const val KEY_LAST_SENT_LAT = "last_sent_lat"
  private const val KEY_LAST_SENT_LON = "last_sent_lon"

  fun save(context: Context, config: TrackingConfig) {
    context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit()
      .putString(KEY_API_URL, config.apiUrl)
      .putString(KEY_TOKEN, config.token)
      .putString(KEY_ROLE, config.role)
      .putString(KEY_PLANNING_DATE, config.planningDate)
      .putString(KEY_RELATIES_ID, config.relatiesId)
      .putString(KEY_USER_ID, config.userId)
      .putString(KEY_REGION_ID, config.regionId)
      .putFloat(KEY_DISTANCE_THRESHOLD, config.distanceThresholdMeters.toFloat())
      .putString(KEY_NOTIFICATION_TITLE, config.notificationTitle)
      .putString(KEY_NOTIFICATION_BODY, config.notificationBody)
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
      distanceThresholdMeters = prefs.getFloat(KEY_DISTANCE_THRESHOLD, 50f).toDouble(),
      notificationTitle = prefs.getString(KEY_NOTIFICATION_TITLE, "ERP TMS Driver") ?: "ERP TMS Driver",
      notificationBody = prefs.getString(KEY_NOTIFICATION_BODY, "Location tracking is active")
        ?: "Location tracking is active",
    )
  }

  fun updateNotificationLabels(context: Context, title: String, body: String) {
    context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit()
      .putString(KEY_NOTIFICATION_TITLE, title)
      .putString(KEY_NOTIFICATION_BODY, body)
      .apply()
  }

  fun saveLastLocation(context: Context, coord: DriverCoordinate) {
    context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit()
      .putFloat(KEY_LAST_LAT, coord.latitude.toFloat())
      .putFloat(KEY_LAST_LON, coord.longitude.toFloat())
      .putFloat(KEY_LAST_HEADING, (coord.heading ?: 0.0).toFloat())
      .putFloat(KEY_LAST_SPEED, (coord.speed ?: 0.0).toFloat())
      .putFloat(KEY_LAST_ACCURACY, (coord.accuracy ?: 0.0).toFloat())
      .apply()
  }

  fun getLastLocation(context: Context): DriverCoordinate? {
    val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    if (!prefs.contains(KEY_LAST_LAT) || !prefs.contains(KEY_LAST_LON)) {
      return null
    }

    val lat = prefs.getFloat(KEY_LAST_LAT, 0f).toDouble()
    val lon = prefs.getFloat(KEY_LAST_LON, 0f).toDouble()
    if (lat == 0.0 && lon == 0.0) {
      return null
    }

    return DriverCoordinate(
      latitude = lat,
      longitude = lon,
      heading = prefs.getFloat(KEY_LAST_HEADING, 0f).toDouble().takeIf { it != 0.0 },
      speed = prefs.getFloat(KEY_LAST_SPEED, 0f).toDouble().takeIf { it != 0.0 },
      accuracy = prefs.getFloat(KEY_LAST_ACCURACY, 0f).toDouble().takeIf { it != 0.0 },
    )
  }

  fun getLastSentCoord(context: Context): Pair<Double, Double>? {
    val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    if (!prefs.contains(KEY_LAST_SENT_LAT) || !prefs.contains(KEY_LAST_SENT_LON)) {
      return null
    }
    return prefs.getFloat(KEY_LAST_SENT_LAT, 0f).toDouble() to prefs.getFloat(KEY_LAST_SENT_LON, 0f).toDouble()
  }

  fun setLastSentCoord(context: Context, latitude: Double, longitude: Double) {
    context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit()
      .putFloat(KEY_LAST_SENT_LAT, latitude.toFloat())
      .putFloat(KEY_LAST_SENT_LON, longitude.toFloat())
      .apply()
  }

  fun clearLastSentCoord(context: Context) {
    context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit()
      .remove(KEY_LAST_SENT_LAT)
      .remove(KEY_LAST_SENT_LON)
      .apply()
  }

  fun clear(context: Context) {
    context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit().clear().apply()
  }
}
