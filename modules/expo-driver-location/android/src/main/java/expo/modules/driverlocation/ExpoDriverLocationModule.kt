package expo.modules.driverlocation

import android.content.Context
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class ExpoDriverLocationModule : Module() {
  private fun resolveContext(): Context? {
    return appContext.reactContext?.applicationContext
      ?: DriverLocationService.getApplicationContext()
  }

  override fun definition() = ModuleDefinition {
    Name("ExpoDriverLocation")

    Events("onShiftForceClosed")

    OnCreate {
      ShiftLocationGuardService.eventSink = { name, body ->
        try {
          sendEvent(name, body)
        } catch (_: Exception) {
          // JS bridge may be gone during app kill
        }
      }
    }

    OnDestroy {
      ShiftLocationGuardService.eventSink = null
    }

    AsyncFunction("startTracking") { config: Map<String, Any?> ->
      val context = resolveContext() ?: return@AsyncFunction null
      val trackingConfig = TrackingConfig.fromMap(config)
      TrackingSessionStore.save(context, trackingConfig)

      val action = if (DriverLocationService.isRunning) {
        DriverLocationService.ACTION_UPDATE
      } else {
        DriverLocationService.ACTION_START
      }

      try {
        DriverLocationService.launchService(context, action)
      } catch (_: Exception) {
        if (DriverLocationService.isRunning) {
          context.startService(DriverLocationService.startServiceIntent(context, action))
        }
      }
      null
    }

    AsyncFunction("stopTracking") {
      val context = resolveContext() ?: return@AsyncFunction null
      context.startService(
        DriverLocationService.startServiceIntent(context, DriverLocationService.ACTION_STOP),
      )
      null
    }

    AsyncFunction("isTracking") {
      DriverLocationService.isRunning
    }

    AsyncFunction("updateNotificationLabels") { title: String, body: String ->
      val context = resolveContext() ?: return@AsyncFunction null
      TrackingSessionStore.updateNotificationLabels(context, title, body)
      if (DriverLocationService.isRunning) {
        DriverLocationService.updateNotification(context, title, body)
      }
      null
    }

    AsyncFunction("getLastLocation") {
      val context = resolveContext() ?: return@AsyncFunction null
      val coord = TrackingSessionStore.getLastLocation(context) ?: return@AsyncFunction null
      mapOf(
        "latitude" to coord.latitude,
        "longitude" to coord.longitude,
        "heading" to (coord.heading ?: 0.0),
        "speed" to (coord.speed ?: 0.0),
        "accuracy" to (coord.accuracy ?: 0.0),
        "capturedAtMs" to (coord.capturedAtMs ?: 0.0),
      )
    }

    AsyncFunction("enableShiftLocationGuard") { config: Map<String, Any?> ->
      val context = resolveContext() ?: return@AsyncFunction null
      val trackingConfig = TrackingConfig.fromMap(config)
      val endTripApiUrl = config["endTripApiUrl"] as? String
      ShiftGuardSessionStore.save(context, trackingConfig, endTripApiUrl)

      val seedLat = (config["seedLatitude"] as? Number)?.toDouble()
      val seedLon = (config["seedLongitude"] as? Number)?.toDouble()
      if (seedLat != null && seedLon != null && seedLat != 0.0 && seedLon != 0.0) {
        ShiftGuardSessionStore.saveLastLocation(
          context,
          DriverCoordinate(
            latitude = seedLat,
            longitude = seedLon,
            heading = null,
            speed = null,
            accuracy = null,
          ),
        )
      }

      try {
        ShiftLocationGuardService.launch(context, ShiftLocationGuardService.ACTION_ENABLE)
      } catch (_: Exception) {
        context.startService(
          ShiftLocationGuardService.startServiceIntent(
            context,
            ShiftLocationGuardService.ACTION_ENABLE,
          ),
        )
      }
      null
    }

    AsyncFunction("disableShiftLocationGuard") {
      val context = resolveContext() ?: return@AsyncFunction null
      try {
        ShiftLocationGuardService.launch(context, ShiftLocationGuardService.ACTION_DISABLE)
      } catch (_: Exception) {
        context.startService(
          ShiftLocationGuardService.startServiceIntent(
            context,
            ShiftLocationGuardService.ACTION_DISABLE,
          ),
        )
      }
      ShiftGuardSessionStore.clear(context)
      null
    }

    AsyncFunction("consumePendingShiftClose") {
      val context = resolveContext() ?: return@AsyncFunction null
      ShiftGuardSessionStore.consumePendingCloseReason(context)
    }
  }
}
