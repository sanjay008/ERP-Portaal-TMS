package expo.modules.driverlocation

import okhttp3.Call
import okhttp3.Callback
import okhttp3.MultipartBody
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import java.io.IOException
import java.util.concurrent.TimeUnit

object LocationApiClient {
  private val client = OkHttpClient.Builder()
    .connectTimeout(30, TimeUnit.SECONDS)
    .readTimeout(30, TimeUnit.SECONDS)
    .writeTimeout(30, TimeUnit.SECONDS)
    .build()

  private fun buildMultipart(config: TrackingConfig, coord: DriverCoordinate, isActive: Int): MultipartBody? {
    val forMeta = if (coord.source.isNullOrBlank()) {
      coord.withSource("published_cache")
    } else {
      coord
    }
    // Must be the GPS fix time — never wall-clock now.
    val capturedAt = forMeta.capturedAtMs?.toLong()?.takeIf { it > 0 } ?: run {
      DriverLocLog.w("api", "ok=false reason=captured_at_missing is_active=$isActive")
      return null
    }

    val builder = MultipartBody.Builder()
      .setType(MultipartBody.FORM)
      .addFormDataPart("token", config.token)
      .addFormDataPart("role", config.role)
      .addFormDataPart("planning_date", config.planningDate)
      .addFormDataPart("relaties_id", config.relatiesId)
      .addFormDataPart("user_id", config.userId)
      .addFormDataPart("region_id", config.regionId)
      .addFormDataPart("latitude", forMeta.latitude.toString())
      .addFormDataPart("longitude", forMeta.longitude.toString())
      .addFormDataPart("heading", forMeta.heading?.toString() ?: "")
      .addFormDataPart("accuracy", forMeta.accuracy?.toString() ?: "")
      .addFormDataPart("speed", forMeta.speed?.toString() ?: "")
      .addFormDataPart("is_active", isActive.toString())
      .addFormDataPart("captured_at", capturedAt.toString())
      .addFormDataPart("location_meta", forMeta.toLocationMetaJson())

    if (!config.orderId.isNullOrBlank()) {
      builder.addFormDataPart("order_id", config.orderId)
    }
    return builder.build()
  }

  fun sendLocationUpdate(
    config: TrackingConfig,
    coord: DriverCoordinate,
    isActive: Int,
    onComplete: ((Boolean) -> Unit)? = null,
  ) {
    if (coord.latitude == 0.0 || coord.longitude == 0.0) {
      DriverLocLog.w("api", "ok=false reason=invalid_coords is_active=$isActive")
      onComplete?.invoke(false)
      return
    }

    // is_active=1: never POST a stale published_cache without a fresher fix.
    if (isActive == 1 && coord.isStale()) {
      DriverLocLog.w(
        "api",
        "ok=false reason=stale_published_cache ageMs=${coord.ageMs()} is_active=1",
      )
      onComplete?.invoke(false)
      return
    }

    DriverLocLog.i(
      "api",
      "phase=request is_active=$isActive ${DriverLocLog.coord(coord.latitude, coord.longitude, coord.accuracy, coord.capturedAtMs)} region=${config.regionId} planning=${config.planningDate} order=${config.orderId ?: "-"} user=${config.userId}",
    )

    val multipart = buildMultipart(config, coord, isActive) ?: run {
      onComplete?.invoke(false)
      return
    }
    val request = Request.Builder()
      .url(config.apiUrl)
      .post(multipart)
      .build()

    client.newCall(request).enqueue(object : Callback {
      override fun onFailure(call: Call, e: IOException) {
        DriverLocLog.e("api", "ok=false phase=network is_active=$isActive err=${e.message}", e)
        onComplete?.invoke(false)
      }

      override fun onResponse(call: Call, response: Response) {
        response.use {
          val body = it.body?.string().orEmpty()
          if (it.isSuccessful) {
            DriverLocLog.i(
              "api",
              "ok=true status=${it.code} is_active=$isActive ${DriverLocLog.coord(coord.latitude, coord.longitude, coord.accuracy, coord.capturedAtMs)} region=${config.regionId} order=${config.orderId ?: "-"}",
            )
          } else {
            DriverLocLog.w(
              "api",
              "ok=false status=${it.code} is_active=$isActive body=${body.take(120)}",
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
      DriverLocLog.w("api", "ok=false reason=invalid_coords blocking=1 is_active=$isActive")
      return false
    }

    // Deactivate (is_active=0) may use stale coords; active updates must not.
    if (isActive == 1 && coord.isStale()) {
      DriverLocLog.w(
        "api",
        "ok=false reason=stale_published_cache ageMs=${coord.ageMs()} blocking=1 is_active=1",
      )
      return false
    }

    DriverLocLog.i(
      "api",
      "phase=request blocking=1 is_active=$isActive ${DriverLocLog.coord(coord.latitude, coord.longitude, coord.accuracy, coord.capturedAtMs)} region=${config.regionId} planning=${config.planningDate} order=${config.orderId ?: "-"}",
    )

    val multipart = buildMultipart(config, coord, isActive) ?: return false
    val request = Request.Builder()
      .url(config.apiUrl)
      .post(multipart)
      .build()

    return try {
      client.newCall(request).execute().use { response ->
        val body = response.body?.string().orEmpty()
        if (response.isSuccessful) {
          DriverLocLog.i(
            "api",
            "ok=true blocking=1 status=${response.code} is_active=$isActive ${DriverLocLog.coord(coord.latitude, coord.longitude, coord.accuracy, coord.capturedAtMs)} region=${config.regionId} order=${config.orderId ?: "-"}",
          )
        } else {
          DriverLocLog.w(
            "api",
            "ok=false blocking=1 status=${response.code} is_active=$isActive body=${body.take(120)}",
          )
        }
        response.isSuccessful
      }
    } catch (e: IOException) {
      DriverLocLog.e("api", "ok=false blocking=1 phase=network is_active=$isActive err=${e.message}", e)
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
