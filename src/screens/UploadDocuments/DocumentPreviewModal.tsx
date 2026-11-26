import { Colors } from "@/src/utils/colors";
import { FONTS } from "@/src/utils/storeData";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  BackHandler,
  Dimensions,
  Linking,
  Modal,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  visible: boolean;
  title?: string;
  imageUri?: string | null;
  downloadUrl?: string | null;
  onClose: () => void;
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const IMAGE_W = SCREEN_WIDTH - 32;
const IMAGE_H = SCREEN_HEIGHT * 0.68;
const MIN_SCALE = 1;
const MAX_SCALE = 4;
const ZOOM_MS = 180;

function clamp(value: number, min: number, max: number) {
  "worklet";
  return Math.min(max, Math.max(min, value));
}

export default function DocumentPreviewModal({
  visible,
  title,
  imageUri,
  downloadUrl,
  onClose,
}: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [zoomPct, setZoomPct] = useState(100);

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedX = useSharedValue(0);
  const savedY = useSharedValue(0);

  const resetZoom = () => {
    scale.value = 1;
    savedScale.value = 1;
    translateX.value = 0;
    translateY.value = 0;
    savedX.value = 0;
    savedY.value = 0;
    setZoomPct(100);
  };

  useEffect(() => {
    if (!visible) return;
    resetZoom();
  }, [visible, imageUri]);

  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose]);

  const publishZoom = (value: number) => {
    setZoomPct(Math.round(value * 100));
  };

  const applyZoom = (next: number) => {
    const clamped = clamp(next, MIN_SCALE, MAX_SCALE);
    scale.value = withTiming(clamped, { duration: ZOOM_MS });
    savedScale.value = clamped;
    if (clamped <= 1) {
      translateX.value = withTiming(0, { duration: ZOOM_MS });
      translateY.value = withTiming(0, { duration: ZOOM_MS });
      savedX.value = 0;
      savedY.value = 0;
    }
    setZoomPct(Math.round(clamped * 100));
  };

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = clamp(savedScale.value * e.scale, MIN_SCALE, MAX_SCALE);
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      if (scale.value <= 1) {
        translateX.value = withTiming(0, { duration: ZOOM_MS });
        translateY.value = withTiming(0, { duration: ZOOM_MS });
        savedX.value = 0;
        savedY.value = 0;
      }
      runOnJS(publishZoom)(scale.value);
    });

  const pan = Gesture.Pan()
    .maxPointers(1)
    .onUpdate((e) => {
      if (scale.value <= 1) return;
      const maxX = (IMAGE_W * (scale.value - 1)) / 2;
      const maxY = (IMAGE_H * (scale.value - 1)) / 2;
      translateX.value = clamp(savedX.value + e.translationX, -maxX, maxX);
      translateY.value = clamp(savedY.value + e.translationY, -maxY, maxY);
    })
    .onEnd(() => {
      savedX.value = translateX.value;
      savedY.value = translateY.value;
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1.05) {
        scale.value = withTiming(1, { duration: ZOOM_MS });
        savedScale.value = 1;
        translateX.value = withTiming(0, { duration: ZOOM_MS });
        translateY.value = withTiming(0, { duration: ZOOM_MS });
        savedX.value = 0;
        savedY.value = 0;
        runOnJS(publishZoom)(1);
        return;
      }
      scale.value = withTiming(2, { duration: ZOOM_MS });
      savedScale.value = 2;
      runOnJS(publishZoom)(2);
    });

  const gesture = Gesture.Simultaneous(pinch, Gesture.Exclusive(doubleTap, pan));

  const imageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const onDownload = async () => {
    if (!downloadUrl) return;
    try {
      await Linking.openURL(downloadUrl);
    } catch {
      // no-op
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <GestureHandlerRootView style={styles.root}>
        <StatusBar backgroundColor="#0E1116" barStyle="light-content" />
        <View style={styles.backdrop}>
          <View
            style={[
              styles.header,
              { paddingTop: Math.max(insets.top, 12) },
            ]}
          >
            <Text style={styles.title} numberOfLines={1}>
              {title || t("Document")}
            </Text>
            <Pressable
              onPress={onClose}
              hitSlop={10}
              style={styles.closeBtn}
            >
              <Ionicons name="close" size={20} color={Colors.white} />
            </Pressable>
          </View>

          <View style={styles.imageWrap}>
            {imageUri ? (
              <GestureDetector gesture={gesture}>
                <Animated.Image
                  source={{ uri: imageUri }}
                  style={[styles.image, imageStyle]}
                  resizeMode="contain"
                />
              </GestureDetector>
            ) : null}
          </View>

          <View
            style={[
              styles.toolbar,
              { marginBottom: Math.max(insets.bottom, 16) },
            ]}
          >
            <Pressable
              style={styles.toolBtn}
              onPress={() => applyZoom(scale.value - 0.5)}
            >
              <Ionicons name="remove" size={20} color={Colors.white} />
            </Pressable>
            <Text style={styles.zoomLabel}>{`${zoomPct}%`}</Text>
            <Pressable
              style={styles.toolBtn}
              onPress={() => applyZoom(scale.value + 0.5)}
            >
              <Ionicons name="add" size={20} color={Colors.white} />
            </Pressable>
            {downloadUrl ? (
              <Pressable style={styles.toolBtn} onPress={onDownload}>
                <Ionicons
                  name="download-outline"
                  size={18}
                  color={Colors.white}
                />
              </Pressable>
            ) : null}
          </View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "#0E1116",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontFamily: FONTS.SemiBold,
    color: Colors.white,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  imageWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  image: {
    width: IMAGE_W,
    height: IMAGE_H,
  },
  toolbar: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  toolBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  zoomLabel: {
    minWidth: 52,
    textAlign: "center",
    fontSize: 13,
    fontFamily: FONTS.SemiBold,
    color: Colors.white,
  },
});
