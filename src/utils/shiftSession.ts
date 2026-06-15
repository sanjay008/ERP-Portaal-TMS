import { getData, storeData } from '@/src/utils/storeData';

export const ACTIVE_SHIFT_KEY = 'ACTIVE_SHIFT_SESSION';

export type ActiveShiftSession = {
  shiftActive: boolean;
  region_id: number | string;
  region_name: string;
  planning_date: string;
  started_at: string;
  user_id?: number | string;
};

export function isShiftActive(
  session: ActiveShiftSession | null | undefined,
): boolean {
  return Boolean(session?.shiftActive && session?.region_id && session?.planning_date);
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
