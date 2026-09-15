import { setChauffeurLocation } from '@/src/utils/chauffeurLocationCache';
import { driverLocLog, driverLocWarn } from '@/src/utils/driverLocLog';
import type { NativeDriverCoordinate } from 'expo-driver-location';

/**
 * Scan / live-ping: reuse published cache only if younger than this.
 * Older → fresh GPS (native also resets the 15-min interval timer).
 */
export const SCAN_MAX_AGE_MS = 3 * 60 * 1000;
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

/** Any usable cache (even old) — status_update fallback only. */
async function getAnyCachedCoord(
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
      // Prefer still-young cache; else last published for best-effort.
      const young = await getFreshEnoughCache(orderId);
      if (young) {
        return remember(young.coord, orderId);
      }
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
 * Start / resolve scan GPS after a successful verify (does not block UI).
 */
export function prefetchScanFreshLocation(
  orderId?: number | string | null,
): void {
  void resolveScanLocation(orderId);
}

/**
 * Before Verify: ≤3 min cache or fresh (max ~5s). Sets latitude/longitude on payload.
 * Does not hang forever — uses the same timed resolve as scan/ping.
 */
export async function attachScanLocationForVerify(
  payload: Record<string, any>,
  orderId?: number | string | null,
): Promise<NativeDriverCoordinate | null> {
  const oid = orderId ?? payload?.order_id ?? null;
  try {
    const coord = await resolveScanLocation(oid);
    if (!isUsable(coord)) {
      driverLocWarn('verify_coords', {
        decision: 'no_location',
        order: normalizeOrderId(oid) ?? '-',
      });
      return null;
    }
    payload.latitude = String(coord.latitude);
    payload.longitude = String(coord.longitude);
    driverLocLog('verify_coords', {
      decision: 'attached',
      order: normalizeOrderId(oid) ?? '-',
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
    driverLocWarn('verify_coords', {
      decision: 'error',
      reason: String(error),
    });
    return null;
  }
}

/**
 * status_update GPS: prefer ≤3 min cache; else join/start fetch with short wait.
 * Never hangs the UI (max ~800ms).
 */
export async function awaitScanFreshLocationForStatusUpdate(
  orderId?: number | string | null,
): Promise<NativeDriverCoordinate | null> {
  const oid = normalizeOrderId(orderId);
  try {
    const young = await getFreshEnoughCache(oid);
    if (young) {
      const coord = remember(young.coord, oid);
      driverLocLog('scan_resolve', {
        decision: 'status_cache_within_3min',
        order: oid ?? '-',
        ageMs: young.ageMs,
        lat: coord.latitude,
        lon: coord.longitude,
      });
      return coord;
    }

    const fetchPromise = inFlight ?? ensureFreshFetch(oid);
    const timed = await Promise.race([
      fetchPromise,
      new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), STATUS_UPDATE_MAX_WAIT_MS);
      }),
    ]);

    if (isUsable(timed)) {
      return timed;
    }

    // Timeout: best-effort any cache so status still has coords without waiting.
    const any = await getAnyCachedCoord(oid);
    if (any) {
      driverLocWarn('scan_resolve', {
        decision: 'status_quick_timeout_fallback',
        order: oid ?? '-',
        lat: any.latitude,
        lon: any.longitude,
      });
      return any;
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
