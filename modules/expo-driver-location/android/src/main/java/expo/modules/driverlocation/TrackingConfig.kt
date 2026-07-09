package expo.modules.driverlocation

data class TrackingConfig(
  val apiUrl: String,
  val token: String,
  val role: String,
  val planningDate: String,
  val relatiesId: String,
  val userId: String,
  val regionId: String,
  val distanceThresholdMeters: Double,
  val notificationTitle: String,
  val notificationBody: String,
) {
  companion object {
    fun fromMap(map: Map<String, Any?>): TrackingConfig {
      return TrackingConfig(
        apiUrl = map["apiUrl"] as? String ?: throw IllegalArgumentException("apiUrl is required"),
        token = map["token"] as? String ?: throw IllegalArgumentException("token is required"),
        role = map["role"] as? String ?: throw IllegalArgumentException("role is required"),
        planningDate = map["planningDate"] as? String ?: throw IllegalArgumentException("planningDate is required"),
        relatiesId = map["relatiesId"] as? String ?: throw IllegalArgumentException("relatiesId is required"),
        userId = map["userId"] as? String ?: throw IllegalArgumentException("userId is required"),
        regionId = map["regionId"] as? String ?: throw IllegalArgumentException("regionId is required"),
        distanceThresholdMeters = (map["distanceThresholdMeters"] as? Number)?.toDouble() ?: 50.0,
        notificationTitle = map["notificationTitle"] as? String ?: "ERP TMS Driver",
        notificationBody = map["notificationBody"] as? String ?: "Location tracking is active",
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
