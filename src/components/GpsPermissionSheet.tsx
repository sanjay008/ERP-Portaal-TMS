import { Images } from '@/src/assets/images';
import type { LocationAccessStatus } from '@/src/hooks/useUserGPS';
import { Colors } from '@/src/utils/colors';
import { FONTS } from '@/src/utils/storeData';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Image,
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

type Props = {
  visible: boolean;
  reason: LocationAccessStatus | null;
  loading?: boolean;
  onClose: () => void;
  onPrimaryAction: () => void;
};

type SheetContent = {
  title: string;
  description: string;
  steps: string[];
  primaryLabel: string;
  accent: string;
};

export default function GpsPermissionSheet({
  visible,
  reason,
  loading = false,
  onClose,
  onPrimaryAction,
}: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const progress = useSharedValue(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      progress.value = withSpring(1, {
        damping: 20,
        stiffness: 260,
        mass: 0.85,
      });
      return;
    }

    if (!mounted) return;

    progress.value = withTiming(
      0,
      { duration: 260, easing: Easing.in(Easing.cubic) },
      (finished) => {
        if (finished) {
          runOnJS(setMounted)(false);
        }
      },
    );
  }, [visible, mounted]);

  const content = useMemo((): SheetContent | null => {
    if (!reason || reason === 'granted') return null;

    if (reason === 'blocked') {
      return {
        title: t('Location access is turned off'),
        description: t(
          'GPS tracking needs location permission. Enable it in your device settings to continue.',
        ),
        steps: [
          t('Open Settings'),
          t('Tap Permissions → Location'),
          t('Select "Allow while using the app"'),
        ],
        primaryLabel: t('Open Settings'),
        accent: Colors.primary,
      };
    }

    if (reason === 'services_disabled') {
      return {
        title: t('Turn on Location Services'),
        description: t(
          'Your device location is turned off. Enable Location Services to start GPS tracking.',
        ),
        steps: [
          t('Open Settings'),
          t('Go to Location / Privacy'),
          t('Turn on Location Services'),
        ],
        primaryLabel: t('Open Settings'),
        accent: Colors.TabOrrange,
      };
    }

    return {
      title: t('Allow location access'),
      description: t(
        'We need your location to track deliveries and enable scanning for this route.',
      ),
      steps: [
        t('Tap "Allow Location" below'),
        t('Choose "While using the app"'),
      ],
      primaryLabel: t('Allow Location'),
      accent: Colors.green,
    };
  }, [reason, t]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1], Extrapolation.CLAMP),
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.4, 1], [0, 1, 1], Extrapolation.CLAMP),
    transform: [
      {
        translateY: interpolate(
          progress.value,
          [0, 1],
          [320, 0],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  if (!mounted || !content) {
    return null;
  }

  return (
    <View style={styles.host} pointerEvents="box-none">
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View
        style={[
          styles.sheet,
          sheetStyle,
          { paddingBottom: Math.max(insets.bottom, 20) },
        ]}
      >
        <View style={styles.handle} />

        <View style={[styles.iconRing, { borderColor: `${content.accent}33` }]}>
          <View style={[styles.iconCircle, { backgroundColor: `${content.accent}18` }]}>
            <Image
              source={Images.location}
              style={styles.icon}
              tintColor={content.accent}
            />
          </View>
        </View>

        <Text style={styles.title}>{content.title}</Text>
        <Text style={styles.description}>{content.description}</Text>

        <View style={styles.stepsCard}>
          {content.steps.map((step, index) => (
            <View key={`${step}-${index}`} style={styles.stepRow}>
              <View style={[styles.stepBadge, { backgroundColor: content.accent }]}>
                <Text style={styles.stepBadgeText}>{index + 1}</Text>
              </View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.primaryBtn,
            { backgroundColor: content.accent, opacity: pressed ? 0.88 : 1 },
          ]}
          onPress={onPrimaryAction}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.primaryBtnText}>{content.primaryLabel}</Text>
          )}
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.secondaryBtn, { opacity: pressed ? 0.7 : 1 }]}
          onPress={onClose}
          disabled={loading}
        >
          <Text style={styles.secondaryBtnText}>{t('Not now')}</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    elevation: 999,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 16,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.litegray,
    marginBottom: 20,
  },
  iconRing: {
    alignSelf: 'center',
    borderWidth: 1,
    borderRadius: 40,
    padding: 4,
    marginBottom: 16,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: 30,
    height: 30,
  },
  title: {
    fontSize: 20,
    fontFamily: FONTS.SemiBold,
    color: Colors.black,
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    fontFamily: FONTS.Regular,
    color: Colors.darkText,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  stepsCard: {
    backgroundColor: Colors.primaryopacity,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 22,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadgeText: {
    color: Colors.white,
    fontSize: 12,
    fontFamily: FONTS.SemiBold,
  },
  stepText: {
    flex: 1,
    fontSize: 13,
    fontFamily: FONTS.Medium,
    color: Colors.black,
    lineHeight: 18,
  },
  primaryBtn: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  primaryBtnText: {
    color: Colors.white,
    fontSize: 16,
    fontFamily: FONTS.SemiBold,
  },
  secondaryBtn: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    color: Colors.darkText,
    fontSize: 15,
    fontFamily: FONTS.Medium,
  },
});
