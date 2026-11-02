import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useMemo, useState } from "react";
import {
  Dimensions,
  ImageStyle,
  Modal,
  Pressable,
  StatusBar,
  StyleSheet,
  View,
} from "react-native";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Images } from "../assets/images";
import { Colors } from "../utils/colors";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const PREVIEW_SIZE = Math.min(SCREEN_WIDTH - 48, SCREEN_HEIGHT * 0.55);

const ProfileImageViewer = ({
  imageUri,
  imageStyle,
  size,
  showRing = false,
}: {
  imageUri: string;
  imageStyle?: ImageStyle;
  size?: number;
  showRing?: boolean;
}) => {
  const [visible, setVisible] = useState(false);
  const [hasError, setHasError] = useState(false);

  const scale = useSharedValue(0.88);
  const opacity = useSharedValue(0);
  const backdropOpacity = useSharedValue(0);

  const avatarSize = useMemo(() => {
    if (typeof size === "number" && size > 0) return size;
    const fromStyle = Number(imageStyle?.width);
    if (Number.isFinite(fromStyle) && fromStyle > 0) return fromStyle;
    return 48;
  }, [imageStyle?.width, size]);

  const animatedImageStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const animatedBackdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const openImage = useCallback(() => {
    if (hasError || !imageUri) return;
    setVisible(true);
    scale.value = 0.88;
    opacity.value = 0;
    backdropOpacity.value = 0;
    scale.value = withSpring(1, { damping: 18, stiffness: 180 });
    opacity.value = withTiming(1, { duration: 200 });
    backdropOpacity.value = withTiming(1, { duration: 220 });
  }, [hasError, imageUri]);

  const closeImage = useCallback(() => {
    scale.value = withTiming(0.92, { duration: 160 });
    opacity.value = withTiming(0, { duration: 160 });
    backdropOpacity.value = withTiming(0, { duration: 180 }, () => {
      runOnJS(setVisible)(false);
    });
  }, []);

  const imageSource =
    hasError || !imageUri ? Images.userblanck : { uri: imageUri };

  const avatarImageStyle = [
    styles.userImage,
    {
      width: avatarSize,
      height: avatarSize,
      borderRadius: avatarSize / 2,
    },
    imageStyle,
  ];

  return (
    <>
      <Pressable onPress={openImage} style={styles.avatarPress}>
        {showRing ? (
          <View
            style={[
              styles.avatarRing,
              {
                width: avatarSize + 8,
                height: avatarSize + 8,
                borderRadius: (avatarSize + 8) / 2,
              },
            ]}
          >
            <Animated.Image
              source={imageSource}
              style={avatarImageStyle}
              resizeMode="cover"
              onError={() => setHasError(true)}
            />
          </View>
        ) : (
          <Animated.Image
            source={imageSource}
            style={avatarImageStyle}
            resizeMode="cover"
            onError={() => setHasError(true)}
          />
        )}
      </Pressable>

      <Modal
        visible={visible}
        transparent
        statusBarTranslucent
        animationType="none"
        onRequestClose={closeImage}
      >
        <StatusBar backgroundColor="rgba(0,0,0,0.92)" barStyle="light-content" />
        <View style={styles.modalWrapper}>
          <Animated.View style={[styles.backdrop, animatedBackdropStyle]} />
          <Pressable style={StyleSheet.absoluteFill} onPress={closeImage} />

          <Animated.View style={[styles.previewCard, animatedImageStyle]}>
            <Animated.Image
              source={imageSource}
              style={styles.fullImage}
              resizeMode="cover"
            />
          </Animated.View>

          <Pressable style={styles.closeBtn} onPress={closeImage} hitSlop={12}>
            <Ionicons name="close" size={22} color={Colors.white} />
          </Pressable>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  avatarPress: {
    alignItems: "center",
    justifyContent: "center",
  },
  avatarRing: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.primary,
    backgroundColor: Colors.white,
  },
  userImage: {
    backgroundColor: Colors.Boxgray,
  },
  modalWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(8, 12, 24, 0.88)",
  },
  previewCard: {
    width: PREVIEW_SIZE,
    height: PREVIEW_SIZE,
    borderRadius: PREVIEW_SIZE / 2,
    overflow: "hidden",
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.35)",
    backgroundColor: "#1F2937",
  },
  fullImage: {
    width: "100%",
    height: "100%",
  },
  closeBtn: {
    position: "absolute",
    top: 54,
    right: 22,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.16)",
  },
});

export default ProfileImageViewer;
