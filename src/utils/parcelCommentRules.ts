import { getOrderStatusId, isDeliveryOrder } from '@/src/utils/orderStatus';
import { isPickupPlannedOrder } from '@/src/utils/pickupPlanned';

const toFlag = (value: unknown): boolean | null => {
  if (value == null || value === '') return null;
  const n = Number(value);
  if (n === 1 || value === true) return true;
  if (n === 0 || value === false) return false;
  return null;
};

export function shouldShowDamageInCommentModal(
  _deliveryLabel: any,
  order: any,
): boolean {
  return isDeliveryOrder(order) || isPickupPlannedOrder(order);
}

/** Signature after last parcel — use delivery label flag only (no tms_current_status). */
export function isSignatureRequiredAfterStatusUpdate(
  _statusUpdateResponse: any,
  deliveryLabel: any,
): boolean {
  return deliveryLabel?.signature_required == 1;
}


export function isDescriptionOptional(
  deliveryLabel: any,
  damageData: any,
  order?: any,
): boolean {
  const statusId = Number(order?.tmsstatus?.id ?? order?.status);
  return (
    statusId === 4 &&
    Number(deliveryLabel?.id) === 21 &&
    Number(damageData?.id) === 34
  );
}

/**
 * Skip comment modal after camera proof — same rule as ScannerScreens camera setData.
 */
export function shouldSkipCommentAfterCamera(
  deliveryLabel: any,
  damageData: any,
): boolean {
  return Number(deliveryLabel?.id) === 21 && Number(damageData?.id) === 28;
}

export function isUndamagedDamageOption(damageData: any): boolean {
  if (toFlag(damageData?.is_undamaged) === true) return true;
  if (toFlag(damageData?.is_undamaged) === false) return false;
  return Number(damageData?.id) === 34;
}

export function getOrderStatusIdForComment(order: any): number {
  return getOrderStatusId(order);
}
