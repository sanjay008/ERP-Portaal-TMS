import * as Location from 'expo-location';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState, Linking, Platform } from 'react-native';
import { GlobalContextData } from '../context/GlobalContext';
import {
  buildAndValidateDriverPayload,
  REQUIRED_CHAUFFEUR_ROLE,
  resolveTrackingContext,
  sendDriverLocationUpdate,
  type DriverCoordinate,
} from '../utils/driverLocationApi';
import {
  isDriverLocationTaskRunning,
  startDriverBackgroundLocation,
  stopDriverBackgroundLocation,
} from '../tasks/driverLocationTask';
import {
  ensureBackgroundPermission,
  getBackgroundPermissionStatus,
} from '../utils/backgroundLocationPermissions';

type LocationPermissionStatus = {
  granted: boolean;
  canAskAgain: boolean;
  backgroundGranted: boolean;
};

export type LocationAccessStatus =
  | 'granted'
  | 'denied'
  | 'blocked'
  | 'services_disabled';

export async function checkLocationPermission(): Promise<LocationPermissionStatus> {
  const { status, canAskAgain } = await Location.getForegroundPermissionsAsync();
  const backgroundStatus = await getBackgroundPermissionStatus();

  return {
    granted: status === Location.PermissionStatus.GRANTED,
    canAskAgain: canAskAgain !== false,
    backgroundGranted: backgroundStatus === Location.PermissionStatus.GRANTED,
  };
}

export async function areLocationServicesEnabled(): Promise<boolean> {
  try {
    return await Location.hasServicesEnabledAsync();
  } catch {
    return false;
  }
}

export async function ensureLocationServicesEnabled(): Promise<boolean> {
  if (await areLocationServicesEnabled()) {
    return true;
  }

  if (Platform.OS === 'android') {
    try {
      await Location.enableNetworkProviderAsync();
    } catch {
      // user declined the system dialog or it is unavailable
    }
    return await areLocationServicesEnabled();
  }

  return false;
}

export async function resolveLocationAccess(): Promise<LocationAccessStatus> {
  const current = await checkLocationPermission();

  if (current.granted) {
    const servicesEnabled = await ensureLocationServicesEnabled();
    if (!servicesEnabled) {
      return 'services_disabled';
    }

    await ensureBackgroundPermission();
    return 'granted';
  }

  if (!current.canAskAgain) {
    return 'blocked';
  }

  const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
  if (status === Location.PermissionStatus.GRANTED) {
    const servicesEnabled = await ensureLocationServicesEnabled();
    if (!servicesEnabled) {
      return 'services_disabled';
    }

    await ensureBackgroundPermission();
    return 'granted';
  }

  if (canAskAgain === false) {
    return 'blocked';
  }

  return 'denied';
}

export async function retryLocationPermission(): Promise<LocationAccessStatus> {
  const current = await checkLocationPermission();

  if (current.granted) {
    const servicesEnabled = await ensureLocationServicesEnabled();
    if (!servicesEnabled) {
      return 'services_disabled';
    }

    await ensureBackgroundPermission();
    return 'granted';
  }

  if (!current.canAskAgain) {
    return 'blocked';
  }

  const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
  if (status === Location.PermissionStatus.GRANTED) {
    const servicesEnabled = await ensureLocationServicesEnabled();
    if (!servicesEnabled) {
      return 'services_disabled';
    }

    await ensureBackgroundPermission();
    return 'granted';
  }

  if (canAskAgain === false) {
    return 'blocked';
  }

  return 'denied';
}

export async function openAppSettings(): Promise<void> {
  await Linking.openSettings();
}

export async function recheckLocationAccess(): Promise<LocationAccessStatus> {
  const current = await checkLocationPermission();

  if (!current.granted) {
    return current.canAskAgain ? 'denied' : 'blocked';
  }

  const servicesEnabled = await areLocationServicesEnabled();
  if (!servicesEnabled) {
    return 'services_disabled';
  }

  return 'granted';
}

