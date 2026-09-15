import Constants from 'expo-constants';
import { Platform } from 'react-native';
import apiConstants from '@/src/api/apiConstants';
import ApiService from '@/src/utils/Apiservice';
import { driverLocLog, driverLocWarn } from '@/src/utils/driverLocLog';
import { getLastScannedOrderId } from '@/src/utils/lastScannedOrderId';
import { ACTIVE_SHIFT_KEY, type ActiveShiftSession, loadTrackingRegion } from '@/src/utils/shiftSession';
import { getData } from '@/src/utils/storeData';
import type { LocationSource, NativeDriverCoordinate } from 'expo-driver-location';

export const REQUIRED_CHAUFFEUR_ROLE = 'chauffeur';

/** Do not POST published_cache older than this without a fresh GPS fix (20 min). */
export const STALE_LOCATION_MAX_AGE_MS = 20 * 60 * 1000;

export type DriverCoordinate = {
  latitude: number;
  longitude: number;
  heading: number | null;
  speed: number | null;
  accuracy: number | null;
  /** Epoch ms when this fix was captured (from native GPS timestamp). */
  capturedAtMs?: number | null;
  altitude?: number | null;
  altitudeAccuracy?: number | null;
  isMock?: boolean | null;
  source?: LocationSource | null;
  provider?: string | null;
};

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

type ValidatedPayload = {
  token: string;
  role: string;
  planning_date: string;
  relaties_id: string;
  user_id: string;
  region_id: string;
  latitude: string;
  longitude: string;
  heading: string;
  accuracy: string;
  speed: string;
  is_active: number;
  captured_at: string;
  location_meta: string;
  order_id?: string;
};

type PayloadValidationResult =
  | { valid: true; payload: ValidatedPayload }
  | { valid: false; reason: string };

function getTodayDate(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function getAppVersion(): string {
  return (
    Constants.nativeAppVersion ??
    Constants.expoConfig?.version ??
    '0.0.0'
  );
}

export function getLocationAgeMs(
  capturedAtMs: number | null | undefined,
  now = Date.now(),
): number | null {
  if (capturedAtMs == null || !Number.isFinite(Number(capturedAtMs)) || Number(capturedAtMs) <= 0) {
    return null;
  }
  return Math.max(0, now - Number(capturedAtMs));
}

export function isLocationStale(
  capturedAtMs: number | null | undefined,
  now = Date.now(),
): boolean {
  const age = getLocationAgeMs(capturedAtMs, now);
  if (age == null) return true;
  return age > STALE_LOCATION_MAX_AGE_MS;
}

/** Build location_meta JSON object from the actual GPS coordinate fields. */
export function buildLocationMeta(
  coord: DriverCoordinate,
  now = Date.now(),
): Record<string, unknown> {
  const locationTimeMs =
    coord.capturedAtMs != null && Number(coord.capturedAtMs) > 0
      ? Number(coord.capturedAtMs)
      : null;
  const ageMs =
    locationTimeMs != null ? Math.max(0, now - locationTimeMs) : null;

  return {
    source: coord.source ?? 'published_cache',
    provider:
      coord.provider ??
      (Platform.OS === 'ios' ? 'core_location' : 'fused'),
    location_time_ms: locationTimeMs,
    age_ms: ageMs,
    is_mock: coord.isMock ?? false,
    accuracy_m: coord.accuracy,
    altitude: coord.altitude ?? null,
    bearing: coord.heading,
    speed_mps: coord.speed,
    latitude: coord.latitude,
    longitude: coord.longitude,
    altitude_accuracy: coord.altitudeAccuracy ?? null,
    platform: Platform.OS,
    app_version: getAppVersion(),
  };
}

export function nativeCoordToDriverCoordinate(
  last: NativeDriverCoordinate,
  fallbackSource: LocationSource = 'published_cache',
): DriverCoordinate {
  return {
    latitude: last.latitude,
    longitude: last.longitude,
    heading: last.heading ?? null,
    speed: last.speed ?? null,
    accuracy: last.accuracy ?? null,
    capturedAtMs: last.capturedAtMs ?? null,
    altitude: last.altitude ?? null,
    altitudeAccuracy: last.altitudeAccuracy ?? null,
    isMock: last.isMock ?? null,
    source: last.source ?? fallbackSource,
    provider: last.provider ?? null,
  };
}

export function normalizeStoredUserData(raw: unknown): UserDataShape | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const record = raw as Record<string, unknown>;
  if (record.user && typeof record.user === 'object') {
    return record as UserDataShape;
  }

  if (record.data && typeof record.data === 'object') {
    return record.data as UserDataShape;
  }

  return null;
}

