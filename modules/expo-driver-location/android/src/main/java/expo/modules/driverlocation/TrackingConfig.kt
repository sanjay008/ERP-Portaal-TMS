package expo.modules.driverlocation

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
)
