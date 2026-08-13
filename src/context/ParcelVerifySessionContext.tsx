import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import {
  clearActiveVerifyDeliveryLabel,
  getActiveVerifyDeliveryLabel,
  setActiveVerifyDeliveryLabel,
} from '@/src/utils/parcelVerifyDeliveryLabelStore';

export type ParcelVerifySession = {
  deliveryLabel: any | null;
  damageData: any | null;
  orderId: number | string | null;
  itemId: number | string | null;
};

type ParcelVerifySessionContextValue = {
  session: ParcelVerifySession;
  /** Shared across Filter + Details — one source of truth for comment popup. */
  commentVisible: boolean;
  setCommentVisible: (visible: boolean) => void;
  setSessionDeliveryLabel: (label: any | null) => void;
  setSessionDamageData: (damage: any | null) => void;
  setSessionPlace: (place: {
    orderId?: number | string | null;
    itemId?: number | string | null;
  }) => void;
  clearParcelVerifySession: () => void;
};

const EMPTY_SESSION: ParcelVerifySession = {
  deliveryLabel: null,
  damageData: null,
  orderId: null,
  itemId: null,
};

/**
 * Survives FilterScreen focus clear + React remount of session state.
 * Only cleared explicitly after signature / go-to-list / next-parcel clear.
 */
let rememberedDeliveryLabel: any = null;

/**
 * Hard pin for Direct Flow — survives brief clears while Camera is open /
 * Filter focus races. Cleared only with clearRememberedDeliveryLabel.
 */
let pinnedDeliveryLabel: any = null;

/**
 * Latest Camera setData — set synchronously before navigate so CustomCamera
 * never calls a stale DeliveyDataSave from React context.
 */
let latestDeliveryCameraSetData: ((images: any[]) => void | Promise<void>) | null =
  null;
let latestPickupCameraSetData: ((images: any[]) => void | Promise<void>) | null =
  null;

export function setLatestDeliveryCameraSetData(
  fn: ((images: any[]) => void | Promise<void>) | null,
) {
  latestDeliveryCameraSetData = fn;
}

export function setLatestPickupCameraSetData(
  fn: ((images: any[]) => void | Promise<void>) | null,
) {
  latestPickupCameraSetData = fn;
}

export function runLatestDeliveryCameraSetData(images: any[]) {
  const fn = latestDeliveryCameraSetData;
  if (typeof fn === 'function') {
    return fn(images);
  }
  return undefined;
}

export function runLatestPickupCameraSetData(images: any[]) {
  const fn = latestPickupCameraSetData;
  if (typeof fn === 'function') {
    return fn(images);
  }
  return undefined;
}

export function rememberDeliveryLabel(label: any) {
  if (label == null) return;
  rememberedDeliveryLabel = label;
  pinnedDeliveryLabel = label;
  setActiveVerifyDeliveryLabel(label);
  console.log('[rememberDeliveryLabel]', {
    id: label?.id,
    signature_required: label?.signature_required,
    signature_rejected: label?.signature_rejected,
    title: label?.title,
  });
}

export function getRememberedDeliveryLabel() {
  return (
    getActiveVerifyDeliveryLabel() ??
    pinnedDeliveryLabel ??
    rememberedDeliveryLabel
  );
}

export function clearRememberedDeliveryLabel() {
  console.log('[clearRememberedDeliveryLabel]');
  rememberedDeliveryLabel = null;
  pinnedDeliveryLabel = null;
  clearActiveVerifyDeliveryLabel();
}

const ParcelVerifySessionContext =
  createContext<ParcelVerifySessionContextValue | null>(null);

export function ParcelVerifySessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, setSession] = useState<ParcelVerifySession>(EMPTY_SESSION);
  const [commentVisible, setCommentVisible] = useState(false);

  const setSessionDeliveryLabel = useCallback((label: any | null) => {
    console.log('[ParcelVerifySession] setSessionDeliveryLabel', {
      id: label?.id ?? null,
      signature_required: label?.signature_required,
      signature_rejected: label?.signature_rejected,
      isNull: label == null,
      full: label,
    });
    // Only pin on set — never wipe remembered here (Filter/Direct Flow soft clears
    // call this with null and were wiping optional label mid-flow).
    if (label != null) {
      rememberDeliveryLabel(label);
    }
    setSession((prev) => ({ ...prev, deliveryLabel: label }));
  }, []);

  const setSessionDamageData = useCallback((damage: any | null) => {
    setSession((prev) => ({ ...prev, damageData: damage }));
  }, []);

  const setSessionPlace = useCallback(
    (place: {
      orderId?: number | string | null;
      itemId?: number | string | null;
    }) => {
      setSession((prev) => ({
        ...prev,
        orderId: place.orderId !== undefined ? place.orderId : prev.orderId,
        itemId: place.itemId !== undefined ? place.itemId : prev.itemId,
      }));
    },
    [],
  );

  const clearParcelVerifySession = useCallback(() => {
    clearRememberedDeliveryLabel();
    setCommentVisible(false);
    setSession(EMPTY_SESSION);
  }, []);

  const value = useMemo(
    () => ({
      session,
      commentVisible,
      setCommentVisible,
      setSessionDeliveryLabel,
      setSessionDamageData,
      setSessionPlace,
      clearParcelVerifySession,
    }),
    [
      session,
      commentVisible,
      setCommentVisible,
      setSessionDeliveryLabel,
      setSessionDamageData,
      setSessionPlace,
      clearParcelVerifySession,
    ],
  );

  return (
    <ParcelVerifySessionContext.Provider value={value}>
      {children}
    </ParcelVerifySessionContext.Provider>
  );
}

export function useParcelVerifySession() {
  const ctx = useContext(ParcelVerifySessionContext);
  if (ctx == null) {
    throw new Error(
      'useParcelVerifySession must be used within ParcelVerifySessionProvider',
    );
  }
  return ctx;
}
