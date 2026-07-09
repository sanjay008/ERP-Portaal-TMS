import { requireNativeModule } from 'expo-modules-core';

import type { NativeDriverCoordinate, NativeTrackingConfig } from './ExpoDriverLocation.types';

type ExpoDriverLocationNativeModule = {
  startTracking(config: NativeTrackingConfig): Promise<void>;
  stopTracking(): Promise<void>;
  isTracking(): Promise<boolean>;
  updateNotificationLabels(title: string, body: string): Promise<void>;
  getLastLocation(): Promise<NativeDriverCoordinate | null>;
};

export default requireNativeModule<ExpoDriverLocationNativeModule>('ExpoDriverLocation');
