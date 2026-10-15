import { setChauffeurLocation } from '@/src/utils/chauffeurLocationCache';
import { REQUIRED_CHAUFFEUR_ROLE } from '@/src/utils/driverLocationApi';
import { driverLocLog, driverLocWarn } from '@/src/utils/driverLocLog';
import type { NativeDriverCoordinate } from 'expo-driver-location';
import * as Location from 'expo-location';
import { Platform } from 'react-native';

/**
 * Scan / live-ping: reuse published cache only if younger than this.
 * Older → fresh GPS (native also resets the 15-min interval timer).
 */
export const SCAN_MAX_AGE_MS = 3 * 60 * 1000;
/**
 * Hard cap on native getFreshLocationAndPublish (background / prefetch).
 * iOS requestLocation() can hang for minutes with no timeout — OTA-safe JS guard.
 */
const NATIVE_FRESH_TIMEOUT_MS = 4000;
/** Native fresh-fix acceptance window; older coords are fallbacks, not new GPS. */
const FRESH_FIX_MAX_AGE_MS = 60 * 1000;

let inFlight: Promise<NativeDriverCoordinate | null> | null = null;
let activeRole: string | undefined;
let genericInFlight: Promise<NativeDriverCoordinate | null> | null = null;
let genericFresh: NativeDriverCoordinate | null = null;
/** Newest real GPS fix not yet sent to the live-location API. */
let unsentFreshFix: NativeDriverCoordinate | null = null;
const lateFixHandlers = new Map<string, {
  callback: (coord: NativeDriverCoordinate) => void;
  deadlineAt: number;
}>();
let lastFresh: {
  coord: NativeDriverCoordinate;
  at: number;
  orderId: string | null;
} | null = null;

export function setScanLocationRole(role?: string): void {
  activeRole = role;
}

function asNativeCoordinate(location: Location.LocationObject): NativeDriverCoordinate {
  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    heading: location.coords.heading,
    speed: location.coords.speed,
    accuracy: location.coords.accuracy,
    altitude: location.coords.altitude,
    altitudeAccuracy: location.coords.altitudeAccuracy,
    capturedAtMs: location.timestamp,
    source: 'getCurrentLocation',
  };
}

async function resolveNonDriverScanLocation(): Promise<NativeDriverCoordinate | null> {
  if (genericFresh && isUsable(genericFresh) && ageOfCoord(genericFresh) <= SCAN_MAX_AGE_MS) {
    return genericFresh;
  }
  if (genericInFlight) return genericInFlight;

  genericInFlight = (async () => {
    try {
      const permission = await Location.getForegroundPermissionsAsync();
      if (permission.status !== Location.PermissionStatus.GRANTED) return null;
      const last = await Location.getLastKnownPositionAsync();
      if (last && Date.now() - last.timestamp <= SCAN_MAX_AGE_MS) {
        genericFresh = asNativeCoordinate(last);
        return genericFresh;
      }
      const position = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), NATIVE_FRESH_TIMEOUT_MS)),
      ]);
      if (!position) return null;
      const coord = asNativeCoordinate(position);
      if (ageOfCoord(coord) > SCAN_MAX_AGE_MS || !isUsable(coord)) return null;
      genericFresh = coord;
      return coord;
    } catch (error) {
      driverLocWarn('scan_resolve', { decision: 'generic_fresh_fetch', ok: 0, reason: String(error) });
      return null;
    } finally {
      genericInFlight = null;
    }
  })();
  return genericInFlight;
}

function normalizeOrderId(
  orderId: number | string | null | undefined,
): string | null {
  if (orderId == null) {
    return null;
  }
  const value = String(orderId).trim();
  return value ? value : null;
}

function isUsable(
  coord: NativeDriverCoordinate | null | undefined,
): coord is NativeDriverCoordinate {
  return !!coord && Number(coord.latitude) !== 0 && Number(coord.longitude) !== 0;
}

function applyToChauffeurCache(coord: NativeDriverCoordinate): void {
  setChauffeurLocation(Number(coord.latitude), Number(coord.longitude), true);
}

function remember(
  coord: NativeDriverCoordinate,
  orderId: string | null,
): NativeDriverCoordinate {
  lastFresh = { coord, at: Date.now(), orderId };
  applyToChauffeurCache(coord);
  return coord;
}

