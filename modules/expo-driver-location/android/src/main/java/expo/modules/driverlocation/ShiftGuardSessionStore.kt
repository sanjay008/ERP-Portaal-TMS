package expo.modules.driverlocation

import android.content.Context
import android.util.Log
import okhttp3.MultipartBody
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.IOException
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.TimeUnit

object ShiftTripApiClient {
  private const val TAG = "ShiftLocationGuard"

  private val client = OkHttpClient.Builder()
    .connectTimeout(30, TimeUnit.SECONDS)
    .readTimeout(30, TimeUnit.SECONDS)
    .writeTimeout(30, TimeUnit.SECONDS)
    .build()

  fun sendEndRegionTripBlocking(config: TrackingConfig, endTripApiUrl: String?): Boolean {
    if (endTripApiUrl.isNullOrBlank()) {
      Log.w(TAG, "[Shift] CLOSE skipped end-region-trip — missing url")
      return false
    }

    val endedAt = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.US).format(Date())
    Log.i(
      TAG,
      "[Shift] CLOSE end-region-trip request region=${config.regionId} " +
        "planning=${config.planningDate} ended_at=$endedAt user=${config.userId}",
    )

    val multipart = MultipartBody.Builder()
      .setType(MultipartBody.FORM)
      .addFormDataPart("token", config.token)
      .addFormDataPart("role", config.role)
      .addFormDataPart("planning_date", config.planningDate)
      .addFormDataPart("relaties_id", config.relatiesId)
      .addFormDataPart("user_id", config.userId)
      .addFormDataPart("region_id", config.regionId)
      .addFormDataPart("ended_at", endedAt)
      .build()

    val request = Request.Builder()
      .url(endTripApiUrl)
      .post(multipart)
      .build()

    return try {
      client.newCall(request).execute().use { response ->
        val body = response.body?.string().orEmpty()
        val ok = response.isSuccessful
        if (ok) {
          Log.i(TAG, "[Shift] CLOSE end-region-trip success status=${response.code}")
        } else {
          Log.w(
            TAG,
            "[Shift] CLOSE end-region-trip failed status=${response.code} body=${body.take(200)}",
          )
        }
        ok
      }
    } catch (e: IOException) {
      Log.e(TAG, "[Shift] CLOSE end-region-trip network error: ${e.message}", e)
      false
    }
  }
}

object ShiftGuardSessionStore {
  private const val PREFS_NAME = "expo_shift_location_guard"
  private const val KEY_API_URL = "api_url"
  private const val KEY_END_TRIP_API_URL = "end_trip_api_url"
  private const val KEY_TOKEN = "token"
  private const val KEY_ROLE = "role"
  private const val KEY_PLANNING_DATE = "planning_date"
  private const val KEY_RELATIES_ID = "relaties_id"
  private const val KEY_USER_ID = "user_id"
  private const val KEY_REGION_ID = "region_id"
  private const val KEY_NOTIFICATION_TITLE = "notification_title"
  private const val KEY_NOTIFICATION_BODY = "notification_body"
  private const val KEY_LAST_LAT = "last_lat"
  private const val KEY_LAST_LON = "last_lon"
  private const val KEY_LAST_HEADING = "last_heading"
  private const val KEY_LAST_SPEED = "last_speed"
  private const val KEY_LAST_ACCURACY = "last_accuracy"
  private const val KEY_ENABLED = "enabled"
  private const val KEY_PENDING_CLOSE_REASON = "pending_close_reason"

  fun save(context: Context, config: TrackingConfig, endTripApiUrl: String?) {
    context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit()
      .putBoolean(KEY_ENABLED, true)
      .putString(KEY_API_URL, config.apiUrl)
      .putString(KEY_END_TRIP_API_URL, endTripApiUrl)
      .putString(KEY_TOKEN, config.token)
      .putString(KEY_ROLE, config.role)
      .putString(KEY_PLANNING_DATE, config.planningDate)
      .putString(KEY_RELATIES_ID, config.relatiesId)
      .putString(KEY_USER_ID, config.userId)
      .putString(KEY_REGION_ID, config.regionId)
      .putString(KEY_NOTIFICATION_TITLE, config.notificationTitle)
      .putString(KEY_NOTIFICATION_BODY, config.notificationBody)
      .remove(KEY_PENDING_CLOSE_REASON)
      .apply()
    Log.i(
      TAG,
      "[Shift] ON guard saved region=${config.regionId} planning=${config.planningDate} user=${config.userId}",
    )
  }

  private const val TAG = "ShiftLocationGuard"

  fun load(context: Context): TrackingConfig? {
    val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    if (!prefs.getBoolean(KEY_ENABLED, false)) {
      return null
    }
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
      apiIntervalSeconds = 30,
      notificationTitle = prefs.getString(KEY_NOTIFICATION_TITLE, "ERP TMS Driver") ?: "ERP TMS Driver",
      notificationBody = prefs.getString(KEY_NOTIFICATION_BODY, "Shift session active")
        ?: "Shift session active",
    )
  }

  fun getEndTripApiUrl(context: Context): String? {
    return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      .getString(KEY_END_TRIP_API_URL, null)
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

  fun markPendingClose(context: Context, reason: String) {
    context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit()
      .putString(KEY_PENDING_CLOSE_REASON, reason)
      .putBoolean(KEY_ENABLED, false)
      .apply()
    Log.i(TAG, "[Shift] CLOSE pending local wipe reason=$reason")
  }

  fun consumePendingCloseReason(context: Context): String? {
    val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    val reason = prefs.getString(KEY_PENDING_CLOSE_REASON, null) ?: return null
    prefs.edit().remove(KEY_PENDING_CLOSE_REASON).apply()
    Log.i(TAG, "[Shift] CLOSE pending consumed reason=$reason")
    return reason
  }

  fun clear(context: Context) {
    val pending = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      .getString(KEY_PENDING_CLOSE_REASON, null)
    context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit().clear().apply()
    if (pending != null) {
      context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit()
        .putString(KEY_PENDING_CLOSE_REASON, pending)
        .apply()
    }
  }
}
