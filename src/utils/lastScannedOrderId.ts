import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'LAST_SCANNED_ORDER_ID';

let memoryCache: string | null | undefined;

export async function getLastScannedOrderId(): Promise<string | null> {
  if (memoryCache !== undefined) {
    return memoryCache;
  }

  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    memoryCache = stored && stored.trim() ? stored.trim() : null;
    return memoryCache;
  } catch {
    memoryCache = null;
    return null;
  }
}

/** Replace with latest scanned order id (or clear when null). */
export async function setLastScannedOrderId(
  orderId: number | string | null | undefined,
): Promise<void> {
  if (orderId == null || String(orderId).trim() === '') {
    memoryCache = null;
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    return;
  }

  const value = String(orderId).trim();
  memoryCache = value;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, value);
  } catch {
    // ignore
  }
}

export async function clearLastScannedOrderId(): Promise<void> {
  await setLastScannedOrderId(null);
}
