import { useNavigation } from "@react-navigation/native";
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
import { clearAllData, FONTS } from "../utils/storeData";

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
  const { setUserData } = useContext(GlobalContextData);
  const navigation = useNavigation<any>();
  const translateY = useSharedValue(-150);
  const lineWidth = useSharedValue(0);
  const { setToast } = useContext(GlobalContextData);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const lineStyle = useAnimatedStyle(() => ({
    width: `${lineWidth.value}%`,
  }));

  const LogOut = async () => {
    try {
      await clearAllData();
      setUserData(null);
      navigation.reset({
        index: 0,
        routes: [{ name: "OnBoarding" }],
      });
    } catch (error) {
      console.log("Error during logout:", error);
    }
  };

  useEffect(() => {
    if (visible) {
      setIsVisible(true);

      translateY.value = withTiming(0, { duration: 400 });
      lineWidth.value = withTiming(120, { duration: 3000 });

      const timer = setTimeout(() => {
        translateY.value = withTiming(-150, { duration: 400 });
        lineWidth.value = withTiming(0, { duration: 300 });

        setTimeout(() => {
          setToast({
            visible: false,
            text: "",
            type: "success",
            top: 45,
          });
          setIsVisible(false);
          onClose?.();

          if (text === "Token Expired.") {
            LogOut();
          }
        }, 300);
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
        {type === "success" && <Image source={Images.Success} style={styles.icon} />}
        {type === "error" && <Image source={Images.WrongIcon} style={styles.icon} />}
        {type === "info" && <Image source={Images.Info} style={styles.icon} />}

        <Text style={[styles.text, text?.length > 40 && { fontSize: 10 }]}>
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
    top: 45,
    alignSelf: "center",
    width: "90%",
    backgroundColor: Colors.white,
    borderRadius: 7,
    padding: 10,
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
  },
  text: {
    fontSize: 15,
    color: Colors.black,
    fontFamily: FONTS.Medium,
    flex: 1,
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