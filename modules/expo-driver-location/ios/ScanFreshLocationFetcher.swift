import CoreLocation
import Foundation

/**
 * Isolated one-shot GPS for scan → status_update.
 * Does not share pendingPublishCompletion with the 15-min tracking timer.
 */
final class ScanFreshLocationFetcher: NSObject, CLLocationManagerDelegate {
  static let shared = ScanFreshLocationFetcher()

  private let logTag = "ExpoDriverLocation"
  private let locationManager = CLLocationManager()
  private var waiters: [(CLLocation?) -> Void] = []
  private var inFlight = false
  private let maxLocationAgeSeconds: TimeInterval = 60
  private let maxAccuracyMeters: CLLocationAccuracy = 100

  private override init() {
    super.init()
    locationManager.delegate = self
    locationManager.desiredAccuracy = kCLLocationAccuracyBest
  }

  func fetch(completion: @escaping (CLLocation?) -> Void) {
    waiters.append(completion)
    guard !inFlight else { return }

    guard CLLocationManager.locationServicesEnabled() else {
      finish(nil)
      return
    }

    let status = locationManager.authorizationStatus
    guard status == .authorizedAlways || status == .authorizedWhenInUse else {
      print("[\(logTag)] Scan fresh GPS skipped — not authorized")
      finish(nil)
      return
    }

    inFlight = true
    locationManager.requestLocation()
  }

  func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
    finish(locations.last)
  }

  func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
    print("[\(logTag)] Scan fresh GPS error → \(error.localizedDescription)")
    if let cached = locationManager.location, isAcceptableFix(cached) {
      finish(cached)
      return
    }
    finish(nil)
  }

  func publishIfAcceptable(_ location: CLLocation) -> DriverCoordinate? {
    guard isAcceptableFix(location) else {
      let age = abs(location.timestamp.timeIntervalSinceNow)
      print("[\(logTag)] Scan rejected fix age=\(age)s accuracy=\(location.horizontalAccuracy)")
      return nil
    }

    let published = DriverCoordinate(
      latitude: location.coordinate.latitude,
      longitude: location.coordinate.longitude,
      heading: location.course >= 0 ? location.course : nil,
      speed: location.speed >= 0 ? location.speed : nil,
      accuracy: location.horizontalAccuracy >= 0 ? location.horizontalAccuracy : nil,
      capturedAtMs: Date().timeIntervalSince1970 * 1000
    )
    guard published.latitude != 0, published.longitude != 0 else { return nil }

    TrackingSessionStore.savePublishedLocation(published)
    TrackingSessionStore.saveWarmLocation(published)
    DriverLocationManager.shared.rescheduleApiIntervalAfterScanPublish()
    DriverLocLog.i(
      "scan_fresh",
      "ok=true timerReset=1 \(DriverLocLog.coord(lat: published.latitude, lon: published.longitude, accuracy: published.accuracy, capturedAtMs: published.capturedAtMs))"
    )
    return published
  }

  private func finish(_ location: CLLocation?) {
    inFlight = false
    let callbacks = waiters
    waiters.removeAll()
    DispatchQueue.main.async {
      for cb in callbacks {
        cb(location)
      }
    }
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
}
