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
  const { UserData, setActiveShift, setSelectCurrentDate } =
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

  useChauffeurLocation(role);

  // Restore active shift after app reopen (same date/region) — does not close shift.
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

  const handleGpsPermissionResult = useCallback(async (status: LocationAccessStatus) => {
    if (status === 'granted') {
      setGpsPermissionSheet({ visible: false, reason: null });
      await startChauffeurLocationWatch();
      return;
    }

    setGpsPermissionSheet({ visible: true, reason: status });
  }, []);

  const requestChauffeurLocationPermission = useCallback(async () => {
    if (!isChauffeur || !userId) {
      return;
    }

    if (permissionPromptedRef.current === userId) {
      const status = await recheckLocationAccess();
      if (status === 'granted') {
        await handleGpsPermissionResult(status);
      }
      return;
    }

    permissionPromptedRef.current = userId;
    setIsGpsPermissionLoading(true);
    try {
      const status = await resolveLocationAccess();
      await handleGpsPermissionResult(status);
    } finally {
      setIsGpsPermissionLoading(false);
    }
  }, [handleGpsPermissionResult, isChauffeur, userId]);

  useEffect(() => {
    if (!isChauffeur || !userId) {
      permissionPromptedRef.current = null;
      return;
    }

    requestChauffeurLocationPermission().catch(() => undefined);
  }, [isChauffeur, userId, requestChauffeurLocationPermission]);

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