function ageOfCoord(coord: NativeDriverCoordinate, fallbackAt?: number): number {
  const capturedAt = Number(coord.capturedAtMs) || 0;
  if (capturedAt > 0) {
    return Math.max(0, Date.now() - capturedAt);
  }
  if (fallbackAt != null && fallbackAt > 0) {
    return Math.max(0, Date.now() - fallbackAt);
  }
  return Number.POSITIVE_INFINITY;
}

function logScan(
  decision: string,
  orderId: string | null,
  coord: NativeDriverCoordinate | null,
  ageMs?: number,
): void {
  driverLocLog('scan_resolve', {
    decision,
    order: orderId ?? '-',
    ageMs: ageMs ?? '-',
    lat: coord ? coord.latitude : '-',
    lon: coord ? coord.longitude : '-',
    capturedAt: coord?.capturedAtMs ? Math.round(Number(coord.capturedAtMs)) : '-',
  });
}

async function readPublished(): Promise<{
  coord: NativeDriverCoordinate;
  ageMs: number;
} | null> {
  try {
    const { getLastLocation } = await import('expo-driver-location');
    const last = await getLastLocation();
    if (!isUsable(last)) {
      return null;
    }
    return { coord: last, ageMs: ageOfCoord(last) };
  } catch {
    return null;
  }
}

/** Cache usable for scan/ping only if age ≤ SCAN_MAX_AGE_MS (3 min). */
async function getFreshEnoughCache(
  orderId: string | null,
): Promise<{ coord: NativeDriverCoordinate; ageMs: number } | null> {
  if (lastFresh && isUsable(lastFresh.coord)) {
    const ageMs = ageOfCoord(lastFresh.coord, lastFresh.at);
    if (ageMs <= SCAN_MAX_AGE_MS) {
      return { coord: lastFresh.coord, ageMs };
    }
  }

  const published = await readPublished();
  if (published && published.ageMs <= SCAN_MAX_AGE_MS) {
    return published;
  }

  return null;
}

async function fetchFreshFromNative(
  orderId: string | null,
): Promise<NativeDriverCoordinate | null> {
  try {
    const { getFreshLocationAndPublish } = await import('expo-driver-location');
    // Keep observing the native promise after the JS timeout. Native still
    // publishes a later fix (and resets its timer); this handler also sends it
    // to the API for the scan that registered an order callback.
    const nativeRequest = getFreshLocationAndPublish().then((coord) => {
      if (!isUsable(coord) || ageOfCoord(coord) > SCAN_MAX_AGE_MS) return null;

      const isFreshGps = coord.source !== 'published_cache' &&
        ageOfCoord(coord) <= FRESH_FIX_MAX_AGE_MS;
      if (isFreshGps) {
        // Prefetch can start the shared native request before a QR is scanned.
        // In that case, associate its late fix only when exactly one scan is
        // waiting; never guess an order when multiple scans overlap.
        const pending = (orderId ? lateFixHandlers.get(orderId) : undefined) ??
          (lateFixHandlers.size === 1 ? lateFixHandlers.values().next().value : undefined);
        if (pending && Date.now() >= pending.deadlineAt) {
          const handlerOrder = Array.from(lateFixHandlers.entries()).find(([, candidate]) => candidate === pending)?.[0];
          if (handlerOrder) lateFixHandlers.delete(handlerOrder);
          pending.callback(remember(coord, handlerOrder ?? orderId));
        } else {
          // On-time fixes are picked up by the existing post-verify path.
          unsentFreshFix = coord;
          remember(coord, orderId);
        }
      } else {
        remember(coord, orderId);
      }
      return coord;
    });

    // Never block verify forever — iOS requestLocation() can hang without resolving.
    const coord = await Promise.race([
      nativeRequest,
      new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), NATIVE_FRESH_TIMEOUT_MS);
      }),
    ]);
    if (!isUsable(coord)) {
      driverLocWarn('scan_resolve', {
        decision: 'fresh_fetch',
        ok: 0,
        order: orderId ?? '-',
        reason: 'native_null_or_timeout',
      });
      // A failed fresh request must not let an older-than-3-min coordinate
      // through to a scan payload.
      const young = await getFreshEnoughCache(orderId);
      if (young) {
        return remember(young.coord, orderId);
      }
      return null;
    }
    if (ageOfCoord(coord) > SCAN_MAX_AGE_MS) {
      driverLocWarn('scan_resolve', {
        decision: 'fresh_fetch_rejected_stale_native_fix',
        order: orderId ?? '-',
        ageMs: ageOfCoord(coord),
      });
      return null;
    }
    // nativeRequest already cached the coordinate and queued any live ping.
    return coord;
  } catch (error) {
    driverLocWarn('scan_resolve', {
      decision: 'fresh_fetch',
      ok: 0,
      order: orderId ?? '-',
      reason: String(error),
    });
    return null;
  }
}

