import apiConstants from '@/src/api/apiConstants';
import {
  getChauffeurLocation,
  setChauffeurLocation,
} from '@/src/utils/chauffeurLocationCache';
import {
  REQUIRED_CHAUFFEUR_ROLE,
  resolveTrackingContext,
  sendDriverLocationUpdate,
} from '@/src/utils/driverLocationApi';
import { driverLocLog, driverLocWarn } from '@/src/utils/driverLocLog';
import { getLastScannedOrderId } from '@/src/utils/lastScannedOrderId';
import { recheckLocationAccess } from '@/src/hooks/useUserGPS';
import {
  buildDateTime,
  getCurrentTimeString,
  tripOff,
} from '@/src/utils/regionTripApi';
import type { ActiveShiftSession } from '@/src/utils/shiftSession';
import {
  doesShiftBelongToUser,
  wipeShiftLocalData,
} from '@/src/utils/shiftSession';
import * as Location from 'expo-location';
import {
  addShiftForceClosedListener,
  consumePendingShiftClose,
  disableShiftLocationGuard as nativeDisableShiftLocationGuard,
  enableShiftLocationGuard as nativeEnableShiftLocationGuard,
  type ShiftForceClosedEvent,
} from 'expo-driver-location';

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

/** Prevents Filter + Bootstrap from enabling the same shift guard twice. */
let enabledGuardKey: string | null = null;
let enableInFlightKey: string | null = null;
let enableInFlight: Promise<boolean> | null = null;

function clearEnabledGuardState() {
  enabledGuardKey = null;
  enableInFlight = null;
  enableInFlightKey = null;
}

function buildGuardKey(
  userId: number | string,
  regionId: number | string,
  planningDate: string,
): string {
  return `${userId}|${regionId}|${planningDate}`;
}

/** Silent: latest coords + is_active=1 (no UI). */
async function sendSilentIsActiveOn(
  userData: UserDataShape,
  regionId: number | string,
  planningDate: string,
): Promise<void> {
  let latitude = 0;
  let longitude = 0;

  const cached = getChauffeurLocation();
  if (cached.latitude && cached.longitude) {
    latitude = cached.latitude;
    longitude = cached.longitude;
  } else {
    try {
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      latitude = position.coords.latitude;
      longitude = position.coords.longitude;
      setChauffeurLocation(latitude, longitude, true);
    } catch (error) {
      driverLocWarn('guard_on', { phase: 'is_active=1', ok: 0, reason: 'location_fetch', err: String(error) });
      return;
    }
  }

  if (!latitude || !longitude) {
    driverLocWarn('guard_on', { phase: 'is_active=1', ok: 0, reason: 'no_location' });
    return;
  }

  try {
    const ok = await sendDriverLocationUpdate(
      {
        latitude,
        longitude,
        heading: null,
        speed: null,
        accuracy: null,
      },
      userData,
      regionId,
      planningDate,
      1,
    );
    driverLocLog('guard_on', {
      phase: 'is_active=1',
      ok: ok ? 1 : 0,
      region_id: regionId,
      lat: latitude,
      lon: longitude,
    });
  } catch (error) {
    driverLocWarn('guard_on', { phase: 'is_active=1', ok: 0, reason: String(error) });
  }
}

/**
 * Enable native shift location guard (Android + iOS).
 * On enable: silent is_active=1. On location off: is_active=0 + end-region-trip.
 */
