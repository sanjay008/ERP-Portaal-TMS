import { Images } from '@/src/assets/images';
import { Colors } from '@/src/utils/colors';
import { FONTS } from '@/src/utils/storeData';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
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

export type ImageSourceChoice = 'camera' | 'gallery';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (source: ImageSourceChoice) => void;
  showCamera?: boolean;
  showGallery?: boolean;
};

/**
 * Reanimated bottom sheet: Camera / Gallery (no native Alert).
 */
export default function ImageSourceSheet({
  visible,
  onClose,
  onSelect,
  showCamera = true,
  showGallery = true,
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
  }, [visible, mounted, progress]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1], Extrapolation.CLAMP),
  }));

  const sheetStyle = useAnimatedStyle(() => ({
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

  if (!mounted) {
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
          {
            // Stay above home indicator / gesture bar (safe area).
            paddingBottom: Math.max(insets.bottom, 16) + 8,
          },
        ]}
      >
        <View style={styles.handle} />

        <View style={styles.iconRing}>
          <View style={styles.iconCircle}>
            <Image
              source={Images.UploadPhoto}
              style={styles.icon}
              tintColor={Colors.primary}
            />
          </View>
        </View>

        <Text style={styles.title}>{t('Add photo')}</Text>
        <Text style={styles.description}>
          {t('Choose Camera or Gallery')}
        </Text>

        <View style={styles.optionsRow}>
          {showCamera ? (
            <Pressable
              style={({ pressed }) => [
                styles.optionCard,
                { opacity: pressed ? 0.88 : 1 },
              ]}
              onPress={() => onSelect('camera')}
            >
              <View style={styles.optionIconWrap}>
                <Image
                  source={Images.UploadPhoto}
                  style={styles.optionIcon}
                  tintColor={Colors.primary}
                />
              </View>
              <Text style={styles.optionLabel}>{t('Camera')}</Text>
            </Pressable>
          ) : null}

          {showGallery ? (
            <Pressable
              style={({ pressed }) => [
                styles.optionCard,
                { opacity: pressed ? 0.88 : 1 },
              ]}
              onPress={() => onSelect('gallery')}
            >
              <View style={styles.optionIconWrap}>
                <Image
                  source={Images.UploadPhoto}
                  style={styles.optionIcon}
                  tintColor={Colors.primary}
                />
              </View>
              <Text style={styles.optionLabel}>{t('Gallery')}</Text>
            </Pressable>
          ) : null}
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.cancelBtn,
            { opacity: pressed ? 0.7 : 1 },
          ]}
          onPress={onClose}
        >
          <Text style={styles.cancelText}>{t('Cancel')}</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10000,
    elevation: 10000,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 10,
    gap: 12,
  },
  handle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.litegray,
    marginBottom: 4,
  },
  iconRing: {
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: `${Colors.primary}33`,
    borderRadius: 40,
    padding: 6,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: `${Colors.primary}18`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: 26,
    height: 26,
    resizeMode: 'contain',
  },
  title: {
    textAlign: 'center',
    fontSize: 17,
    fontFamily: FONTS.SemiBold,
    color: Colors.black,
  },
  description: {
    textAlign: 'center',
    fontSize: 13,
    fontFamily: FONTS.Regular,
    color: Colors.darkText,
    marginBottom: 4,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  optionCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primaryopacity,
    backgroundColor: Colors.primarylite,
    paddingVertical: 18,
    alignItems: 'center',
    gap: 10,
  },
  optionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionIcon: {
    width: 22,
    height: 22,
    resizeMode: 'contain',
  },
  optionLabel: {
    fontSize: 14,
    fontFamily: FONTS.SemiBold,
    color: Colors.black,
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  cancelText: {
    fontSize: 14,
    fontFamily: FONTS.Medium,
    color: Colors.darkText,
  },
});
