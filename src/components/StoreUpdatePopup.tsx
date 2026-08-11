import { usePlayStoreInAppUpdate } from '@/src/hooks/usePlayStoreInAppUpdate';
import { Colors } from '@/src/utils/colors';
import { FONTS } from '@/src/utils/storeData';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
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

export type StoreUpdatePromptMode = 'available' | 'ready';

export type StoreUpdatePopupProps = {
  visible: boolean;
  mode: StoreUpdatePromptMode;
  storeName: 'Play Store' | 'App Store';
  currentVersion?: string;
  storeVersion?: string;
  force?: boolean;
  loading?: boolean;
  onUpdate: () => void;
  onDismiss: () => void;
};

export default function StoreUpdatePopup({
  visible,
  mode,
  storeName,
  currentVersion,
  storeVersion,
  force = false,
  loading = false,
  onUpdate,
  onDismiss,
}: StoreUpdatePopupProps) {
  const insets = useSafeAreaInsets();
  const progress = useSharedValue(0);
  const [mounted, setMounted] = useState(false);

  const isReady = mode === 'ready';
  const title = isReady ? 'Update ready' : 'Update available';
  const subtitle = isReady
    ? 'The new version has finished downloading. Restart to install it now.'
    : `A newer version is available on the ${storeName}. Update to keep using the latest features and fixes.`;
  const primaryLabel = isReady ? 'Restart & install' : 'Update';
  const iconName = isReady ? 'checkmark-circle' : 'cloud-download-outline';

  useEffect(() => {
    if (visible) {
      setMounted(true);
      progress.value = withSpring(1, {
        damping: 20,
        stiffness: 260,
        mass: 0.82,
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
        translateY: interpolate(progress.value, [0, 1], [36, 0], Extrapolation.CLAMP),
      },
      {
        scale: interpolate(progress.value, [0, 1], [0.94, 1], Extrapolation.CLAMP),
      },
    ],
  }));

  if (!mounted) return null;

  return (
    <View style={styles.host} pointerEvents="box-none">
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        {!force ? (
          <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} />
        ) : (
          <View style={StyleSheet.absoluteFill} />
        )}
      </Animated.View>

      <Animated.View
        style={[
          styles.card,
          cardStyle,
          { marginBottom: Math.max(insets.bottom, 20) },
        ]}
      >
        <View style={styles.handle} />

        <View style={styles.iconWrap}>
          <Ionicons name={iconName as any} size={34} color={Colors.primary} />
        </View>

        <View style={styles.storePill}>
          <Text style={styles.storePillText}>{storeName}</Text>
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>

        {(currentVersion || storeVersion) && (
          <View style={styles.versionRow}>
            {!!currentVersion && (
              <View style={styles.versionChip}>
                <Text style={styles.versionLabel}>Current</Text>
                <Text style={styles.versionValue}>v{currentVersion}</Text>
              </View>
            )}
            {!!currentVersion && !!storeVersion && (
              <Ionicons name="arrow-forward" size={16} color={Colors.darkText} />
            )}
            {!!storeVersion && (
              <View style={[styles.versionChip, styles.versionChipNew]}>
                <Text style={[styles.versionLabel, styles.versionLabelNew]}>New</Text>
                <Text style={[styles.versionValue, styles.versionValueNew]}>
                  v{storeVersion}
                </Text>
              </View>
            )}
          </View>
        )}

        <Pressable
          style={({ pressed }) => [
            styles.primaryBtn,
            { opacity: pressed || loading ? 0.88 : 1 },
          ]}
          onPress={onUpdate}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.primaryBtnText}>{primaryLabel}</Text>
          )}
        </Pressable>

        {!force && (
          <Pressable
            style={({ pressed }) => [
              styles.secondaryBtn,
              { opacity: pressed ? 0.7 : 1 },
            ]}
            onPress={onDismiss}
            disabled={loading}
          >
            <Text style={styles.secondaryBtnText}>Not now</Text>
          </Pressable>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1200,
    elevation: 1200,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.52)',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: Colors.white,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 20,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.litegray,
    marginBottom: 14,
  },
  iconWrap: {
    alignSelf: 'center',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primaryopacity,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  storePill: {
    alignSelf: 'center',
    marginBottom: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: Colors.primarylite,
  },
  storePillText: {
    color: Colors.primaryblue,
    fontSize: 11,
    fontFamily: FONTS.SemiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  title: {
    fontSize: 20,
    fontFamily: FONTS.SemiBold,
    color: Colors.black,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 16,
    fontSize: 13.5,
    lineHeight: 20,
    fontFamily: FONTS.Regular,
    color: Colors.darkText,
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  versionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 18,
  },
  versionChip: {
    minWidth: 110,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.litegray,
    backgroundColor: Colors.litegray1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  versionChipNew: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryopacity,
  },
  versionLabel: {
    fontSize: 11,
    fontFamily: FONTS.Medium,
    color: Colors.darkText,
    marginBottom: 2,
  },
  versionLabelNew: {
    color: Colors.primaryblue,
  },
  versionValue: {
    fontSize: 14,
    fontFamily: FONTS.SemiBold,
    color: Colors.black,
  },
  versionValueNew: {
    color: Colors.primary,
  },
  primaryBtn: {
    height: 50,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryBtnText: {
    fontSize: 15,
    fontFamily: FONTS.SemiBold,
    color: Colors.white,
  },
  secondaryBtn: {
    marginTop: 10,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontSize: 14,
    fontFamily: FONTS.Medium,
    color: Colors.darkText,
  },
});

/** Root overlay — Play Store / App Store update prompt. */
export function StoreInAppUpdateGate() {
  const {
    prompt,
    storeName,
    currentVersion,
    loading,
    confirmPrompt,
    dismissPrompt,
  } = usePlayStoreInAppUpdate();

  return (
    <StoreUpdatePopup
      visible={prompt != null}
      mode={prompt?.mode ?? 'available'}
      storeName={storeName}
      currentVersion={currentVersion}
      storeVersion={prompt?.storeVersion}
      force={prompt?.force ?? false}
      loading={loading}
      onUpdate={confirmPrompt}
      onDismiss={dismissPrompt}
    />
  );
}
