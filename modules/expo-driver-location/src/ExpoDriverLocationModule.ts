import { requireNativeModule, EventEmitter } from 'expo-modules-core';

import type {
  NativeDriverCoordinate,
  NativeShiftLocationGuardConfig,
  NativeTrackingConfig,
  ShiftForceClosedEvent,
} from './ExpoDriverLocation.types';

type ExpoDriverLocationNativeModule = {
  startTracking(config: NativeTrackingConfig): Promise<void>;
  stopTracking(): Promise<void>;
  isTracking(): Promise<boolean>;
  updateNotificationLabels(title: string, body: string): Promise<void>;
  getLastLocation(): Promise<NativeDriverCoordinate | null>;
  enableShiftLocationGuard(config: NativeShiftLocationGuardConfig): Promise<void>;
  disableShiftLocationGuard(): Promise<void>;
  consumePendingShiftClose(): Promise<string | null>;
};

const ExpoDriverLocation =
  requireNativeModule<ExpoDriverLocationNativeModule>('ExpoDriverLocation');

export default ExpoDriverLocation;

const emitter = new EventEmitter(ExpoDriverLocation as any);

export function addShiftForceClosedListener(
  listener: (event: ShiftForceClosedEvent) => void,
) {
  return emitter.addListener('onShiftForceClosed', listener);
}
