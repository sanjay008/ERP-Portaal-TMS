/**
 * Expo shim for sp-react-native-in-app-updates.
 * Avoids linking the full react-native-device-info native module.
 */
import Constants from 'expo-constants';
import { Platform } from 'react-native';

export const getBundleId = () => {
  if (Platform.OS === 'ios') {
    return Constants.expoConfig?.ios?.bundleIdentifier ?? '';
  }
  return Constants.expoConfig?.android?.package ?? '';
};

export const getVersion = () =>
  Constants.nativeAppVersion ?? Constants.expoConfig?.version ?? '0.0.0';

export default {
  getBundleId,
  getVersion,
};
