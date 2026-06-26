import { Camera } from 'expo-camera';
import { Linking } from 'react-native';

export type CameraAccessStatus = 'granted' | 'denied' | 'blocked';

type CameraPermissionResult = {
  granted: boolean;
  canAskAgain: boolean;
};

export async function checkCameraPermission(): Promise<CameraPermissionResult & { status: string }> {
  const { granted, canAskAgain, status } = await Camera.getCameraPermissionsAsync();
  return {
    granted: granted === true,
    canAskAgain: canAskAgain !== false,
    status,
  };
}

export async function requestCameraPermission(): Promise<CameraPermissionResult> {
  const { granted, canAskAgain } = await Camera.requestCameraPermissionsAsync();
  return {
    granted: granted === true,
    canAskAgain: canAskAgain !== false,
  };
}

function toAccessStatus(result: CameraPermissionResult): CameraAccessStatus {
  if (result.granted) return 'granted';
  if (!result.canAskAgain) return 'blocked';
  return 'denied';
}

/** On screen open: auto-request only the first time; otherwise return denied/blocked for in-app sheet. */
export async function resolveCameraAccess(): Promise<CameraAccessStatus> {
  const current = await checkCameraPermission();
  if (current.granted) return 'granted';
  if (!current.canAskAgain) return 'blocked';

  if (current.status === 'undetermined') {
    const requested = await requestCameraPermission();
    return toAccessStatus(requested);
  }

  return 'denied';
}

/** Re-request when the user taps Allow on the in-app sheet. */
export async function retryCameraPermission(): Promise<CameraAccessStatus> {
  const current = await checkCameraPermission();
  if (current.granted) return 'granted';
  if (!current.canAskAgain) return 'blocked';

  const requested = await requestCameraPermission();
  return toAccessStatus(requested);
}

/** Read-only check (e.g. after returning from Settings). */
export async function recheckCameraAccess(): Promise<CameraAccessStatus> {
  const current = await checkCameraPermission();
  return toAccessStatus(current);
}

export async function openAppSettings(): Promise<void> {
  await Linking.openSettings();
}
