import PickUpBox from '@/src/components/PickUpBox';
import Loader from '@/src/components/loading';
import { Colors } from '@/src/utils/colors';
import { FONTS, height } from '@/src/utils/storeData';
import { Ionicons } from '@expo/vector-icons';
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
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type SheetMode = 'scan' | 'saved';

type Props = {
  visible: boolean;
  loading?: boolean;
  orderData: any;
  mode?: SheetMode;
  onStop: () => void;
  onNextScan: () => void;
  onEdit: () => void;
  onEditAgain: () => void;
  onClose: () => void;
  onAddImage?: () => void;
};

export default function WarehouseOrderSheet({
  visible,
  loading = false,
  orderData,
  mode = 'scan',
  onStop,
  onNextScan,
  onEdit,
  onEditAgain,
  onClose,
  onAddImage,
}: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const progress = useSharedValue(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      progress.value = withSpring(1, {
        damping: 22,
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
  }, [visible, mounted]);

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
          [height * 0.92, 0],
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
        <Pressable style={StyleSheet.absoluteFill} onPress={onNextScan} />
      </Animated.View>

      <Animated.View
        style={[
          styles.sheet,
          sheetStyle,
          { paddingBottom: Math.max(insets.bottom, 16) },
        ]}
      >
        <View style={styles.handle} />
        <View style={styles.titleRow}>
          <View style={styles.titleSide} />
          <Text style={styles.title}>{t('Details')}</Text>
          <Pressable
            style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]}
            onPress={onClose}
            hitSlop={8}
          >
            <Ionicons name="close" size={22} color={Colors.darkText} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          bounces={false}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {loading || !orderData ? (
            <View style={styles.loaderBox}>
              <Loader />
            </View>
          ) : (
            <>
              <PickUpBox
                AllisCollapsed={true}
                downButton={true}
                LableStatus={orderData?.tmsstatus?.status_name}
                OrderId={orderData?.id}
                ProductItem={orderData?.items}
                driver_note={null}
                LableBackground={orderData?.tmsstatus?.color}
                start={orderData?.pickup_location}
                end={orderData?.deliver_location}
                ItemData={orderData}
                additional_cost_label={orderData?.additional_cost_label}
                customerData={orderData?.customer}
                external_platform_data={orderData?.display_name}
                external_order_id={orderData?.external_order_id}
                contact={true}
              />
              {!!orderData?.driver_note && (
                <View style={styles.driverNote}>
                  <Text style={styles.driverNoteText}>{orderData.driver_note}</Text>
                </View>
              )}
            </>
          )}
        </ScrollView>

        <View style={styles.actions}>
          {mode === 'scan' ? (
            <>
              <Pressable
                style={({ pressed }) => [
                  styles.btn,
                  styles.stopBtn,
                  pressed && styles.pressed,
                ]}
                onPress={onStop}
                disabled={loading}
              >
                <Text style={styles.stopBtnText}>{t('Stop')}</Text>
              </Pressable>
              <View style={styles.savedRow}>
                <Pressable
                  style={({ pressed }) => [
                    styles.btn,
                    styles.nextBtn,
                    styles.halfBtn,
                    pressed && styles.pressed,
                  ]}
                  onPress={onNextScan}
                  disabled={loading}
                >
                  <Text style={styles.nextBtnText}>{t('Volgende Scan')}</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.btn,
                    styles.editBtn,
                    styles.halfBtn,
                    pressed && styles.pressed,
                  ]}
                  onPress={onEdit}
                  disabled={loading || !orderData}
                >
                  <Text style={styles.editBtnText}>{t('Bewerken')}</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <Pressable
                style={({ pressed }) => [
                  styles.btn,
                  styles.stopBtn,
                  pressed && styles.pressed,
                ]}
                onPress={onStop}
                disabled={loading}
              >
                <Text style={styles.stopBtnText}>{t('Stop')}</Text>
              </Pressable>
              <View style={styles.savedRow}>
                <Pressable
                  style={({ pressed }) => [
                    styles.btn,
                    styles.editBtn,
                    styles.halfBtn,
                    pressed && styles.pressed,
                  ]}
                  onPress={onEditAgain}
                  disabled={loading || !orderData}
                >
                  <Text style={styles.editBtnText}>{t('Edit again')}</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.btn,
                    styles.nextBtn,
                    styles.halfBtn,
                    pressed && styles.pressed,
                  ]}
                  onPress={onNextScan}
                  disabled={loading}
                >
                  <Text style={styles.nextBtnText}>{t('Volgende Scan')}</Text>
                </Pressable>
              </View>
            </>
          )}
          {!!onAddImage && (
            <Pressable
              style={({ pressed }) => [
                styles.btn,
                styles.addImageBtn,
                pressed && styles.pressed,
              ]}
              onPress={onAddImage}
              disabled={loading || !orderData}
            >
              <Text style={styles.addImageBtnText}>{t('Take picture')}</Text>
            </Pressable>
          )}
        </View>

        {loading && (
          <View style={styles.loadingOverlay} pointerEvents="none">
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        )}
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
    backgroundColor: 'rgba(15, 23, 42, 0.58)',
  },
  sheet: {
    maxHeight: height * 0.92,
    minHeight: height * 0.55,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.litegray,
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    fontFamily: FONTS.SemiBold,
    color: Colors.black,
    flex: 1,
    textAlign: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  titleSide: {
    width: 36,
    height: 36,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.litegray,
  },
  scroll: {
    flexGrow: 0,
    flexShrink: 1,
  },
  scrollContent: {
    gap: 12,
    paddingBottom: 8,
  },
  loaderBox: {
    minHeight: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverNote: {
    backgroundColor: '#595959',
    padding: 8,
    borderRadius: 6,
  },
  driverNoteText: {
    fontSize: 14,
    fontFamily: FONTS.SemiBold,
    color: '#FFEA00',
  },
  actions: {
    gap: 10,
    paddingTop: 12,
  },
  btn: {
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halfBtn: {
    flex: 1,
  },
  savedRow: {
    flexDirection: 'row',
    gap: 10,
  },
  stopBtn: {
    backgroundColor: Colors.black,
  },
  stopBtnText: {
    color: Colors.white,
    fontSize: 16,
    fontFamily: FONTS.SemiBold,
  },
  nextBtn: {
    backgroundColor: Colors.primary,
  },
  nextBtnText: {
    color: Colors.white,
    fontSize: 16,
    fontFamily: FONTS.SemiBold,
  },
  editBtn: {
    backgroundColor: Colors.approve,
  },
  editBtnText: {
    color: Colors.white,
    fontSize: 16,
    fontFamily: FONTS.SemiBold,
  },
  addImageBtn: {
    backgroundColor: Colors.red,
  },
  addImageBtnText: {
    color: Colors.white,
    fontSize: 16,
    fontFamily: FONTS.SemiBold,
  },
  pressed: {
    opacity: 0.88,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
