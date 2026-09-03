import CoreLocation
import Foundation
import UIKit

/**
 * Lightweight shift guard — caches current location only.
 * On GPS/location off: is_active=0 + end-region-trip, then pending local wipe.
 * App kill does NOT close the trip — tracking continues in background.
 * Does NOT send periodic is_active=1 updates.
 */
final class ShiftLocationGuardManager: NSObject, CLLocationManagerDelegate {
  static let shared = ShiftLocationGuardManager()

  var onForceClosed: (([String: Any]) -> Void)?

  private let logTag = "ShiftLocationGuard"
  private let locationManager = CLLocationManager()
  private var config: TrackingConfig?
  private var endTripApiUrl: String?
  private(set) var isEnabled = false
  private var isDeactivating = false
  private var terminateObserver: NSObjectProtocol?

  private override init() {
    super.init()
    locationManager.delegate = self
    locationManager.desiredAccuracy = kCLLocationAccuracyHundredMeters
    locationManager.distanceFilter = 25
    locationManager.pausesLocationUpdatesAutomatically = false
    locationManager.allowsBackgroundLocationUpdates = false
    if #available(iOS 11.0, *) {
      locationManager.showsBackgroundLocationIndicator = false
    }
  }

  func enable(
    config: TrackingConfig,
    endTripApiUrl: String?,
    seedLatitude: Double?,
    seedLongitude: Double?
  ) {
    self.config = config
    self.endTripApiUrl = endTripApiUrl
    ShiftGuardSessionStore.save(config, endTripApiUrl: endTripApiUrl)
    isEnabled = true
    isDeactivating = false

    if let lat = seedLatitude, let lon = seedLongitude, lat != 0, lon != 0 {
      ShiftGuardSessionStore.saveLastLocation(
        DriverCoordinate(latitude: lat, longitude: lon, heading: nil, speed: nil, accuracy: nil)
      )
    }

    registerLifecycleObservers()

    guard CLLocationManager.locationServicesEnabled() else {
      print("[\(logTag)] [Shift] ON deferred — location off, waiting (no auto-close on enable)")
      print("[\(logTag)] [Shift] ON guard saved region=\(config.regionId) planning=\(config.planningDate)")
      return
    }

    let status = locationManager.authorizationStatus
    configureBackgroundLocation(for: status)
    if isAuthorized(status) {
      beginLocationCache()
    } else {
      locationManager.requestWhenInUseAuthorization()
    }

    DriverLocLog.i(
      "guard_on",
      "region=\(config.regionId) planning=\(config.planningDate) order=\(config.orderId ?? "-")"
    )
  }

  func disable() {
    removeLifecycleObservers()
    stopLocationCache()
    config = nil
    endTripApiUrl = nil
    isEnabled = false
    isDeactivating = false
    ShiftGuardSessionStore.clear()
    print("[\(logTag)] [Shift] guard disabled (manual)")
  }

  func consumePendingCloseReason() -> String? {
    ShiftGuardSessionStore.consumePendingCloseReason()
  }

  func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
    guard isEnabled, !isDeactivating else { return }
    guard CLLocationManager.locationServicesEnabled() else {
      sendDeactivateAndDisable(reason: "location_off")
      return
    }
    guard let location = locations.last else { return }
    saveLocation(location)
  }

  func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
    print("[\(logTag)] location error → \(error.localizedDescription)")
    if let clError = error as? CLError, clError.code == .denied {
      sendDeactivateAndDisable(reason: "location_off")
    }
  }

  func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
    guard isEnabled, !isDeactivating else { return }

    if !CLLocationManager.locationServicesEnabled() {
      sendDeactivateAndDisable(reason: "location_off")
      return
    }

    let status = manager.authorizationStatus
    configureBackgroundLocation(for: status)

    if isAuthorized(status) {
      beginLocationCache()
    } else if status == .denied || status == .restricted {
      sendDeactivateAndDisable(reason: "location_off")
    }
  }

  private func beginLocationCache() {
    if let location = locationManager.location {
      saveLocation(location)
    }
    locationManager.startUpdatingLocation()
  }

  private func stopLocationCache() {
    locationManager.stopUpdatingLocation()
  }

  private func saveLocation(_ location: CLLocation) {
    let coord = DriverCoordinate(
      latitude: location.coordinate.latitude,
      longitude: location.coordinate.longitude,
      heading: location.course >= 0 ? location.course : nil,
      speed: location.speed >= 0 ? location.speed : nil,
      accuracy: location.horizontalAccuracy >= 0 ? location.horizontalAccuracy : nil
    )
    guard coord.latitude != 0, coord.longitude != 0 else { return }
    ShiftGuardSessionStore.saveLastLocation(coord)
  }

  private func registerLifecycleObservers() {
    // Intentionally empty: app terminate must not end the trip.
    // Location-off is handled via CLLocationManager / authorization callbacks.
    removeLifecycleObservers()
  }

  private func removeLifecycleObservers() {
    if let terminateObserver {
      NotificationCenter.default.removeObserver(terminateObserver)
      self.terminateObserver = nil
    }
  }

  private func sendDeactivateAndDisable(reason: String) {
    guard !isDeactivating else { return }
    isDeactivating = true

    let activeConfig = config ?? ShiftGuardSessionStore.load()
    let lastCoord = ShiftGuardSessionStore.getLastLocation()
    let endUrl = endTripApiUrl ?? ShiftGuardSessionStore.getEndTripApiUrl()

    DriverLocLog.i(
      "trip_close",
      "phase=start reason=\(reason) region=\(activeConfig?.regionId ?? "-") \(DriverLocLog.coord(lat: lastCoord?.latitude, lon: lastCoord?.longitude))"
    )

    stopLocationCache()
    removeLifecycleObservers()
    isEnabled = false
    config = nil
    endTripApiUrl = nil

    ShiftGuardSessionStore.markPendingClose(reason: reason)
    ShiftGuardSessionStore.clear()

    guard let activeConfig else {
      isDeactivating = false
      print("[\(logTag)] [Shift] CLOSE aborted — missing config")
      return
    }

    let semaphore = DispatchSemaphore(value: 0)
    DispatchQueue.global(qos: .userInitiated).async {
      if let lastCoord, lastCoord.latitude != 0, lastCoord.longitude != 0 {
        DriverLocLog.i(
          "api",
          "is_active=0 source=shift_guard \(DriverLocLog.coord(lat: lastCoord.latitude, lon: lastCoord.longitude))"
        )
        let ok = LocationApiClient.sendLocationUpdateBlocking(
          config: activeConfig,
          coord: lastCoord,
          isActive: 0
        )
        DriverLocLog.i("api", "ok=\(ok ? 1 : 0) is_active=0 source=shift_guard")
      } else {
        DriverLocLog.w("api", "ok=false is_active=0 source=shift_guard reason=no_location")
      }

      let tripOk = Self.sendEndRegionTripBlocking(config: activeConfig, endTripApiUrl: endUrl)
      DriverLocLog.i("end_trip", "ok=\(tripOk ? 1 : 0) reason=\(reason)")
      DriverLocLog.i("trip_close", "phase=finished reason=\(reason) ok=true")
      semaphore.signal()
    }
    _ = semaphore.wait(timeout: .now() + 35)

    onForceClosed?([
      "reason": reason,
      "regionId": activeConfig.regionId,
      "planningDate": activeConfig.planningDate,
    ])
    isDeactivating = false
  }

  private static func sendEndRegionTripBlocking(config: TrackingConfig, endTripApiUrl: String?) -> Bool {
    guard let endTripApiUrl, let url = URL(string: endTripApiUrl) else {
      print("[ShiftLocationGuard] [Shift] CLOSE end-region-trip skipped — missing url")
      return false
    }

    let formatter = DateFormatter()
    formatter.locale = Locale(identifier: "en_US_POSIX")
    formatter.dateFormat = "yyyy-MM-dd HH:mm:ss"
    let endedAt = formatter.string(from: Date())

    print(
      "[ShiftLocationGuard] [Shift] CLOSE end-region-trip request region=\(config.regionId) " +
        "planning=\(config.planningDate) ended_at=\(endedAt)"
    )

    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    let boundary = "Boundary-\(UUID().uuidString)"
    request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")

    var body = Data()
    let fields: [String: String] = [
      "token": config.token,
      "role": config.role,
      "planning_date": config.planningDate,
      "relaties_id": config.relatiesId,
      "user_id": config.userId,
      "region_id": config.regionId,
      "ended_at": endedAt,
    ]
    for (key, value) in fields {
      body.append("--\(boundary)\r\n".data(using: .utf8)!)
      body.append("Content-Disposition: form-data; name=\"\(key)\"\r\n\r\n".data(using: .utf8)!)
      body.append("\(value)\r\n".data(using: .utf8)!)
    }
    body.append("--\(boundary)--\r\n".data(using: .utf8)!)
    request.httpBody = body

    let semaphore = DispatchSemaphore(value: 0)
    var success = false
    URLSession.shared.dataTask(with: request) { _, response, _ in
      let code = (response as? HTTPURLResponse)?.statusCode ?? 0
      success = (200...299).contains(code)
      semaphore.signal()
    }.resume()
    _ = semaphore.wait(timeout: .now() + 30)
    return success
  }

  private func isAuthorized(_ status: CLAuthorizationStatus) -> Bool {
    status == .authorizedAlways || status == .authorizedWhenInUse
  }

  private func configureBackgroundLocation(for status: CLAuthorizationStatus) {
    let allowBackground = status == .authorizedAlways
    locationManager.allowsBackgroundLocationUpdates = allowBackground
    if #available(iOS 11.0, *) {
      locationManager.showsBackgroundLocationIndicator = allowBackground
    }
  }
}

