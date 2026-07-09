import ExpoDriverLocation from './ExpoDriverLocationModule';
import type { NativeDriverCoordinate, NativeTrackingConfig } from './ExpoDriverLocation.types';

export type { NativeDriverCoordinate, NativeTrackingConfig } from './ExpoDriverLocation.types';

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