export async function loadTrackingUserData(): Promise<UserDataShape | null> {
  const stored = await getData('USERDATA');
  return normalizeStoredUserData(stored);
}

export async function loadTrackingShift(): Promise<ActiveShiftSession | null> {
  const session = await getData(ACTIVE_SHIFT_KEY);
  if (!session?.shiftActive || !session?.region_id) {
    return null;
  }
  return session as ActiveShiftSession;
}

export function buildAndValidateDriverPayload(
  coord: DriverCoordinate,
  userData: UserDataShape | null | undefined,
  planning_date: string | null | undefined,
  region_id: number | string | null | undefined,
  isActive: number,
): PayloadValidationResult {
  if (!userData?.user) {
    return { valid: false, reason: 'UserData or user is null — user not logged in' };
  }

  const role = userData.user.role;
  if (role !== REQUIRED_CHAUFFEUR_ROLE) {
    return { valid: false, reason: `Role is "${role}" — only "${REQUIRED_CHAUFFEUR_ROLE}" is allowed` };
  }

  const token = userData.user.verify_token;
  if (!token) {
    return { valid: false, reason: 'verify_token is missing' };
  }

  const user_id = userData.user.id;
  if (!user_id) {
    return { valid: false, reason: 'user_id is missing' };
  }

  const relaties_id = userData.relaties?.id;
  if (!relaties_id) {
    return { valid: false, reason: 'relaties_id is missing' };
  }

  if (!region_id) {
    return { valid: false, reason: 'region_id is null/missing' };
  }

  if (!coord.latitude || !coord.longitude) {
    return {
      valid: false,
      reason: `Invalid coordinates — lat: ${coord.latitude}, lon: ${coord.longitude}`,
    };
  }

  const capturedAtMs =
    coord.capturedAtMs != null && Number(coord.capturedAtMs) > 0
      ? Number(coord.capturedAtMs)
      : null;

  if (capturedAtMs == null) {
    return {
      valid: false,
      reason: 'captured_at missing — GPS fix timestamp required (not Date.now())',
    };
  }

  const locationMeta = buildLocationMeta({
    ...coord,
    capturedAtMs,
    source: coord.source ?? 'published_cache',
  });

  return {
    valid: true,
    payload: {
      token: String(token),
      role: String(role),
      planning_date: String(planning_date ?? getTodayDate()),
      relaties_id: String(relaties_id),
      user_id: String(user_id),
      region_id: String(region_id),
      latitude: String(coord.latitude),
      longitude: String(coord.longitude),
      heading: coord.heading != null ? String(coord.heading) : '',
      accuracy: coord.accuracy != null ? String(coord.accuracy) : '',
      speed: coord.speed != null ? String(coord.speed) : '',
      is_active: isActive,
      captured_at: String(Math.round(capturedAtMs)),
      location_meta: JSON.stringify(locationMeta),
    },
  };
}

export async function resolveTrackingContext(
  activeShift?: ActiveShiftSession | null,
  selectRegionId?: number | string | null,
  selectCurrentDate?: string | null,
) {
  if (activeShift?.shiftActive && activeShift.region_id) {
    return {
      region_id: activeShift.region_id,
      planning_date: activeShift.planning_date,
    };
  }

  const storedShift = await loadTrackingShift();
  if (storedShift?.region_id) {
    return {
      region_id: storedShift.region_id,
      planning_date: storedShift.planning_date,
    };
  }

  const storedRegion = await loadTrackingRegion();
  if (storedRegion?.region_id) {
    return {
      region_id: storedRegion.region_id,
      planning_date: storedRegion.planning_date,
    };
  }

  return {
    region_id: selectRegionId ?? null,
    planning_date: selectCurrentDate ?? getTodayDate(),
  };
}