enum ShiftGuardSessionStore {
  private static let defaults = UserDefaults(suiteName: "expo_shift_location_guard") ?? .standard

  static func save(_ config: TrackingConfig, endTripApiUrl: String?) {
    defaults.set(true, forKey: "enabled")
    defaults.set(config.apiUrl, forKey: "api_url")
    defaults.set(endTripApiUrl, forKey: "end_trip_api_url")
    defaults.set(config.token, forKey: "token")
    defaults.set(config.role, forKey: "role")
    defaults.set(config.planningDate, forKey: "planning_date")
    defaults.set(config.relatiesId, forKey: "relaties_id")
    defaults.set(config.userId, forKey: "user_id")
    defaults.set(config.regionId, forKey: "region_id")
    defaults.set(config.notificationTitle, forKey: "notification_title")
    defaults.set(config.notificationBody, forKey: "notification_body")
    if let orderId = config.orderId, !orderId.isEmpty {
      defaults.set(orderId, forKey: "order_id")
    } else {
      defaults.removeObject(forKey: "order_id")
    }
    defaults.removeObject(forKey: "pending_close_reason")
  }

  static func load() -> TrackingConfig? {
    guard defaults.bool(forKey: "enabled") else { return nil }
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
      apiIntervalSeconds: 30,
      notificationTitle: defaults.string(forKey: "notification_title") ?? "ERP TMS Driver",
      notificationBody: defaults.string(forKey: "notification_body") ?? "Shift session active",
      orderId: defaults.string(forKey: "order_id")
    )
  }

  static func getEndTripApiUrl() -> String? {
    defaults.string(forKey: "end_trip_api_url")
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
    let heading = defaults.double(forKey: "last_heading")
    let speed = defaults.double(forKey: "last_speed")
    let accuracy = defaults.double(forKey: "last_accuracy")
    return DriverCoordinate(
      latitude: lat,
      longitude: lon,
      heading: heading == 0 ? nil : heading,
      speed: speed == 0 ? nil : speed,
      accuracy: accuracy == 0 ? nil : accuracy
    )
  }

  static func markPendingClose(reason: String) {
    defaults.set(reason, forKey: "pending_close_reason")
    defaults.set(false, forKey: "enabled")
    print("[ShiftLocationGuard] [Shift] CLOSE pending local wipe reason=\(reason)")
  }

  static func consumePendingCloseReason() -> String? {
    guard let reason = defaults.string(forKey: "pending_close_reason") else { return nil }
    defaults.removeObject(forKey: "pending_close_reason")
    print("[ShiftLocationGuard] [Shift] CLOSE pending consumed reason=\(reason)")
    return reason
  }

  static func clear() {
    let pending = defaults.string(forKey: "pending_close_reason")
    let keys = [
      "enabled", "api_url", "end_trip_api_url", "token", "role", "planning_date", "relaties_id",
      "user_id", "region_id", "notification_title", "notification_body",
      "last_lat", "last_lon", "last_heading", "last_speed", "last_accuracy", "pending_close_reason",
    ]
    keys.forEach { defaults.removeObject(forKey: $0) }
    if let pending {
      defaults.set(pending, forKey: "pending_close_reason")
    }
  }
}