/**
 * Single shared fresh-GPS promise — 2nd parcel while 1st is fetching joins this.
 */
export function ensureFreshFetch(
  orderId: string | null,
): Promise<NativeDriverCoordinate | null> {
  if (inFlight) {
    return inFlight;
  }

  inFlight = fetchFreshFromNative(orderId).finally(() => {
    inFlight = null;
  });
  return inFlight;
}

export function getScanLocationInFlight(): Promise<NativeDriverCoordinate | null> | null {
  return inFlight;
}

/**
 * Returns the newest fresh GPS fix once, then clears it — so each new fix
 * is sent to the live-location API only one time.
 */
export function consumeUnsentFreshFix(): NativeDriverCoordinate | null {
  const coord = unsentFreshFix;
  unsentFreshFix = null;
  return coord;
}

/**
 * Shared scan GPS resolver (prefetch / ping / background).
 *
 * - Cache age ≤ 3 min → reuse (same or new order).
 * - Older / empty → one shared fresh fetch (resets native 15-min timer on success).
 * - Concurrent scans share the same in-flight promise (no hang / no double GPS).
 */
export async function resolveScanLocation(
  orderId?: number | string | null,
): Promise<NativeDriverCoordinate | null> {
  const oid = normalizeOrderId(orderId);

  if (activeRole !== REQUIRED_CHAUFFEUR_ROLE) {
    const coord = await resolveNonDriverScanLocation();
    logScan(coord?.source === 'lastLocation' ? 'reuse_within_3min' : 'generic_scan_location', oid, coord,
      coord ? ageOfCoord(coord) : undefined);
    return coord;
  }

  // Another scan already fetching — join it (don't start a second GPS / don't block UI path).
  if (inFlight) {
    const joined = await inFlight;
    if (isUsable(joined)) {
      logScan('join_in_flight', oid, joined, ageOfCoord(joined));
      return remember(joined, oid);
    }
  }

  const young = await getFreshEnoughCache(oid);
  if (young) {
    const coord = remember(young.coord, oid);
    logScan('reuse_within_3min', oid, coord, young.ageMs);
    return coord;
  }

  const published = await readPublished();
  const fresh = await ensureFreshFetch(oid);
  logScan('fresh_fetch', oid, fresh, published?.ageMs);
  return fresh;
}

/**
 * Start / resolve scan GPS while a scan screen is being prepared.
 */
export function prefetchScanFreshLocation(
  orderId?: number | string | null,
): void {
  void resolveScanLocation(orderId);
}

/**
 * Before Verify: ≤3 min cache or fresh, with a 4-second total wait cap.
 * Older cache is a fallback; missing coordinates never block Verify.
 */
