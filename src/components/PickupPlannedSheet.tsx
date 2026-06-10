import PickUpBox from '@/src/components/PickUpBox';
import { Colors } from '@/src/utils/colors';
import { FONTS } from '@/src/utils/storeData';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
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
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  visible: boolean;
  orderData: any;
  scanItemId?: number | string | null;
  loading?: boolean;
  onPickupWithPhoto: () => void;
  onCancelAndNewScan: () => void;
  onCancelPickup: () => void;
  onPickupNextScan: () => void;
};

export default function PickupPlannedSheet({
  visible,
  orderData,
  loading = false,
  onPickupWithPhoto,
  onCancelAndNewScan,
  onCancelPickup,
  onPickupNextScan,
}: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const progress = useSharedValue(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      progress.value = withTiming(1, {
        duration: 280,
        easing: Easing.out(Easing.cubic),
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
  }, [visible, mounted]);

  const panelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1], Extrapolation.CLAMP),
    transform: [
      {
        translateY: interpolate(
          progress.value,
          [0, 1],
          [24, 0],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  if (!mounted || !orderData) {
    return null;
  }

  return (
    <View style={styles.host} pointerEvents="box-none">
      <Animated.View
        style={[
          styles.panel,
          panelStyle,
          {
            paddingTop: Math.max(insets.top, 12),
            paddingBottom: Math.max(insets.bottom, 16),
          },
        ]}
      >
        <ScrollView
          bounces={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <PickUpBox
            AllisCollapsed={true}
            downButton={true}
            LableStatus={orderData?.tmsstatus?.status_name}
            OrderId={orderData?.id}
            ProductItem={orderData?.items}
            driver_note={orderData?.driver_note || null}
            LableBackground={orderData?.tmsstatus?.color}
            start={orderData?.pickup_location}
            end={orderData?.deliver_location}
            ItemData={orderData}
            additional_cost_label={orderData?.additional_cost_label}
            customerData={orderData?.customer}
            external_platform_data={orderData?.display_name}
            external_order_id={orderData?.external_order_id}
            statusData={orderData?.tmsstatus}
            contact={true}
          />

          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [
                styles.actionBtn,
                styles.btnBlack,
                { opacity: pressed || loading ? 0.85 : 1 },
              ]}
              onPress={onPickupWithPhoto}
              disabled={loading}
            >
              <Text style={styles.btnTextLight}>{t('Pickup with photo')}</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.actionBtn,
                styles.btnBlue,
                { opacity: pressed || loading ? 0.85 : 1 },
              ]}
              onPress={onCancelAndNewScan}
              disabled={loading}
            >
              <Text style={styles.btnTextLight}>{t('Cancel & new scan')}</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.actionBtn,
                styles.btnGrey,
                { opacity: pressed || loading ? 0.85 : 1 },
              ]}
              onPress={onCancelPickup}
              disabled={loading}
            >
              <Text style={styles.btnTextDark}>{t('Cancel this pickup')}</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.actionBtn,
                styles.btnGreen,
                { opacity: pressed || loading ? 0.85 : 1 },
              ]}
              onPress={onPickupNextScan}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.btnTextLight}>{t('Pickup & next scan')}</Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    elevation: 1000,
  },
  panel: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.white,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 15,
    paddingBottom: 8,
  },
  actions: {
    marginTop: 16,
    gap: 10,
  },
  actionBtn: {
    minHeight: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  btnBlack: {
    backgroundColor: Colors.black,
  },
  btnBlue: {
    backgroundColor: Colors.primary,
  },
  btnGrey: {
    backgroundColor: Colors.Boxgray,
  },
  btnGreen: {
    backgroundColor: Colors.green,
  },
  btnTextLight: {
    color: Colors.white,
    fontSize: 15,
    fontFamily: FONTS.SemiBold,
    textAlign: 'center',
  },
  btnTextDark: {
    color: Colors.black,
    fontSize: 15,
    fontFamily: FONTS.SemiBold,
    textAlign: 'center',
  },
});
