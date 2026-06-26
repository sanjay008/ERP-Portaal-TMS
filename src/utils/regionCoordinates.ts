export type LatLng = {
  latitude: number;
  longitude: number;
};

const LAT_KEYS = [
  "latitude",
  "lat",
  "region_latitude",
  "pickup_latitude",
  "delivery_latitude",
  "deliver_latitude",
  "pickup_ad_latitude",
  "delivery_ad_latitude",
  "deliver_ad_latitude",
  "pickup_lat",
  "delivery_lat",
  "region_lat",
] as const;

const LNG_KEYS = [
  "longitude",
  "lng",
  "lon",
  "long",
  "region_longitude",
  "pickup_longitude",
  "delivery_longitude",
  "deliver_longitude",
  "pickup_ad_longitude",
  "delivery_ad_longitude",
  "deliver_ad_longitude",
  "pickup_lng",
  "delivery_lng",
  "region_lng",
  "region_lon",
] as const;

export function parseCoordinate(value: unknown): number | null {
  if (value == null || value === "") return null;
  const num = Number(String(value).trim());
  if (!Number.isFinite(num)) return null;
  return num;
}

function parseLatLngString(value: unknown): LatLng | null {
  if (typeof value !== "string" || !value.includes(",")) return null;
  const [latRaw, lngRaw] = value.split(",").map((part) => part.trim());
  const latitude = parseCoordinate(latRaw);
  const longitude = parseCoordinate(lngRaw);
  if (latitude == null || longitude == null) return null;
  if (latitude === 0 && longitude === 0) return null;
  return { latitude, longitude };
}

function pickCoordinate(obj: Record<string, unknown>, keys: readonly string[]): number | null {
  const lowerMap: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    lowerMap[key.toLowerCase()] = value;
  }

  for (const key of keys) {
    const parsed = parseCoordinate(obj[key] ?? lowerMap[key.toLowerCase()]);
    if (parsed != null) return parsed;
  }
  return null;
}

export function parseLatLng(source: unknown): LatLng | null {
  if (!source || typeof source !== "object") return null;

  const obj = source as Record<string, unknown>;
  const latitude = pickCoordinate(obj, LAT_KEYS);
  const longitude = pickCoordinate(obj, LNG_KEYS);

  if (latitude == null || longitude == null) {
    for (const value of Object.values(obj)) {
      const fromString = parseLatLngString(value);
      if (fromString) return fromString;
    }
    return null;
  }
  if (latitude === 0 && longitude === 0) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return null;
  }

  return { latitude, longitude };
}

function findLatLngDeep(source: unknown, depth = 0): LatLng | null {
  const direct = parseLatLng(source);
  if (direct) return direct;
  if (!source || typeof source !== "object" || depth > 3) return null;

  for (const value of Object.values(source as Record<string, unknown>)) {
    if (value && typeof value === "object") {
      const nested = findLatLngDeep(value, depth + 1);
      if (nested) return nested;
    }
  }

  return null;
}

function firstValidLatLng(sources: unknown[]): LatLng | null {
  for (const source of sources) {
    const parsed = findLatLngDeep(source);
    if (parsed) return parsed;
  }
  return null;
}

function resolveStatusId(
  statusId: unknown,
  orderData?: Record<string, unknown> | null,
): number | null {
  const candidates = [
    statusId,
    orderData?.tmsstatus && typeof orderData.tmsstatus === "object"
      ? (orderData.tmsstatus as Record<string, unknown>).id
      : null,
    orderData?.status,
    orderData?.tms_status_id,
    orderData?.item_status_id,
  ];

  for (const candidate of candidates) {
    const status = Number(candidate);
    if (Number.isFinite(status)) return status;
  }

  return null;
}

type ResolveArgs = {
  orderStatusId?: unknown;
  pickupRegionData?: unknown;
  deliveryRegionData?: unknown;
  orderData?: Record<string, unknown> | null;
};

/** Status 1|2 → pickup coords; 4|5 → delivery coords. */
export function resolveOrderNavigationDestination({
  orderStatusId = null,
  pickupRegionData = null,
  deliveryRegionData = null,
  orderData = null,
}: ResolveArgs): LatLng | null {
  const status = resolveStatusId(orderStatusId, orderData);
  if (status == null) return null;

  const pickupSources = [
    pickupRegionData,
    orderData?.pickup_region_data,
    orderData?.pickup_region,
    orderData?.region_data,
    {
      latitude: orderData?.pickup_ad_latitude,
      longitude: orderData?.pickup_ad_longitude,
      lat: orderData?.pickup_lat,
      lng: orderData?.pickup_lng,
    },
  ];

  const deliverySources = [
    deliveryRegionData,
    orderData?.delivery_region_data,
    orderData?.deliver_region_data,
    orderData?.delivery_region,
    {
      latitude: orderData?.delivery_ad_latitude,
      longitude: orderData?.delivery_ad_longitude,
      lat: orderData?.delivery_lat,
      lng: orderData?.delivery_lng,
    },
    {
      latitude: orderData?.deliver_ad_latitude,
      longitude: orderData?.deliver_ad_longitude,
    },
  ];

  if (status === 1 || status === 2) {
    return firstValidLatLng(pickupSources);
  }

  if (status === 3 || status === 4 || status === 5) {
    return firstValidLatLng(deliverySources);
  }

  return null;
}
