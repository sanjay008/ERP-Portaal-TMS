import useUserGPS from '../hooks/useUserGPS';
import { refreshNativeNotificationLabels } from '@/src/utils/nativeDriverLocation';
import { GlobalContextData } from '../context/GlobalContext';
import React, { useContext, useEffect, useRef } from 'react';

const REQUIRED_ROLE = 'chauffeur';

/**
 * Periodic driver location API (native FGS, 15 min interval).
 * Shift on/off and permissions are handled by ChauffeurLocationBootstrap.
 */
export default function DriverGPSTraking() {
  const { shouldTrack, isChauffeur } = useUserGPS();

  const { UserData, setIsGpsTracking, activeShift, SelectLanguage } =
    useContext(GlobalContextData);

  const lastNotificationLanguageRef = useRef<string | null>(null);
  const chauffeurId = UserData?.user?.id;
  const shiftOn = Boolean(activeShift?.shiftActive);

  useEffect(() => {
    const isChauffeurRole =
      UserData?.user?.role === REQUIRED_ROLE && Boolean(chauffeurId);
    setIsGpsTracking(isChauffeurRole && shiftOn);
  }, [chauffeurId, UserData?.user?.role, shiftOn, setIsGpsTracking]);

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
    refreshNativeNotificationLabels().catch(() => undefined);
  }, [SelectLanguage, isChauffeur, chauffeurId, shouldTrack]);

  return null;
}
