import GpsPermissionSheet from '@/src/components/GpsPermissionSheet';
import { GlobalContextData } from '@/src/context/GlobalContext';
import {
  startChauffeurLocationWatch,
  useChauffeurLocation,
} from '@/src/hooks/useChauffeurLocation';
import { REQUIRED_CHAUFFEUR_ROLE } from '@/src/utils/driverLocationApi';
import {
  doesShiftBelongToUser,
  loadActiveShift,
} from '@/src/utils/shiftSession';
import {
  type LocationAccessStatus,
  openAppSettings,
  recheckLocationAccess,
  resolveLocationAccess,
  retryLocationPermission,
} from '@/src/hooks/useUserGPS';
import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

export default function ChauffeurLocationBootstrap() {
  const { UserData, setActiveShift, setSelectCurrentDate, activeShift } =
    useContext(GlobalContextData);
  const role = UserData?.user?.role;
  const userId = UserData?.user?.id;
  const isChauffeur = role === REQUIRED_CHAUFFEUR_ROLE;

  const [isGpsPermissionLoading, setIsGpsPermissionLoading] = useState(false);
  const [gpsPermissionSheet, setGpsPermissionSheet] = useState<{
    visible: boolean;
    reason: LocationAccessStatus | null;
  }>({ visible: false, reason: null });

  const permissionPromptedRef = useRef<number | string | null>(null);
  const shiftRestoredRef = useRef(false);
  const activeShiftRef = useRef(activeShift);
  activeShiftRef.current = activeShift;

  useChauffeurLocation(role);

  // Native force-close (location off) → wipe JS shift state immediately.
  useEffect(() => {
    if (!isChauffeur) {
      return;
    }
    let sub: { remove: () => void } | null = null;
    (async () => {
      const { subscribeShiftForceClosed, consumeAndWipePendingShiftClose } =
        await import('@/src/utils/shiftLocationGuard');
      await consumeAndWipePendingShiftClose(setActiveShift);
      sub = subscribeShiftForceClosed(setActiveShift);
    })();
    return () => {
      sub?.remove();
    };
  }, [isChauffeur, setActiveShift]);

  const enableGuardIfNeeded = useCallback(async () => {
    if (!isChauffeur || !UserData) {
      return;
    }

    const current = activeShiftRef.current;
    const session =
      (current?.shiftActive ? current : null) ?? (await loadActiveShift());

    if (!doesShiftBelongToUser(session, UserData)) {
      return;
    }

    const { enableShiftLocationGuard } = await import(
      '@/src/utils/shiftLocationGuard'
    );
    await enableShiftLocationGuard(UserData, session);
  }, [UserData, isChauffeur]);

  // Restore active shift after app reopen — do NOT start native guard until permission is granted.
  useEffect(() => {
    if (!isChauffeur || !userId) {
      shiftRestoredRef.current = false;
      return;
    }

    if (shiftRestoredRef.current) {
      return;
    }

    let cancelled = false;

    (async () => {
      const session = await loadActiveShift();
      if (cancelled) {
        return;
      }

      if (doesShiftBelongToUser(session, UserData)) {
        shiftRestoredRef.current = true;
        console.log('[Shift] restored for region context', session);
        setActiveShift(session);
        setSelectCurrentDate(session!.planning_date);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isChauffeur, userId, UserData, setActiveShift, setSelectCurrentDate]);

  // After restore / Filter shift ON: enable guard once permission is available.
  useEffect(() => {
    if (!isChauffeur || !activeShift?.shiftActive) {
      return;
    }
    void enableGuardIfNeeded();
  }, [
    isChauffeur,
    activeShift?.shiftActive,
    activeShift?.region_id,
    activeShift?.planning_date,
    enableGuardIfNeeded,
  ]);

  const handleGpsPermissionResult = useCallback(async (status: LocationAccessStatus) => {
    if (status === 'granted') {
      setGpsPermissionSheet({ visible: false, reason: null });
      await startChauffeurLocationWatch();
      // Native FGS needs location permission first — enable only after grant.
      await enableGuardIfNeeded();
      return;
    }

    setGpsPermissionSheet({ visible: true, reason: status });
  }, [enableGuardIfNeeded]);

  // Permission once per user — do not re-run when activeShift changes (that caused duplicate guard enable).
  useEffect(() => {
    if (!isChauffeur || !userId) {
      permissionPromptedRef.current = null;
      return;
    }

    if (permissionPromptedRef.current === userId) {
      return;
    }

    permissionPromptedRef.current = userId;
    let cancelled = false;

    (async () => {
      setIsGpsPermissionLoading(true);
      try {
        const status = await resolveLocationAccess();
        if (!cancelled) {
          await handleGpsPermissionResult(status);
        }
      } finally {
        if (!cancelled) {
          setIsGpsPermissionLoading(false);
        }
      }
    })().catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [isChauffeur, userId, handleGpsPermissionResult]);

  const handleGpsSheetPrimaryAction = useCallback(async () => {
    const reason = gpsPermissionSheet.reason;
    if (!reason || reason === 'granted') {
      return;
    }

    setIsGpsPermissionLoading(true);
    try {
      if (reason === 'denied' || reason === 'services_disabled') {
        const status = await retryLocationPermission();
        await handleGpsPermissionResult(status);
        return;
      }

      await openAppSettings();
    } finally {
      setIsGpsPermissionLoading(false);
    }
  }, [gpsPermissionSheet.reason, handleGpsPermissionResult]);

  useEffect(() => {
    if (!gpsPermissionSheet.visible) {
      return;
    }

    const subscription = AppState.addEventListener('change', async (nextState) => {
      if (nextState !== 'active') {
        return;
      }

      const status = await recheckLocationAccess();
      await handleGpsPermissionResult(status);
    });

    return () => subscription.remove();
  }, [gpsPermissionSheet.visible, handleGpsPermissionResult]);

  if (!isChauffeur) {
    return null;
  }

  return (
    <GpsPermissionSheet
      visible={gpsPermissionSheet.visible}
      reason={gpsPermissionSheet.reason}
      loading={isGpsPermissionLoading}
      onClose={() => setGpsPermissionSheet({ visible: false, reason: null })}
      onPrimaryAction={handleGpsSheetPrimaryAction}
    />
  );
}