export async function sendDriverLocationUpdate(
  coord: DriverCoordinate,
  userData: UserDataShape | null | undefined,
  region_id: number | string | null | undefined,
  planning_date: string | null | undefined,
  isActive: number,
): Promise<boolean> {
  // Active updates must not send stale published_cache without a fresher fix.
  if (
    isActive === 1 &&
    isLocationStale(coord.capturedAtMs) &&
    (coord.source === 'published_cache' || coord.source == null)
  ) {
    driverLocWarn('api', {
      ok: 0,
      reason: 'stale_published_cache',
      age_ms: getLocationAgeMs(coord.capturedAtMs),
      is_active: isActive,
    });
    return false;
  }

  const result = buildAndValidateDriverPayload(
    coord,
    userData,
    planning_date,
    region_id,
    isActive,
  );

  if (result.valid === false) {
    driverLocWarn('api', { ok: 0, reason: result.reason, is_active: isActive });
    return false;
  }

  try {
    const orderId = await getLastScannedOrderId();
    const customData =
      orderId != null
        ? { ...result.payload, order_id: orderId }
        : result.payload;

    const res = await ApiService(apiConstants.update_driver_live_location, {
      customData,
    });
    console.log('res', res, customData);
    if (res?.status) {
      driverLocLog('api', {
        ok: 1,
        source: 'js',
        is_active: isActive,
        lat: coord.latitude,
        lon: coord.longitude,
        captured_at: coord.capturedAtMs ?? '-',
        region_id: result.payload.region_id,
        planning_date: result.payload.planning_date,
        order_id: orderId ?? '-',
        location_source: coord.source ?? 'published_cache',
      });
      return true;
    }

    driverLocWarn('api', { ok: 0, source: 'js', is_active: isActive, reason: 'status_false' });
    return false;
  } catch (error) {
    driverLocWarn('api', { ok: 0, source: 'js', is_active: isActive, reason: String(error) });
    return false;
  }
}

/**
 * Fire-and-forget: ping live location once (e.g. after successful Verify_status).
 * Uses the same 3-min scan cache rule + shared in-flight fetch as prefetch
 * (so parcel 2 while parcel 1 is still fetching joins the same GPS promise).
 */
export async function pingDriverLiveLocation(
  userData?: UserDataShape | null,
  orderId?: number | string | null,
): Promise<void> {
  try {
    const resolvedUser = userData ?? (await loadTrackingUserData());
    if (!resolvedUser?.user || resolvedUser.user.role !== REQUIRED_CHAUFFEUR_ROLE) {
      return;
    }

    const { resolveScanLocation } = await import('@/src/utils/scanFreshLocation');
    const last = await resolveScanLocation(orderId);
    if (!last?.latitude || !last?.longitude) {
      driverLocWarn('ping', { ok: 0, reason: 'no_scan_location' });
      return;
    }

    const coord = nativeCoordToDriverCoordinate(
      last,
      (last.source as LocationSource) ?? 'published_cache',
    );

    // Absolute safety: never POST published_cache older than 20 min without a real fix.
    if (isLocationStale(coord.capturedAtMs)) {
      driverLocWarn('ping', {
        ok: 0,
        reason: 'stale_after_resolve',
        age_ms: getLocationAgeMs(coord.capturedAtMs),
      });
      return;
    }

    const { region_id, planning_date } = await resolveTrackingContext();
    driverLocLog('ping', {
      lat: coord.latitude,
      lon: coord.longitude,
      capturedAt: coord.capturedAtMs ?? '-',
      region_id,
      planning_date,
      source: coord.source ?? 'published_cache',
      order: orderId ?? '-',
    });
    await sendDriverLocationUpdate(
      coord,
      resolvedUser,
      region_id,
      planning_date,
      1,
    );
  } catch (error) {
    driverLocWarn('ping', { ok: 0, reason: String(error) });
  }
}
