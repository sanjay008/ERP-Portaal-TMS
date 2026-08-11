import ExpoModulesCore

public final class ExpoDriverLocationModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ExpoDriverLocation")

    Events("onShiftForceClosed")

    OnCreate {
      ShiftLocationGuardManager.shared.onForceClosed = { [weak self] body in
        self?.sendEvent("onShiftForceClosed", body)
      }
    }

    OnDestroy {
      ShiftLocationGuardManager.shared.onForceClosed = nil
    }

    AsyncFunction("startTracking") { (config: [String: Any]) in
      let trackingConfig = try TrackingConfig.fromDictionary(config)
      try DriverLocationManager.shared.startTracking(config: trackingConfig)
    }

    AsyncFunction("stopTracking") {
      DriverLocationManager.shared.stopTracking(sendDeactivate: true)
    }

    AsyncFunction("isTracking") {
      DriverLocationManager.shared.isTracking
    }

    AsyncFunction("updateNotificationLabels") { (_ title: String, _ body: String) in
      DriverLocationManager.shared.updateNotificationLabels(title: title, body: body)
    }

    AsyncFunction("getLastLocation") { () -> [String: Any]? in
      guard let coord = TrackingSessionStore.getLastLocation() else {
        return nil
      }
      return [
        "latitude": coord.latitude,
        "longitude": coord.longitude,
        "heading": coord.heading as Any,
        "speed": coord.speed as Any,
        "accuracy": coord.accuracy as Any,
        "capturedAtMs": coord.capturedAtMs as Any,
      ]
    }

    // Scan → status_update: fresh GPS + replace published 15-min cache (no live-location POST).
    AsyncFunction("getFreshLocationAndPublish") { (promise: Promise) in
      ScanFreshLocationFetcher.shared.fetch { location in
        var published: DriverCoordinate? = nil
        if let location {
          published = ScanFreshLocationFetcher.shared.publishIfAcceptable(location)
        }
        // If fresh rejected, still return current published cache for status_update fallback.
        let coord = published ?? TrackingSessionStore.getLastLocation()
        guard let coord, coord.latitude != 0, coord.longitude != 0 else {
          promise.resolve(nil)
          return
        }
        promise.resolve([
          "latitude": coord.latitude,
          "longitude": coord.longitude,
          "heading": coord.heading as Any,
          "speed": coord.speed as Any,
          "accuracy": coord.accuracy as Any,
          "capturedAtMs": coord.capturedAtMs as Any,
        ])
      }
    }

    AsyncFunction("enableShiftLocationGuard") { (config: [String: Any]) in
      let trackingConfig = try TrackingConfig.fromDictionary(config)
      let endTripApiUrl = config["endTripApiUrl"] as? String
      let seedLat = (config["seedLatitude"] as? NSNumber)?.doubleValue
      let seedLon = (config["seedLongitude"] as? NSNumber)?.doubleValue
      ShiftLocationGuardManager.shared.enable(
        config: trackingConfig,
        endTripApiUrl: endTripApiUrl,
        seedLatitude: seedLat,
        seedLongitude: seedLon
      )
    }

    AsyncFunction("disableShiftLocationGuard") {
      ShiftLocationGuardManager.shared.disable()
    }

    AsyncFunction("consumePendingShiftClose") { () -> String? in
      ShiftLocationGuardManager.shared.consumePendingCloseReason()
    }
  }
}
