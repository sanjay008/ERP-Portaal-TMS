import AsyncStorage from '@react-native-async-storage/async-storage';

export const PRODUCTION_BASE = 'https://app.erpportaal.nl/api/';
export const GESUTMS_BASE = 'https://gesutms.nl/api/';
export const DEVELOPMENT_BASE = 'https://development.erpportaal.nl/api/';

export const API_BASE_LIST = [
  { id: 'erpportaal', url: PRODUCTION_BASE },
  { id: 'gesutms', url: GESUTMS_BASE },
] as const;

const STORAGE_KEY = 'ADMIN_API_BASE_URL';
const ALLOWED = new Set<string>([PRODUCTION_BASE, GESUTMS_BASE]);

let override: string | null = null;
let hydratePromise: Promise<void> | null = null;

export function isAllowedApiBase(url: string | null | undefined): url is string {
  return typeof url === 'string' && ALLOWED.has(url);
}

export function getApiBaseUrl(fallback: string): string {
  if (isAllowedApiBase(override)) {
    return override;
  }
  return fallback;
}

export async function hydrateApiBaseUrl(): Promise<void> {
  if (hydratePromise) {
    return hydratePromise;
  }

  hydratePromise = (async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (isAllowedApiBase(saved)) {
        override = saved;
      }
    } catch {
      override = null;
    }
  })();

  return hydratePromise;
}

export async function saveApiBaseUrl(url: string): Promise<boolean> {
  if (!isAllowedApiBase(url)) {
    return false;
  }

  override = url;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, url);
    return true;
  } catch {
    return false;
  }
}

void hydrateApiBaseUrl();
