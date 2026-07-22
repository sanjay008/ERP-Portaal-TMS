import {
  clearChauffeurLocation,
  setChauffeurLocation,
} from '@/src/utils/chauffeurLocationCache';
import { REQUIRED_CHAUFFEUR_ROLE } from '@/src/utils/driverLocationApi';
import * as Location from 'expo-location';
import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { getSafeCurrentPosition, recheckLocationAccess } from './useUserGPS';

let watchSubscription: Location.LocationSubscription | null = null;

async function seedChauffeurLocation(force = true): Promise<void> {
  const position = await getSafeCurrentPosition();
  if (!position) {
    return;
  }

  setChauffeurLocation(
    position.coords.latitude,
    position.coords.longitude,
    force,
  );
}

export async function startChauffeurLocationWatch(): Promise<void> {
  if (watchSubscription) {
    return;
  }

  const access = await recheckLocationAccess();
  if (access !== 'granted') {
    return;
  }

  await seedChauffeurLocation(true);

  watchSubscription = await Location.watchPositionAsync(
    { accuracy: Location.Accuracy.Balanced },
    (location) => {
      setChauffeurLocation(
        location.coords.latitude,
        location.coords.longitude,
      );
    },
  );
}

export function stopChauffeurLocationWatch(): void {
  watchSubscription?.remove();
  watchSubscription = null;
}

export function useChauffeurLocation(role: string | undefined): void {
  const isChauffeur = role === REQUIRED_CHAUFFEUR_ROLE;
  const startedRef = useRef(false);

  const syncTracking = useCallback(async () => {
    if (!isChauffeur) {
      if (startedRef.current) {
        stopChauffeurLocationWatch();
        clearChauffeurLocation();
        startedRef.current = false;
      }
      return;
    }

    if (AppState.currentState !== 'active') {
      return;
    }

    const access = await recheckLocationAccess();
    if (access !== 'granted') {
      return;
    }

    await startChauffeurLocationWatch();
    startedRef.current = true;
  }, [isChauffeur]);

  useEffect(() => {
    syncTracking().catch(() => undefined);

    if (!isChauffeur) {
      return;
    }

    const appStateSub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        syncTracking().catch(() => undefined);
      }
    });

    return () => {
      appStateSub.remove();
    };
  }, [isChauffeur, syncTracking]);

  useEffect(() => {
    return () => {
      if (startedRef.current) {
        stopChauffeurLocationWatch();
      }
    };
  }, []);
}

export function resetChauffeurLocationSession(): void {
  stopChauffeurLocationWatch();
  clearChauffeurLocation();
}
