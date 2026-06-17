import { formatDate } from '@/src/components/DateFormate';
import { Images } from '@/src/assets/images';
import { GlobalContextData } from '@/src/context/GlobalContext';
import { Colors } from '@/src/utils/colors';
import { FONTS } from '@/src/utils/storeData';
import React, { useContext, useEffect, useState } from 'react';
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

type SheetMode = 'logout' | 'exit';

type Props = {
  visible: boolean;
  mode?: SheetMode;
  loading?: boolean;
  regionName?: string;
  planningDate?: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function LogoutShiftSheet({
  visible,
  mode = 'logout',
  loading = false,
  regionName = '',
  planningDate = '',
  onCancel,
  onConfirm,
}: Props) {
  const { t } = useTranslation();
  const { SelectLanguage } = useContext(GlobalContextData);
  const isExitMode = mode === 'exit';
  const insets = useSafeAreaInsets();
  const progress = useSharedValue(0);
  const [mounted, setMounted] = useState(false);

  const accent = isExitMode ? Colors.TabOrrange : Colors.red;
  const accentSoft = isExitMode ? '#FFF8E8' : '#FFF1F1';

  useEffect(() => {
    if (visible) {
      setMounted(true);
      progress.value = withSpring(1, {
        damping: 24,
        stiffness: 280,
        mass: 0.82,
      });
      return;
    }

    if (!mounted) return;

    progress.value = withTiming(
      0,
      { duration: 240, easing: Easing.in(Easing.cubic) },
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

  const sheetStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.35, 1], [0, 1, 1], Extrapolation.CLAMP),
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

  if (!mounted) return null;

  const title = isExitMode
    ? t('Close shift before exit?')
    : t('Close shift before logout?');
  const subtitle = isExitMode
    ? t('You have an active shift. Close it to exit the app, or cancel to stay.')
    : t('You have an active shift. Close it and log out, or cancel to stay signed in.');
  const confirmLabel = isExitMode
    ? t('Close shift & Exit')
    : t('Close shift & Log out');
  const formattedDate = planningDate
    ? formatDate(planningDate, SelectLanguage || 'en')
    : '';

  return (
    <View style={styles.host} pointerEvents="box-none">
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
      </Animated.View>

      <Animated.View
        style={[
          styles.sheet,
          sheetStyle,
          { paddingBottom: Math.max(insets.bottom, 20) },
        ]}
      >
        <View style={styles.handle} />

        <View style={[styles.accentBar, { backgroundColor: accent }]} />

        <View style={styles.body}>
          <View style={[styles.iconRing, { borderColor: `${accent}33` }]}>
            <View style={[styles.iconCircle, { backgroundColor: accentSoft }]}>
              <Image
                source={isExitMode ? Images.close : Images.LogOutFullBox}
                style={styles.icon}
                tintColor={accent}
              />
            </View>
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>

          {(regionName || formattedDate) ? (
            <View style={styles.infoCard}>
              {regionName ? (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>{t('Region')}</Text>
                  <Text style={styles.infoValue} numberOfLines={1}>
                    {regionName}
                  </Text>
                </View>
              ) : null}
              {formattedDate ? (
                <View style={[styles.infoRow, regionName && styles.infoRowBorder]}>
                  <Text style={styles.infoLabel}>{t('Start Date')}</Text>
                  <Text style={styles.infoValue}>{formattedDate}</Text>
                </View>
              ) : null}
            </View>
          ) : null}

          <Pressable
            style={({ pressed }) => [
              styles.primaryBtn,
              { backgroundColor: accent, opacity: pressed || loading ? 0.9 : 1 },
            ]}
            onPress={onConfirm}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.primaryBtnText}>{confirmLabel}</Text>
            )}
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.secondaryBtn,
              { opacity: pressed || loading ? 0.75 : 1 },
            ]}
            onPress={onCancel}
            disabled={loading}
          >
            <Text style={styles.secondaryBtnText}>{t('Cancel')}</Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2000,
    elevation: 2000,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.58)',
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.14,
    shadowRadius: 28,
    elevation: 24,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.litegray,
    marginTop: 12,
    marginBottom: 8,
  },
  accentBar: {
    height: 4,
    width: '100%',
  },
  body: {
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 8,
  },
  iconRing: {
    alignSelf: 'center',
    borderWidth: 1,
    borderRadius: 42,
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
    fontSize: 21,
    fontFamily: FONTS.SemiBold,
    color: Colors.black,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: FONTS.Regular,
    color: Colors.darkText,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 18,
    paddingHorizontal: 6,
  },
  infoCard: {
    backgroundColor: Colors.primaryopacity,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E8EEF9',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    gap: 12,
  },
  infoRowBorder: {
    borderTopWidth: 1,
    borderTopColor: '#E8EEF9',
  },
  infoLabel: {
    fontSize: 13,
    fontFamily: FONTS.Medium,
    color: Colors.darkText,
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
    fontFamily: FONTS.SemiBold,
    color: Colors.black,
    textAlign: 'right',
  },
  primaryBtn: {
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtnText: {
    fontSize: 16,
    fontFamily: FONTS.SemiBold,
    color: Colors.white,
  },
  secondaryBtn: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.litegray,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontSize: 15,
    fontFamily: FONTS.SemiBold,
    color: Colors.black,
  },
});
