import apiConstants from '@/src/api/apiConstants';
import ApiService from '@/src/utils/Apiservice';
import { getLastScannedOrderId } from '@/src/utils/lastScannedOrderId';
import { ACTIVE_SHIFT_KEY, type ActiveShiftSession, loadTrackingRegion } from '@/src/utils/shiftSession';
import { getData } from '@/src/utils/storeData';

export const REQUIRED_CHAUFFEUR_ROLE = 'chauffeur';

export type DriverCoordinate = {
  latitude: number;
  longitude: number;
  heading: number | null;
  speed: number | null;
  accuracy: number | null;
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
      heading: String(coord.heading ?? ''),
      accuracy: String(coord.accuracy ?? ''),
      speed: String(coord.speed ?? ''),
      is_active: isActive,
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
  const result = buildAndValidateDriverPayload(
    coord,
    userData,
    planning_date,
    region_id,
    isActive,
  );

  if (result.valid === false) {
    console.warn(`[driverLocationApi] API call skipped — ${result.reason}`);
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

    if (res?.status) {
      if (isActive === 1) {
        console.log('[driverLocationApi] tracking on', {
          lat: coord.latitude,
          lon: coord.longitude,
          region_id: result.payload.region_id,
          planning_date: result.payload.planning_date,
          order_id: orderId,
        });
      }
      return true;
    }

    console.warn('[driverLocationApi] API responded with failure status');
    return false;
  } catch (error) {
    console.error('[driverLocationApi] Failed to send location:', error);
    return false;
  }
}

/**
 * Fire-and-forget: ping live location once (e.g. after successful Verify_status).
 * Does not replace the 15-min native tracking interval.
 */
export async function pingDriverLiveLocation(
  userData?: UserDataShape | null,
): Promise<void> {
  try {
    const resolvedUser = userData ?? (await loadTrackingUserData());
    if (!resolvedUser?.user || resolvedUser.user.role !== REQUIRED_CHAUFFEUR_ROLE) {
      return;
    }

    const { getLastLocation } = await import('expo-driver-location');
    const { getChauffeurLocation } = await import(
      '@/src/utils/chauffeurLocationCache'
    );

    let latitude = 0;
    let longitude = 0;
    let heading: number | null = null;
    let speed: number | null = null;
    let accuracy: number | null = null;

    const last = await getLastLocation();
    if (last?.latitude && last?.longitude) {
      latitude = last.latitude;
      longitude = last.longitude;
      heading = last.heading ?? null;
      speed = last.speed ?? null;
      accuracy = last.accuracy ?? null;
    } else {
      const cached = getChauffeurLocation();
      if (cached.latitude && cached.longitude) {
        latitude = cached.latitude;
        longitude = cached.longitude;
      }
    }

    if (!latitude || !longitude) {
      console.warn(
        '[driverLocationApi] live location ping skipped — no coords',
      );
      return;
    }

    const { region_id, planning_date } = await resolveTrackingContext();
    await sendDriverLocationUpdate(
      { latitude, longitude, heading, speed, accuracy },
      resolvedUser,
      region_id,
      planning_date,
      1,
    );
  } catch (error) {
    console.warn('[driverLocationApi] live location ping failed', error);
  }
}
