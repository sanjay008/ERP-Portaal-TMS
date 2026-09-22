import { getApiBaseUrl } from '@/src/utils/apiBaseUrl';
import * as Updates from 'expo-updates';

export function getActiveApiShortName(): string {
  const url = getApiBaseUrl().toLowerCase();
  if (url.includes('gesutms.nl') || url.includes('gesu')) {
    return 'Gesu';
  }
  if (url.includes('app.erpportaal.nl')) {
    return 'App';
  }
  return 'App';
}

function toSafeDate(value: Date | number | string | null | undefined): Date {
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return value;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    const fromMs = new Date(value);
    if (Number.isFinite(fromMs.getTime())) return fromMs;
  }
  if (typeof value === 'string' && value.trim()) {
    const fromText = new Date(value);
    if (Number.isFinite(fromText.getTime())) return fromText;
  }
  return new Date(Date.now());
}

/** YY.M.D — e.g. 26.9.21, no leading zeros */
function formatOtaDate(value: Date | number | string | null | undefined): string {
  const date = toSafeDate(value);
  return `${date.getFullYear() % 100}.${date.getMonth() + 1}.${date.getDate()}`;
}

function resolveOtaDate(): Date {
  const createdAt = Updates.createdAt;
  if (createdAt instanceof Date && Number.isFinite(createdAt.getTime())) {
    return createdAt;
  }

  const manifest = Updates.manifest as { createdAt?: string | number } | undefined;
  if (manifest?.createdAt != null) {
    return toSafeDate(manifest.createdAt);
  }

  return new Date(Date.now());
}

export function getOtaVersionLine(): string {
  return `OTA ${formatOtaDate(resolveOtaDate())} - ${getActiveApiShortName()}`;
}
