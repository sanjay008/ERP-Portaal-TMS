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
  deliveryLabel: any,
  order: any,
): boolean {
  // Pickup: always show damage list (no label flag check).
  if (isPickupPlannedOrder(order)) {
    return true;
  }
  // Delivery / drop: only when label says damaged_required == 1.
  if (isDeliveryOrder(order)) {
    return deliveryLabel?.damaged_required == 1;
  }
  return false;
}

/** Signature after last parcel — same rules as ScannerScreens CommentFun. */
export function isSignatureRequiredAfterStatusUpdate(
  statusUpdateResponse: any,
  deliveryLabel: any,
): boolean {
  const status =
    statusUpdateResponse?.tms_current_status ??
    statusUpdateResponse?.data?.tms_current_status;
  return (
    Number(status) === 5 && deliveryLabel?.signature_required == 1
  );
}


export function isDescriptionOptional(
  deliveryLabel: any,
  damageData: any,
  order?: any,
): boolean {
  const statusId = Number(
    order?.tmsstatus?.id ?? order?.status ?? order?.items?.[0]?.tmsstatus?.id,
  );
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
