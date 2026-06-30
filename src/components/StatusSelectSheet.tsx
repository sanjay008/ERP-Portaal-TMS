import { Colors } from '@/src/utils/colors';
import { FONTS, height, width } from '@/src/utils/storeData';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FlatList,
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

type StatusItem = {
  id: number | string;
  status_name?: string;
  color?: string;
  [key: string]: any;
};

type Props = {
  visible: boolean;
  data: StatusItem[];
  selected: StatusItem | null;
  onClose: () => void;
  onConfirm: (item: StatusItem) => void;
};

export default function StatusSelectSheet({
  visible,
  data,
  selected,
  onClose,
  onConfirm,
}: Props) {
  const { t } = useTranslation();
  const progress = useSharedValue(0);
  const [mounted, setMounted] = useState(false);
  const [pending, setPending] = useState<StatusItem | null>(selected);

  useEffect(() => {
    if (visible) {
      setPending(selected);
      setMounted(true);
      progress.value = withSpring(1, {
        damping: 20,
        stiffness: 280,
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
  }, [visible, mounted, selected]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1], Extrapolation.CLAMP),
  }));

  const cardStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.5, 1], [0, 1, 1], Extrapolation.CLAMP),
    transform: [
      {
        scale: interpolate(progress.value, [0, 1], [0.92, 1], Extrapolation.CLAMP),
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

      <Animated.View style={[styles.card, cardStyle]}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('Select Status')}</Text>
          <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={22} color={Colors.darkText} />
          </Pressable>
        </View>

        <FlatList
          data={data}
          keyExtractor={(item, index) => String(item?.id ?? index)}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const isSelected = pending?.id === item?.id;
            return (
              <Pressable
                style={styles.row}
                onPress={() => setPending(item)}
              >
                <View
                  style={[
                    styles.radioOuter,
                    isSelected && styles.radioOuterActive,
                  ]}
                >
                  {isSelected ? <View style={styles.radioInner} /> : null}
                </View>
                <Text style={styles.rowText} numberOfLines={2}>
                  {item?.status_name || ''}
                </Text>
              </Pressable>
            );
          }}
        />

        <View style={styles.footer}>
          <Pressable
            style={({ pressed }) => [
              styles.nextBtn,
              !pending && styles.nextBtnDisabled,
              pressed && pending && styles.nextBtnPressed,
            ]}
            disabled={!pending}
            onPress={() => {
              if (pending) {
                onConfirm(pending);
              }
            }}
          >
            <Text
              style={[
                styles.nextBtnText,
                !pending && styles.nextBtnTextDisabled,
              ]}
            >
              {t('Next')}
            </Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 11000,
    elevation: 11000,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
  },
  card: {
    width: Math.min(width - 40, 420),
    maxHeight: height * 0.72,
    backgroundColor: Colors.white,
    borderRadius: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 12,
  },
  title: {
    fontSize: 18,
    fontFamily: FONTS.SemiBold,
    color: Colors.black,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.litegray1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    flexGrow: 0,
  },
  listContent: {
    paddingHorizontal: 18,
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.litegray,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.litegray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterActive: {
    borderColor: Colors.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary,
  },
  rowText: {
    flex: 1,
    fontSize: 15,
    fontFamily: FONTS.Medium,
    color: Colors.black,
  },
  footer: {
    alignItems: 'flex-end',
    paddingRight: 12,
    paddingLeft: 18,
    paddingTop: 4,
    paddingBottom: 18,
  },
  nextBtn: {
    backgroundColor: 'transparent',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: -4,
  },
  nextBtnPressed: {
    opacity: 0.65,
  },
  nextBtnDisabled: {
    opacity: 0.35,
  },
  nextBtnText: {
    color: Colors.primary,
    fontSize: 16,
    fontFamily: FONTS.SemiBold,
  },
  nextBtnTextDisabled: {
    color: Colors.textgray,
  },
});
