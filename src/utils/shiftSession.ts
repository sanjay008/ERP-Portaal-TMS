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
