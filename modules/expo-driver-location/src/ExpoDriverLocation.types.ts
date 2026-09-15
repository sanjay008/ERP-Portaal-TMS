export type NativeTrackingConfig = {
  apiUrl: string;
  token: string;
  role: string;
  planningDate: string;
  relatiesId: string;
  userId: string;
  regionId: string;
  apiIntervalSeconds: number;
  notificationTitle: string;
  notificationBody: string;
  /** Latest scanned order — omitted when none yet */
  orderId?: string;
};

export type NativeShiftLocationGuardConfig = Omit<
  NativeTrackingConfig,
  'apiIntervalSeconds'
> & {
  endTripApiUrl?: string;
  seedLatitude?: number;
  seedLongitude?: number;
};

export type LocationSource =
  | 'getCurrentLocation'
  | 'lastLocation'
  | 'published_cache'
  | 'interval'
  | string;

export type NativeDriverCoordinate = {
  latitude: number;
  longitude: number;
  heading?: number | null;
  speed?: number | null;
  accuracy?: number | null;
  /** Epoch ms when the GPS fix was measured */
  capturedAtMs?: number | null;
  altitude?: number | null;
  altitudeAccuracy?: number | null;
  isMock?: boolean | null;
  source?: LocationSource | null;
  provider?: string | null;
};

export type ShiftForceClosedEvent = {
  reason: string;
  regionId?: string;
  planningDate?: string;
};
