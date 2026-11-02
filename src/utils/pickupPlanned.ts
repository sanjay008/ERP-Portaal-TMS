/** Pickup planned sheet — allowed order/item tmsstatus ids */
export const PICKUP_PLANNED_STATUS_ID = [1, 8, 59];

export const DELIVERY_STATUS_ID = 4;

export function getOrderTmsStatusId(order: any): number {
  if (!order) return NaN;

  const raw =
    order?.items?.[0]?.tmsstatus?.id ??
    order?.tmsstatus?.id ??
    order?.tms_status_id;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : NaN;
}

export function getItemTmsStatusId(item: any): number {
  if (!item) return NaN;
  const raw =
    item?.tmsstatus?.id ??
    item?.tms_status_id ??
    item?.item_status_id ??
    item?.status;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : NaN;
}

export function isPickupPlannedStatusId(statusId: number): boolean {
  return PICKUP_PLANNED_STATUS_ID.includes(statusId);
}

export function isPickupPlannedOrder(order: any): boolean {
  return isPickupPlannedStatusId(getOrderTmsStatusId(order));
}

export function isReadyForPickupSlide(
  slideType?: string | null,
  globalSlideType?: string | null,
): boolean {
  return (
    slideType === 'ready_for_pickup' ||
    globalSlideType === 'ready_for_pickup'
  );
}

export function isPickupDropoffSlide(
  slideType?: string | null,
  globalSlideType?: string | null,
): boolean {
  return (
    slideType === 'pickup_dropoff' ||
    slideType === 'additional_address' ||
    globalSlideType === 'pickup_dropoff' ||
    globalSlideType === 'additional_address'
  );
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
  if (isReadyForPickupSlide(slideType, globalSlideType)) {
    return Boolean(verifyData?.order_data);
  }

  if (!isPickupDropoffSlide(slideType, globalSlideType)) return false;
  if (verifyData?.error_key) return false;

  const matchedItem = getScannedOrderItem(verifyData, scanPayload);
  const statusAllowed =
    isPickupPlannedOrder(verifyData?.order_data) ||
    (matchedItem != null &&
      isPickupPlannedStatusId(getItemTmsStatusId(matchedItem)));

  if (!statusAllowed) return false;

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
  if (apiData == null) return null;
  const raw =
    apiData?.total_remaining_item_to_scan ??
    apiData?.remaining_item_to_scan ??
    apiData?.remaining_item ??
    apiData?.data?.total_remaining_item_to_scan ??
    apiData?.data?.remaining_item_to_scan ??
    apiData?.data?.remaining_item;
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

/**
 * How many parcels remain AFTER treating current scan as done.
 * Backend verify still includes the just-scanned item (status_update not yet called),
 * so show apiRemaining - 1 (e.g. backend 3 → popup "2 more parcel").
 */
export function getMoreParcelsCountAfterScan(
  orderData: any,
  apiData: any,
  justScannedItemId: number | string,
  noParcelItemIds: number[] = [],
): number {
  const apiRemaining = getRemainingParcelsFromApi(apiData);
  if (apiRemaining != null) {
    return Math.max(0, apiRemaining - 1);
  }

  return (
    countRemainingDeliveryParcels(
      orderData,
      noParcelItemIds,
      justScannedItemId,
    ) ?? 0
  );
}

/** Build / merge a ProductDamageList entry for a just-verified delivery parcel. */
export function buildDeliveryDamageListEntry(
  orderData: any,
  itemId: number | string,
  itemDataList?: any[],
): any {
  const numericId = Number(itemId);
  if (Array.isArray(itemDataList)) {
    const fromApi = itemDataList.find(
      (el: any) => Number(el?.id) === numericId,
    );
    if (fromApi) return { ...fromApi, scan_qty: 1 };
  }

  const orderItems = orderData?.items ?? orderData?.order_data?.items ?? [];
  const matched = Array.isArray(orderItems)
    ? orderItems.find((el: any) => Number(el?.id) === numericId)
    : null;

  return {
    id: numericId,
    item_status_id: matched?.item_status_id ?? null,
    scan_qty: 1,
    delivery_label: matched?.delivery_label ?? null,
    is_damaged_delivery: null,
    is_damaged_pickup: matched?.is_damaged_pickup ?? null,
    tms_product_name: matched?.tms_product_name ?? '',
  };
}

export function mergeParcelIntoDamageList(
  prev: any[] | null | undefined,
  entry: any,
): any[] {
  const list = Array.isArray(prev) ? [...prev] : [];
  const idx = list.findIndex((el) => Number(el?.id) === Number(entry?.id));
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...entry };
    return list;
  }
  return [...list, entry];
}
