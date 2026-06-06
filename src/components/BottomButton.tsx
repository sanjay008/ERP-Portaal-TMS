import React, { useEffect } from 'react';
import {
    Dimensions,
    StyleSheet,
    Text,
    TextStyle,
    TouchableOpacity,
    ViewStyle,
} from 'react-native';
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import { Colors } from '../utils/colors';
import { FONTS } from '../utils/storeData';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const ANIMATION_CONFIG = {
  duration: 320,
  easing: Easing.bezier(0.25, 0.1, 0.25, 1),
};

interface BottomButtonProps {
  visible: boolean;
  label: string;
  onPress: () => void;
  style?: ViewStyle;
  labelStyle?: TextStyle;
}

const BottomButton: React.FC<BottomButtonProps> = ({
  visible,
  label,
  onPress,
  style,
  labelStyle,
}) => {
  const translateY = useSharedValue(SCREEN_HEIGHT);

  useEffect(() => {
    translateY.value = withTiming(
      visible ? 0 : SCREEN_HEIGHT,
      ANIMATION_CONFIG
    );
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[styles.wrapper, animatedStyle]}>
      <TouchableOpacity
        style={[styles.button, style]}
        onPress={onPress}
        activeOpacity={0.82}
      >
        <Text style={[styles.label, labelStyle]}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: 7,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: Colors.white,
    fontSize: 19,
    fontFamily: FONTS.SemiBold,
    letterSpacing: 0.4,
      textTransform:'capitalize'
  },
});

export default BottomButton;