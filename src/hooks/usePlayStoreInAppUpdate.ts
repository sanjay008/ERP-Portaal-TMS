import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
  Linking,
  Platform,
  type AppStateStatus,
} from 'react-native';

type InAppUpdatesModule = typeof import('sp-react-native-in-app-updates');

type PromptState = {
  mode: 'available' | 'ready';
  storeVersion?: string;
  force: boolean;
};

/** Play Console updatePriority 0–5. 4+ → IMMEDIATE when Play allows it. */
const FORCE_UPDATE_PRIORITY = 4;
const CHECK_COOLDOWN_MS = 15 * 60 * 1000;

const ANDROID_PACKAGE =
  Constants.expoConfig?.android?.package ?? 'com.erpportaal.ERP_Portaal_TMS';
const IOS_BUNDLE_ID =
  Constants.expoConfig?.ios?.bundleIdentifier ?? 'com.erptmsdriver.app';

const isStoreClient =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

const isSupportedBuild =
  !isStoreClient && (Platform.OS === 'android' || Platform.OS === 'ios');

function loadInAppUpdates(): InAppUpdatesModule | null {
  if (!isSupportedBuild) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('sp-react-native-in-app-updates') as InAppUpdatesModule;
  } catch (e) {
    console.log('[StoreInAppUpdate] module unavailable:', e);
    return null;
  }
}

function getCurrentVersion(): string {
  return (
    Constants.nativeAppVersion ??
    Constants.expoConfig?.version ??
    '0.0.0'
  );
}

/** Client builds use YY.M.D, for example 26.10.7. App Store is still 2.7. */
function isClientDateVersion(version: string): boolean {
  return /^\d{2}\.\d{1,2}\.\d{1,2}$/.test(version);
}

function dateVersionStamp(version: string): number {
  const [year, month, day] = version.split('.').map((part) => Number(part) || 0);
  return year * 10000 + month * 100 + day;
}

/**
 * Library calls this as (storeVersion, appVersion).
 * Return 1 when the user should install the App Store build.
 */
function compareIosStoreVersion(
  storeVersion: string,
  appVersion: string,
): -1 | 0 | 1 {
  const store = String(storeVersion || '').trim();
  const app = String(appVersion || '').trim();
  if (!store || !app || store === app) return 0;

  if (isClientDateVersion(store) && isClientDateVersion(app)) {
    const diff = dateVersionStamp(store) - dateVersionStamp(app);
    if (diff > 0) return 1;
    if (diff < 0) return -1;
    return 0;
  }

  // 2.7 on the store and 26.10.7 in the app are different schemes.
  if (isClientDateVersion(app) !== isClientDateVersion(store)) {
    return 1;
  }

  const toParts = (value: string) =>
    value.split('.').map((part) => Number(part) || 0);
  const storeParts = toParts(store);
  const appParts = toParts(app);
  const length = Math.max(storeParts.length, appParts.length);
  for (let index = 0; index < length; index += 1) {
    const storePart = storeParts[index] ?? 0;
    const appPart = appParts[index] ?? 0;
    if (storePart > appPart) return 1;
    if (storePart < appPart) return -1;
  }
  return 0;
}

function resolveIosStoreUrl(other: unknown): string {
  const extras = (other ?? {}) as {
    trackViewUrl?: string;
    trackId?: number;
  };

  if (typeof extras.trackViewUrl === 'string' && extras.trackViewUrl.length > 0) {
    return extras.trackViewUrl.split('?')[0];
  }

  if (typeof extras.trackId === 'number' && extras.trackId > 0) {
    return `itms-apps://apps.apple.com/app/id${extras.trackId}`;
  }

  return `https://apps.apple.com/us/search?term=${encodeURIComponent(IOS_BUNDLE_ID)}`;
}

