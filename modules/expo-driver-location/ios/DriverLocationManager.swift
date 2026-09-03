import CoreLocation
import Foundation

final class DriverLocationManager: NSObject, CLLocationManagerDelegate {
  static let shared = DriverLocationManager()

  private let logTag = "ExpoDriverLocation"
  private let locationManager = CLLocationManager()
  private var config: TrackingConfig?
  private var apiTimer: Timer?
  private(set) var isTracking = false
  private var userStopped = false
  private var gpsLocationDisabled = false
  private var pendingPublishCompletion: ((CLLocation?) -> Void)?
  private var publishInFlight = false

  private let maxLocationAgeSeconds: TimeInterval = 60
  private let maxAccuracyMeters: CLLocationAccuracy = 100

  private override init() {
    super.init()
    locationManager.delegate = self
    locationManager.desiredAccuracy = kCLLocationAccuracyHundredMeters
    locationManager.distanceFilter = 10
    locationManager.pausesLocationUpdatesAutomatically = false
    locationManager.allowsBackgroundLocationUpdates = false
    if #available(iOS 11.0, *) {
      locationManager.showsBackgroundLocationIndicator = false
    }
  }

  func startTracking(config: TrackingConfig) throws {
    guard CLLocationManager.locationServicesEnabled() else {
      throw NSError(domain: "ExpoDriverLocation", code: 2, userInfo: [NSLocalizedDescriptionKey: "Location services disabled"])
    }

    userStopped = false
    gpsLocationDisabled = false
    self.config = config
    TrackingSessionStore.save(config)

    if isTracking {
      // Keep existing timer — only refresh config (avoids interval double-start).
      return
    }

    let status = locationManager.authorizationStatus
    configureBackgroundLocation(for: status)

    if isAuthorized(status) {
      beginLocationUpdates(config: config)
      return
    }

    locationManager.requestAlwaysAuthorization()
  }

  func stopTracking(sendDeactivate: Bool) {
    userStopped = true
    gpsLocationDisabled = false
    pendingPublishCompletion = nil
    publishInFlight = false
    sendDeactivateIfNeeded(sendDeactivate)
    stopLocationAndTimer()
    config = nil
  }

  func updateNotificationLabels(title: String, body: String) {
    // iOS does not require a persistent notification for background location.
  }

  func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
    guard !userStopped, !gpsLocationDisabled, (config ?? TrackingSessionStore.load()) != nil else { return }
    guard CLLocationManager.locationServicesEnabled() else {
      suspendTrackingForDisabledLocation(sendDeactivate: true)
      return
    }

    guard let location = locations.last else { return }

    if let completion = pendingPublishCompletion {
      pendingPublishCompletion = nil
      completion(location)
      return
    }

    // Continuous GPS only warms — does not overwrite published 15-min cache.
    saveWarmLocation(location)
  }

  func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
    print("[\(logTag)] location error → \(error.localizedDescription)")
    if let completion = pendingPublishCompletion {
      pendingPublishCompletion = nil
      completion(nil)
    }
    if let clError = error as? CLError, clError.code == .denied {
      suspendTrackingForDisabledLocation(sendDeactivate: true)
    }
  }

  func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
    if !CLLocationManager.locationServicesEnabled() {
      suspendTrackingForDisabledLocation(sendDeactivate: true)
      return
    }

    if userStopped {
      return
    }

    if gpsLocationDisabled {
      gpsLocationDisabled = false
      print("[\(logTag)] GPS enabled again — waiting for app to resume tracking")
      return
    }

    let status = manager.authorizationStatus
    configureBackgroundLocation(for: status)

    guard isAuthorized(status), let config = config ?? TrackingSessionStore.load() else {
      return
    }

    if !isTracking {
      beginLocationUpdates(config: config)
    }
  }

  private func beginLocationUpdates(config: TrackingConfig) {
    guard !isTracking else { return }

    locationManager.startUpdatingLocation()
    isTracking = true
    restartApiInterval(config: config)
    publishFreshAndSend(config: config)
    DriverLocLog.i(
      "tracking_on",
      "intervalSec=\(config.apiIntervalSeconds) region=\(config.regionId) planning=\(config.planningDate) order=\(config.orderId ?? "-") user=\(config.userId)"
    )
  }

  private func restartApiInterval(config: TrackingConfig) {
    stopApiInterval()
    let interval = TimeInterval(max(10, config.apiIntervalSeconds))
    let timer = Timer(timeInterval: interval, repeats: true) { [weak self] _ in
      self?.sendPeriodicUpdate()
    }
    apiTimer = timer
    RunLoop.main.add(timer, forMode: .common)
  }

  /// After scan publishes a fresh fix, restart the 15-min API clock from now.
  func rescheduleApiIntervalAfterScanPublish() {
    guard isTracking, !userStopped, !gpsLocationDisabled else { return }
    guard let config = config ?? TrackingSessionStore.load() else { return }
    restartApiInterval(config: config)
    DriverLocLog.i("timer_reset", "source=scan intervalSec=\(config.apiIntervalSeconds)")
  }

  private func stopApiInterval() {
    apiTimer?.invalidate()
    apiTimer = nil
  }

  private func stopLocationAndTimer() {
    stopApiInterval()
    locationManager.stopUpdatingLocation()
    isTracking = false
  }

  private func sendPeriodicUpdate() {
    guard !userStopped, !gpsLocationDisabled else { return }
    guard CLLocationManager.locationServicesEnabled() else {
      suspendTrackingForDisabledLocation(sendDeactivate: true)
      return
    }
    guard isAuthorized(locationManager.authorizationStatus) else {
      suspendTrackingForDisabledLocation(sendDeactivate: true)
      return
    }
    guard let config = config ?? TrackingSessionStore.load() else { return }
    publishFreshAndSend(config: config)
  }

  /**
   * Force a fresh GPS fix, lock it as the published 15-min cache, then API.
   */
  private func publishFreshAndSend(config: TrackingConfig) {
    if publishInFlight {
      print("[\(logTag)] publish skipped — already in flight")
      return
    }
    publishInFlight = true

    pendingPublishCompletion = { [weak self] location in
      guard let self else { return }
      defer { self.publishInFlight = false }

      if let location, self.tryPublishLocation(location, source: "requestLocation") {
        self.sendActiveApiUpdate(config: config)
        return
      }

      if let cached = self.locationManager.location,
         self.tryPublishLocation(cached, source: "manager.location") {
        self.sendActiveApiUpdate(config: config)
        return
      }

      self.tryPublishWarmOnlyIfNoPublished()
      self.sendActiveApiUpdate(config: config)
    }
    locationManager.requestLocation()
  }

  private func tryPublishWarmOnlyIfNoPublished() {
    if TrackingSessionStore.getLastLocation() != nil {
      print("[\(logTag)] Keeping existing published fix — warm/fallback not used")
      return
    }
    guard let warm = TrackingSessionStore.getWarmLocation() else { return }
    TrackingSessionStore.savePublishedLocation(
      DriverCoordinate(
        latitude: warm.latitude,
        longitude: warm.longitude,
        heading: warm.heading,
        speed: warm.speed,
        accuracy: warm.accuracy,
        capturedAtMs: Date().timeIntervalSince1970 * 1000
      )
    )
    print("[\(logTag)] Seeded published from warm (first fix) → lat=\(warm.latitude) lon=\(warm.longitude)")
  }

  @discardableResult
  private func tryPublishLocation(_ location: CLLocation, source: String) -> Bool {
    guard isAcceptableFix(location) else {
      let age = abs(location.timestamp.timeIntervalSinceNow)
      print("[\(logTag)] Rejected \(source) fix age=\(age)s accuracy=\(location.horizontalAccuracy)")
      return false
    }
    publishLocation(location)
    return true
  }

  private func isAcceptableFix(_ location: CLLocation) -> Bool {
    let coord = location.coordinate
    if coord.latitude == 0 && coord.longitude == 0 {
      return false
    }
    let age = abs(location.timestamp.timeIntervalSinceNow)
    if age > maxLocationAgeSeconds {
      return false
    }
    if location.horizontalAccuracy < 0 || location.horizontalAccuracy > maxAccuracyMeters {
      return false
    }
    return true
  }

  private func sendActiveApiUpdate(config: TrackingConfig) {
    guard let coord = TrackingSessionStore.getLastLocation() else {
      print("[\(logTag)] API skipped — no published location yet")
      return
    }
    guard coord.latitude != 0, coord.longitude != 0 else {
      print("[\(logTag)] API skipped — invalid coordinates (0,0)")
      return
    }

    LocationApiClient.sendLocationUpdate(config: config, coord: coord, isActive: 1) { _ in }
  }

  private func saveWarmLocation(_ location: CLLocation) {
    guard let coord = locationToCoord(location) else { return }
    TrackingSessionStore.saveWarmLocation(coord)
  }

  private func publishLocation(_ location: CLLocation) {
    guard let base = locationToCoord(location) else { return }
    let published = DriverCoordinate(
      latitude: base.latitude,
      longitude: base.longitude,
      heading: base.heading,
      speed: base.speed,
      accuracy: base.accuracy,
      capturedAtMs: Date().timeIntervalSince1970 * 1000
    )
    TrackingSessionStore.savePublishedLocation(published)
    TrackingSessionStore.saveWarmLocation(published)
    DriverLocLog.i(
      "publish",
      "source=interval \(DriverLocLog.coord(lat: published.latitude, lon: published.longitude, accuracy: published.accuracy, capturedAtMs: published.capturedAtMs))"
    )
  }

  private func locationToCoord(_ location: CLLocation) -> DriverCoordinate? {
    let coord = DriverCoordinate(
      latitude: location.coordinate.latitude,
      longitude: location.coordinate.longitude,
      heading: location.course >= 0 ? location.course : nil,
      speed: location.speed >= 0 ? location.speed : nil,
      accuracy: location.horizontalAccuracy >= 0 ? location.horizontalAccuracy : nil
    )
    guard coord.latitude != 0, coord.longitude != 0 else { return nil }
    return coord
  }

  private func suspendTrackingForDisabledLocation(sendDeactivate: Bool) {
    guard !gpsLocationDisabled else { return }
    DriverLocLog.w("location_off", "action=deactivate source=ios_tracking")
    gpsLocationDisabled = true
    sendDeactivateIfNeeded(sendDeactivate)
    stopLocationAndTimer()
  }

  private func sendDeactivateIfNeeded(_ sendDeactivate: Bool) {
    guard sendDeactivate, let config = config ?? TrackingSessionStore.load() else { return }
    guard let coord = TrackingSessionStore.getLocationForApiOrDeactivate() else {
      DriverLocLog.w("api", "ok=false is_active=0 reason=no_location")
      return
    }
    guard coord.latitude != 0, coord.longitude != 0 else {
      DriverLocLog.w("api", "ok=false is_active=0 reason=invalid_coords")
      return
    }

    DriverLocLog.i(
      "api",
      "phase=request is_active=0 action=deactivate \(DriverLocLog.coord(lat: coord.latitude, lon: coord.longitude, accuracy: coord.accuracy, capturedAtMs: coord.capturedAtMs)) region=\(config.regionId)"
    )
    let semaphore = DispatchSemaphore(value: 0)
    var success = false
    DispatchQueue.global(qos: .userInitiated).async {
      success = LocationApiClient.sendLocationUpdateBlocking(config: config, coord: coord, isActive: 0)
      semaphore.signal()
    }
    _ = semaphore.wait(timeout: .now() + 30)
    if !success {
      DriverLocLog.w("api", "ok=false is_active=0 action=deactivate")
    }
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
