import { setChauffeurLocation } from '@/src/utils/chauffeurLocationCache';
import type { NativeDriverCoordinate } from 'expo-driver-location';

/** Reuse fresh fix across parcels in the same scan session. */
const FRESH_TTL_MS = 5 * 60 * 1000;
/** Max wait at status_update if prefetch still running. */
const AWAIT_TIMEOUT_MS = 5000;

let inFlight: Promise<NativeDriverCoordinate | null> | null = null;
let lastFresh: { coord: NativeDriverCoordinate; at: number } | null = null;

function isUsable(coord: NativeDriverCoordinate | null | undefined): coord is NativeDriverCoordinate {
  return !!coord && Number(coord.latitude) !== 0 && Number(coord.longitude) !== 0;
}

function applyToChauffeurCache(coord: NativeDriverCoordinate): void {
  setChauffeurLocation(Number(coord.latitude), Number(coord.longitude), true);
}

async function fetchFreshFromNative(): Promise<NativeDriverCoordinate | null> {
  try {
    const { getFreshLocationAndPublish } = await import('expo-driver-location');
    const coord = await getFreshLocationAndPublish();
    if (!isUsable(coord)) {
      return null;
    }
    lastFresh = { coord, at: Date.now() };
    applyToChauffeurCache(coord);
    return coord;
  } catch (error) {
    console.warn('[scanFreshLocation] native fresh GPS failed', error);
    return null;
  }
}

function ensureFreshFetch(): Promise<NativeDriverCoordinate | null> {
  if (lastFresh && Date.now() - lastFresh.at < FRESH_TTL_MS && isUsable(lastFresh.coord)) {
    applyToChauffeurCache(lastFresh.coord);
    return Promise.resolve(lastFresh.coord);
  }

  if (inFlight) {
    return inFlight;
  }

  inFlight = fetchFreshFromNative().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

/**
 * Start fresh GPS in background after a successful scan/verify.
 * Does not block UI. Safe to call on every parcel — coalesces + 5-min TTL.
 */
export function prefetchScanFreshLocation(): void {
  void ensureFreshFetch();
}

/**
 * Await fresh GPS before status_update (scan path only).
 * Prefers in-flight / recent fresh; waits up to timeout; falls back to published cache.
 * Updates chauffeurLocationCache so ApiService injects lat/lon into status_update.
 */
export async function awaitScanFreshLocationForStatusUpdate(): Promise<NativeDriverCoordinate | null> {
  try {
    if (lastFresh && Date.now() - lastFresh.at < FRESH_TTL_MS && isUsable(lastFresh.coord)) {
      applyToChauffeurCache(lastFresh.coord);
      return lastFresh.coord;
    }

    const fetchPromise = ensureFreshFetch();
    const timed = await Promise.race([
      fetchPromise,
      new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), AWAIT_TIMEOUT_MS);
      }),
    ]);

    if (isUsable(timed)) {
      return timed;
    }

    // Timeout or failed fresh — use whatever published cache native has.
    try {
      const { getLastLocation } = await import('expo-driver-location');
      const last = await getLastLocation();
      if (isUsable(last)) {
        applyToChauffeurCache(last);
        return last;
      }
    } catch {
      // ignore
    }

    return null;
  } catch (error) {
    console.warn('[scanFreshLocation] await for status_update failed', error);
    return null;
  }
}

/** Mutates payload with fresh lat/lon for scan → status_update only. */
export async function attachScanFreshCoordsToPayload(
  payload: Record<string, any>,
): Promise<void> {
  const fresh = await awaitScanFreshLocationForStatusUpdate();
  if (!fresh) {
    return;
  }
  payload.latitude = String(fresh.latitude);
  payload.longitude = String(fresh.longitude);
}
