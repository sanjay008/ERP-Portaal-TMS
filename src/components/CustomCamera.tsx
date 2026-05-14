// import { Ionicons } from "@expo/vector-icons";
// import { CameraView, useCameraPermissions } from "expo-camera";
// import { router } from "expo-router";
// import React, { useContext, useEffect, useRef, useState } from "react";
// import { useTranslation } from "react-i18next";
// import {
//   FlatList,
//   Image,
//   StyleSheet,
//   Text,
//   TouchableOpacity,
//   View,
// } from "react-native";
// import { useSafeAreaInsets } from "react-native-safe-area-context";
// import { GlobalContextData } from "../context/GlobalContext";
// import { Colors } from "../utils/colors";
// import { FONTS } from "../utils/storeData";

// export default function CustomCamera({ navigation, route }: any) {
//   const params = route?.params || {};
//   const { Data, selectReason, } = params;
//   const [permission, requestPermission] = useCameraPermissions();
//   const cameraRef = useRef<any>(null);
//   const [photos, setPhotos] = useState<any[]>([]);
//   const [torch, setTorch] = useState(false);
//   const { t } = useTranslation();
//   const insets = useSafeAreaInsets();
//   const { DeliveyDataSave, setDeliveyDataSave } = useContext(GlobalContextData)
//   const { PickUpDataSave, setPickUpDataSave } = useContext(GlobalContextData)

//   const takePhoto = async () => {
//     if (cameraRef.current) {
//       const photo = await cameraRef.current?.takePictureAsync({ quality: 0.8 });
//       setPhotos((prev: any) => [...prev, photo.uri]);
//     }
//   };

//   const done = () => {
//     if (route?.params?.from === "Pickup") {
//       console.log("enter in Pickup");

//       PickUpDataSave?.setData?.([...photos]);
//     } else {
//       // Default — save photos to delivery data context
//       DeliveyDataSave?.setData?.([...photos]);
//     }
//     cameraRef.current?.resumePreview();

//     router.back()
//   };
//   // const done = () => {
//   //   DeliveyDataSave?.setData([...photos])
//   //   navigation.goBack();
//   // };

//   useEffect(() => {
//     requestPermission();
//   }, []);

//   if (!permission?.granted) {
//     return (
//       <View
//         style={[
//           styles.container,
//           { paddingTop: insets.top, paddingBottom: insets.bottom },
//         ]}
//       >
//         <View style={styles.card}>
//           <Text style={styles.title}>{t("Camera Permission Needed")}</Text>
//           <Text style={styles.message}>
//             {t(
//               "We need your permission to access the camera for taking photos."
//             )}
//           </Text>

//           <TouchableOpacity
//             activeOpacity={0.8}
//             style={styles.allowButton}
//             onPress={requestPermission}
//           >
//             <Text style={styles.allowText}>{t("Grant Permission")}</Text>
//           </TouchableOpacity>
//         </View>
//       </View>
//     );
//   }

//   return (
//     <View style={{ flex: 1, backgroundColor: "#000" }}>
//       <CameraView
//         ref={cameraRef}
//         style={{ flex: 1 }}
//         facing="back"
//         enableTorch={torch}
//       />

//       <TouchableOpacity
//         style={styles.flashButton}
//         onPress={() => setTorch(!torch)}
//         activeOpacity={0.8}
//       >
//         <Ionicons
//           name={torch ? "flash" : "flash-off"}
//           size={28}
//           color={torch ? Colors.white : Colors.litegray}
//         />
//       </TouchableOpacity>

//       <FlatList
//         data={photos}
//         horizontal
//         keyExtractor={(_, i) => i.toString()}
//         showsHorizontalScrollIndicator={false}
//         bounces={false}
//         contentContainerStyle={{ paddingLeft: 10, paddingRight: 25 }}
//         style={{ position: "absolute", bottom: 100 }}
//         renderItem={({ item }) => (
//           <Image source={{ uri: item }} style={styles.AllClickImage} />
//         )}
//       />

//       <TouchableOpacity
//         onPress={takePhoto}
//         activeOpacity={0.8}
//         style={styles.captureOuter}
//       >
//         <View style={styles.captureInner} />
//       </TouchableOpacity>

