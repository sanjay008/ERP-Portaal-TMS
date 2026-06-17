import GpsPermissionSheet from '@/src/components/GpsPermissionSheet';
import useUserGPS, {
  type LocationAccessStatus,
  openAppSettings,
  recheckLocationAccess,
  resolveLocationAccess,
  retryLocationPermission,
} from '../hooks/useUserGPS';
import { GlobalContextData } from '../context/GlobalContext';
import { doesShiftBelongToUser, loadActiveShift } from '../utils/shiftSession';
import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

export default function DriverGPSTraking() {
  useUserGPS();

  const {
    UserData,
    setIsGpsTracking,
    setActiveShift,
    setSelectCurrentDate,
    activeShift,
  } = useContext(GlobalContextData);

  const [gpsPermissionSheet, setGpsPermissionSheet] = useState<{
    visible: boolean;
    reason: LocationAccessStatus | null;
  }>({ visible: false, reason: null });
  const [isGpsPermissionLoading, setIsGpsPermissionLoading] = useState(false);
  const restoredRef = useRef(false);

  const handleGpsPermissionResult = useCallback(
    (status: LocationAccessStatus) => {
      if (status === 'granted') {
        setGpsPermissionSheet({ visible: false, reason: null });
        setIsGpsTracking(true);
        return;
      }

      setGpsPermissionSheet({ visible: true, reason: status });
    },
    [setIsGpsTracking],
  );

  useEffect(() => {
    const userId = UserData?.user?.id;
    if (!userId || restoredRef.current) return;

    let cancelled = false;

    (async () => {
      const session = await loadActiveShift();
      if (cancelled || !doesShiftBelongToUser(session, UserData)) return;

      restoredRef.current = true;
      console.log('[Shift] ON (restored)', session);
      setActiveShift(session);
      setSelectCurrentDate(session!.planning_date);
      setIsGpsTracking(true);

      const status = await resolveLocationAccess();
      if (!cancelled && status !== 'granted') {
        handleGpsPermissionResult(status);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    UserData?.user?.id,
    setActiveShift,
    setSelectCurrentDate,
    setIsGpsTracking,
    handleGpsPermissionResult,
  ]);

  const handleGpsSheetPrimaryAction = useCallback(async () => {
    const reason = gpsPermissionSheet.reason;
    if (!reason || reason === 'granted') return;

    setIsGpsPermissionLoading(true);
    try {
      if (reason === 'denied') {
        const status = await retryLocationPermission();
        handleGpsPermissionResult(status);
        return;
      }

      await openAppSettings();
    } finally {
      setIsGpsPermissionLoading(false);
    }
  }, [gpsPermissionSheet.reason, handleGpsPermissionResult]);

  useEffect(() => {
    if (!gpsPermissionSheet.visible) return;

    const subscription = AppState.addEventListener('change', async (nextState) => {
      if (nextState !== 'active') return;

      const status = await recheckLocationAccess();
      if (status === 'granted') {
        handleGpsPermissionResult(status);
      }
    });

    return () => subscription.remove();
  }, [gpsPermissionSheet.visible, handleGpsPermissionResult]);

  if (!activeShift?.shiftActive && !gpsPermissionSheet.visible) {
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