async function openPlayStoreListing() {
  const marketUrl = `market://details?id=${ANDROID_PACKAGE}`;
  const webUrl = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`;
  try {
    await Linking.openURL(marketUrl);
  } catch {
    await Linking.openURL(webUrl);
  }
}

/**
 * Play Store (native Play Core where possible) + App Store (custom UI → store).
 * Never uses system Alert — custom Reanimated popup instead.
 */
export function usePlayStoreInAppUpdate() {
  const [prompt, setPrompt] = useState<PromptState | null>(null);
  const [loading, setLoading] = useState(false);

  const checkingRef = useRef(false);
  const lastPromptAtRef = useRef(0);
  const clientRef = useRef<InstanceType<InAppUpdatesModule['default']> | null>(
    null,
  );
  const iosStoreUrlRef = useRef<string | null>(null);
  const promptedReadyRef = useRef(false);

  const storeName = Platform.OS === 'ios' ? 'App Store' : 'Play Store';
  const currentVersion = useMemo(() => getCurrentVersion(), []);

  const showReadyPrompt = useCallback(() => {
    if (promptedReadyRef.current) return;
    promptedReadyRef.current = true;
    setPrompt({
      mode: 'ready',
      force: false,
      storeVersion: undefined,
    });
  }, []);

  const dismissPrompt = useCallback(() => {
    setPrompt((prev) => {
      if (prev?.force) return prev;
      if (prev?.mode === 'ready') {
        promptedReadyRef.current = false;
      }
      return null;
    });
  }, []);

  const confirmPrompt = useCallback(async () => {
    const active = prompt;
    if (!active) return;

    setLoading(true);
    try {
      if (active.mode === 'ready') {
        clientRef.current?.installUpdate();
        return;
      }

      if (Platform.OS === 'ios') {
        const url = iosStoreUrlRef.current;
        if (url) {
          await Linking.openURL(url);
        }
        setPrompt(null);
        return;
      }

      await openPlayStoreListing();
      setPrompt(null);
    } catch (e) {
      console.log('[StoreInAppUpdate] confirm failed:', e);
    } finally {
      setLoading(false);
    }
  }, [prompt]);

  useEffect(() => {
    if (!isSupportedBuild) return;

    const mod = loadInAppUpdates();
    if (!mod) return;

    const {
      default: SpInAppUpdates,
      IAUUpdateKind,
      IAUInstallStatus,
      IAUAvailabilityStatus,
    } = mod;

    const client = new SpInAppUpdates(__DEV__);
    clientRef.current = client;

    const onStatus = (event: { status: number }) => {
      if (event.status === IAUInstallStatus.DOWNLOADED) {
        showReadyPrompt();
      }
    };

    if (Platform.OS === 'android') {
      client.addStatusUpdateListener(onStatus);
    }

    const runCheck = async (forceCheck: boolean) => {
      if (checkingRef.current) return;

      const now = Date.now();
      if (!forceCheck && now - lastPromptAtRef.current < CHECK_COOLDOWN_MS) {
        return;
      }

      checkingRef.current = true;

      try {
        if (Platform.OS === 'android') {
          const result = await client.checkNeedsUpdate({
            customVersionComparator: () => 1,
          });

          const extras =
            result && 'other' in result
              ? (result.other as {
                  updateAvailability?: number;
                  updatePriority?: number;
                  isFlexibleUpdateAllowed?: boolean;
                  isImmediateUpdateAllowed?: boolean;
                })
              : undefined;

          const availability = extras?.updateAvailability;

          if (availability === IAUAvailabilityStatus.DEVELOPER_TRIGGERED) {
            showReadyPrompt();
            return;
          }

          if (!result?.shouldUpdate) return;

          const priority = extras?.updatePriority ?? 0;
          const wantImmediate =
            priority >= FORCE_UPDATE_PRIORITY &&
            extras?.isImmediateUpdateAllowed === true;

          const updateType = wantImmediate
            ? IAUUpdateKind.IMMEDIATE
            : extras?.isFlexibleUpdateAllowed
              ? IAUUpdateKind.FLEXIBLE
              : extras?.isImmediateUpdateAllowed
                ? IAUUpdateKind.IMMEDIATE
                : null;

          if (updateType == null) {
            lastPromptAtRef.current = Date.now();
            setPrompt({
              mode: 'available',
              storeVersion: result.storeVersion,
              force: wantImmediate,
            });
            return;
          }

          lastPromptAtRef.current = Date.now();
          try {
            await client.startUpdate({ updateType });
          } catch (nativeErr) {
            console.log(
              '[StoreInAppUpdate] native Play UI failed, using custom:',
              nativeErr,
            );
            setPrompt({
              mode: 'available',
              storeVersion: result.storeVersion,
              force: wantImmediate,
            });
          }
          return;
        }

        const result = await client.checkNeedsUpdate({
          curVersion: getCurrentVersion(),
          bundleId: IOS_BUNDLE_ID,
          customVersionComparator: compareIosStoreVersion,
        });

        if (!result?.shouldUpdate) return;

        iosStoreUrlRef.current = resolveIosStoreUrl(
          'other' in result ? result.other : null,
        );

        lastPromptAtRef.current = Date.now();
        setPrompt({
          mode: 'available',
          storeVersion: result.storeVersion,
          force: false,
        });
      } catch (e) {
        console.log('[StoreInAppUpdate] check failed:', e);
      } finally {
        checkingRef.current = false;
      }
    };

    const startTimer = setTimeout(() => {
      void runCheck(true);
    }, 1600);

    const onAppState = (next: AppStateStatus) => {
      if (next === 'active') {
        void runCheck(false);
      }
    };
    const sub = AppState.addEventListener('change', onAppState);

    return () => {
      clearTimeout(startTimer);
      sub.remove();
      if (Platform.OS === 'android') {
        client.removeStatusUpdateListener(onStatus);
      }
      clientRef.current = null;
    };
  }, [showReadyPrompt]);

  return {
    prompt,
    storeName,
    currentVersion,
    loading,
    confirmPrompt,
    dismissPrompt,
  };
}