export async function enableShiftLocationGuard(
  userData: UserDataShape | null | undefined,
  activeShift?: ActiveShiftSession | null,
): Promise<boolean> {
  if (!userData?.user || userData.user.role !== REQUIRED_CHAUFFEUR_ROLE) {
    return false;
  }
  if (!activeShift?.shiftActive || !activeShift.region_id) {
    return false;
  }

  const access = await recheckLocationAccess();
  if (access !== 'granted') {
    driverLocWarn('guard_on', { ok: 0, reason: 'location_not_granted' });
    return false;
  }

  const token = userData.user.verify_token;
  const userId = userData.user.id;
  const relatiesId = userData.relaties?.id;
  if (!token || !userId || !relatiesId) {
    return false;
  }

  const { region_id, planning_date } = await resolveTrackingContext(
    activeShift,
    activeShift.region_id,
    activeShift.planning_date,
  );

  if (!region_id) {
    return false;
  }

  const resolvedPlanningDate = String(
    planning_date ?? activeShift.planning_date,
  );
  const guardKey = buildGuardKey(userId, region_id, resolvedPlanningDate);

  if (enabledGuardKey === guardKey) {
    return true;
  }

  if (enableInFlight && enableInFlightKey === guardKey) {
    return enableInFlight;
  }

  const cached = getChauffeurLocation();
  const seedLatitude =
    cached.latitude && cached.longitude ? cached.latitude : undefined;
  const seedLongitude =
    cached.latitude && cached.longitude ? cached.longitude : undefined;

  enableInFlightKey = guardKey;
  enableInFlight = (async () => {
    try {
      const orderId = await getLastScannedOrderId();
      await nativeEnableShiftLocationGuard({
        apiUrl: apiConstants.update_driver_live_location,
        endTripApiUrl: apiConstants.end_region_trip,
        token: String(token),
        role: String(userData.user!.role),
        planningDate: resolvedPlanningDate,
        relatiesId: String(relatiesId),
        userId: String(userId),
        regionId: String(region_id),
        notificationTitle: 'ERP TMS Driver',
        notificationBody: 'Shift session active',
        seedLatitude,
        seedLongitude,
        ...(orderId ? { orderId } : {}),
      });
      enabledGuardKey = guardKey;
      driverLocLog('guard_on', {
        region_id,
        planning_date: resolvedPlanningDate,
        user_id: userId,
      });
      await sendSilentIsActiveOn(
        userData,
        region_id,
        resolvedPlanningDate,
      );
      return true;
    } catch (error) {
      driverLocWarn('guard_on', { ok: 0, reason: String(error) });
      return false;
    } finally {
      enableInFlight = null;
      enableInFlightKey = null;
    }
  })();

  return enableInFlight;
}

/** Disable guard without force-close APIs (manual shift off / logout). */
export async function disableShiftLocationGuard(): Promise<void> {
  clearEnabledGuardState();
  try {
    await nativeDisableShiftLocationGuard();
    driverLocLog('guard_off', { source: 'manual' });
  } catch (error) {
    driverLocWarn('guard_off', { ok: 0, reason: String(error) });
  }
}

/**
 * Silent shift close: is_active=0 + end-region-trip (no UI/toast).
 * Best-effort — always disables the native guard afterward.
 */
export async function closeActiveShiftSilent(
  userData: UserDataShape | null | undefined,
  activeShift?: ActiveShiftSession | null,
): Promise<void> {
  if (!doesShiftBelongToUser(activeShift, userData)) {
    await disableShiftLocationGuard();
    return;
  }

  const cached = getChauffeurLocation();
  if (cached.latitude && cached.longitude) {
    try {
      await sendDriverLocationUpdate(
        {
          latitude: cached.latitude,
          longitude: cached.longitude,
          heading: null,
          speed: null,
          accuracy: null,
        },
        userData,
        activeShift!.region_id,
        activeShift!.planning_date,
        0,
      );
    } catch (error) {
      driverLocWarn('api', { is_active: 0, source: 'js_silent', ok: 0, reason: String(error) });
    }
  } else {
    driverLocWarn('api', { is_active: 0, source: 'js_silent', ok: 0, reason: 'no_location' });
  }

  try {
    const planning_date = activeShift!.planning_date;
    const ended_at = buildDateTime(planning_date, getCurrentTimeString());
    await tripOff({
      UserData: userData,
      region_id: activeShift!.region_id,
      planning_date,
      ended_at,
    });
  } catch (error) {
    driverLocWarn('end_trip', { source: 'js_silent', ok: 0, reason: String(error) });
  }

  await disableShiftLocationGuard();
}

export async function applyForceClosedShiftCleanup(
  setActiveShift: (value: any) => void,
  event?: ShiftForceClosedEvent | { reason?: string; regionId?: string },
): Promise<void> {
  const reason = event?.reason ?? 'unknown';
  const regionId = event?.regionId;
  driverLocLog('trip_close', { phase: 'cleanup_start', reason, regionId: regionId ?? '-' });
  clearEnabledGuardState();
  await wipeShiftLocalData(regionId, reason);
  setActiveShift(null);
  driverLocLog('trip_close', { phase: 'cleanup_done', reason, regionId: regionId ?? '-' });
}

/** Consume pending close from native (location off) and wipe JS shift storage. */
export async function consumeAndWipePendingShiftClose(
  setActiveShift: (value: any) => void,
): Promise<boolean> {
  try {
    const reason = await consumePendingShiftClose();
    if (!reason) {
      return false;
    }
    await applyForceClosedShiftCleanup(setActiveShift, { reason });
    return true;
  } catch (error) {
    driverLocWarn('trip_close', { phase: 'pending_consume', ok: 0, reason: String(error) });
    return false;
  }
}

export function subscribeShiftForceClosed(
  setActiveShift: (value: any) => void,
) {
  return addShiftForceClosedListener((event) => {
    applyForceClosedShiftCleanup(setActiveShift, event).catch(() => undefined);
  });
}
