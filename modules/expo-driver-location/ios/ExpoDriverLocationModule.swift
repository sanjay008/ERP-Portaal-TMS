import ExpoModulesCore

public final class ExpoDriverLocationModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ExpoDriverLocation")

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
      ]
    }
  }
}
