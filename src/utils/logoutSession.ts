import { removeMultipleData } from '@/src/utils/storeData';
import { ACTIVE_SHIFT_KEY, TRACKING_REGION_KEY } from '@/src/utils/shiftSession';

export const LOGOUT_CLEAR_KEYS = [
  'USERDATA',
  'AUTH',
  'LOGIN',
  'COMPANYLOGIN',
  'COMPANYDATA',
  'COMPANYLOGO',
  'google_maps_api_key',
  'GOOGLE_API_KEY',
  ACTIVE_SHIFT_KEY,
  TRACKING_REGION_KEY,
];

export async function clearUserSessionStorage(): Promise<void> {
  await removeMultipleData(LOGOUT_CLEAR_KEYS);
}
