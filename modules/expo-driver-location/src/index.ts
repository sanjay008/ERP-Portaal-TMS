import ExpoDriverLocation, {
  addShiftForceClosedListener,
} from './ExpoDriverLocationModule';
import type {
  NativeDriverCoordinate,
  NativeShiftLocationGuardConfig,
  NativeTrackingConfig,
  ShiftForceClosedEvent,
} from './ExpoDriverLocation.types';

export type {
  NativeDriverCoordinate,
  NativeShiftLocationGuardConfig,
  NativeTrackingConfig,
  ShiftForceClosedEvent,
} from './ExpoDriverLocation.types';

export { addShiftForceClosedListener };

export async function startTracking(config: NativeTrackingConfig): Promise<void> {
  await ExpoDriverLocation.startTracking(config);
}

export async function stopTracking(): Promise<void> {
  await ExpoDriverLocation.stopTracking();
}

export async function isTracking(): Promise<boolean> {
  return ExpoDriverLocation.isTracking();
}

export async function updateNotificationLabels(title: string, body: string): Promise<void> {
  await ExpoDriverLocation.updateNotificationLabels(title, body);
}

export async function getLastLocation(): Promise<NativeDriverCoordinate | null> {
  return ExpoDriverLocation.getLastLocation();
}

/** Fresh GPS for scan → status_update; also replaces the published 15-min cache. */
export async function getFreshLocationAndPublish(): Promise<NativeDriverCoordinate | null> {
  return ExpoDriverLocation.getFreshLocationAndPublish();
}

export async function enableShiftLocationGuard(
  config: NativeShiftLocationGuardConfig,
): Promise<void> {
  await ExpoDriverLocation.enableShiftLocationGuard(config);
}

export async function disableShiftLocationGuard(): Promise<void> {
  await ExpoDriverLocation.disableShiftLocationGuard();
}

export async function consumePendingShiftClose(): Promise<string | null> {
  return ExpoDriverLocation.consumePendingShiftClose();
}
