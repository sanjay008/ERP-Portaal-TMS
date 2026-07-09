import GpsPermissionSheet from '@/src/components/GpsPermissionSheet';
import useUserGPS, {
  type LocationAccessStatus,
  openAppSettings,
  recheckLocationAccess,
  resolveLocationAccess,
  retryLocationPermission,
} from '../hooks/useUserGPS';
import { doesShiftBelongToUser, loadActiveShift } from '../utils/shiftSession';
import { restartDriverBackgroundLocation } from '@/src/tasks/driverLocationTask';
import { GlobalContextData } from '../context/GlobalContext';
import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

const REQUIRED_ROLE = 'chauffeur';

export default function DriverGPSTraking() {
  const {
    refreshLocationAccess,
    startTracking,
    locationAccess,
    shouldTrack,
    isChauffeur,
  } = useUserGPS();

  const {
    UserData,
    setIsGpsTracking,
    setActiveShift,
    setSelectCurrentDate,
    SelectLanguage,
  } = useContext(GlobalContextData);

  const [gpsPermissionSheet, setGpsPermissionSheet] = useState<{
    visible: boolean;
    reason: LocationAccessStatus | null;
  }>({ visible: false, reason: null });
  const [isGpsPermissionLoading, setIsGpsPermissionLoading] = useState(false);
  const restoredRef = useRef(false);
  const lastNotificationLanguageRef = useRef<string | null>(null);
  const chauffeurId = UserData?.user?.id;

  const handleGpsPermissionResult = useCallback(
    async (status: LocationAccessStatus) => {
      if (status === 'granted') {
        setGpsPermissionSheet({ visible: false, reason: null });
        setIsGpsTracking(true);
        await startTracking();
        return;
      }

      setGpsPermissionSheet({ visible: true, reason: status });
    },
    [setIsGpsTracking, startTracking],
  );

  useEffect(() => {
    if (!chauffeurId || UserData?.user?.role !== REQUIRED_ROLE) {
      restoredRef.current = false;
      return;
    }

    setIsGpsTracking(true);
  }, [chauffeurId, UserData?.user?.role, setIsGpsTracking]);

  useEffect(() => {
    if (!chauffeurId || UserData?.user?.role !== REQUIRED_ROLE || restoredRef.current) {
      return;
    }

    let cancelled = false;

    (async () => {
      const session = await loadActiveShift();
      if (cancelled) {
        return;
      }

      if (doesShiftBelongToUser(session, UserData)) {
        restoredRef.current = true;
        console.log('[Shift] restored for region context', session);
        setActiveShift(session);
        setSelectCurrentDate(session!.planning_date);
      }

      setIsGpsTracking(true);

      const status = await resolveLocationAccess();
      if (!cancelled && status !== 'granted') {
        handleGpsPermissionResult(status);
        return;
      }

      if (!cancelled) {
        await startTracking();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    chauffeurId,
    UserData,
    setActiveShift,
    setSelectCurrentDate,
    setIsGpsTracking,
    handleGpsPermissionResult,
    startTracking,
  ]);

  useEffect(() => {
    if (!isChauffeur || !chauffeurId || !shouldTrack || !SelectLanguage) {
      return;
    }

    if (lastNotificationLanguageRef.current === null) {
      lastNotificationLanguageRef.current = SelectLanguage;
      return;
    }

    if (lastNotificationLanguageRef.current === SelectLanguage) {
      return;
    }

    lastNotificationLanguageRef.current = SelectLanguage;
    restartDriverBackgroundLocation().catch(() => undefined);
  }, [SelectLanguage, isChauffeur, chauffeurId, shouldTrack]);

  useEffect(() => {
    if (!isChauffeur || !chauffeurId) {
      return;
    }

    const monitorLocationAccess = async () => {
      const status = await recheckLocationAccess();
      if (status === 'granted') {
        if (gpsPermissionSheet.visible) {
          await handleGpsPermissionResult(status);
        }
        return;
      }

      setGpsPermissionSheet({ visible: true, reason: status });
    };

    monitorLocationAccess();
    const intervalId = setInterval(monitorLocationAccess, 5000);
    const appStateSub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        monitorLocationAccess();
      }
    });

    return () => {
      clearInterval(intervalId);
      appStateSub.remove();
    };
  }, [
    isChauffeur,
    chauffeurId,
    gpsPermissionSheet.visible,
    handleGpsPermissionResult,
  ]);

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
      const status = await refreshLocationAccess();
      if (status === 'granted') {
        await handleGpsPermissionResult(status);
      }
    } finally {
      setIsGpsPermissionLoading(false);
    }
  }, [
    gpsPermissionSheet.reason,
    handleGpsPermissionResult,
    refreshLocationAccess,
  ]);

  if (!shouldTrack && !gpsPermissionSheet.visible) {
    return null;
  }

  return (
    <GpsPermissionSheet
      visible={gpsPermissionSheet.visible}
      reason={gpsPermissionSheet.reason ?? locationAccess}
      loading={isGpsPermissionLoading}
      onClose={() => setGpsPermissionSheet({ visible: false, reason: null })}
      onPrimaryAction={handleGpsSheetPrimaryAction}
    />
  );
}
