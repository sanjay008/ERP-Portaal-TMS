import * as Location from 'expo-location';
import {
  doesShiftBelongToUser,
  isShiftActive,
  isShiftActiveForRegion,
  type ActiveShiftSession,
} from '@/src/utils/shiftSession';
import { areLocationServicesEnabled } from '@/src/hooks/useUserGPS';

export type PickupDropoffScanBlock = 'trip' | 'region' | 'location' | null;

export const isPickupDropoffType = (type?: string | null): boolean =>
  type === 'pickup_dropoff';

/**
 * pickup_dropoff slide: scanner is allowed only when trip is on, the order belongs to
 * the trip-on region, AND device location is on.
 * Returns the reason when blocked, or null when allowed. Never prompts the user.
 */
export async function getPickupDropoffScanBlock(
  activeShift: ActiveShiftSession | null | undefined,
  userData: any,
  orderRegionId?: number | string | null,
): Promise<PickupDropoffScanBlock> {
  const tripOn =
    isShiftActive(activeShift) && doesShiftBelongToUser(activeShift, userData);
  if (!tripOn) return 'trip';

  if (!isShiftActiveForRegion(activeShift, orderRegionId)) return 'region';

  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== Location.PermissionStatus.GRANTED) return 'location';
    if (!(await areLocationServicesEnabled())) return 'location';
  } catch {
    return 'location';
  }
  return null;
}

export function getPickupDropoffBlockText(
  block: Exclude<PickupDropoffScanBlock, null>,
  t: (key: string) => string,
): string {
  if (block === 'trip') return t('Please start your trip before scanning.');
  if (block === 'region') {
    return t('You can only scan parcels of the region where your trip is on.');
  }
  return t('GPS/Location Services must be enabled before you can scan.');
}