//       <TouchableOpacity
//         disabled={!(photos?.length > 0)}
//         onPress={done}
//         style={[
//           styles.DoneBtn,
//           photos?.length > 0 && { backgroundColor: Colors.primary },
//         ]}
//       >
//         <Text style={styles.Text}>
//           {t("Done")} ({photos.length})
//         </Text>
//       </TouchableOpacity>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: Colors.gray,
//     justifyContent: "center",
//     alignItems: "center",
//     paddingHorizontal: 20,
//   },
//   captureOuter: {
//     position: "absolute",
//     bottom: 30,
//     alignSelf: "center",
//     width: 60,
//     height: 60,
//     borderRadius: 40,
//     backgroundColor: "rgba(255,255,255,0.2)",
//     justifyContent: "center",
//     alignItems: "center",
//     borderWidth: 3,
//     borderColor: Colors.white,
//     shadowColor: Colors.black,
//     shadowOffset: { width: 0, height: 4 },
//     shadowOpacity: 0.3,
//     shadowRadius: 6,
//     elevation: 8,
//   },

//   captureInner: {
//     width: 40,
//     height: 40,
//     backgroundColor: Colors.white,
//     borderRadius: 30,
//   },
//   card: {
//     backgroundColor: Colors.white,
//     borderRadius: 20,
//     paddingVertical: 30,
//     paddingHorizontal: 25,
//     alignItems: "center",
//     width: "90%",
//     shadowColor: Colors.black,
//     shadowOpacity: 0.1,
//     shadowRadius: 6,
//     elevation: 3,
//   },
//   AllClickImage: {
//     width: 80,
//     height: 80,
//     marginRight: 8,
//     borderRadius: 10,
//     borderWidth: 2,
//     borderColor: Colors.white,
//   },
//   DoneBtn: {
//     position: "absolute",
//     top: 40,
//     right: 20,
//     backgroundColor: "rgba(255,255,255,0.3)",
//     padding: 10,
//     borderRadius: 10,
//   },
//   flashButton: {
//     position: "absolute",
//     top: 40,
//     left: 20,
//     backgroundColor: "rgba(255,255,255,0.2)",
//     padding: 10,
//     borderRadius: 10,
//   },
//   title: {
//     fontFamily: FONTS.SemiBold,
//     fontSize: 20,
//     color: Colors.black,
//     textAlign: "center",
//     marginBottom: 10,
//   },
//   Text: {
//     color: Colors.white,
//     fontSize: 16,
//   },
//   message: {
//     fontFamily: FONTS.Regular,
//     fontSize: 15,
//     color: Colors.litegray,
//     textAlign: "center",
//     marginBottom: 25,
//   },
//   allowButton: {
//     backgroundColor: Colors.green,
//     borderRadius: 12,
//     paddingVertical: 12,
//     paddingHorizontal: 25,
//     width: "80%",
//     alignItems: "center",
//     marginBottom: 10,
//   },
//   allowText: {
//     color: Colors.white,
//     fontFamily: FONTS.Medium,
//     fontSize: 16,
//   },
//   cancelButton: {
//     backgroundColor: Colors.litegray,
//     borderRadius: 12,
//     paddingVertical: 12,
//     paddingHorizontal: 25,
//     width: "80%",
//     alignItems: "center",
//   },
//   cancelText: {
//     color: Colors.black,
//     fontFamily: FONTS.Medium,
//     fontSize: 15,
//   },
// });
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions, useMicrophonePermissions } from "expo-camera";
import { router } from "expo-router";
import React, { useCallback, useContext, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlobalContextData } from "../context/GlobalContext";
import { Colors } from "../utils/colors";
import { FONTS } from "../utils/storeData";

