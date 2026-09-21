import AsyncStorage from '@react-native-async-storage/async-storage';

export const PRODUCTION_BASE = 'https://app.erpportaal.nl/api/';
export const GESUTMS_BASE = 'https://gesutms.nl/api/';
export const DEVELOPMENT_BASE = 'https://development.erpportaal.nl/api/';
export const default_base_Url = PRODUCTION_BASE;
export const DEFAULT_URL_UPDATED_AT = '2026-09-21T17:35:00+05:30';
export const ADMIN_PASSCODE = '2020';

export const API_BASE_LIST = [
  { id: 'gesutms', url: GESUTMS_BASE },
  { id: 'erpportaal', url: PRODUCTION_BASE },
] as const;

const STORAGE_KEY = 'ADMIN_API_BASE_URL';
const SAVED_AT_KEY = 'ADMIN_API_BASE_URL_SAVED_AT';
const LAST_DEFAULT_KEY = 'ADMIN_API_LAST_DEFAULT_URL';
const LAST_DEFAULT_AT_KEY = 'ADMIN_API_LAST_DEFAULT_AT';
const ALLOWED = new Set<string>([PRODUCTION_BASE, GESUTMS_BASE]);

let override: string | null = null;
let hydratePromise: Promise<void> | null = null;

export function isAllowedApiBase(url: string | null | undefined): url is string {
  return typeof url === 'string' && ALLOWED.has(url);
}

export function getApiBaseUrl(_fallback?: string): string {
  if (isAllowedApiBase(override)) {
    return override;
  }
  return default_base_Url;
}

function parseTime(value: string | null): number {
  if (!value) return 0;
  const t = Date.parse(value);
  return Number.isFinite(t) ? t : 0;
}

async function readSavedUrl(): Promise<string | null> {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    return isAllowedApiBase(saved) ? saved : null;
  } catch {
    return null;
  }
}

export async function hydrateApiBaseUrl(): Promise<void> {
  if (hydratePromise) {
    return hydratePromise;
  }

  hydratePromise = (async () => {
    let next: string | null = null;
    try {
      const pairs = await AsyncStorage.multiGet([
        STORAGE_KEY,
        SAVED_AT_KEY,
      ]);
      const saved = pairs[0]?.[1] ?? null;
      const savedAt = pairs[1]?.[1] ?? null;
      const hasSaved = isAllowedApiBase(saved);
      const userAt = parseTime(savedAt);
      const defaultAt = parseTime(DEFAULT_URL_UPDATED_AT);
      const useDefault = !hasSaved || defaultAt >= userAt;

      if (useDefault) {
        next = null;
        if (hasSaved) {
          try {
            await AsyncStorage.multiRemove([STORAGE_KEY, SAVED_AT_KEY]);
            await AsyncStorage.setItem(
              LAST_DEFAULT_AT_KEY,
              DEFAULT_URL_UPDATED_AT,
            );
          } catch {}
        }
      } else {
        next = saved;
      }

      try {
        await AsyncStorage.setItem(LAST_DEFAULT_KEY, default_base_Url);
      } catch {}
    } catch {
      next = await readSavedUrl();
    }
    override = next;
  })();

  return hydratePromise;
}

export async function saveApiBaseUrl(url: string): Promise<boolean> {
  if (!isAllowedApiBase(url)) {
    return false;
  }

  override = url;
  try {
    await AsyncStorage.multiSet([
      [STORAGE_KEY, url],
      [SAVED_AT_KEY, new Date().toISOString()],
    ]);
    return true;
  } catch {
    return false;
  }
}

void hydrateApiBaseUrl();
