import React, { useEffect } from "react";
import {
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Colors } from "../utils/colors";
import { FONTS } from "../utils/storeData";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const HERO_SIZE = Math.min(SCREEN_W * 0.78, SCREEN_H * 0.36, 300);

const SecondCustomModal = ({
  SecondModal,
}: any) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (SecondModal?.visible) {
      progress.value = withTiming(1, {
        duration: 300,
      });
    } else {
      progress.value = withTiming(0, {
        duration: 250,
      });
    }
  }, [SecondModal?.visible]);

  const backdropStyle = useAnimatedStyle(() => {
    return {
      opacity: progress.value,
    };
  });

  const contentStyle = useAnimatedStyle(() => {
    return {
      opacity: progress.value,
      transform: [
        {
          translateY: interpolate(
            progress.value,
            [0, 1],
            [120, 0],
            Extrapolation.CLAMP
          ),
        },
        {
          scale: interpolate(
            progress.value,
            [0, 1],
            [0.9, 1],
            Extrapolation.CLAMP
          ),
        },
      ],
    };
  });

  if (!SecondModal?.visible) {
    return null;
  }

  const hasImage = Boolean(SecondModal?.image);
  const hasHint = Boolean(SecondModal?.hint);
  const isSignaturePopup = hasImage || hasHint;
  const hasTitle = Boolean(SecondModal?.title);
  const hasMessage = Boolean(SecondModal?.message);
  const hasButtons = Boolean(SecondModal?.buttons?.length);
  const showCard = hasTitle || hasMessage || hasButtons;
  const isMultiline = String(SecondModal?.message || "").includes("\n");

  return (
    <View pointerEvents="auto" style={styles.root}>
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          styles.backdrop,
          {
            backgroundColor:
              SecondModal?.color || "rgba(0,0,0,0.6)",
          },
          backdropStyle,
        ]}
      >
        <ScrollView
          bounces={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {hasImage ? (
            <View style={styles.heroWrap}>
              <Image
                source={SecondModal.image}
                style={styles.heroImage}
                resizeMode="contain"
              />
            </View>
          ) : null}

          {showCard ? (
            <Animated.View
              style={[
                isSignaturePopup ? styles.cardSoft : styles.card,
                contentStyle,
              ]}
            >
              {hasTitle ? (
                <Text
                  style={
                    isSignaturePopup ? styles.titleSoft : styles.title
                  }
                >
                  {SecondModal.title}
                </Text>
              ) : null}

              {hasMessage ? (
                <ScrollView
                  style={styles.messageScroll}
                  nestedScrollEnabled
                  showsVerticalScrollIndicator={false}
                >
                  <Text
                    style={[
                      styles.message,
                      isMultiline && styles.messageLeft,
                    ]}
                  >
                    {SecondModal.message}
                  </Text>
                </ScrollView>
              ) : null}

              {hasButtons ? (
                <View style={styles.buttonRow}>
                  {SecondModal.buttons.map((btn: any, index: number) => {
                    const isPrimary =
                      btn.type === "primary" || Boolean(btn.backgroundColor);

                    return (
                      <TouchableOpacity
                        key={index}
                        style={[
                          isSignaturePopup
                            ? styles.buttonSoft
                            : styles.button,
                          {
                            backgroundColor:
                              btn.backgroundColor ||
                              (btn.type === "primary"
                                ? Colors.primary
                                : "#E0E0E0"),
                          },
                        ]}
                        onPress={btn.onPress}
                        activeOpacity={0.88}
                      >
                        <Text
                          style={{
                            color: isPrimary ? Colors.white : Colors.black,
                            fontFamily: FONTS.Medium,
                            fontSize: 15,
                          }}
                        >
                          {btn.text}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : null}
            </Animated.View>
          ) : null}

          {hasHint ? (
            <Text style={styles.hint}>{SecondModal.hint}</Text>
          ) : null}
        </ScrollView>
      </Animated.View>
    </View>
  );
};

export default SecondCustomModal;

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    elevation: 999,
  },
  backdrop: {
    overflow: "visible",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 28,
  },
  heroWrap: {
    width: HERO_SIZE,
    height: HERO_SIZE,
    marginBottom: 16,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "transparent",
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    width: "95%",
    maxWidth: 420,
    paddingVertical: 25,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  cardSoft: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    width: "92%",
    maxWidth: 420,
    paddingVertical: 22,
    paddingHorizontal: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    color: "#000",
    marginBottom: 10,
  },
  titleSoft: {
    fontSize: 18,
    fontFamily: FONTS.SemiBold,
    textAlign: "center",
    color: Colors.black,
    marginBottom: 10,
  },
  messageScroll: {
    maxHeight: 160,
    alignSelf: "stretch",
    marginBottom: 16,
  },
  message: {
    fontSize: 14,
    fontFamily: FONTS.Regular,
    color: Colors.gray,
    textAlign: "center",
    lineHeight: 20,
  },
  messageLeft: {
    textAlign: "left",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "center",
    width: "100%",
  },
  button: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginHorizontal: 5,
    flex: 1,
    alignItems: "center",
    minHeight: 50,
    justifyContent: "center",
  },
  buttonSoft: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginHorizontal: 5,
    flex: 1,
    alignItems: "center",
    minHeight: 50,
    justifyContent: "center",
  },
  hint: {
    marginTop: 24,
    fontSize: 14,
    fontFamily: FONTS.SemiBold,
    color: Colors.white,
    letterSpacing: 0.7,
    textAlign: "center",
    paddingHorizontal: 16,
  },
});
