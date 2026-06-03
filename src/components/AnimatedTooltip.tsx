import React, { useEffect } from 'react';
import {
    Modal,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import Animated, {
    Easing,
    Extrapolation,
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';

type Props = {
  visible: boolean;
  message: string;
  onClose: () => void;
};

export default function AnimatedTooltip({
  visible,
  message,
  onClose,
}: Props) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(visible ? 1 : 0, {
      duration: 250,
      easing: Easing.out(Easing.cubic),
    });
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      {
        translateY: interpolate(
          progress.value,
          [0, 1],
          [10, 0],
          Extrapolation.CLAMP,
        ),
      },
      {
        scale: interpolate(
          progress.value,
          [0, 1],
          [0.92, 1],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  if (!visible) {
    return null;
  }

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
    >
      <Pressable
        style={styles.overlay}
        onPress={onClose}
      >
        <Animated.View
          style={[styles.container, animatedStyle]}
        >
          <View style={styles.tooltip}>
            <Text style={styles.text}>
              {message}
            </Text>
          </View>

          <View style={styles.arrow} />
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    
  },

container: {
    position: 'absolute',
    right: 15,
    top: "21%",
  maxWidth: 270,
},

tooltip: {
  backgroundColor: '#5B7FFF',
  borderRadius: 6,
  paddingHorizontal: 14,
  paddingVertical: 10,
},

arrow: {
  position: 'absolute',
  bottom: -8,

  right: '6%',

  width: 0,
  height: 0,
  borderLeftWidth: 8,
  borderRightWidth: 8,
  borderTopWidth: 8,
  borderLeftColor: 'transparent',
  borderRightColor: 'transparent',
  borderTopColor: '#5B7FFF',
},
  text: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
});