export default function CustomCamera({ navigation, route }: any) {
  const params = route?.params || {};
  const { Data, selectReason, maxDuration = 15 } = params;

  const [permission, requestPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const cameraRef = useRef<any>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [torch, setTorch] = useState(false);
  const [isVideoMode, setIsVideoMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isCameraSwitching, setIsCameraSwitching] = useState(false);

  const isRecordingRef = useRef(false);
  const timerRef = useRef<any>(null);
  const switchLockRef = useRef<any>(null);

  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { DeliveyDataSave, setDeliveyDataSave } = useContext(GlobalContextData);
  const { PickUpDataSave, setPickUpDataSave } = useContext(GlobalContextData);

  const switchTranslate = useSharedValue(0);

  const animatedThumb = useAnimatedStyle(() => ({
    transform: [{ translateX: withTiming(switchTranslate.value, { duration: 250 }) }],
  }));

  const formatSeconds = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // Validation: at least 3 photos OR at least 1 video
  const isDoneEnabled = videos.length >= 1 || photos.length >= 3;

  // Hint message for user
  const validationHint = (() => {
    if (videos.length >= 1 || photos.length >= 3) return null;
    if (isVideoMode) {
      return t("Please record at least 1 video");
    }
    if (photos.length === 0) return t("Please take at least 3 photos");
    return t(`${3 - photos.length} more photo(s) needed`);
  })();

  const toggleMode = useCallback(() => {
    if (isRecordingRef.current || isCameraSwitching) return;

    const next = !isVideoMode;
    setIsVideoMode(next);
    switchTranslate.value = next ? 72 : 0;

    setIsCameraSwitching(true);
    if (switchLockRef.current) clearTimeout(switchLockRef.current);
    switchLockRef.current = setTimeout(() => {
      setIsCameraSwitching(false);
    }, 800);

    if (next && !micPermission?.granted) {
      requestMicPermission();
    }
  }, [isVideoMode, isCameraSwitching, micPermission]);

  const takePhoto = useCallback(async () => {
    if (!cameraRef.current || isCameraSwitching || isRecordingRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (photo?.uri) {
        setPhotos((prev) => [...prev, photo.uri]);
      }
    } catch (e) {
      console.log("takePictureAsync error:", e);
    }
  }, [isCameraSwitching]);

  const startRecording = useCallback(async () => {
    if (!cameraRef.current || isRecordingRef.current || isCameraSwitching) return;

    let isMuted = !micPermission?.granted;
    if (!micPermission?.granted) {
      try {
        const result = await requestMicPermission();
        isMuted = !result?.granted;
      } catch (_) {
        isMuted = true;
      }
    }

    isRecordingRef.current = true;
    setIsRecording(true);
    setRecordingSeconds(0);

    timerRef.current = setInterval(() => {
      setRecordingSeconds((s) => s + 1);
    }, 1000);

    try {
      const video = await cameraRef.current.recordAsync({
        maxDuration: maxDuration,
        mute: isMuted,
      });
      if (video?.uri) {
        setVideos((prev) => [...prev, video.uri]);
      }
    } catch (e) {
      console.log("recordAsync error:", e);
    } finally {
      clearInterval(timerRef.current);
      timerRef.current = null;
      isRecordingRef.current = false;
      setIsRecording(false);
      setRecordingSeconds(0);
    }
  }, [isCameraSwitching, micPermission, maxDuration]);

  const stopRecording = useCallback(() => {
    if (cameraRef.current && isRecordingRef.current) {
      try {
        cameraRef.current.stopRecording();
      } catch (e) {
        console.log("stopRecording error:", e);
      }
    }
  }, []);

  const handleCapture = useCallback(() => {
    if (isCameraSwitching) return;
    if (isVideoMode) {
      if (isRecordingRef.current) {
        stopRecording();
      } else {
        startRecording();
      }
    } else {
      takePhoto();
    }
  }, [isVideoMode, isCameraSwitching, stopRecording, startRecording, takePhoto]);

  const done = useCallback(() => {
    if (!isDoneEnabled) return;
    if (isRecordingRef.current) stopRecording();
    const allMedia = [...photos, ...videos];
    if (route?.params?.from === "Pickup") {
      console.log("enter in Pickup");
      PickUpDataSave?.setData?.(allMedia);
    } else {
      DeliveyDataSave?.setData?.(allMedia);
    }
    cameraRef.current?.resumePreview?.();
    router.back();
  }, [photos, videos, stopRecording, isDoneEnabled]);

  useEffect(() => {
    (async () => {
      await requestPermission();
      await requestMicPermission();
    })();
  }, []);

  useEffect(() => {
    if (isRecording && recordingSeconds >= maxDuration) {
      stopRecording();
    }
  }, [recordingSeconds]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (switchLockRef.current) clearTimeout(switchLockRef.current);
    };
  }, []);

  const totalMedia = photos.length + videos.length;
  const allMediaList = [
    ...photos.map((uri) => ({ uri, isVideo: false })),
    ...videos.map((uri) => ({ uri, isVideo: true })),
  ];

  if (!permission?.granted) {
    return (
      <View
        style={[
          styles.container,
          { paddingTop: insets.top, paddingBottom: insets.bottom },
        ]}
      >
        <View style={styles.card}>
          <Text style={styles.title}>{t("Camera Permission Needed")}</Text>
          <Text style={styles.message}>
            {t("We need your permission to access the camera for taking photos.")}
          </Text>
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.allowButton}
            onPress={requestPermission}
          >
            <Text style={styles.allowText}>{t("Grant Permission")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <CameraView
        ref={cameraRef}
        style={{ flex: 1 }}
        facing="back"
        enableTorch={torch}
        mode={isVideoMode ? "video" : "picture"}
      />

      {isCameraSwitching && (
        <View style={styles.switchingOverlay}>
          <ActivityIndicator size="small" color={Colors.white} />
        </View>
      )}

      <TouchableOpacity
        style={[styles.flashButton, { top: insets.top + 10 }]}
        onPress={() => setTorch((prev) => !prev)}
        activeOpacity={0.8}
        disabled={isRecording}
      >
        <Ionicons
          name={torch ? "flash" : "flash-off"}
          size={28}
          color={torch ? Colors.white : Colors.litegray}
        />
      </TouchableOpacity>

      <TouchableOpacity
        disabled={!isDoneEnabled}
        onPress={done}
        style={[
          styles.DoneBtn,
          { top: insets.top + 10 },
          isDoneEnabled && { backgroundColor: Colors.primary },
        ]}
      >
        <Text style={styles.Text}>
          {t("Done")} ({totalMedia})
        </Text>
      </TouchableOpacity>

      {isRecording && (
        <View style={[styles.timerContainer, { top: insets.top + 10 }]}>
          <View style={styles.recDot} />
          <Text style={styles.timerText}>
            {formatSeconds(recordingSeconds)} / {formatSeconds(maxDuration)}
          </Text>
        </View>
      )}

      {validationHint && !isRecording && (
        <View style={[styles.validationHintContainer, { top: insets.top + 60 }]}>
          <Text style={styles.validationHintText}>{validationHint}</Text>
        </View>
      )}

      {allMediaList.length > 0 && (
        <FlatList
          data={allMediaList}
          horizontal
          keyExtractor={(_, i) => i.toString()}
          showsHorizontalScrollIndicator={false}
          bounces={false}
          contentContainerStyle={{ paddingLeft: 10, paddingRight: 10 }}
          style={[styles.thumbnailList, { bottom: insets.bottom + 152 }]}
          renderItem={({ item }: any) =>
            item.isVideo ? (
              <View style={[styles.AllClickImage, styles.videoThumb]}>
                <Ionicons name="videocam" size={26} color={Colors.white} />
              </View>
            ) : (
              <Image source={{ uri: item.uri }} style={styles.AllClickImage} />
            )
          }
        />
      )}

      <View style={[styles.switchContainer, { bottom: insets.bottom + 96 }]}>
        <TouchableOpacity
          onPress={toggleMode}
          activeOpacity={0.9}
          style={styles.switchTrack}
          disabled={isRecording || isCameraSwitching}
        >
          <Animated.View style={[styles.switchThumb, animatedThumb]} />
          <View style={styles.switchLabelLeft}>
            <Ionicons
              name="camera"
              size={14}
              color={isVideoMode ? "rgba(255,255,255,0.45)" : Colors.white}
            />
            <Text
              style={[
                styles.switchLabelText,
                { color: isVideoMode ? "rgba(255,255,255,0.45)" : Colors.white },
              ]}
            >
              {t("Photo")}
            </Text>
          </View>
          <View style={styles.switchLabelRight}>
            <Ionicons
              name="videocam"
              size={14}
              color={!isVideoMode ? "rgba(255,255,255,0.45)" : Colors.white}
            />
            <Text
              style={[
                styles.switchLabelText,
                { color: !isVideoMode ? "rgba(255,255,255,0.45)" : Colors.white },
              ]}
            >
              {t("Video")}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        onPress={handleCapture}
        activeOpacity={0.8}
        disabled={isCameraSwitching}
        style={[
          styles.captureOuter,
          { bottom: insets.bottom + 24 },
          isRecording && styles.captureRecording,
          isCameraSwitching && { opacity: 0.4 },
        ]}
      >
        {isRecording ? (
          <View style={styles.stopInner} />
        ) : (
          <View
            style={[
              styles.captureInner,
              isVideoMode && { backgroundColor: "#FF3B30" },
            ]}
          />
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.gray,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  captureOuter: {
    position: "absolute",
    alignSelf: "center",
    width: 60,
    height: 60,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: Colors.white,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  captureRecording: {
    borderColor: "#FF3B30",
    backgroundColor: "rgba(255,59,48,0.15)",
  },
  captureInner: {
    width: 40,
    height: 40,
    backgroundColor: Colors.white,
    borderRadius: 30,
  },
  stopInner: {
    width: 22,
    height: 22,
    backgroundColor: "#FF3B30",
    borderRadius: 4,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    paddingVertical: 30,
    paddingHorizontal: 25,
    alignItems: "center",
    width: "90%",
    shadowColor: Colors.black,
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  thumbnailList: {
    position: "absolute",
    left: 0,
    right: 0,
  },
  AllClickImage: {
    width: 80,
    height: 80,
    marginRight: 8,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  videoThumb: {
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  DoneBtn: {
    position: "absolute",
    right: 20,
    backgroundColor: "rgba(255,255,255,0.3)",
    padding: 10,
    borderRadius: 10,
  },
  flashButton: {
    position: "absolute",
    left: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    padding: 10,
    borderRadius: 10,
  },
  switchingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  timerContainer: {
    position: "absolute",
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 7,
  },
  recDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FF3B30",
  },
  timerText: {
    color: Colors.white,
    fontSize: 15,
    fontFamily: FONTS.SemiBold,
    letterSpacing: 1,
  },
  validationHintContainer: {
    position: "absolute",
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  validationHintText: {
    color: Colors.white,
    fontSize: 13,
    fontFamily: FONTS.Medium,
    textAlign: "center",
  },
  switchContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  switchTrack: {
    width: 150,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.18)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 6,
    overflow: "hidden",
  },
  switchThumb: {
    position: "absolute",
    left: 3,
    width: 72,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.28)",
  },
  switchLabelLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    zIndex: 1,
    width: 65,
    justifyContent: "center",
  },
  switchLabelRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    zIndex: 1,
    width: 65,
    justifyContent: "center",
  },
  switchLabelText: {
    fontSize: 13,
    fontFamily: FONTS.Medium,
  },
  title: {
    fontFamily: FONTS.SemiBold,
    fontSize: 20,
    color: Colors.black,
    textAlign: "center",
    marginBottom: 10,
  },
  Text: {
    color: Colors.white,
    fontSize: 16,
  },
  message: {
    fontFamily: FONTS.Regular,
    fontSize: 15,
    color: Colors.litegray,
    textAlign: "center",
    marginBottom: 25,
  },
  allowButton: {
    backgroundColor: Colors.green,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 25,
    width: "80%",
    alignItems: "center",
    marginBottom: 10,
  },
  allowText: {
    color: Colors.white,
    fontFamily: FONTS.Medium,
    fontSize: 16,
  },
  cancelButton: {
    backgroundColor: Colors.litegray,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 25,
    width: "80%",
    alignItems: "center",
  },
  cancelText: {
    color: Colors.black,
    fontFamily: FONTS.Medium,
    fontSize: 15,
  },
});