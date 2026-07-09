import Foundation
import CoreLocation

struct TrackingConfig {
  let apiUrl: String
  let token: String
  let role: String
  let planningDate: String
  let relatiesId: String
  let userId: String
  let regionId: String
  let distanceThresholdMeters: Double
  let notificationTitle: String
  let notificationBody: String

  static func fromDictionary(_ dict: [String: Any]) throws -> TrackingConfig {
    guard
      let apiUrl = dict["apiUrl"] as? String,
      let token = dict["token"] as? String,
      let role = dict["role"] as? String,
      let planningDate = dict["planningDate"] as? String,
      let relatiesId = dict["relatiesId"] as? String,
      let userId = dict["userId"] as? String,
      let regionId = dict["regionId"] as? String
    else {
      throw NSError(domain: "ExpoDriverLocation", code: 1, userInfo: [NSLocalizedDescriptionKey: "Invalid tracking config"])
    }

    let distance = (dict["distanceThresholdMeters"] as? NSNumber)?.doubleValue ?? 50
    let title = dict["notificationTitle"] as? String ?? "ERP TMS Driver"
    let body = dict["notificationBody"] as? String ?? "Location tracking is active"

    return TrackingConfig(
      apiUrl: apiUrl,
      token: token,
      role: role,
      planningDate: planningDate,
      relatiesId: relatiesId,
      userId: userId,
      regionId: regionId,
      distanceThresholdMeters: distance,
      notificationTitle: title,
      notificationBody: body
    )
  }
}

struct DriverCoordinate {
  let latitude: Double
  let longitude: Double
  let heading: Double?
  let speed: Double?
  let accuracy: Double?
}

enum TrackingSessionStore {
  private static let defaults = UserDefaults(suiteName: "expo_driver_location") ?? .standard

  static func save(_ config: TrackingConfig) {
    defaults.set(config.apiUrl, forKey: "api_url")
    defaults.set(config.token, forKey: "token")
    defaults.set(config.role, forKey: "role")
    defaults.set(config.planningDate, forKey: "planning_date")
    defaults.set(config.relatiesId, forKey: "relaties_id")
    defaults.set(config.userId, forKey: "user_id")
    defaults.set(config.regionId, forKey: "region_id")
    defaults.set(config.distanceThresholdMeters, forKey: "distance_threshold")
    defaults.set(config.notificationTitle, forKey: "notification_title")
    defaults.set(config.notificationBody, forKey: "notification_body")
  }

  static func load() -> TrackingConfig? {
    guard
      let apiUrl = defaults.string(forKey: "api_url"),
      let token = defaults.string(forKey: "token"),
      let role = defaults.string(forKey: "role"),
      let planningDate = defaults.string(forKey: "planning_date"),
      let relatiesId = defaults.string(forKey: "relaties_id"),
      let userId = defaults.string(forKey: "user_id"),
      let regionId = defaults.string(forKey: "region_id")
    else {
      return nil
    }

    return TrackingConfig(
      apiUrl: apiUrl,
      token: token,
      role: role,
      planningDate: planningDate,
      relatiesId: relatiesId,
      userId: userId,
      regionId: regionId,
      distanceThresholdMeters: defaults.double(forKey: "distance_threshold").nonZeroOr,
      notificationTitle: defaults.string(forKey: "notification_title") ?? "ERP TMS Driver",
      notificationBody: defaults.string(forKey: "notification_body") ?? "Location tracking is active"
    )
  }

  static func saveLastLocation(_ coord: DriverCoordinate) {
    defaults.set(coord.latitude, forKey: "last_lat")
    defaults.set(coord.longitude, forKey: "last_lon")
    defaults.set(coord.heading ?? 0, forKey: "last_heading")
    defaults.set(coord.speed ?? 0, forKey: "last_speed")
    defaults.set(coord.accuracy ?? 0, forKey: "last_accuracy")
  }

