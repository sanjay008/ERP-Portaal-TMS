import * as Location from 'expo-location';
import { Platform } from 'react-native';

let backgroundPermissionApiAvailable: boolean | null = null;

export async function isBackgroundLocationApiAvailable(): Promise<boolean> {
  // Android tracking uses a foreground service with while-in-use location only.
  if (Platform.OS === 'android') {
    return false;
  }

  if (Platform.OS !== 'ios') {
    return false;
  }

  if (backgroundPermissionApiAvailable !== null) {
    return backgroundPermissionApiAvailable;
  }

  try {
    await Location.getBackgroundPermissionsAsync();
    backgroundPermissionApiAvailable = true;
  } catch (error) {
    console.warn(
      '[backgroundLocation] Background permission API unavailable — rebuild native app after app.json changes.',
      error,
    );
    backgroundPermissionApiAvailable = false;
  }

  return backgroundPermissionApiAvailable;
}

export async function getBackgroundPermissionStatus(): Promise<Location.PermissionStatus | null> {
  if (!(await isBackgroundLocationApiAvailable())) {
    return null;
  }

  try {
    const { status } = await Location.getBackgroundPermissionsAsync();
    return status;
  } catch {
    backgroundPermissionApiAvailable = false;
    return null;
  }
}

export async function ensureBackgroundPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    return true;
  }

  if (!(await isBackgroundLocationApiAvailable())) {
    return false;
  }

  try {
    const current = await Location.getBackgroundPermissionsAsync();
    if (current.status === Location.PermissionStatus.GRANTED) {
      return true;
    }

    const requested = await Location.requestBackgroundPermissionsAsync();
    return requested.status === Location.PermissionStatus.GRANTED;
  } catch {
    backgroundPermissionApiAvailable = false;
    return false;
  }
}
