import React, { ReactNode, useEffect, useState } from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";
import { Colors } from "../utils/colors";

interface Props {
  visible: boolean;
  children: ReactNode;
  duration?: number;
  backgroundColor?: string;
  radius?: number;
  padding?: number;
  style?: ViewStyle;
}

const CustomCollapsible: React.FC<Props> = ({
  visible,
  children,
  duration = 300,
  backgroundColor = Colors.white,
  radius = 10,
  padding = 0,
  style,
}) => {
  const height = useSharedValue(0);
  const opacity = useSharedValue(0);

  const [contentHeight, setContentHeight] = useState(0);

  useEffect(() => {
    if (visible) {
      height.value = withTiming(contentHeight, { duration });
      opacity.value = withTiming(1, { duration: duration - 50 });
    } else {
      height.value = withTiming(0, { duration });
      opacity.value = withTiming(0, { duration: duration - 50 });
    }
  }, [visible, contentHeight]);

  const animStyle = useAnimatedStyle(() => {
    return {
      height: height.value,
      opacity: opacity.value,
    };
  });

  return (
    <Animated.View
      style={[
        styles.wrapper,
        animStyle,
      
      ]}
    >
      {/* Hidden content measure */}
      <View
        style={styles.measure}
        onLayout={(e) => {
          setContentHeight(e.nativeEvent.layout.height);
        }}
      >
        <View style={{ padding }}>{children}</View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    overflow: "hidden",
  },
  measure: {
    position: "absolute",
    // opacity: 0,
    // zIndex: -1,
  },
});

export default CustomCollapsible;