export async function attachScanLocationForVerify(
  payload: Record<string, any>,
  orderId?: number | string | null,
  onLateFreshFix?: (coord: NativeDriverCoordinate) => void,
): Promise<NativeDriverCoordinate | null> {
  const oid = orderId ?? payload?.order_id ?? null;
  const normalizedOrderId = normalizeOrderId(oid);
  const startedAt = Date.now();
  const clearLateFixHandler = () => {
    if (normalizedOrderId && lateFixHandlers.get(normalizedOrderId)?.callback === onLateFreshFix) {
      lateFixHandlers.delete(normalizedOrderId);
    }
  };
  if (onLateFreshFix && normalizedOrderId) {
    const registration = {
      callback: onLateFreshFix,
      deadlineAt: startedAt + NATIVE_FRESH_TIMEOUT_MS,
    };
    lateFixHandlers.set(normalizedOrderId, registration);
    // Avoid retaining a handler forever if iOS never completes the request.
    setTimeout(() => {
      if (lateFixHandlers.get(normalizedOrderId) === registration) {
        lateFixHandlers.delete(normalizedOrderId);
      }
    }, 2 * 60 * 1000);
  }
  try {
    const readFallback = async (): Promise<NativeDriverCoordinate | null> => {
      const young = await getFreshEnoughCache(normalizedOrderId);
      if (young) return young.coord;
      const published = await readPublished();
      if (published) return published.coord;
      return lastFresh && isUsable(lastFresh.coord) ? lastFresh.coord : null;
    };
    // Read fallback in parallel so cache I/O consumes the same four-second cap.
    const fallbackPromise = readFallback().catch(() => null);

    // The scan screen requests permission before scanning. Never show a
    // permission prompt in the critical verify path, where it could block it.
    if (Platform.OS === 'ios') {
      const permission = await Promise.race([
        Location.getForegroundPermissionsAsync(),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), Math.max(0, NATIVE_FRESH_TIMEOUT_MS - (Date.now() - startedAt)))),
      ]);
      if (permission?.status !== Location.PermissionStatus.GRANTED) {
        const fallback = await Promise.race([
          fallbackPromise,
          new Promise<null>((resolve) => setTimeout(() => resolve(null), Math.max(0, NATIVE_FRESH_TIMEOUT_MS - (Date.now() - startedAt)))),
        ]);
        if (isUsable(fallback)) {
          clearLateFixHandler();
          payload.latitude = String(fallback.latitude);
          payload.longitude = String(fallback.longitude);
          logScan('verify_no_permission_cache_fallback', normalizedOrderId, fallback, ageOfCoord(fallback));
          return fallback;
        }
        clearLateFixHandler();
        return null;
      }
    }

    const remainingMs = Math.max(0, NATIVE_FRESH_TIMEOUT_MS - (Date.now() - startedAt));
    const resolvePromise = resolveScanLocation(oid);
    const coord = await Promise.race([
      resolvePromise,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), remainingMs)),
    ]);
    if (!isUsable(coord)) {
      const fallbackCoord = await Promise.race([
        fallbackPromise,
        new Promise<null>((resolve) => setTimeout(() => resolve(null), Math.max(0, NATIVE_FRESH_TIMEOUT_MS - (Date.now() - startedAt)))),
      ]);
      if (isUsable(fallbackCoord)) {
        if (Date.now() - startedAt < NATIVE_FRESH_TIMEOUT_MS) clearLateFixHandler();
        payload.latitude = String(fallbackCoord.latitude);
        payload.longitude = String(fallbackCoord.longitude);
        logScan('verify_timeout_stale_cache_fallback', normalizedOrderId, fallbackCoord, ageOfCoord(fallbackCoord));
        return fallbackCoord;
      }
      if (Date.now() - startedAt < NATIVE_FRESH_TIMEOUT_MS) clearLateFixHandler();
      driverLocWarn('verify_coords', {
        decision: 'no_location',
        order: normalizedOrderId ?? '-',
      });
      // A missing GPS point must not hold up Verify.
      return null;
    }
    clearLateFixHandler();
    payload.latitude = String(coord.latitude);
    payload.longitude = String(coord.longitude);
    driverLocLog('verify_coords', {
      decision: 'attached',
      order: normalizedOrderId ?? '-',
      lat: coord.latitude,
      lon: coord.longitude,
      capturedAt: coord.capturedAtMs
        ? Math.round(Number(coord.capturedAtMs))
        : '-',
      source: coord.source ?? '-',
      ageMs: ageOfCoord(coord),
    });
    return coord;
  } catch (error) {
    clearLateFixHandler();
    driverLocWarn('verify_coords', { decision: 'location_error_continue', reason: String(error) });
    return null;
  }
}

/**
 * status_update GPS: reuse only a ≤3 min cache; otherwise fetch a fresh fix.
 */
export async function awaitScanFreshLocationForStatusUpdate(
  orderId?: number | string | null,
): Promise<NativeDriverCoordinate | null> {
  return resolveScanLocation(orderId);
}

/** Mutates payload with required scan lat/lon; the API call must not proceed without it. */
export async function attachScanFreshCoordsToPayload(
  payload: Record<string, any>,
): Promise<void> {
  const fresh = await awaitScanFreshLocationForStatusUpdate(
    payload?.order_id ?? payload?.orderId,
  );
  if (!fresh) {
    throw new Error('Current location is required to scan. Please enable location permission and try again.');
  }
  payload.latitude = String(fresh.latitude);
  payload.longitude = String(fresh.longitude);
  driverLocLog('status_coords', {
    order: payload?.order_id ?? payload?.orderId ?? '-',
    lat: fresh.latitude,
    lon: fresh.longitude,
  });
}
