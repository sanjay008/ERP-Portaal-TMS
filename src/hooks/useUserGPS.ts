import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';

type UserCoordinateProps = {
  latitude: number;
  longitude: number;
  heading?: number | null;
  speed?: number | null;
  accuracy?: number | null;
};

const DISTANCE_INTERVAL = 5;
const TIME_INTERVAL = 2000;

export default function useUserGPS(enabled: boolean = true) {
  const [userCoordinate, setUserCoordinate] =
    useState<UserCoordinateProps>({
      latitude: 0,
      longitude: 0,
      heading: null,
      speed: null,
      accuracy: null,
    });

  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    if (!enabled) {
      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
        subscriptionRef.current = null;
      }

      return;
    }

    let mounted = true;

    const startTracking = async () => {
      const { status } =
        await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
      });

      if (mounted) {
        setUserCoordinate({
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
          heading: currentLocation.coords.heading,
          speed: currentLocation.coords.speed,
          accuracy: currentLocation.coords.accuracy,
        });
      }

      subscriptionRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: TIME_INTERVAL,
          distanceInterval: DISTANCE_INTERVAL,
        },
        location => {
          const latitude = location.coords.latitude;
          const longitude = location.coords.longitude;

          setUserCoordinate(prev => {
            if (
              prev.latitude === latitude &&
              prev.longitude === longitude
            ) {
              return prev;
            }

            return {
              latitude,
              longitude,
              heading: location.coords.heading,
              speed: location.coords.speed,
              accuracy: location.coords.accuracy,
            };
          });
        },
      );
    };

    startTracking();

    return () => {
      mounted = false;

      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
        subscriptionRef.current = null;
      }
    };
  }, [enabled]);

  return {
    userCoordinate,
  };
}