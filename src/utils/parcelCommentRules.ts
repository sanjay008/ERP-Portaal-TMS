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

  if (isPickupPlannedOrder(order)) {
    return true;
  }

  if (isDeliveryOrder(order)) {
    return deliveryLabel?.damaged_required == 1;
  }
  return false;
}

/** Deliver status_update / payload: send is_damage only when label requires it. Pickup-planned keeps damage. */
export function shouldSendDamageForDeliveryLabel(
  deliveryLabel: any,
  order?: any,
): boolean {
  if (order != null && isPickupPlannedOrder(order)) {
    return true;
  }
  if (order != null && isDeliveryOrder(order)) {
    return deliveryLabel?.damaged_required == 1;
  }
  // No order context (or non-delivery): only send if label explicitly requires damage.
  if (deliveryLabel != null) {
    return deliveryLabel?.damaged_required == 1;
  }
  return false;
}

/** Delivery label must explicitly require a customer signature. */
export function doesLabelRequireSignature(deliveryLabel: any): boolean {
  return Number(deliveryLabel?.signature_required) === 1;
}

export function isSignatureRequiredAfterStatusUpdate(
  statusUpdateResponse: any,
  deliveryLabel: any,
): boolean {
  const status =
    statusUpdateResponse?.tms_current_status ??
    statusUpdateResponse?.data?.tms_current_status;
  return Number(status) === 5 && doesLabelRequireSignature(deliveryLabel);
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
