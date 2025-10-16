import React, { useContext, useEffect, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Images } from "../assets/images";
import { GlobalContextData } from "../context/GlobalContext";
import { Colors } from "../utils/colors";

type Props = {
  top?: number;
  text?: string;
  type?: "error" | "success" | "info";
  visible?: boolean;
  onClose?: () => void;
};

export default function ToastMessage({
  top = 45,
  text = "Text Message",
  type = "success",
  visible = false,
  onClose,
}: Props) {
  const [isVisible, setIsVisible] = useState(visible);
  const translateY = useSharedValue(-150);
  const lineWidth = useSharedValue("0%");
  const { setToast } = useContext(GlobalContextData);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const lineStyle = useAnimatedStyle<any>(() => ({
    width: lineWidth.value,
  }));

  useEffect(() => {
    if (visible) {
      setIsVisible(true);
      translateY.value = withTiming(top, { duration: 400 });
      lineWidth.value = withTiming("120%", { duration: 3000 });

      const timer = setTimeout(() => {
        translateY.value = withTiming(0, { duration: 400 });
      lineWidth.value = withTiming("0%", { duration: 3000 });

        setTimeout(() => {
          setToast({
            top: 100,
            text: "",
            type: "",
            visible: false,
          });
          setIsVisible(false);
          onClose?.();
        }, 100);
      }, 3000);

      return () => clearTimeout(timer);
    } else {
      translateY.value = withTiming(-150, { duration: 400 });
      setTimeout(() => setIsVisible(false), 400);
    }
  }, [visible]);

  if (!isVisible) return null;

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      <View style={styles.flex}>
        {type === "success" && (
          <Image source={Images.Success} style={styles.icon} />
        )}
        {type === "error" && (
          <Image source={Images.WrongIcon} style={styles.icon} />
        )}
        <Text
          style={[styles.text, text?.length > 40 && { fontSize: 10 }]}
        >
          {text}
        </Text>
      </View>

      <Animated.View
        style={[
          styles.line,
          {
            backgroundColor:
              type === "success"
                ? Colors.green
                : type === "error"
                ? Colors.red
                : Colors.blue1,
          },
          lineStyle,
        ]}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    alignSelf: "center",
    width: "90%",
    backgroundColor: Colors.white,
    borderTopLeftRadius:7,
    borderTopRightRadius:7,
    padding:10,
    justifyContent: "center",
    overflow: "hidden",
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    zIndex: 9999,
  },
  flex: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  icon: {
    width: 32,
    height: 32,
    // tintColor: Colors.green,
  },
  text: {
    fontSize: 15,
    color: Colors.black,
    fontFamily: "Medium",
    flex:1
  },
  line: {
    height: 2.5,
    position: "absolute",
    bottom: 0,
    left: 0,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
});