  static func getLastLocation() -> DriverCoordinate? {
    guard defaults.object(forKey: "last_lat") != nil else { return nil }
    let lat = defaults.double(forKey: "last_lat")
    let lon = defaults.double(forKey: "last_lon")
    if lat == 0 && lon == 0 { return nil }

    return DriverCoordinate(
      latitude: lat,
      longitude: lon,
      heading: defaults.double(forKey: "last_heading").nonZeroOrNil,
      speed: defaults.double(forKey: "last_speed").nonZeroOrNil,
      accuracy: defaults.double(forKey: "last_accuracy").nonZeroOrNil
    )
  }

  static func getLastSentCoord() -> (Double, Double)? {
    guard defaults.object(forKey: "last_sent_lat") != nil else { return nil }
    return (defaults.double(forKey: "last_sent_lat"), defaults.double(forKey: "last_sent_lon"))
  }

  static func setLastSentCoord(latitude: Double, longitude: Double) {
    defaults.set(latitude, forKey: "last_sent_lat")
    defaults.set(longitude, forKey: "last_sent_lon")
  }

  static func clearLastSentCoord() {
    defaults.removeObject(forKey: "last_sent_lat")
    defaults.removeObject(forKey: "last_sent_lon")
  }
}

private extension Double {
  var nonZeroOr: Double { self == 0 ? 50 : self }
  var nonZeroOrNil: Double? { self == 0 ? nil : self }
}

enum LocationMath {
  static func haversineDistance(lat1: Double, lon1: Double, lat2: Double, lon2: Double) -> Double {
    let earthRadius = 6_371_000.0
    let dLat = (lat2 - lat1) * .pi / 180
    let dLon = (lon2 - lon1) * .pi / 180
    let a = sin(dLat / 2) * sin(dLat / 2) +
      cos(lat1 * .pi / 180) * cos(lat2 * .pi / 180) * sin(dLon / 2) * sin(dLon / 2)
    let c = 2 * atan2(sqrt(a), sqrt(1 - a))
    return earthRadius * c
  }
}

enum LocationApiClient {
  private static func formatOptional(_ value: Double?) -> String {
    guard let value else {
      return ""
    }
    return String(value)
  }

  static func sendLocationUpdate(config: TrackingConfig, coord: DriverCoordinate, isActive: Int, completion: ((Bool) -> Void)? = nil) {
    guard coord.latitude != 0, coord.longitude != 0 else {
      completion?(false)
      return
    }

    guard let url = URL(string: config.apiUrl) else {
      completion?(false)
      return
    }

    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    let boundary = "Boundary-\(UUID().uuidString)"
    request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
    request.httpBody = buildMultipartBody(
      boundary: boundary,
      fields: [
        "token": config.token,
        "role": config.role,
        "planning_date": config.planningDate,
        "relaties_id": config.relatiesId,
        "user_id": config.userId,
        "region_id": config.regionId,
        "latitude": String(coord.latitude),
        "longitude": String(coord.longitude),
        "heading": formatOptional(coord.heading),
        "accuracy": formatOptional(coord.accuracy),
        "speed": formatOptional(coord.speed),
        "is_active": "\(isActive)",
      ]
    )

    URLSession.shared.dataTask(with: request) { _, response, _ in
      let statusCode = (response as? HTTPURLResponse)?.statusCode ?? 0
      let success = (200...299).contains(statusCode)
      completion?(success)
    }.resume()
  }

  static func sendLocationUpdateBlocking(config: TrackingConfig, coord: DriverCoordinate, isActive: Int) -> Bool {
    let semaphore = DispatchSemaphore(value: 0)
    var success = false
    sendLocationUpdate(config: config, coord: coord, isActive: isActive) { result in
      success = result
      semaphore.signal()
    }
    _ = semaphore.wait(timeout: .now() + 30)
    return success
  }

  private static func buildMultipartBody(boundary: String, fields: [String: String]) -> Data {
    var body = Data()
    for (key, value) in fields {
      body.append("--\(boundary)\r\n".data(using: .utf8)!)
      body.append("Content-Disposition: form-data; name=\"\(key)\"\r\n\r\n".data(using: .utf8)!)
      body.append("\(value)\r\n".data(using: .utf8)!)
    }
    body.append("--\(boundary)--\r\n".data(using: .utf8)!)
    return body
  }
}
