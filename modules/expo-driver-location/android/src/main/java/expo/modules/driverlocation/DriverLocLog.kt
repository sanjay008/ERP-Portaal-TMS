package expo.modules.driverlocation

import android.util.Log

/**
 * Single Logcat tag for the whole driver-location system.
 * Filter after app kill: `adb logcat -s DriverLoc`
 */
object DriverLocLog {
  const val TAG = "DriverLoc"

  fun i(event: String, details: String = "") {
    Log.i(TAG, format(event, details))
  }

  fun w(event: String, details: String = "") {
    Log.w(TAG, format(event, details))
  }

  fun e(event: String, details: String = "", throwable: Throwable? = null) {
    if (throwable != null) {
      Log.e(TAG, format(event, details), throwable)
    } else {
      Log.e(TAG, format(event, details))
    }
  }

  private fun format(event: String, details: String): String {
    return if (details.isBlank()) {
      "event=$event"
    } else {
      "event=$event | $details"
    }
  }

  fun coord(
    lat: Double?,
    lon: Double?,
    accuracy: Double? = null,
    capturedAtMs: Double? = null,
  ): String {
    val parts = mutableListOf(
      "lat=${lat ?: "-"}",
      "lon=${lon ?: "-"}",
    )
    if (accuracy != null) {
      parts.add("accuracy=$accuracy")
    }
    if (capturedAtMs != null && capturedAtMs > 0) {
      parts.add("capturedAt=${capturedAtMs.toLong()}")
      parts.add("ageMs=${(System.currentTimeMillis() - capturedAtMs.toLong()).coerceAtLeast(0)}")
    }
    return parts.joinToString(" ")
  }
}
