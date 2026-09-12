import { setChauffeurLocation } from '@/src/utils/chauffeurLocationCache';
import { driverLocLog, driverLocWarn } from '@/src/utils/driverLocLog';
import { getLastScannedOrderId } from '@/src/utils/lastScannedOrderId';
import type { NativeDriverCoordinate } from 'expo-driver-location';

/**
 * First parcel of an order: reuse published cache if younger than this;
 * otherwise fetch fresh GPS (native also resets the 15-min publish timer).
 */
const SCAN_MAX_AGE_MS = 3.5 * 60 * 1000;
/**
 * Hard cap on native getFreshLocationAndPublish (background / prefetch).
 * iOS requestLocation() can hang for minutes with no timeout — OTA-safe JS guard.
 */
const NATIVE_FRESH_TIMEOUT_MS = 5000;
/**
 * status_update must not block UI on iOS GPS.
 * Use cache immediately; only wait this long if no cache at all.
 */
const STATUS_UPDATE_MAX_WAIT_MS = 800;

let inFlight: Promise<NativeDriverCoordinate | null> | null = null;
let lastFresh: {
  coord: NativeDriverCoordinate;
  at: number;
  orderId: string | null;
} | null = null;

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

function logScan(
  decision: string,
  orderId: string | null,
  previousOrderId: string | null,
  sameOrder: boolean,
  coord: NativeDriverCoordinate | null,
  ageMs?: number,
): void {
  driverLocLog('scan_resolve', {
    decision,
    sameOrder: sameOrder ? 1 : 0,
    order: orderId ?? '-',
    prevOrder: previousOrderId ?? '-',
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
    const capturedAt = Number(last.capturedAtMs) || 0;
    const ageMs =
      capturedAt > 0 ? Math.max(0, Date.now() - capturedAt) : Number.POSITIVE_INFINITY;
    return { coord: last, ageMs };
  } catch {
    return null;
  }
}

/** Instant best-effort: memory then published store (no fresh GPS wait). */
async function getCachedCoord(
  orderId: string | null,
): Promise<NativeDriverCoordinate | null> {
  if (lastFresh && isUsable(lastFresh.coord)) {
    return remember(lastFresh.coord, orderId ?? lastFresh.orderId);
  }
  const published = await readPublished();
  if (published) {
    return remember(published.coord, orderId);
  }
  return null;
}

async function fetchFreshFromNative(
  orderId: string | null,
): Promise<NativeDriverCoordinate | null> {
  try {
    const { getFreshLocationAndPublish } = await import('expo-driver-location');
    // Never block forever — iOS native GPS can hang without resolving.
    const coord = await Promise.race([
      getFreshLocationAndPublish(),
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
      const published = await readPublished();
      if (published) {
        return remember(published.coord, orderId);
      }
      return null;
    }
    return remember(coord, orderId);
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

function ensureFreshFetch(
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

/**
 * Shared scan GPS resolver for verify prefetch / background.
 *
 * - Same order (parcel 2/3…): reuse published/memory — never refetch.
 * - First parcel / new order: reuse if published age ≤ ~3.5 min; else fresh GPS.
 */
export async function resolveScanLocation(
  orderId?: number | string | null,
): Promise<NativeDriverCoordinate | null> {
  const oid = normalizeOrderId(orderId);
  const previousOrderId = await getLastScannedOrderId();
  const sameOrder = oid != null && previousOrderId != null && oid === previousOrderId;

  if (sameOrder) {
    if (lastFresh && isUsable(lastFresh.coord)) {
      const ageMs = Date.now() - lastFresh.at;
      const coord = remember(lastFresh.coord, oid);
      logScan('reuse_same_order_memory', oid, previousOrderId, true, coord, ageMs);
      return coord;
    }
    const published = await readPublished();
    if (published) {
      const coord = remember(published.coord, oid);
      logScan('reuse_same_order_published', oid, previousOrderId, true, coord, published.ageMs);
      return coord;
    }
    const fresh = await ensureFreshFetch(oid);
    logScan('fresh_same_order_no_cache', oid, previousOrderId, true, fresh);
    return fresh;
  }

  if (
    lastFresh &&
    Date.now() - lastFresh.at <= SCAN_MAX_AGE_MS &&
    isUsable(lastFresh.coord)
  ) {
    const ageMs = Date.now() - lastFresh.at;
    const coord = remember(lastFresh.coord, oid);
    logScan('reuse_age_memory', oid, previousOrderId, false, coord, ageMs);
    return coord;
  }

  const published = await readPublished();
  if (published && published.ageMs <= SCAN_MAX_AGE_MS) {
    const coord = remember(published.coord, oid);
    logScan('reuse_age_published', oid, previousOrderId, false, coord, published.ageMs);
    return coord;
  }

  const fresh = await ensureFreshFetch(oid);
  logScan(
    'fresh_fetch',
    oid,
    previousOrderId,
    false,
    fresh,
    published?.ageMs,
  );
  return fresh;
}

/**
 * Start / resolve scan GPS after a successful verify (does not block UI).
 */
export function prefetchScanFreshLocation(
  orderId?: number | string | null,
): void {
  void resolveScanLocation(orderId);
}

/**
 * status_update GPS: cache-first, almost no wait (iOS must not delay loader).
 * Fresh fetch runs in background for next call.
 */
export async function awaitScanFreshLocationForStatusUpdate(
  orderId?: number | string | null,
): Promise<NativeDriverCoordinate | null> {
  const oid = normalizeOrderId(orderId);
  try {
    const cached = await getCachedCoord(oid);
    if (cached) {
      driverLocLog('scan_resolve', {
        decision: 'status_cache_immediate',
        order: oid ?? '-',
        lat: cached.latitude,
        lon: cached.longitude,
      });
      return cached;
    }

    // No cache: start fresh, wait at most ~800ms, then continue without coords.
    const fetchPromise = ensureFreshFetch(oid);
    const timed = await Promise.race([
      fetchPromise,
      new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), STATUS_UPDATE_MAX_WAIT_MS);
      }),
    ]);

    if (isUsable(timed)) {
      return timed;
    }

    const published = await readPublished();
    if (published) {
      driverLocWarn('scan_resolve', {
        decision: 'status_quick_timeout_fallback',
        order: oid ?? '-',
        ageMs: published.ageMs,
        lat: published.coord.latitude,
        lon: published.coord.longitude,
      });
      return remember(published.coord, oid);
    }

    driverLocWarn('scan_resolve', {
      decision: 'status_quick_timeout_empty',
      order: oid ?? '-',
    });
    return null;
  } catch (error) {
    driverLocWarn('scan_resolve', {
      decision: 'status_error',
      reason: String(error),
    });
    return null;
  }
}

/** Mutates payload with scan lat/lon for status_update (non-blocking on iOS). */
export async function attachScanFreshCoordsToPayload(
  payload: Record<string, any>,
): Promise<void> {
  const fresh = await awaitScanFreshLocationForStatusUpdate(
    payload?.order_id ?? payload?.orderId,
  );
  if (!fresh) {
    return;
  }
  payload.latitude = String(fresh.latitude);
  payload.longitude = String(fresh.longitude);
  driverLocLog('status_coords', {
    order: payload?.order_id ?? payload?.orderId ?? '-',
    lat: fresh.latitude,
    lon: fresh.longitude,
  });
}
