/**
 * Single JS console tag for driver-location tracking.
 * Filter Metro: DriverLoc
 * Native kill/background: use `adb logcat -s DriverLoc`
 */
const TAG = 'DriverLoc';

function format(event: string, details?: Record<string, unknown> | string): string {
  if (details == null || details === '') {
    return `event=${event}`;
  }
  if (typeof details === 'string') {
    return `event=${event} | ${details}`;
  }
  const parts = Object.entries(details)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}=${v === null || v === '' ? '-' : String(v)}`);
  return parts.length ? `event=${event} | ${parts.join(' ')}` : `event=${event}`;
}

export function driverLocLog(
  event: string,
  details?: Record<string, unknown> | string,
): void {
  console.log(`[${TAG}] ${format(event, details)}`);
}

export function driverLocWarn(
  event: string,
  details?: Record<string, unknown> | string,
): void {
  console.warn(`[${TAG}] ${format(event, details)}`);
}
