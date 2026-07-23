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
      restartApiInterval(config: config)
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
    saveLocation(location)
  }

  func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
    print("[\(logTag)] location error → \(error.localizedDescription)")
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
    sendImmediateUpdate(config: config)
    print("[\(logTag)] tracking started — API every \(config.apiIntervalSeconds)s")
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

  private func stopApiInterval() {
    apiTimer?.invalidate()
    apiTimer = nil
  }

  private func stopLocationAndTimer() {
    stopApiInterval()
    locationManager.stopUpdatingLocation()
    isTracking = false
  }

  private func sendImmediateUpdate(config: TrackingConfig) {
    if let location = locationManager.location {
      saveLocation(location)
    }
    sendActiveApiUpdate(config: config)
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
    sendActiveApiUpdate(config: config)
  }

  private func sendActiveApiUpdate(config: TrackingConfig) {
    guard let coord = TrackingSessionStore.getLastLocation() else {
      print("[\(logTag)] API skipped — no location fix yet")
      return
    }
    guard coord.latitude != 0, coord.longitude != 0 else {
      print("[\(logTag)] API skipped — invalid coordinates (0,0)")
      return
    }

    LocationApiClient.sendLocationUpdate(config: config, coord: coord, isActive: 1) { _ in }
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
    TrackingSessionStore.saveLastLocation(coord)
  }

  private func suspendTrackingForDisabledLocation(sendDeactivate: Bool) {
    guard !gpsLocationDisabled else { return }
    print("[\(logTag)] GPS disabled — sending is_active=0 and pausing tracking")
    gpsLocationDisabled = true
    sendDeactivateIfNeeded(sendDeactivate)
    stopLocationAndTimer()
  }

  private func sendDeactivateIfNeeded(_ sendDeactivate: Bool) {
    guard sendDeactivate, let config = config ?? TrackingSessionStore.load() else { return }
    guard let coord = TrackingSessionStore.getLastLocation() else {
      print("[\(logTag)] Deactivate skipped — no last location for is_active=0")
      return
    }
    guard coord.latitude != 0, coord.longitude != 0 else {
      print("[\(logTag)] Deactivate skipped — invalid last location (0,0)")
      return
    }

    print("[\(logTag)] Sending deactivate API — is_active=0")
    let semaphore = DispatchSemaphore(value: 0)
    var success = false
    DispatchQueue.global(qos: .userInitiated).async {
      success = LocationApiClient.sendLocationUpdateBlocking(config: config, coord: coord, isActive: 0)
      semaphore.signal()
    }
    _ = semaphore.wait(timeout: .now() + 30)
    if !success {
      print("[\(logTag)] Deactivate API failed — is_active=0")
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
