import * as Location from 'expo-location';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Linking } from 'react-native';
import apiConstants from '../api/apiConstants';
import { GlobalContextData } from '../context/GlobalContext';
import ApiService from '../utils/Apiservice';

type LocationPermissionStatus = {
  granted: boolean;
  canAskAgain: boolean;
};

export type LocationAccessStatus =
  | 'granted'
  | 'denied'
  | 'blocked'
  | 'services_disabled';

export async function checkLocationPermission(): Promise<LocationPermissionStatus> {
  const { status, canAskAgain } = await Location.getForegroundPermissionsAsync();
  return {
    granted: status === Location.PermissionStatus.GRANTED,
    canAskAgain: canAskAgain !== false,
  };
}

export async function resolveLocationAccess(): Promise<LocationAccessStatus> {
  const current = await checkLocationPermission();

  if (current.granted) {
    return 'granted';
  }

  if (!current.canAskAgain) {
    return 'blocked';
  }

  const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
  if (status === Location.PermissionStatus.GRANTED) {
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
    return 'granted';
  }

  if (!current.canAskAgain) {
    return 'blocked';
  }

  const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
  if (status === Location.PermissionStatus.GRANTED) {
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

  return 'granted';
}

export async function requestLocationAccess(): Promise<boolean> {
  const current = await checkLocationPermission();
  if (current.granted) {
    return true;
  }

  if (!current.canAskAgain) {
    await Linking.openSettings();
    const afterSettings = await checkLocationPermission();
    return afterSettings.granted;
  }

  const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
  if (status === Location.PermissionStatus.GRANTED) {
    return true;
  }

  if (canAskAgain === false) {
    await Linking.openSettings();
    const afterSettings = await checkLocationPermission();
    return afterSettings.granted;
  }

  return false;
}

export async function areLocationServicesEnabled(): Promise<boolean> {
  try {
    return await Location.hasServicesEnabledAsync();
  } catch {
    return false;
  }
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

type UserCoordinateProps = {
  latitude: number;
  longitude: number;
  heading: number | null;
  speed: number | null;
  accuracy: number | null;
};

const TIME_INTERVAL = 3000;
const DISTANCE_INTERVAL = 50;
const API_DISTANCE_THRESHOLD = 50;
const REQUIRED_ROLE = 'chauffeur';

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

function getTodayDate(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

type ValidatedPayload = {
  token: string;
  role: string;
  planning_date: string;
  relaties_id: string;
  user_id: string;
  region_id: string;
  latitude: string;
  longitude: string;
  heading: string;
  accuracy: string;
  speed: string;
  is_active: number;
};

type PayloadValidationResult =
  | { valid: true; payload: ValidatedPayload }
  | { valid: false; reason: string };

function buildAndValidatePayload(
  coord: UserCoordinateProps,
  UserData: any,
  planning_date: string | null | undefined,
  region_id: number | string | null | undefined,
  isActive: number,
): PayloadValidationResult {
  if (!UserData?.user) {
    return { valid: false, reason: 'UserData or user is null — user not logged in' };
  }

  const role = UserData?.user?.role;
  if (role !== REQUIRED_ROLE) {
    return { valid: false, reason: `Role is "${role}" — only "${REQUIRED_ROLE}" is allowed` };
  }

  const token = UserData?.user?.verify_token;
  if (!token) {
    return { valid: false, reason: 'verify_token is missing' };
  }

  const user_id = UserData?.user?.id;
  if (!user_id) {
    return { valid: false, reason: 'user_id is missing' };
  }

  const relaties_id = UserData?.relaties?.id;
  if (!relaties_id) {
    return { valid: false, reason: 'relaties_id is missing' };
  }

  if (!region_id) {
    return { valid: false, reason: 'region_id is null/missing' };
  }

  if (!coord.latitude || !coord.longitude) {
    return { valid: false, reason: `Invalid coordinates — lat: ${coord.latitude}, lon: ${coord.longitude}` };
  }

  const resolvedPlanningDate = planning_date ?? getTodayDate();

  return {
    valid: true,
    payload: {
      token: String(token),
      role: String(role),
      planning_date: String(resolvedPlanningDate),
      relaties_id: String(relaties_id),
      user_id: String(user_id),
      region_id: String(region_id),
      latitude: String(coord.latitude),
      longitude: String(coord.longitude),
      heading: String(coord.heading ?? ''),
      accuracy: String(coord.accuracy ?? ''),
      speed: String(coord.speed ?? ''),
      is_active: isActive,
    },
  };
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

  const [userCoordinate, setUserCoordinate] = useState<UserCoordinateProps>({
    latitude: 0,
    longitude: 0,
    heading: null,
    speed: null,
    accuracy: null,
  });
  const [isSending, setIsSending] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const lastSentCoordRef = useRef<{ latitude: number; longitude: number } | null>(null);
  const isSendingRef = useRef(false);
  const deactivateCalledRef = useRef(false);

  const contextRef = useRef({ UserData, SelectCurrentDate, selectRegionData, activeShift });
  useEffect(() => {
    contextRef.current = { UserData, SelectCurrentDate, selectRegionData, activeShift };
  }, [UserData, SelectCurrentDate, selectRegionData, activeShift]);

  const isChauffeur = UserData?.user?.role === REQUIRED_ROLE;
  const shiftActive = Boolean(activeShift?.shiftActive);
  const canTrack = isGpsTracking && isChauffeur && shiftActive;

  const getTrackingContext = useCallback(() => {
    const { activeShift: shift, SelectCurrentDate: currentDate, selectRegionData: region } =
      contextRef.current;

    if (shift?.shiftActive) {
      return {
        region_id: shift.region_id,
        planning_date: shift.planning_date,
      };
    }

    return {
      region_id: region?.id,
      planning_date: currentDate ?? getTodayDate(),
    };
  }, []);

  const sendLocationToBackend = useCallback(async (coord: UserCoordinateProps, isActive: number) => {
    if (isSendingRef.current) return;

    const { UserData } = contextRef.current;
    const { region_id, planning_date } = getTrackingContext();

    const result: any = buildAndValidatePayload(
      coord,
      UserData,
      planning_date,
      region_id,
      isActive,
    );

    if (!result.valid) {
      console.warn(`[useUserGPS] API call skipped — ${result.reason}`);
      return;
    }

    isSendingRef.current = true;
    setIsSending(true);

    try {
      const res = await ApiService(
        apiConstants.update_driver_live_location,
        { customData: result.payload },
      );

      if (res?.status) {
        if (isActive === 1) {
          console.log('[useUserGPS] tracking on', {
            lat: coord.latitude,
            lon: coord.longitude,
            region_id: result.payload.region_id,
            planning_date: result.payload.planning_date,
          });
          lastSentCoordRef.current = {
            latitude: coord.latitude,
            longitude: coord.longitude,
          };
        }
      } else {
        console.warn('[useUserGPS] API responded with failure status');
      }
    } catch (error) {
      console.error('[useUserGPS] Failed to send location:', error);
    } finally {
      isSendingRef.current = false;
      setIsSending(false);
    }
  }, [getTrackingContext]);

  useEffect(() => {
    if (!canTrack) {
      if (!isGpsTracking && isChauffeur && !deactivateCalledRef.current) {
        deactivateCalledRef.current = true;

        const lastCoord = lastSentCoordRef.current;
        const coordToSend: UserCoordinateProps = lastCoord
          ? { latitude: lastCoord.latitude, longitude: lastCoord.longitude, heading: null, speed: null, accuracy: null }
          : { latitude: 0, longitude: 0, heading: null, speed: null, accuracy: null };

        sendLocationToBackend(coordToSend, 0);
      } else if (!isChauffeur) {
        console.warn(`[useUserGPS] Tracking blocked — role is "${UserData?.user?.role}", required "${REQUIRED_ROLE}"`);
      }

      subscriptionRef.current?.remove();
      subscriptionRef.current = null;
      lastSentCoordRef.current = null;
      isSendingRef.current = false;
      return;
    }

    deactivateCalledRef.current = false;
    console.log('[Shift] ON - GPS tracking active');
    let mounted = true;

    const startTracking = async () => {
      try {
        const permission = await checkLocationPermission();

        if (!permission.granted) {
          setPermissionDenied(true);
          if (!contextRef.current.activeShift?.shiftActive) {
            setIsGpsTracking(false);
          }
          return;
        }

        setPermissionDenied(false);

        const initial = await getSafeCurrentPosition();
        if (initial?.coords && mounted) {
          const initialCoord: UserCoordinateProps = {
            latitude: initial.coords.latitude,
            longitude: initial.coords.longitude,
            heading: initial.coords.heading,
            speed: initial.coords.speed,
            accuracy: initial.coords.accuracy,
          };

          setUserCoordinate(initialCoord);
          sendLocationToBackend(initialCoord, 1);
        }

        subscriptionRef.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: TIME_INTERVAL,
            distanceInterval: DISTANCE_INTERVAL,
          },
          location => {
            if (!mounted) return;

            const { latitude, longitude, heading, speed, accuracy } = location.coords;

            const newCoord: UserCoordinateProps = {
              latitude,
              longitude,
              heading,
              speed,
              accuracy,
            };

            setUserCoordinate(prev => {
              if (prev.latitude === latitude && prev.longitude === longitude) return prev;
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
      } catch {
        setPermissionDenied(true);
        if (!contextRef.current.activeShift?.shiftActive) {
          setIsGpsTracking(false);
        }
        subscriptionRef.current?.remove();
        subscriptionRef.current = null;
      }
    };

    startTracking().catch(() => {
      if (!contextRef.current.activeShift?.shiftActive) {
        setIsGpsTracking(false);
      }
      subscriptionRef.current?.remove();
      subscriptionRef.current = null;
    });

    return () => {
      mounted = false;
      subscriptionRef.current?.remove();
      subscriptionRef.current = null;
    };
  }, [canTrack, sendLocationToBackend, isGpsTracking, isChauffeur, shiftActive, setIsGpsTracking]);

  return {
    userCoordinate,
    isSending,
    permissionDenied,
    isGpsTracking,
    isChauffeur,
    setIsGpsTracking,
    requestLocationAccess,
    checkLocationPermission,
    resolveLocationAccess,
    retryLocationPermission,
    openAppSettings,
    recheckLocationAccess,
  };
}