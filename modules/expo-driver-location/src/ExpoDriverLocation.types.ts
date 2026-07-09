export type NativeTrackingConfig = {
  apiUrl: string;
  token: string;
  role: string;
  planningDate: string;
  relatiesId: string;
  userId: string;
  regionId: string;
  distanceThresholdMeters: number;
  notificationTitle: string;
  notificationBody: string;
};

export type NativeDriverCoordinate = {
  latitude: number;
  longitude: number;
  heading: number | null;
  speed: number | null;
  accuracy: number | null;
};
