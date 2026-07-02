import { getOrderStatusId, isDeliveryOrder } from '@/src/utils/orderStatus';

const toFlag = (value: unknown): boolean | null => {
  if (value == null || value === '') return null;
  const n = Number(value);
  if (n === 1 || value === true) return true;
  if (n === 0 || value === false) return false;
  return null;
};

/** Damaged / undamaged — only when order delivery status id is 4. */
export function shouldShowDamageInCommentModal(
  _deliveryLabel: any,
  order: any,
): boolean {
  return isDeliveryOrder(order);
}

/** Signature step after last parcel — same rules as ScannerScreens CommentFun. */
export function isSignatureRequiredAfterStatusUpdate(
  statusUpdateResponse: any,
  deliveryLabel: any,
): boolean {
  return (
    Number(statusUpdateResponse?.tms_current_status) === 5 &&
    Number(deliveryLabel?.signature_required) === 1
  );
}

/**
 * Description optional when backend marks it optional, or legacy Delivered + Undamaged.
 * Backend can send on damage row or delivery label:
 * - comment_optional: 1
 * - comment_required: 0
 */
export function isDescriptionOptional(
  deliveryLabel: any,
  damageData: any,
  order?: any,
): boolean {
  if (order != null && !isDeliveryOrder(order)) {
    return false;
  }
  const damageOptional = toFlag(damageData?.comment_optional);
  if (damageOptional === true) return true;
  if (toFlag(damageData?.comment_required) === false) return true;
  if (toFlag(damageData?.comment_required) === true) return false;

  const labelOptional = toFlag(deliveryLabel?.comment_optional);
  if (labelOptional === true) return true;
  if (toFlag(deliveryLabel?.comment_required) === false) return true;
  if (toFlag(deliveryLabel?.comment_required) === true) return false;

  // Scanner legacy: Delivered label (21) + Undamaged (34)
  return Number(deliveryLabel?.id) === 21 && Number(damageData?.id) === 34;
}

/**
 * Skip comment modal after camera proof (go straight to status/signature flow).
 * Backend: skip_comment / comment_modal_skip on damage or label.
 */
export function shouldSkipCommentAfterCamera(
  deliveryLabel: any,
  damageData: any,
): boolean {
  if (toFlag(damageData?.skip_comment) === true) return true;
  if (toFlag(damageData?.comment_modal_skip) === true) return true;
  if (toFlag(deliveryLabel?.skip_comment) === true) return true;

  // Scanner legacy
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
