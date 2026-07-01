export type LatLng = {
  latitude: number;
  longitude: number;
};

export function parseCoordinate(value: unknown): number | null {
  if (value == null || value === "") return null;
  const num = Number(String(value).trim());
  if (!Number.isFinite(num)) return null;
  return num;
}

type ResolveArgs = {
  orderData?: Record<string, unknown> | null | any;
};

export function resolveOrderNavigationDestination({
  orderData = null,
}: ResolveArgs): LatLng | null {
  if (!orderData) return null;

  const stopType = orderData?.stop_data?.stop_type;

  if (stopType === "pickup") {
    const latitude = parseCoordinate(orderData?.pickup_ad_latitude);
    const longitude = parseCoordinate(orderData?.pickup_ad_longitude);
    if (latitude == null || longitude == null) return null;
    return { latitude, longitude };
  }

  if (stopType === "deliver") {
    const latitude = parseCoordinate(orderData?.delivery_ad_latitude);
    const longitude = parseCoordinate(orderData?.delivery_ad_longitude);
    if (latitude == null || longitude == null) return null;
    return { latitude, longitude };
  }

  return null;
}