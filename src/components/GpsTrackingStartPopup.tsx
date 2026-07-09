import { formatDate } from '@/src/components/DateFormate';
import TimePickerField from '@/src/components/TimePickerField';
import { GlobalContextData } from '@/src/context/GlobalContext';
import { Colors } from '@/src/utils/colors';
import { getCurrentTimeString } from '@/src/utils/regionTripApi';
import { FONTS } from '@/src/utils/storeData';
import React, { useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type RegionTripPopupMode = 'start' | 'end';

type Props = {
  visible: boolean;
  mode?: RegionTripPopupMode;
  initialDate?: string;
  initialTime?: string;
  regionName?: string;
  loading?: boolean;
  onClose: () => void;
  onConfirm: (date: string, time: string) => void;
};

export default function GpsTrackingStartPopup({
  visible,
  mode = 'start',
  initialDate = '',
  initialTime = '',
  regionName = '',
  loading = false,
  onClose,
  onConfirm,
}: Props) {
  const { t } = useTranslation();
  const { SelectLanguage } = useContext(GlobalContextData);
  const insets = useSafeAreaInsets();
  const progress = useSharedValue(0);
  const [mounted, setMounted] = useState(false);
  const [tripTime, setTripTime] = useState(initialTime);

  const isStartMode = mode === 'start';
  const dateLabel = isStartMode ? t('Start Date') : t('End Date');
  const timeLabel = isStartMode ? t('Start Time') : t('End Time');
  const title = isStartMode ? t('Start Shift') : t('Close shift');
  const subtitle = isStartMode
    ? t('Select start time for shift')
    : t('Select end time to close shift');
  const confirmLabel = isStartMode ? t('Start Shift') : t('Close shift');
  const formattedDate = initialDate
    ? formatDate(initialDate, SelectLanguage || 'en')
    : '—';

  useEffect(() => {
    if (visible) {
      setTripTime(initialTime || getCurrentTimeString());
    }
  }, [visible, initialTime]);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      progress.value = withSpring(1, {
        damping: 22,
        stiffness: 280,
        mass: 0.8,
      });
      return;
    }

    if (!mounted) return;

    progress.value = withTiming(
      0,
      { duration: 220, easing: Easing.in(Easing.cubic) },
      (finished) => {
        if (finished) {
          runOnJS(setMounted)(false);
        }
      },
    );
  }, [visible, mounted, progress]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1], Extrapolation.CLAMP),
  }));

  const cardStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.35, 1], [0, 1, 1], Extrapolation.CLAMP),
    transform: [
      {
        translateY: interpolate(
          progress.value,
          [0, 1],
          [28, 0],
          Extrapolation.CLAMP,
        ),
      },
      {
        scale: interpolate(
          progress.value,
          [0, 1],
          [0.94, 1],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  if (!mounted) return null;

  return (
    <View style={styles.host} pointerEvents="box-none">
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View
        style={[
          styles.card,
          cardStyle,
          { marginBottom: Math.max(insets.bottom, 24) },
        ]}
      >
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>

        <View style={styles.fieldBlock}>
          <Text style={styles.label}>{dateLabel}</Text>
          <View style={styles.readOnlyField}>
            <Text style={styles.readOnlyText}>{formattedDate}</Text>
          </View>
        </View>

        {regionName ? (
          <View style={styles.fieldBlock}>
            <Text style={styles.label}>{t('Region')}</Text>
            <View style={styles.readOnlyField}>
              <Text style={styles.readOnlyText}>{regionName}</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.fieldBlock}>
          <Text style={styles.label}>{timeLabel}</Text>
          <TimePickerField time={tripTime} setTime={setTripTime} />
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.startBtn,
            { opacity: pressed || loading ? 0.88 : 1 },
          ]}
          onPress={() => onConfirm(initialDate, tripTime)}
          disabled={loading || !initialDate || !tripTime}
        >
          {loading ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.startBtnText}>{confirmLabel}</Text>
          )}
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    elevation: 1000,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: Colors.white,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 18,
  },
  title: {
    fontSize: 18,
    fontFamily: FONTS.SemiBold,
    color: Colors.black,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 6,
    marginBottom: 18,
    fontSize: 13,
    fontFamily: FONTS.Regular,
    color: Colors.darkText,
    textAlign: 'center',
  },
  fieldBlock: {
    marginBottom: 14,
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontFamily: FONTS.Medium,
    color: Colors.black,
  },
  readOnlyField: {
    minHeight: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.litegray,
    backgroundColor: Colors.primaryopacity,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  readOnlyText: {
    fontSize: 14,
    fontFamily: FONTS.Medium,
    color: Colors.black,
  },
  startBtn: {
    marginTop: 8,
    height: 48,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  startBtnText: {
    fontSize: 15,
    fontFamily: FONTS.SemiBold,
    color: Colors.white,
  },
});
