import { removeMultipleData } from '@/src/utils/storeData';

export const LOGOUT_CLEAR_KEYS = [
  'USERDATA',
  'AUTH',
  'LOGIN',
  'COMPANYLOGIN',
  'COMPANYDATA',
  'COMPANYLOGO',
  'google_maps_api_key',
  'GOOGLE_API_KEY',
];

export async function clearUserSessionStorage(): Promise<void> {
  await removeMultipleData(LOGOUT_CLEAR_KEYS);
}
