import CoreLocation
import Foundation

final class DriverLocationManager: NSObject, CLLocationManagerDelegate {
  static let shared = DriverLocationManager()

  private let locationManager = CLLocationManager()
  private var config: TrackingConfig?
  private(set) var isTracking = false
  private var userStopped = false

  private override init() {
    super.init()
    locationManager.delegate = self
    locationManager.desiredAccuracy = kCLLocationAccuracyHundredMeters
    locationManager.distanceFilter = 50
    locationManager.pausesLocationUpdatesAutomatically = false
    locationManager.allowsBackgroundLocationUpdates = true
    locationManager.showsBackgroundLocationIndicator = true
    if #available(iOS 11.0, *) {
      locationManager.showsBackgroundLocationIndicator = true
    }
  }

  func startTracking(config: TrackingConfig) throws {
    guard CLLocationManager.locationServicesEnabled() else {
      throw NSError(domain: "ExpoDriverLocation", code: 2, userInfo: [NSLocalizedDescriptionKey: "Location services disabled"])
    }

    userStopped = false
    self.config = config
    TrackingSessionStore.save(config)

    if isTracking {
      locationManager.distanceFilter = config.distanceThresholdMeters
      return
    }

    locationManager.requestAlwaysAuthorization()
    locationManager.startUpdatingLocation()
    isTracking = true
  }

  func stopTracking(sendDeactivate: Bool) {
    userStopped = true
    if sendDeactivate, let config = config ?? TrackingSessionStore.load() {
      let coord = TrackingSessionStore.getLastLocation() ?? DriverCoordinate(latitude: 0, longitude: 0, heading: nil, speed: nil, accuracy: nil)
      if coord.latitude != 0 && coord.longitude != 0 {
        _ = LocationApiClient.sendLocationUpdateBlocking(config: config, coord: coord, isActive: 0)
      }
    }

    locationManager.stopUpdatingLocation()
    isTracking = false
    config = nil
    TrackingSessionStore.clearLastSentCoord()
  }

  func updateNotificationLabels(title: String, body: String) {
    // iOS does not require a persistent notification for background location.
  }

  func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
    guard !userStopped, let config = config ?? TrackingSessionStore.load() else { return }
    guard CLLocationManager.locationServicesEnabled() else {
      stopTracking(sendDeactivate: true)
      return
    }

    guard let location = locations.last else { return }

    let coord = DriverCoordinate(
      latitude: location.coordinate.latitude,
      longitude: location.coordinate.longitude,
      heading: location.course >= 0 ? location.course : nil,
      speed: location.speed >= 0 ? location.speed : nil,
      accuracy: location.horizontalAccuracy >= 0 ? location.horizontalAccuracy : nil
    )

    TrackingSessionStore.saveLastLocation(coord)

    let lastSent = TrackingSessionStore.getLastSentCoord()
    let distanceMoved: Double
    if let lastSent {
      distanceMoved = LocationMath.haversineDistance(
        lat1: lastSent.0,
        lon1: lastSent.1,
        lat2: coord.latitude,
        lon2: coord.longitude
      )
    } else {
      distanceMoved = .greatestFiniteMagnitude
    }

    if distanceMoved < config.distanceThresholdMeters {
      return
    }

    LocationApiClient.sendLocationUpdate(config: config, coord: coord, isActive: 1) { success in
      if success {
        TrackingSessionStore.setLastSentCoord(latitude: coord.latitude, longitude: coord.longitude)
      }
    }
  }

  func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
    if let clError = error as? CLError, clError.code == .denied {
      stopTracking(sendDeactivate: true)
    }
  }

  func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
    if !CLLocationManager.locationServicesEnabled() {
      stopTracking(sendDeactivate: true)
      return
    }

    // Do not auto-restart when services become available again.
    if userStopped {
      return
    }
  }
}
