type ScanInfoInput = {
  order_id?: number | string;
  item_id?: number | string;
  scan_source?: string;
  item?: unknown;
  scan_info?: string | Record<string, unknown> | null;
};

/** Describes how the parcel was identified when status_update is submitted. */
export function buildScanInfo(data: ScanInfoInput = {}): string {
  if (typeof data?.scan_info === 'string' && data.scan_info.trim()) {
    return data.scan_info;
  }

  if (
    data?.scan_info &&
    typeof data.scan_info === 'object' &&
    !Array.isArray(data.scan_info)
  ) {
    try {
      return JSON.stringify(data.scan_info);
    } catch {
      // fall through and rebuild
    }
  }

  const source =
    data.scan_source === 'manual_entry'
      ? 'manual_entry'
      : data.item
        ? 'pickup_box_action'
        : 'barcode_scan';
  const description = {
    manual_entry: 'Order ID and Item ID entered manually in the scanner',
    pickup_box_action: 'Status updated directly from the parcel action in PickUpBox',
    barcode_scan: 'Parcel barcode scanned with the device scanner',
  }[source];

  return JSON.stringify({
    source,
    description,
    order_id: data.order_id ?? null,
    item_id: data.item_id ?? null,
  });
}