export async function requestLocationAccess(): Promise<boolean> {
  const status = await resolveLocationAccess();
  return status === 'granted';
}

export async function getSafeCurrentPosition(): Promise<Location.LocationObject | null> {
  try {
    try {
      return await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
    } catch {
      return (await Location.getLastKnownPositionAsync()) ?? null;
    }
  } catch {
    return null;
  }
}

const API_DISTANCE_THRESHOLD = 50;

function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function useUserGPS() {
  const {
    UserData,
    SelectCurrentDate,
    selectRegionData,
    isGpsTracking,
    setIsGpsTracking,
    activeShift,
  } = useContext(GlobalContextData);

  const [userCoordinate, setUserCoordinate] = useState<DriverCoordinate>({
    latitude: 0,
    longitude: 0,
    heading: null,
    speed: null,
    accuracy: null,
  });
  const [isSending, setIsSending] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [locationAccess, setLocationAccess] = useState<LocationAccessStatus>('denied');

  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const lastSentCoordRef = useRef<{ latitude: number; longitude: number } | null>(null);
  const isSendingRef = useRef(false);
  const deactivateCalledRef = useRef(false);
  const trackingStartedRef = useRef(false);

  const contextRef = useRef({
    UserData,
    SelectCurrentDate,
    selectRegionData,
    activeShift,
  });

  useEffect(() => {
    contextRef.current = {
      UserData,
      SelectCurrentDate,
      selectRegionData,
      activeShift,
    };
  }, [UserData, SelectCurrentDate, selectRegionData, activeShift]);

  const isChauffeur = UserData?.user?.role === REQUIRED_CHAUFFEUR_ROLE;
  const isLoggedIn = Boolean(UserData?.user?.id);
  const shouldTrack = isChauffeur && isLoggedIn && isGpsTracking;
  const canTrack = shouldTrack && locationAccess === 'granted';

  const getTrackingContext = useCallback(async () => {
    const { activeShift: shift, SelectCurrentDate: currentDate, selectRegionData: region } =
      contextRef.current;

    return resolveTrackingContext(
      shift,
      region?.id,
      currentDate ?? null,
    );
  }, []);

  const sendLocationToBackend = useCallback(
    async (coord: DriverCoordinate, isActive: number) => {
      if (isSendingRef.current) {
        return;
      }

      const { UserData: currentUser } = contextRef.current;
      const { region_id, planning_date } = await getTrackingContext();

      const result = buildAndValidateDriverPayload(
        coord,
        currentUser,
        planning_date,
        region_id,
        isActive,
      );

      if (result.valid === false) {
        console.warn(`[useUserGPS] API call skipped — ${result.reason}`);
        return;
      }

      isSendingRef.current = true;
      setIsSending(true);

      try {
        const sent = await sendDriverLocationUpdate(
          coord,
          currentUser,
          region_id,
          planning_date,
          isActive,
        );

        if (sent && isActive === 1) {
          lastSentCoordRef.current = {
            latitude: coord.latitude,
            longitude: coord.longitude,
          };
        }
      } finally {
        isSendingRef.current = false;
        setIsSending(false);
      }
    },
    [getTrackingContext],
  );

  const refreshLocationAccess = useCallback(async () => {
    const status = await recheckLocationAccess();
    setLocationAccess(status);
    setPermissionDenied(status !== 'granted');
    return status;
  }, []);

  const stopTracking = useCallback(async (sendDeactivate = true) => {
    subscriptionRef.current?.remove();
    subscriptionRef.current = null;
    trackingStartedRef.current = false;

    try {
      await stopDriverBackgroundLocation();
    } catch (error) {
      console.warn('[useUserGPS] failed to stop background location:', error);
    }

    if (sendDeactivate && !deactivateCalledRef.current) {
      deactivateCalledRef.current = true;
      const lastCoord = lastSentCoordRef.current;
      const coordToSend: DriverCoordinate = lastCoord
        ? {
            latitude: lastCoord.latitude,
            longitude: lastCoord.longitude,
            heading: null,
            speed: null,
            accuracy: null,
          }
        : {
            latitude: 0,
            longitude: 0,
            heading: null,
            speed: null,
            accuracy: null,
          };

      await sendLocationToBackend(coordToSend, 0);
    }

    lastSentCoordRef.current = null;
    isSendingRef.current = false;
  }, [sendLocationToBackend]);

  const ensureBackgroundTracking = useCallback(async () => {
    if (AppState.currentState !== 'active') {
      return false;
    }

    if (await isDriverLocationTaskRunning()) {
      return true;
    }

    return startDriverBackgroundLocation();
  }, []);

  const startTracking = useCallback(async () => {
    const status = await resolveLocationAccess();
    setLocationAccess(status);

    if (status !== 'granted') {
      setPermissionDenied(true);
      return;
    }

    setPermissionDenied(false);
    deactivateCalledRef.current = false;

    if (!trackingStartedRef.current) {
      const initial = await getSafeCurrentPosition();
      if (initial?.coords) {
        const initialCoord: DriverCoordinate = {
          latitude: initial.coords.latitude,
          longitude: initial.coords.longitude,
          heading: initial.coords.heading,
          speed: initial.coords.speed,
          accuracy: initial.coords.accuracy,
        };

        setUserCoordinate(initialCoord);
        await sendLocationToBackend(initialCoord, 1);
      }
    }

    if (!subscriptionRef.current) {
      subscriptionRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 3000,
          distanceInterval: 50,
        },
        (location) => {
          const { latitude, longitude, heading, speed, accuracy } = location.coords;
          const newCoord: DriverCoordinate = {
            latitude,
            longitude,
            heading,
            speed,
            accuracy,
          };

          setUserCoordinate((prev) => {
            if (prev.latitude === latitude && prev.longitude === longitude) {
              return prev;
            }
            return newCoord;
          });

          const last = lastSentCoordRef.current;
          const distanceMoved =
            last !== null
              ? haversineDistance(last.latitude, last.longitude, latitude, longitude)
              : Infinity;

          if (distanceMoved >= API_DISTANCE_THRESHOLD) {
            sendLocationToBackend(newCoord, 1);
          }
        },
      );
    }

    const backgroundStarted = await ensureBackgroundTracking();
    trackingStartedRef.current = true;
    console.log(
      backgroundStarted
        ? '[useUserGPS] chauffeur tracking active (foreground + background)'
        : '[useUserGPS] chauffeur tracking active (foreground)',
    );
  }, [sendLocationToBackend, ensureBackgroundTracking]);

  useEffect(() => {
    if (!shouldTrack) {
      stopTracking(true);
      return;
    }

    startTracking().catch((error) => {
      console.error('[useUserGPS] failed to start tracking:', error);
      setPermissionDenied(true);
    });
  }, [shouldTrack, startTracking, stopTracking]);

  useEffect(() => {
    if (!shouldTrack) {
      return;
    }

    const syncAccess = async () => {
      const status = await refreshLocationAccess();
      if (status === 'granted') {
        await ensureBackgroundTracking();
      }
    };

    syncAccess();
    const intervalId = setInterval(syncAccess, 5000);
    const appStateSub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        syncAccess();
      }
    });

    return () => {
      clearInterval(intervalId);
      appStateSub.remove();
    };
  }, [shouldTrack, refreshLocationAccess, ensureBackgroundTracking]);

  return {
    userCoordinate,
    isSending,
    permissionDenied,
    locationAccess,
    isGpsTracking,
    isChauffeur,
    shouldTrack,
    canTrack,
    setIsGpsTracking,
    requestLocationAccess,
    checkLocationPermission,
    resolveLocationAccess,
    retryLocationPermission,
    openAppSettings,
    recheckLocationAccess,
    refreshLocationAccess,
    startTracking,
  };
}
