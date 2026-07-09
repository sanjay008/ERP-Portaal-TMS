package expo.modules.driverlocation

import android.content.Context
import android.content.Intent
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class ExpoDriverLocationModule : Module() {
  private fun resolveContext(): Context? {
    return appContext.reactContext?.applicationContext
      ?: DriverLocationService.getApplicationContext()
  }

  override fun definition() = ModuleDefinition {
    Name("ExpoDriverLocation")

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
      )
    }
  }
}
