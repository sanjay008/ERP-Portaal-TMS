import Foundation
import CoreLocation
import UIKit

struct TrackingConfig {
  let apiUrl: String
  let token: String
  let role: String
  let planningDate: String
  let relatiesId: String
  let userId: String
  let regionId: String
  let apiIntervalSeconds: Int
  let notificationTitle: String
  let notificationBody: String
  let orderId: String?

  static func fromDictionary(_ dict: [String: Any]) throws -> TrackingConfig {
    guard
      let apiUrl = stringValue(dict, key: "apiUrl"),
      let token = stringValue(dict, key: "token"),
      let role = stringValue(dict, key: "role"),
      let planningDate = stringValue(dict, key: "planningDate"),
      let relatiesId = stringValue(dict, key: "relatiesId"),
      let userId = stringValue(dict, key: "userId"),
      let regionId = stringValue(dict, key: "regionId")
    else {
      throw NSError(domain: "ExpoDriverLocation", code: 1, userInfo: [NSLocalizedDescriptionKey: "Invalid tracking config"])
    }

    let interval: Int
    if let seconds = dict["apiIntervalSeconds"] as? NSNumber {
      interval = max(10, seconds.intValue)
    } else if let legacy = dict["distanceThresholdMeters"] as? NSNumber {
      interval = max(10, legacy.intValue)
    } else {
      interval = 30
    }

    let title = dict["notificationTitle"] as? String ?? "ERP TMS Driver"
    let body = dict["notificationBody"] as? String ?? "Location tracking is active"
    let orderId = stringValue(dict, key: "orderId")

    return TrackingConfig(
      apiUrl: apiUrl,
      token: token,
      role: role,
      planningDate: planningDate,
      relatiesId: relatiesId,
      userId: userId,
      regionId: regionId,
      apiIntervalSeconds: interval,
      notificationTitle: title,
      notificationBody: body,
      orderId: orderId
    )
  }

  private static func stringValue(_ dict: [String: Any], key: String) -> String? {
    if let value = dict[key] as? String {
      let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
      return trimmed.isEmpty ? nil : trimmed
    }
    if let value = dict[key] as? NSNumber {
      return value.stringValue
    }
    if let value = dict[key] as? Int {
      return String(value)
    }
    if let value = dict[key] as? Double {
      return String(value)
    }
    return nil
  }
}

struct DriverCoordinate {
  let latitude: Double
  let longitude: Double
  let heading: Double?
  let speed: Double?
  let accuracy: Double?
  /// Epoch ms when this fix was published (15-min tick).
  let capturedAtMs: Double?

  init(
    latitude: Double,
    longitude: Double,
    heading: Double?,
    speed: Double?,
    accuracy: Double?,
    capturedAtMs: Double? = nil
  ) {
    self.latitude = latitude
    self.longitude = longitude
    self.heading = heading
    self.speed = speed
    self.accuracy = accuracy
    self.capturedAtMs = capturedAtMs
  }
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
    defaults.set(config.apiIntervalSeconds, forKey: "api_interval_seconds")
    defaults.set(config.notificationTitle, forKey: "notification_title")
    defaults.set(config.notificationBody, forKey: "notification_body")
    if let orderId = config.orderId, !orderId.isEmpty {
      defaults.set(orderId, forKey: "order_id")
    } else {
      defaults.removeObject(forKey: "order_id")
    }
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
      apiIntervalSeconds: {
        let stored = defaults.integer(forKey: "api_interval_seconds")
        if stored > 0 {
          return max(10, stored)
        }
        let legacy = defaults.double(forKey: "distance_threshold")
        return legacy > 0 ? max(10, Int(legacy)) : 30
      }(),
      notificationTitle: defaults.string(forKey: "notification_title") ?? "ERP TMS Driver",
      notificationBody: defaults.string(forKey: "notification_body") ?? "Location tracking is active",
      orderId: defaults.string(forKey: "order_id")
    )
  }

  static func saveWarmLocation(_ coord: DriverCoordinate) {
    defaults.set(coord.latitude, forKey: "warm_lat")
    defaults.set(coord.longitude, forKey: "warm_lon")
    defaults.set(coord.heading ?? 0, forKey: "warm_heading")
    defaults.set(coord.speed ?? 0, forKey: "warm_speed")
    defaults.set(coord.accuracy ?? 0, forKey: "warm_accuracy")
  }

  static func getWarmLocation() -> DriverCoordinate? {
    guard defaults.object(forKey: "warm_lat") != nil else { return nil }
    let lat = defaults.double(forKey: "warm_lat")
    let lon = defaults.double(forKey: "warm_lon")
    if lat == 0 && lon == 0 { return nil }
    return DriverCoordinate(
      latitude: lat,
      longitude: lon,
      heading: defaults.double(forKey: "warm_heading").nonZeroOrNil,
      speed: defaults.double(forKey: "warm_speed").nonZeroOrNil,
      accuracy: defaults.double(forKey: "warm_accuracy").nonZeroOrNil
    )
  }

  static func savePublishedLocation(_ coord: DriverCoordinate) {
    defaults.set(coord.latitude, forKey: "last_lat")
    defaults.set(coord.longitude, forKey: "last_lon")
    defaults.set(coord.heading ?? 0, forKey: "last_heading")
    defaults.set(coord.speed ?? 0, forKey: "last_speed")
    defaults.set(coord.accuracy ?? 0, forKey: "last_accuracy")
    defaults.set(coord.capturedAtMs ?? (Date().timeIntervalSince1970 * 1000), forKey: "last_captured_at")
  }

  static func saveLastLocation(_ coord: DriverCoordinate) {
    savePublishedLocation(coord)
  }

  static func getLastLocation() -> DriverCoordinate? {
    guard defaults.object(forKey: "last_lat") != nil else { return nil }
    let lat = defaults.double(forKey: "last_lat")
    let lon = defaults.double(forKey: "last_lon")
    if lat == 0 && lon == 0 { return nil }

    let capturedAt = defaults.object(forKey: "last_captured_at") != nil
      ? defaults.double(forKey: "last_captured_at")
      : nil

    return DriverCoordinate(
      latitude: lat,
      longitude: lon,
      heading: defaults.double(forKey: "last_heading").nonZeroOrNil,
      speed: defaults.double(forKey: "last_speed").nonZeroOrNil,
      accuracy: defaults.double(forKey: "last_accuracy").nonZeroOrNil,
      capturedAtMs: capturedAt
    )
  }

  static func getLocationForApiOrDeactivate() -> DriverCoordinate? {
    getLastLocation() ?? getWarmLocation()
  }

  static func clearLastSentCoord() {
    defaults.removeObject(forKey: "last_sent_lat")
    defaults.removeObject(forKey: "last_sent_lon")
  }
}

