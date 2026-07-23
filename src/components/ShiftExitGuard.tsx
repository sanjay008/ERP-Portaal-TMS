import LogoutShiftSheet from '@/src/components/LogoutShiftSheet';
import { useErrorHandle } from '@/src/components/ErrorHandle';
import { GlobalContextData } from '@/src/context/GlobalContext';
import {
  buildDateTime,
  getCurrentTimeString,
  tripOff,
} from '@/src/utils/regionTripApi';
import {
  clearActiveShift,
  doesShiftBelongToUser,
} from '@/src/utils/shiftSession';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useContext, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BackHandler, Platform } from 'react-native';

type Props = {
  navigation: any;
};

export default function ShiftExitGuard({ navigation }: Props) {
  const { t } = useTranslation();
  const { ErrorHandle } = useErrorHandle();
  const {
    UserData,
    activeShift,
    setActiveShift,
    setIsGpsTracking,
    setToast,
  } = useContext(GlobalContextData);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const handleCloseShiftAndExit = useCallback(async () => {
    if (!doesShiftBelongToUser(activeShift, UserData)) {
      setSheetVisible(false);
      BackHandler.exitApp();
      return;
    }

    setIsClosing(true);
    try {
      const planning_date = activeShift!.planning_date;
      const ended_at = buildDateTime(planning_date, getCurrentTimeString());
      const response = await tripOff({
        UserData,
        region_id: activeShift!.region_id,
        planning_date,
        ended_at,
      });

      if (!response?.status) {
        setToast({
          top: 45,
          text: t(response?.message) || t('Failed to close shift'),
          type: 'error',
          visible: true,
        });
        return;
      }

      setSheetVisible(false);
      setIsGpsTracking(false);

      await new Promise((resolve) => setTimeout(resolve, 150));

      // Silent is_active=0 + disable guard (trip already ended above).
      const { getChauffeurLocation } = await import(
        '@/src/utils/chauffeurLocationCache'
      );
      const { sendDriverLocationUpdate } = await import(
        '@/src/utils/driverLocationApi'
      );
      const cached = getChauffeurLocation();
      if (cached.latitude && cached.longitude) {
        await sendDriverLocationUpdate(
          {
            latitude: cached.latitude,
            longitude: cached.longitude,
            heading: null,
            speed: null,
            accuracy: null,
          },
          UserData,
          activeShift!.region_id,
          planning_date,
          0,
        ).catch(() => undefined);
      }

      await clearActiveShift();
      setActiveShift(null);
      const { disableShiftLocationGuard } = await import(
        '@/src/utils/shiftLocationGuard'
      );
      await disableShiftLocationGuard();
      BackHandler.exitApp();
    } catch (error: any) {
      setToast({
        top: 45,
        text: ErrorHandle(error)?.message || t('Failed to close shift'),
        type: 'error',
        visible: true,
      });
    } finally {
      setIsClosing(false);
    }
  }, [
    UserData,
    activeShift,
    setActiveShift,
    setIsGpsTracking,
    setToast,
    t,
    ErrorHandle,
  ]);

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'android') {
        return undefined;
      }

      const onBackPress = () => {
        if (sheetVisible) {
          if (!isClosing) {
            setSheetVisible(false);
          }
          return true;
        }

        if (navigation.canGoBack()) {
          return false;
        }

        if (!doesShiftBelongToUser(activeShift, UserData)) {
          return false;
        }

        setSheetVisible(true);
        return true;
      };

      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        onBackPress,
      );

      return () => subscription.remove();
    }, [
      navigation,
      sheetVisible,
      isClosing,
      activeShift,
      UserData,
    ]),
  );

  return (
    <LogoutShiftSheet
      mode="exit"
      visible={sheetVisible}
      loading={isClosing}
      regionName={activeShift?.region_name || ''}
      planningDate={activeShift?.planning_date || ''}
      onCancel={() => {
        if (!isClosing) {
          setSheetVisible(false);
        }
      }}
      onConfirm={handleCloseShiftAndExit}
    />
  );
}
