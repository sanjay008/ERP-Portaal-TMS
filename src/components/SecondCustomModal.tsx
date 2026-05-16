import React, { useEffect } from "react";
import {
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
    withTiming
} from "react-native-reanimated";
import { Colors } from "../utils/colors";

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

  return (
    <View
      pointerEvents="box-none"
      style={StyleSheet.absoluteFillObject}
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          {
            justifyContent: "center",
            alignItems: "center",
            backgroundColor:
              SecondModal?.color || "rgba(0,0,0,0.6)",
          },
          backdropStyle,
        ]}
      >
        <Animated.View
          style={[
            {
              backgroundColor: Colors.white,
              borderRadius: 14,
              width: "80%",
              paddingVertical: 25,
              paddingHorizontal: 20,
              alignItems: "center",
            },
            contentStyle,
          ]}
        >
          {SecondModal?.title ? (
            <Text
              style={{
                fontSize: 18,
                fontWeight: "600",
                textAlign: "center",
                color: "#000",
                marginBottom: 10,
              }}
            >
              {SecondModal?.title}
            </Text>
          ) : null}

          {SecondModal?.message ? (
            <Text
              style={{
                fontSize: 14,
                color: "#444",
                textAlign: "center",
                marginBottom: 20,
              }}
            >
              {SecondModal?.message}
            </Text>
          ) : null}

          <View
            style={{
              flexDirection: "row",
              justifyContent: "center",
              width: "100%",
            }}
          >
            {SecondModal?.buttons?.map(
              (btn: any, index: number) => (
                <TouchableOpacity
                  key={index}
                  style={{
                    backgroundColor:
                      btn.type === "primary"
                        ? "#007BFF"
                        : "#E0E0E0",
                    paddingVertical: 10,
                    paddingHorizontal: 20,
                    borderRadius: 8,
                    marginHorizontal: 5,
                    flex: 1,
                    alignItems: "center",
                  }}
                  onPress={btn.onPress}
                >
                  <Text
                    style={{
                      color:
                        btn.type === "primary"
                          ? "#fff"
                          : "#000",
                      fontWeight: "500",
                    }}
                  >
                    {btn.text}
                  </Text>
                </TouchableOpacity>
              )
            )}
          </View>
        </Animated.View>
      </Animated.View>
    </View>
  );
};

export default SecondCustomModal;