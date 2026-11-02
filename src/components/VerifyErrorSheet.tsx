import { Colors } from "@/src/utils/colors";
import { FONTS } from "@/src/utils/storeData";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

type Props = {
  visible: boolean;
  message?: string | null;
  onClose: () => void;
};

export default function VerifyErrorSheet({
  visible,
  message,
  onClose,
}: Props) {
  const { t } = useTranslation();
  const progress = useSharedValue(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      progress.value = withTiming(1, {
        duration: 220,
        easing: Easing.out(Easing.cubic),
      });
      return;
    }

    if (!mounted) return;

    progress.value = withTiming(
      0,
      { duration: 180, easing: Easing.in(Easing.cubic) },
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

  const cardStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1], Extrapolation.CLAMP),
    transform: [
      {
        scale: interpolate(
          progress.value,
          [0, 1],
          [0.94, 1],
          Extrapolation.CLAMP,
        ),
      },
      {
        translateY: interpolate(
          progress.value,
          [0, 1],
          [12, 0],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  if (!mounted) return null;

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, backdropStyle]} />
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View style={[styles.card, cardStyle]}>
          <View style={styles.iconWrap}>
            <Ionicons name="alert-circle" size={34} color={Colors.red} />
          </View>
          <Text style={styles.title}>{t("Error")}</Text>
          <Text style={styles.message}>
            {message || t("Something went wrong. Please try again.")}
          </Text>
          <Pressable
            style={({ pressed }) => [
              styles.cancelBtn,
              { opacity: pressed ? 0.88 : 1 },
            ]}
            onPress={onClose}
          >
            <Text style={styles.cancelText}>{t("Cancel")}</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
  },
  card: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 14,
    backgroundColor: Colors.white,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 18,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.06)",
    shadowColor: "#0F172A",
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  iconWrap: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.diclinelite,
    marginBottom: 12,
  },
  title: {
    textAlign: "center",
    fontSize: 17,
    fontFamily: FONTS.SemiBold,
    color: "#0F172A",
    marginBottom: 8,
  },
  message: {
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FONTS.Medium,
    color: Colors.darkText,
    marginBottom: 18,
  },
  cancelBtn: {
    minHeight: 46,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.Boxgray,
  },
  cancelText: {
    fontSize: 15,
    fontFamily: FONTS.SemiBold,
    color: Colors.black,
  },
});
