import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { AppState } from 'react-native';
import {
  loadTrackingShift,
  loadTrackingUserData,
  sendDriverLocationUpdate,
  type DriverCoordinate,
} from '@/src/utils/driverLocationApi';
import { ensureBackgroundPermission } from '@/src/utils/backgroundLocationPermissions';
import { getTrackingNotificationLabels } from '@/src/utils/trackingNotificationLabels';
import { loadTrackingRegion } from '@/src/utils/shiftSession';
import { getData, storeData } from '@/src/utils/storeData';

export const DRIVER_LOCATION_TASK = 'DRIVER_LOCATION_TASK';
const LAST_SENT_COORD_KEY = 'DRIVER_LAST_SENT_COORD';
const API_DISTANCE_THRESHOLD = 50;

function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function getLastSentCoord(): Promise<{ latitude: number; longitude: number } | null> {
  const stored = await getData(LAST_SENT_COORD_KEY);
  if (!stored?.latitude || !stored?.longitude) {
    return null;
  }
  return stored;
}

async function setLastSentCoord(latitude: number, longitude: number): Promise<void> {
  await storeData(LAST_SENT_COORD_KEY, { latitude, longitude });
}

async function clearLastSentCoord(): Promise<void> {
  await storeData(LAST_SENT_COORD_KEY, null);
}

TaskManager.defineTask(DRIVER_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('[driverLocationTask] error:', error);
    return;
  }

  const locations = (data as { locations?: Location.LocationObject[] } | undefined)?.locations;
  if (!locations?.length) {
    return;
  }

  const location = locations[locations.length - 1];
  const { latitude, longitude, heading, speed, accuracy } = location.coords;

  const coord: DriverCoordinate = {
    latitude,
    longitude,
    heading,
    speed,
    accuracy,
  };

  const userData = await loadTrackingUserData();
  const shift = await loadTrackingShift();
  const regionContext = shift
    ? { region_id: shift.region_id, planning_date: shift.planning_date }
    : await loadTrackingRegion();
  const { region_id, planning_date } = regionContext ?? {
    region_id: null,
    planning_date: null,
  };

  if (!region_id) {
    console.warn('[driverLocationTask] skipped — no active region');
    return;
  }

  const last = await getLastSentCoord();
  const distanceMoved =
    last !== null
      ? haversineDistance(last.latitude, last.longitude, latitude, longitude)
      : Infinity;

  if (distanceMoved < API_DISTANCE_THRESHOLD) {
    return;
  }

  const sent = await sendDriverLocationUpdate(
    coord,
    userData,
    region_id,
    planning_date,
    1,
  );

  if (sent) {
    await setLastSentCoord(latitude, longitude);
  }
});

export async function isDriverLocationTaskRunning(): Promise<boolean> {
  try {
    return await Location.hasStartedLocationUpdatesAsync(DRIVER_LOCATION_TASK);
  } catch {
    return false;
  }
}

export async function startDriverBackgroundLocation(): Promise<boolean> {
  try {
    const alreadyRunning = await isDriverLocationTaskRunning();
    if (alreadyRunning) {
      return true;
    }

    if (AppState.currentState !== 'active') {
      console.log('[driverLocationTask] deferring background start until app is in foreground');
      return false;
    }

    const foreground = await Location.getForegroundPermissionsAsync();
    if (foreground.status !== Location.PermissionStatus.GRANTED) {
      return false;
    }

    await ensureBackgroundPermission();

    const { notificationTitle, notificationBody } = getTrackingNotificationLabels();

    await Location.startLocationUpdatesAsync(DRIVER_LOCATION_TASK, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 3000,
      distanceInterval: 50,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle,
        notificationBody,
        notificationColor: '#4169E1',
      },
      pausesUpdatesAutomatically: false,
      activityType: Location.ActivityType.AutomotiveNavigation,
    });

    return true;
  } catch (error: any) {
    const message = String(error?.message ?? error);
    if (message.includes('application is in the background')) {
      console.log('[driverLocationTask] deferring background start until app is in foreground');
      return false;
    }

    console.warn('[driverLocationTask] background updates unavailable:', error);
    return false;
  }
}

export async function restartDriverBackgroundLocation(): Promise<boolean> {
  try {
    const running = await isDriverLocationTaskRunning();
    if (running) {
      await Location.stopLocationUpdatesAsync(DRIVER_LOCATION_TASK);
    }
  } catch (error) {
    console.warn('[driverLocationTask] failed to stop before locale restart:', error);
  }

  return startDriverBackgroundLocation();
}

export async function stopDriverBackgroundLocation(): Promise<void> {
  try {
    const running = await isDriverLocationTaskRunning();
    if (running) {
      await Location.stopLocationUpdatesAsync(DRIVER_LOCATION_TASK);
    }
  } catch (error) {
    console.warn('[driverLocationTask] failed to stop background updates:', error);
  }

  await clearLastSentCoord();
}
