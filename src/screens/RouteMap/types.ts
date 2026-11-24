export type RouteMapMarkerShape =
  | "circle"
  | "square"
  | "star"
  | "triangle"
  | "hold"
  | string;

export type RouteMapMarkerOverlay = "none" | "check" | "x" | "half" | string;

export type RouteMapMarker = {
  shape?: RouteMapMarkerShape;
  label?: string | number | null;
  fill_color?: string | null;
  border_color?: string | null;
  text_color?: string | null;
  badge_fill?: string | null;
  overlay?: RouteMapMarkerOverlay;
  is_done?: boolean;
  is_failed?: boolean;
  is_partial?: boolean;
};

export type GoogleMapsDestination = {
  lat?: number | string | null;
  lng?: number | string | null;
  query?: string | null;
};

export type RouteMapBaseLocation = {
  latitude?: number | string | null;
  longitude?: number | string | null;
  name?: string | null;
  address?: string | null;
};

export type RouteMapOrderType =
  | "pickup"
  | "delivery"
  | "additional_address"
  | string;

export type RouteMapStop = {
  stop_key: string;
  stop_number?: number | string | null;
  sort_order?: number | null;
  /** Prefer for card title; falls back to name. */
  customer_name?: string | null;
  name?: string | null;
  order_type?: RouteMapOrderType | null;
  order_type_label?: string | null;
  eta?: string | null;
  address?: string | null;
  ordernr?: string | number | null;
  order_id?: number | string | null;
  driver_instructions?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  is_done?: boolean;
  google_maps_destination?: GoogleMapsDestination | null;
  marker?: RouteMapMarker | null;
};

export type DriverAssignedRegion = {
  region_id: number | string;
  region_name?: string | null;
  region_color?: string | null;
  trip_started_at?: string | null;
  trip_ended_at?: string | null;
  allow_planning?: boolean | number | null;
};

export type DriverAssignedRegionsData = {
  planning_date?: string;
  default_date?: string;
  regions?: DriverAssignedRegion[];
};

/** Road-following path from server (GraphHopper / Google) — same as web planning. */
export type RoutePathPoint = {
  lat?: number | string | null;
  lng?: number | string | null;
};

export type DriverRouteMapData = {
  region_id?: number | string;
  region_name?: string | null;
  region_color?: string | null;
  planning_date?: string;
  trip_started_at?: string | null;
  trip_ended_at?: string | null;
  base_location?: RouteMapBaseLocation | null;
  stops_total?: number;
  stops_done?: number;
  stops_todo?: number;
  stops?: RouteMapStop[];
  /** Polyline must use this only — not stop-to-stop straight lines. */
  route_path?: RoutePathPoint[] | null;
};

export function toFiniteNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

export function hasValidCoordinates(stop: {
  latitude?: unknown;
  longitude?: unknown;
}): boolean {
  const lat = toFiniteNumber(stop.latitude);
  const lng = toFiniteNumber(stop.longitude);
  return lat != null && lng != null;
}

/** Todo stops in API planning order (sort_order / stop_number). */
export function getTodoStopsInRouteOrder(
  stops?: RouteMapStop[] | null,
): RouteMapStop[] {
  if (!Array.isArray(stops) || stops.length === 0) return [];
  return stops.filter((stop) => Boolean(stop) && stop.is_done !== true);
}
