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

  const stopData = orderData.stop_data;
  const stopType = stopData?.stop_type;

  let latitude: number | null = null;
  let longitude: number | null = null;

  switch (stopType) {
    case "pickup": {
      latitude = parseCoordinate(
        stopData?.depot?.latitude ?? orderData.pickup_ad_latitude,
      );

      longitude = parseCoordinate(
        stopData?.depot?.longitude ?? orderData.pickup_ad_longitude,
      );
      break;
    }

    case "deliver": {
      latitude = parseCoordinate(
        stopData?.depot?.latitude ?? orderData.delivery_ad_latitude,
      );

      longitude = parseCoordinate(
        stopData?.depot?.longitude ?? orderData.delivery_ad_longitude,
      );
      break;
    }

    default:
      return null;
  }

  if (latitude == null || longitude == null) return null;

  if (
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }

  return { latitude, longitude };
}
