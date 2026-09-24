import { Colors } from '@/src/utils/colors';
import { FONTS } from '@/src/utils/storeData';
import { Ionicons } from '@expo/vector-icons';
import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type ToastType = 'success' | 'error';
export type ToastPosition = 'top' | 'bottom';

export interface ToastConfig {
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  position?: ToastPosition;
}

interface ToastRefType {
  show: (config: ToastConfig) => void;
  hide: () => void;
}

const toastRef = React.createRef<ToastRefType>();

export const Toast = {
  show: (config: ToastConfig) => {
    toastRef.current?.show(config);
  },
  hide: () => {
    toastRef.current?.hide();
  },
};

const DEFAULT_DURATION = 3000;
const OFFSCREEN_DISTANCE = 200;
const SWIPE_CLOSE_DISTANCE = 40;
const SWIPE_CLOSE_VELOCITY = 800;

const ICON_COLORS: Record<ToastType, string> = {
  success: Colors.successGradient1,
  error: Colors.errorGradient1,
};

const ICONS: Record<ToastType, keyof typeof Ionicons.glyphMap> = {
  success: 'checkmark-circle',
  error: 'alert-circle',
};

const ToastAnimated: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const toastWidth = screenWidth - 32;

  const [visible, setVisible] = useState(false);
  const [config, setConfig] = useState<ToastConfig>({
    type: 'success',
    title: '',
  });
  const [renderPosition, setRenderPosition] = useState<ToastPosition>('top');

  // -1 = top (enter/exit upward), 1 = bottom (enter/exit downward)
  const positionDirection = useSharedValue(-1);
  const translateY = useSharedValue(-OFFSCREEN_DISTANCE);
  const gestureY = useSharedValue(0);
  const opacity = useSharedValue(0);
  const progress = useSharedValue(1);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animateOutRef = useRef<(direction: number) => void>(() => {});

  const clearTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const animateOut = useCallback(
    (direction: number) => {
      clearTimer();

      const exitPosition = direction * OFFSCREEN_DISTANCE;

      opacity.value = withTiming(0, {
        duration: 180,
        easing: Easing.out(Easing.cubic),
      });

      translateY.value = withTiming(
        exitPosition,
        {
          duration: 260,
          easing: Easing.in(Easing.cubic),
        },
        (finished) => {
          if (finished) {
            gestureY.value = 0;
            runOnJS(setVisible)(false);
          }
        }
      );
    },
    [clearTimer, gestureY, opacity, translateY]
  );

  animateOutRef.current = animateOut;

  const dismiss = useCallback(() => {
    animateOut(positionDirection.value);
  }, [animateOut, positionDirection]);

  const show = useCallback(
    (cfg: ToastConfig) => {
      clearTimer();

      const position = cfg.position ?? 'top';
      const direction = position === 'top' ? -1 : 1;
      const startPosition = direction * OFFSCREEN_DISTANCE;

      positionDirection.value = direction;

      setConfig(cfg);
      setRenderPosition(position);
      setVisible(true);

      gestureY.value = 0;
      translateY.value = startPosition;
      opacity.value = 0;
      progress.value = 1;

      translateY.value = withSpring(0, {
        damping: 16,
        stiffness: 180,
        mass: 0.6,
      });

      opacity.value = withTiming(1, {
        duration: 220,
        easing: Easing.out(Easing.cubic),
      });

      const duration = cfg.duration ?? DEFAULT_DURATION;

      progress.value = withTiming(0, {
        duration,
        easing: Easing.linear,
      });

      timeoutRef.current = setTimeout(() => {
        animateOutRef.current(direction);
      }, duration);
    },
    [clearTimer, gestureY, opacity, positionDirection, progress, translateY]
  );

  useImperativeHandle(
    toastRef,
    () => ({
      show,
      hide: dismiss,
    }),
    [show, dismiss]
  );

  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      const direction = positionDirection.value;

      if (event.translationY * direction > 0) {
        gestureY.value = event.translationY;
      }
    })
    .onEnd((event) => {
      const direction = positionDirection.value;

      const distance = event.translationY * direction;
      const velocity = event.velocityY * direction;

      if (
        distance > SWIPE_CLOSE_DISTANCE ||
        velocity > SWIPE_CLOSE_VELOCITY
      ) {
        runOnJS(dismiss)();
      } else {
        gestureY.value = withSpring(0, {
          damping: 18,
          stiffness: 220,
        });
      }
    });

  const containerStyle = useAnimatedStyle(() => {
    const direction = positionDirection.value;
    const dragDistance = gestureY.value * direction;

    const dragFade = interpolate(
      dragDistance,
      [0, 100],
      [1, 0.3],
      Extrapolation.CLAMP
    );

    return {
      transform: [
        {
          translateY: translateY.value + gestureY.value,
        },
      ],
      opacity: opacity.value * dragFade,
    };
  });

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  if (!visible) {
    return null;
  }

  const iconColor = ICON_COLORS[config.type];
  const iconName = ICONS[config.type];

  const wrapperPositionStyle =
    renderPosition === 'top'
      ? { top: insets.top + 10 }
      : { bottom: insets.bottom + 10 };

  return (
    <GestureHandlerRootView
      style={[styles.wrapper, wrapperPositionStyle]}
      pointerEvents="box-none"
    >
      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[
            styles.container,
            { width: toastWidth },
            containerStyle,
          ]}
        >
          <Pressable onPress={dismiss} style={styles.pressable}>
            <View style={styles.contentRow}>
              <View
                style={[
                  styles.iconBadge,
                  {
                    backgroundColor: `${iconColor}1F`,
                  },
                ]}
              >
                <Ionicons
                  name={iconName}
                  size={20}
                  color={iconColor}
                />
              </View>

              <View style={styles.textContainer}>
                <Text style={styles.title} numberOfLines={1}>
                  {config.title}
                </Text>

                {!!config.message && (
                  <Text style={styles.message} numberOfLines={2}>
                    {config.message}
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.progressTrack}>
              <Animated.View
                style={[
                  styles.progressBar,
                  {
                    backgroundColor: iconColor,
                  },
                  progressStyle,
                ]}
              />
            </View>
          </Pressable>
        </Animated.View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 999,
  },
  container: {
    borderRadius: 16,
    shadowColor: Colors.black,
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
  },
  pressable: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#1E1F29',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    paddingTop: 14,
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontFamily: FONTS.SemiBold,
    fontSize: 15,
    color: Colors.white,
  },
  message: {
    fontFamily: FONTS.Regular,
    fontSize: 12.5,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  progressTrack: {
    height: 3,
    width: '100%',
    borderRadius: 2,
    marginTop: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  progressBar: {
    height: 3,
    borderRadius: 2,
  },
});

export default ToastAnimated;
