import apiConstants from '@/src/api/apiConstants';
import {
  buildAndValidateDriverPayload,
  resolveTrackingContext,
  REQUIRED_CHAUFFEUR_ROLE,
} from '@/src/utils/driverLocationApi';
import { getTrackingNotificationLabels } from '@/src/utils/trackingNotificationLabels';
import type { ActiveShiftSession } from '@/src/utils/shiftSession';
import {
  getLastLocation,
  isTracking,
  startTracking as nativeStartTracking,
  stopTracking as nativeStopTracking,
  updateNotificationLabels,
  type NativeTrackingConfig,
} from 'expo-driver-location';

export const API_DISTANCE_THRESHOLD = 50;

type UserDataShape = {
  user?: {
    id?: number | string;
    role?: string;
    verify_token?: string;
  };
  relaties?: {
    id?: number | string;
  };
};

export async function buildNativeTrackingConfig(
  userData: UserDataShape | null | undefined,
  activeShift?: ActiveShiftSession | null,
  selectRegionId?: number | string | null,
  selectCurrentDate?: string | null,
): Promise<NativeTrackingConfig | null> {
  if (!userData?.user || userData.user.role !== REQUIRED_CHAUFFEUR_ROLE) {
    return null;
  }

  const { region_id, planning_date } = await resolveTrackingContext(
    activeShift,
    selectRegionId,
    selectCurrentDate,
  );

  const validation = buildAndValidateDriverPayload(
    {
      latitude: 1,
      longitude: 1,
      heading: null,
      speed: null,
      accuracy: null,
    },
    userData,
    planning_date,
    region_id,
    1,
  );

  if (validation.valid === false) {
    console.warn(`[nativeDriverLocation] config skipped — ${validation.reason}`);
    return null;
  }

  const { notificationTitle, notificationBody } = getTrackingNotificationLabels();

  return {
    apiUrl: apiConstants.update_driver_live_location,
    token: validation.payload.token,
    role: validation.payload.role,
    planningDate: validation.payload.planning_date,
    relatiesId: validation.payload.relaties_id,
    userId: validation.payload.user_id,
    regionId: validation.payload.region_id,
    distanceThresholdMeters: API_DISTANCE_THRESHOLD,
    notificationTitle,
    notificationBody,
  };
}

export async function syncNativeDriverTracking(
  userData: UserDataShape | null | undefined,
  activeShift?: ActiveShiftSession | null,
  selectRegionId?: number | string | null,
  selectCurrentDate?: string | null,
): Promise<'started' | 'synced' | 'skipped'> {
  const config = await buildNativeTrackingConfig(
    userData,
    activeShift,
    selectRegionId,
    selectCurrentDate,
  );

  if (!config) {
    return 'skipped';
  }

  const alreadyRunning = await isTracking();
  await nativeStartTracking(config);
  return alreadyRunning ? 'synced' : 'started';
}

export async function startNativeDriverTracking(
  userData: UserDataShape | null | undefined,
  activeShift?: ActiveShiftSession | null,
  selectRegionId?: number | string | null,
  selectCurrentDate?: string | null,
): Promise<boolean> {
  const result = await syncNativeDriverTracking(
    userData,
    activeShift,
    selectRegionId,
    selectCurrentDate,
  );
  return result !== 'skipped';
}

export async function stopNativeDriverTracking(): Promise<void> {
  await nativeStopTracking();
}

export async function isNativeDriverTracking(): Promise<boolean> {
  return isTracking();
}

export async function refreshNativeNotificationLabels(): Promise<void> {
  const { notificationTitle, notificationBody } = getTrackingNotificationLabels();
  await updateNotificationLabels(notificationTitle, notificationBody);
}

export { getLastLocation };
