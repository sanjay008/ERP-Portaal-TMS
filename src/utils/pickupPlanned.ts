/** Pickup scheduled / planned — tmsstatus.id must be exactly 1 */
export const PICKUP_PLANNED_STATUS_ID = 1;

export const DELIVERY_STATUS_ID = 4;

export function getOrderTmsStatusId(order: any): number {
  if (!order) return NaN;
  const raw = order?.tmsstatus?.id ?? order?.tms_status_id;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : NaN;
}

export function isPickupPlannedOrder(order: any): boolean {
  return getOrderTmsStatusId(order) === PICKUP_PLANNED_STATUS_ID;
}

export function isPickupDropoffSlide(
  slideType?: string | null,
  globalSlideType?: string | null,
): boolean {
  return slideType === 'pickup_dropoff' || globalSlideType === 'pickup_dropoff';
}

function itemMatchesScanPayload(
  item: any,
  scanPayload: { item_id?: number | string },
): boolean {
  const target = String(scanPayload?.item_id);
  return (
    String(item?.id) === target || String(item?.item_id) === target
  );
}

export function getScannedOrderItem(
  verifyData: any,
  scanPayload: { item_id?: number | string },
): any | null {
  const lists = [
    verifyData?.order_data?.items,
    verifyData?.items,
    verifyData?.item_data_list,
  ];

  for (const items of lists) {
    if (!Array.isArray(items)) continue;
    const match = items.find((item: any) =>
      itemMatchesScanPayload(item, scanPayload),
    );
    if (match) return match;
  }

  return null;
}

/** First-time pickup planned scan — show 4-button sheet */
export function shouldOpenPickupPlannedModal(
  verifyData: any,
  scanPayload: { item_id?: number | string },
  slideType?: string | null,
  globalSlideType?: string | null,
): boolean {
  if (!isPickupDropoffSlide(slideType, globalSlideType)) return false;
  if (verifyData?.error_key) return false;
  if (!isPickupPlannedOrder(verifyData?.order_data)) return false;

  const matchedItem = getScannedOrderItem(verifyData, scanPayload);
  if (matchedItem != null) {
    return Number(matchedItem.scan_qty ?? 0) === 0;
  }

  if (
    verifyData?.isscaned ||
    Number(verifyData?.is_scan) === 1
  ) {
    return false;
  }

  return true;
}

/** Item already delivered for this scan — only scan_qty >= 1 or error_key */
export function isDeliveryItemAlreadyScanned(
  verifyData: any,
  scanPayload: { item_id?: number | string },
): boolean {
  if (Boolean(verifyData?.error_key)) return true;

  const matchedItem = getScannedOrderItem(verifyData, scanPayload);
  if (matchedItem != null) {
    return Number(matchedItem.scan_qty ?? 0) >= 1;
  }

  return false;
}

/** Status 4: item still needs delivery label picker */
export function itemNeedsDeliveryLabelSelection(
  verifyData: any,
  scanPayload: { item_id?: number | string },
): boolean {
  if (getOrderTmsStatusId(verifyData?.order_data) !== DELIVERY_STATUS_ID) {
    return false;
  }
  if (isDeliveryItemAlreadyScanned(verifyData, scanPayload)) return false;

  const matchedItem = getScannedOrderItem(verifyData, scanPayload);
  if (!matchedItem) return false;

  return Number(matchedItem.scan_qty ?? 0) === 0;
}

/** API remaining count — prefer total_remaining_item_to_scan from verify/status_update */
export function getRemainingParcelsFromApi(apiData: any): number | null {
  const raw =
    apiData?.total_remaining_item_to_scan ?? apiData?.remaining_item;
  if (raw == null || raw === '') return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Fallback: count items with scan_qty === 0 */
export function countRemainingDeliveryParcels(
  orderData: any,
  noParcelItemIds: number[] = [],
  justDeliveredItemId?: number | string | null,
): number | null {
  const items = orderData?.items ?? orderData?.order_data?.items ?? [];
  if (!Array.isArray(items) || items.length === 0) return null;

  const excluded = new Set(noParcelItemIds.map((id) => String(id)));

  return items.filter((item: any) => {
    const itemId = String(item?.id);
    if (excluded.has(itemId)) return false;
    if (
      justDeliveredItemId != null &&
      itemId === String(justDeliveredItemId)
    ) {
      return false;
    }
    return Number(item?.scan_qty ?? 0) === 0;
  }).length;
}

export function hasRemainingParcelsToDeliver(
  orderData: any,
  apiData: any,
  noParcelItemIds: number[] = [],
  justDeliveredItemId?: number | string | null,
): boolean {
  const apiRemaining = getRemainingParcelsFromApi(apiData);
  if (apiRemaining != null) {
    return apiRemaining > 0;
  }

  const clientRemaining = countRemainingDeliveryParcels(
    orderData,
    noParcelItemIds,
    justDeliveredItemId,
  );

  if (clientRemaining != null) {
    return clientRemaining > 0;
  }

  return false;
}
