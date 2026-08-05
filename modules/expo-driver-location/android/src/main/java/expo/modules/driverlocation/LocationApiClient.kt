package expo.modules.driverlocation

import android.util.Log
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
  private const val TAG = "ExpoDriverLocation"

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
      Log.w(TAG, "API skipped — invalid coordinates (0,0) is_active=$isActive")
      onComplete?.invoke(false)
      return
    }

    Log.d(
      TAG,
      "API request → is_active=$isActive lat=${coord.latitude} lon=${coord.longitude} " +
        "region=${config.regionId} user=${config.userId} planning=${config.planningDate} order=${config.orderId}",
    )

    val multipartBuilder = MultipartBody.Builder()
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

    coord.capturedAtMs?.let {
      multipartBuilder.addFormDataPart("captured_at", it.toString())
    }

    if (!config.orderId.isNullOrBlank()) {
      multipartBuilder.addFormDataPart("order_id", config.orderId)
    }

    val multipart = multipartBuilder.build()

    val request = Request.Builder()
      .url(config.apiUrl)
      .post(multipart)
      .build()

    client.newCall(request).enqueue(object : Callback {
      override fun onFailure(call: Call, e: IOException) {
        Log.e(TAG, "API failed → network error is_active=$isActive: ${e.message}", e)
        onComplete?.invoke(false)
      }

      override fun onResponse(call: Call, response: Response) {
        response.use {
          val body = it.body?.string().orEmpty()
          if (it.isSuccessful) {
            Log.i(
              TAG,
              "API success → status=${it.code} is_active=$isActive lat=${coord.latitude} lon=${coord.longitude}",
            )
          } else {
            Log.w(
              TAG,
              "API error → status=${it.code} is_active=$isActive body=${body.take(200)}",
            )
          }
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
      Log.w(TAG, "API skipped (blocking) — invalid coordinates (0,0) is_active=$isActive")
      return false
    }

    Log.d(
      TAG,
      "API request (blocking) → is_active=$isActive lat=${coord.latitude} lon=${coord.longitude} " +
        "region=${config.regionId} user=${config.userId} planning=${config.planningDate} order=${config.orderId}",
    )

    val multipartBuilder = MultipartBody.Builder()
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

    coord.capturedAtMs?.let {
      multipartBuilder.addFormDataPart("captured_at", it.toString())
    }

    if (!config.orderId.isNullOrBlank()) {
      multipartBuilder.addFormDataPart("order_id", config.orderId)
    }

    val multipart = multipartBuilder.build()

    val request = Request.Builder()
      .url(config.apiUrl)
      .post(multipart)
      .build()

    return try {
      client.newCall(request).execute().use { response ->
        val body = response.body?.string().orEmpty()
        if (response.isSuccessful) {
          Log.i(
            TAG,
            "API success (blocking) → status=${response.code} is_active=$isActive lat=${coord.latitude} lon=${coord.longitude}",
          )
        } else {
          Log.w(
            TAG,
            "API error (blocking) → status=${response.code} is_active=$isActive body=${body.take(200)}",
          )
        }
        response.isSuccessful
      }
    } catch (e: IOException) {
      Log.e(TAG, "API failed (blocking) → network error is_active=$isActive: ${e.message}", e)
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
