import Foundation

/**
 * Single console tag for the whole driver-location system.
 * Filter in Xcode / Console.app: DriverLoc
 */
enum DriverLocLog {
  private static let tag = "DriverLoc"

  static func i(_ event: String, _ details: String = "") {
    print("[\(tag)] \(format(event, details))")
  }

  static func w(_ event: String, _ details: String = "") {
    print("[\(tag)] \(format(event, details))")
  }

  static func e(_ event: String, _ details: String = "") {
    print("[\(tag)] \(format(event, details))")
  }

  private static func format(_ event: String, _ details: String) -> String {
    if details.isEmpty {
      return "event=\(event)"
    }
    return "event=\(event) | \(details)"
  }

  static func coord(
    lat: Double?,
    lon: Double?,
    accuracy: Double? = nil,
    capturedAtMs: Double? = nil
  ) -> String {
    var parts = [
      "lat=\(lat.map { String($0) } ?? "-")",
      "lon=\(lon.map { String($0) } ?? "-")",
    ]
    if let accuracy {
      parts.append("accuracy=\(accuracy)")
    }
    if let capturedAtMs, capturedAtMs > 0 {
      let age = max(0, Int((Date().timeIntervalSince1970 * 1000) - capturedAtMs))
      parts.append("capturedAt=\(Int(capturedAtMs))")
      parts.append("ageMs=\(age)")
    }
    return parts.joined(separator: " ")
  }
}
