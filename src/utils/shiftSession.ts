import { getData, storeData } from '@/src/utils/storeData';

export const ACTIVE_SHIFT_KEY = 'ACTIVE_SHIFT_SESSION';

export type ActiveShiftSession = {
  shiftActive: boolean;
  region_id: number | string;
  region_name: string;
  planning_date: string;
  started_at: string;
  user_id?: number | string;
  relaties_id?: number | string;
  role?: string;
};

export function isShiftActive(
  session: ActiveShiftSession | null | undefined,
): boolean {
  return Boolean(session?.shiftActive && session?.region_id && session?.planning_date);
}

export function doesShiftBelongToUser(
  session: ActiveShiftSession | null | undefined,
  userData: any,
): boolean {
  if (!isShiftActive(session) || !userData?.user?.id) {
    return false;
  }

  if (
    session!.user_id != null &&
    String(session!.user_id) !== String(userData.user.id)
  ) {
    return false;
  }

  if (
    session!.relaties_id != null &&
    userData?.relaties?.id != null &&
    String(session!.relaties_id) !== String(userData.relaties.id)
  ) {
    return false;
  }

  if (
    session!.role != null &&
    userData?.user?.role != null &&
    String(session!.role) !== String(userData.user.role)
  ) {
    return false;
  }

  return true;
}

export async function saveActiveShift(
  session: ActiveShiftSession,
): Promise<void> {
  await storeData(ACTIVE_SHIFT_KEY, session);
  console.log('[Shift] saved', session);
}

export async function loadActiveShift(): Promise<ActiveShiftSession | null> {
  const session = await getData(ACTIVE_SHIFT_KEY);
  if (!isShiftActive(session)) {
    return null;
  }
  return session as ActiveShiftSession;
}

export async function clearActiveShift(): Promise<void> {
  await storeData(ACTIVE_SHIFT_KEY, null);
  console.log('[Shift] cleared');
}

export const SHIFT_REGISTRY_KEY = 'SHIFT_REGISTRY_BY_REGION';

export type ShiftRegistry = Record<string, ActiveShiftSession>;

function getShiftRegistryKey(regionId: number | string): string {
  return String(regionId);
}

export async function saveShiftToRegistry(
  session: ActiveShiftSession,
): Promise<void> {
  const registry =
    ((await getData(SHIFT_REGISTRY_KEY)) as ShiftRegistry | null) ?? {};
  registry[getShiftRegistryKey(session.region_id)] = session;
  await storeData(SHIFT_REGISTRY_KEY, registry);
}

export async function loadShiftFromRegistry(
  regionId: number | string | null | undefined,
): Promise<ActiveShiftSession | null> {
  if (regionId == null) {
    return null;
  }
  const registry =
    ((await getData(SHIFT_REGISTRY_KEY)) as ShiftRegistry | null) ?? {};
  const session = registry[getShiftRegistryKey(regionId)];
  return isShiftActive(session) ? session : null;
}

export function isShiftActiveForRegion(
  session: ActiveShiftSession | null | undefined,
  regionId: number | string | null | undefined,
): boolean {
  if (!isShiftActive(session) || regionId == null) {
    return false;
  }
  return String(session!.region_id) === String(regionId);
}

export async function deactivateActiveShift(
  session: ActiveShiftSession | null | undefined,
): Promise<void> {
  if (!session) {
    await clearActiveShift();
    return;
  }
  const inactive = { ...session, shiftActive: false };
  await storeData(ACTIVE_SHIFT_KEY, inactive);
}

export const TRACKING_REGION_KEY = 'TRACKING_REGION_CONTEXT';

export type TrackingRegionContext = {
  region_id: number | string;
  planning_date: string;
};

export async function saveTrackingRegion(
  context: TrackingRegionContext,
): Promise<void> {
  await storeData(TRACKING_REGION_KEY, context);
}

export async function loadTrackingRegion(): Promise<TrackingRegionContext | null> {
  const context = await getData(TRACKING_REGION_KEY);
  if (!context?.region_id) {
    return null;
  }
  return context as TrackingRegionContext;
}
