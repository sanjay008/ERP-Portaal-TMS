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
};

export type NativeShiftLocationGuardConfig = Omit<
  NativeTrackingConfig,
  'apiIntervalSeconds'
> & {
  endTripApiUrl?: string;
  seedLatitude?: number;
  seedLongitude?: number;
};

export type NativeDriverCoordinate = {
  latitude: number;
  longitude: number;
  heading: number | null;
  speed: number | null;
  accuracy: number | null;
};

export type ShiftForceClosedEvent = {
  reason: string;
  regionId?: string;
  planningDate?: string;
};