private extension Double {
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
  private static let logTag = "ExpoDriverLocation"

  private static func formatOptional(_ value: Double?) -> String {
    guard let value else {
      return ""
    }
    return String(value)
  }

  static func sendLocationUpdate(config: TrackingConfig, coord: DriverCoordinate, isActive: Int, completion: ((Bool) -> Void)? = nil) {
    guard coord.latitude != 0, coord.longitude != 0 else {
      DriverLocLog.w("api", "ok=false reason=invalid_coords is_active=\(isActive)")
      completion?(false)
      return
    }

    guard let url = URL(string: config.apiUrl) else {
      DriverLocLog.w("api", "ok=false reason=invalid_url is_active=\(isActive)")
      completion?(false)
      return
    }

    DriverLocLog.i(
      "api",
      "phase=request is_active=\(isActive) \(DriverLocLog.coord(lat: coord.latitude, lon: coord.longitude, accuracy: coord.accuracy, capturedAtMs: coord.capturedAtMs)) region=\(config.regionId) planning=\(config.planningDate) order=\(config.orderId ?? "-") user=\(config.userId)"
    )

    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    let boundary = "Boundary-\(UUID().uuidString)"
    request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
    var fields: [String: String] = [
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
    if let orderId = config.orderId, !orderId.isEmpty {
      fields["order_id"] = orderId
    }
    if let capturedAt = coord.capturedAtMs {
      fields["captured_at"] = String(Int64(capturedAt))
    }
    request.httpBody = buildMultipartBody(
      boundary: boundary,
      fields: fields
    )

    var backgroundTaskId: UIBackgroundTaskIdentifier = .invalid
    if Thread.isMainThread {
      backgroundTaskId = UIApplication.shared.beginBackgroundTask(withName: "ExpoDriverLocationAPI") {
        if backgroundTaskId != .invalid {
          UIApplication.shared.endBackgroundTask(backgroundTaskId)
          backgroundTaskId = .invalid
        }
      }
    }

    URLSession.shared.dataTask(with: request) { data, response, error in
      defer {
        if backgroundTaskId != .invalid {
          DispatchQueue.main.async {
            UIApplication.shared.endBackgroundTask(backgroundTaskId)
          }
        }
      }

      if let error {
        DriverLocLog.e("api", "ok=false phase=network is_active=\(isActive) err=\(error.localizedDescription)")
        completion?(false)
        return
      }

      let statusCode = (response as? HTTPURLResponse)?.statusCode ?? 0
      let success = (200...299).contains(statusCode)
      if success {
        DriverLocLog.i(
          "api",
          "ok=true status=\(statusCode) is_active=\(isActive) \(DriverLocLog.coord(lat: coord.latitude, lon: coord.longitude, accuracy: coord.accuracy, capturedAtMs: coord.capturedAtMs)) region=\(config.regionId) order=\(config.orderId ?? "-")"
        )
      } else {
        let body = data.flatMap { String(data: $0, encoding: .utf8) } ?? ""
        DriverLocLog.w("api", "ok=false status=\(statusCode) is_active=\(isActive) body=\(body.prefix(120))")
      }
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
