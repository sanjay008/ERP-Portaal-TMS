const { withInfoPlist } = require('@expo/config-plugins');

/**
 * Ensures iOS background location mode is enabled for native driver tracking.
 * Android service/permissions are declared in the module AndroidManifest.
 */
function withDriverLocation(config) {
  return withInfoPlist(config, (config) => {
    const modes = config.modResults.UIBackgroundModes ?? [];
    if (!modes.includes('location')) {
      config.modResults.UIBackgroundModes = [...modes, 'location'];
    }
    return config;
  });
}

module.exports = withDriverLocation;
