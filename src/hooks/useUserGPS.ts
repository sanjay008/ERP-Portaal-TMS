import * as Location from 'expo-location';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState, InteractionManager, Linking, Platform } from 'react-native';
import { GlobalContextData } from '../context/GlobalContext';
import {
  REQUIRED_CHAUFFEUR_ROLE,
  type DriverCoordinate,
} from '../utils/driverLocationApi';
import {
  getLastLocation,
  isNativeDriverTracking,
  stopNativeDriverTracking,
  syncNativeDriverTracking,
} from '../utils/nativeDriverLocation';
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

  const trackingStartedRef = useRef(false);
  const gpsSuspendedRef = useRef(false);
  const ensureInFlightRef = useRef(false);

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

  const refreshUserCoordinate = useCallback(async () => {
    const last = await getLastLocation();
    if (!last) {
      return;
    }

    setUserCoordinate({
      latitude: last.latitude,
      longitude: last.longitude,
      heading: last.heading,
      speed: last.speed,
      accuracy: last.accuracy,
    });
  }, []);

  const refreshLocationAccess = useCallback(async () => {
    const status = await recheckLocationAccess();
    setLocationAccess(status);
    setPermissionDenied(status !== 'granted');
    return status;
  }, []);

  const stopTracking = useCallback(async () => {
    trackingStartedRef.current = false;
    setIsSending(false);

    try {
      await stopNativeDriverTracking();
    } catch (error) {
      console.warn('[useUserGPS] failed to stop native tracking:', error);
    }
  }, []);

  const ensureNativeTracking = useCallback(async () => {
    if (AppState.currentState !== 'active' || ensureInFlightRef.current) {
      return;
    }

    ensureInFlightRef.current = true;
    setIsSending(true);

    try {
      const status = await refreshLocationAccess();

      if (status !== 'granted') {
        setPermissionDenied(true);
        const nativeStillRunning = await isNativeDriverTracking();
        if (nativeStillRunning || trackingStartedRef.current) {
          gpsSuspendedRef.current = true;
          trackingStartedRef.current = false;
          await stopNativeDriverTracking();
        }
        return;
      }

      setPermissionDenied(false);

      const nativeAlreadyRunning = await isNativeDriverTracking();
      if (nativeAlreadyRunning) {
        gpsSuspendedRef.current = false;
        trackingStartedRef.current = true;

        const { UserData: currentUser, activeShift: shift, selectRegionData: region, SelectCurrentDate: currentDate } =
          contextRef.current;

        const result = await syncNativeDriverTracking(
          currentUser,
          shift,
          region?.id,
          currentDate ?? null,
        );

        if (result !== 'skipped') {
          await refreshUserCoordinate();
        }
        return;
      }

      if (gpsSuspendedRef.current) {
        gpsSuspendedRef.current = false;
      }

      const { UserData: currentUser, activeShift: shift, selectRegionData: region, SelectCurrentDate: currentDate } =
        contextRef.current;

      const result = await syncNativeDriverTracking(
        currentUser,
        shift,
        region?.id,
        currentDate ?? null,
      );

      if (result === 'skipped') {
        console.warn('[useUserGPS] native tracking skipped — missing config');
        return;
      }

      trackingStartedRef.current = true;
      await refreshUserCoordinate();
      console.log('[useUserGPS] native chauffeur tracking active');
    } catch (error) {
      console.error('[useUserGPS] failed to ensure native tracking:', error);
      setPermissionDenied(true);
    } finally {
      ensureInFlightRef.current = false;
      setIsSending(false);
    }
  }, [refreshLocationAccess, refreshUserCoordinate, stopTracking]);

  const startTracking = useCallback(async () => {
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        InteractionManager.runAfterInteractions(() => resolve());
      }, 500);
    });
    await ensureNativeTracking();
  }, [ensureNativeTracking]);

  useEffect(() => {
    if (!shouldTrack) {
      gpsSuspendedRef.current = false;
      stopTracking();
      return;
    }

    startTracking().catch((error) => {
      console.error('[useUserGPS] failed to start tracking:', error);
      setPermissionDenied(true);
    });
  }, [shouldTrack, startTracking, stopTracking]);

  useEffect(() => {
    if (!shouldTrack || AppState.currentState !== 'active') {
      return;
    }

    ensureNativeTracking().catch((error) => {
      console.warn('[useUserGPS] failed to refresh native tracking config:', error);
    });
  }, [
    shouldTrack,
    ensureNativeTracking,
    activeShift?.region_id,
    activeShift?.planning_date,
    selectRegionData?.id,
    SelectCurrentDate,
  ]);

  useEffect(() => {
    if (!shouldTrack) {
      return;
    }

    const syncAccess = async () => {
      if (AppState.currentState !== 'active') {
        return;
      }

      const status = await refreshLocationAccess();
      if (status !== 'granted') {
        const nativeStillRunning = await isNativeDriverTracking();
        if (nativeStillRunning || trackingStartedRef.current) {
          gpsSuspendedRef.current = true;
          trackingStartedRef.current = false;
          await stopNativeDriverTracking();
        }
        return;
      }

      if (gpsSuspendedRef.current) {
        await ensureNativeTracking();
        return;
      }

      const nativeRunning = await isNativeDriverTracking();
      if (nativeRunning) {
        trackingStartedRef.current = true;
      }
    };

    syncAccess();
    const intervalId = setInterval(syncAccess, 5000);
    const appStateSub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        syncAccess();
        if (shouldTrack) {
          setTimeout(() => {
            ensureNativeTracking().catch(() => undefined);
          }, 800);
        }
      }
    });

    return () => {
      clearInterval(intervalId);
      appStateSub.remove();
    };
  }, [shouldTrack, refreshLocationAccess, ensureNativeTracking]);

  useEffect(() => {
    if (!shouldTrack || AppState.currentState !== 'active') {
      return;
    }

    refreshUserCoordinate();
    const intervalId = setInterval(refreshUserCoordinate, 10000);
    return () => clearInterval(intervalId);
  }, [shouldTrack, refreshUserCoordinate]);

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
    stopTracking,
  };
}
