package expo.modules.driverlocation

import okhttp3.Call
import okhttp3.Callback
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response
import java.io.IOException
import java.util.concurrent.TimeUnit

object LocationApiClient {
  private val client = OkHttpClient.Builder()
    .connectTimeout(30, TimeUnit.SECONDS)
    .readTimeout(30, TimeUnit.SECONDS)
    .writeTimeout(30, TimeUnit.SECONDS)
    .build()

  fun sendLocationUpdate(
    config: TrackingConfig,
    coord: DriverCoordinate,
    isActive: Int,
    onComplete: ((Boolean) -> Unit)? = null,
  ) {
    if (coord.latitude == 0.0 || coord.longitude == 0.0) {
      onComplete?.invoke(false)
      return
    }

    val multipart = MultipartBody.Builder()
      .setType(MultipartBody.FORM)
      .addFormDataPart("token", config.token)
      .addFormDataPart("role", config.role)
      .addFormDataPart("planning_date", config.planningDate)
      .addFormDataPart("relaties_id", config.relatiesId)
      .addFormDataPart("user_id", config.userId)
      .addFormDataPart("region_id", config.regionId)
      .addFormDataPart("latitude", coord.latitude.toString())
      .addFormDataPart("longitude", coord.longitude.toString())
      .addFormDataPart("heading", coord.heading?.toString() ?: "")
      .addFormDataPart("accuracy", coord.accuracy?.toString() ?: "")
      .addFormDataPart("speed", coord.speed?.toString() ?: "")
      .addFormDataPart("is_active", isActive.toString())
      .build()

    val request = Request.Builder()
      .url(config.apiUrl)
      .post(multipart)
      .build()

    client.newCall(request).enqueue(object : Callback {
      override fun onFailure(call: Call, e: IOException) {
        onComplete?.invoke(false)
      }

      override fun onResponse(call: Call, response: Response) {
        response.use {
          onComplete?.invoke(it.isSuccessful)
        }
      }
    })
  }

  fun sendLocationUpdateBlocking(
    config: TrackingConfig,
    coord: DriverCoordinate,
    isActive: Int,
  ): Boolean {
    if (coord.latitude == 0.0 || coord.longitude == 0.0) {
      return false
    }

    val multipart = MultipartBody.Builder()
      .setType(MultipartBody.FORM)
      .addFormDataPart("token", config.token)
      .addFormDataPart("role", config.role)
      .addFormDataPart("planning_date", config.planningDate)
      .addFormDataPart("relaties_id", config.relatiesId)
      .addFormDataPart("user_id", config.userId)
      .addFormDataPart("region_id", config.regionId)
      .addFormDataPart("latitude", coord.latitude.toString())
      .addFormDataPart("longitude", coord.longitude.toString())
      .addFormDataPart("heading", coord.heading?.toString() ?: "")
      .addFormDataPart("accuracy", coord.accuracy?.toString() ?: "")
      .addFormDataPart("speed", coord.speed?.toString() ?: "")
      .addFormDataPart("is_active", isActive.toString())
      .build()

    val request = Request.Builder()
      .url(config.apiUrl)
      .post(multipart)
      .build()

    return try {
      client.newCall(request).execute().use { it.isSuccessful }
    } catch (_: IOException) {
      false
    }
  }
}

object LocationMath {
  fun haversineDistance(lat1: Double, lon1: Double, lat2: Double, lon2: Double): Double {
    val earthRadius = 6371000.0
    val dLat = Math.toRadians(lat2 - lat1)
    val dLon = Math.toRadians(lon2 - lon1)
    val a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
    val c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return earthRadius * c
  }
}
