import { REQUIRED_CHAUFFEUR_ROLE } from '@/src/utils/driverLocationApi';

const MIN_INTERVAL_MS = 15000;
const MIN_DISTANCE_M = 25;
const MAX_INTERVAL_MS = 45000;
const MAX_STALE_MS = 5 * 60 * 1000;

type ChauffeurLocationCache = {
  latitude: number;
  longitude: number;
  updatedAt: number;
};

const EMPTY_CACHE: ChauffeurLocationCache = {
  latitude: 0,
  longitude: 0,
  updatedAt: 0,
};

let cache: ChauffeurLocationCache = { ...EMPTY_CACHE };

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const earthRadiusM = 6371000;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) ** 2;

  return 2 * earthRadiusM * Math.asin(Math.sqrt(a));
}

function shouldUpdateCache(latitude: number, longitude: number, force = false): boolean {
  if (force || cache.updatedAt === 0) {
    return true;
  }

  const now = Date.now();
  const elapsed = now - cache.updatedAt;
  const distance = haversineMeters(
    cache.latitude,
    cache.longitude,
    latitude,
    longitude,
  );

  if (elapsed < MIN_INTERVAL_MS) {
    return false;
  }

  if (elapsed >= MAX_INTERVAL_MS) {
    return true;
  }

  return distance >= MIN_DISTANCE_M;
}

export function setChauffeurLocation(
  latitude: number,
  longitude: number,
  force = false,
): boolean {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return false;
  }

  if (!shouldUpdateCache(latitude, longitude, force)) {
    return false;
  }

  cache = {
    latitude,
    longitude,
    updatedAt: Date.now(),
  };
  return true;
}

export function getChauffeurLocation(): ChauffeurLocationCache {
  return cache;
}

export function clearChauffeurLocation(): void {
  cache = { ...EMPTY_CACHE };
}

export function getChauffeurCoordsForApi(
  role: string | undefined,
): { latitude: string; longitude: string } | null {
  if (role !== REQUIRED_CHAUFFEUR_ROLE) {
    return null;
  }

  const { latitude, longitude, updatedAt } = cache;
  if (!latitude || !longitude || !updatedAt) {
    return null;
  }

  if (Date.now() - updatedAt > MAX_STALE_MS) {
    return null;
  }

  return {
    latitude: String(latitude),
    longitude: String(longitude),
  };
}
