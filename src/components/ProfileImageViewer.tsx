import React, { useCallback, useState } from 'react';
import {
    Dimensions,
    ImageStyle,
    Modal,
    Pressable,
    StatusBar,
    StyleSheet,
    TouchableOpacity,
} from 'react-native';
import Animated, {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_SIZE = SCREEN_WIDTH - 40;

const ProfileImageViewer = ({
  imageUri,
  imageStyle,
}: {
  imageUri: string;
  imageStyle?: ImageStyle;
}) => {
  const [visible, setVisible] = useState(false);

  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const backdropOpacity = useSharedValue(0);

  const animatedImageStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const animatedBackdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const openImage = useCallback(() => {
    setVisible(true);
    scale.value = withSpring(1, { damping: 100, stiffness: 200 });
    opacity.value = withTiming(1, { duration: 220 });
    backdropOpacity.value = withTiming(1, { duration: 220 });
  }, []);

  const closeImage = useCallback(() => {
    scale.value = withSpring(0.1, { damping: 100, stiffness: 200 });
    opacity.value = withTiming(0, { duration: 180 });
    backdropOpacity.value = withTiming(0, { duration: 180 }, () => {
      runOnJS(setVisible)(false);
    });
  }, []);

  return (
    <>
      <TouchableOpacity activeOpacity={0.85} onPress={openImage}>
        <Animated.Image
          source={{ uri: imageUri }}
          style={[styles.userImage, imageStyle]}
        />
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        statusBarTranslucent
        animationType="none"
        onRequestClose={closeImage}
      >
        <StatusBar backgroundColor="rgba(0,0,0,0.9)" barStyle="light-content" />

        <Pressable onPress={closeImage} style={styles.modalWrapper}>
          <Animated.View style={[styles.backdrop, animatedBackdropStyle]} />

          <Pressable>
            <Animated.Image
              source={{ uri: imageUri }}
              style={[styles.fullImage, animatedImageStyle]}
              resizeMode="cover"
            />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  userImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  modalWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  fullImage: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: IMAGE_SIZE / 2,
  },
});

export default ProfileImageViewer;