import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { router } from "expo-router";
import React, { useContext, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlobalContextData } from "../context/GlobalContext";
import { Colors } from "../utils/colors";

export default function CustomCamera({ navigation, route }: any) {
  const params = route?.params || {};
  const { Data, selectReason, } = params;
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [torch, setTorch] = useState(false);
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { DeliveyDataSave, setDeliveyDataSave } = useContext(GlobalContextData)
  const { PickUpDataSave, setPickUpDataSave } = useContext(GlobalContextData)

  const takePhoto = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current?.takePictureAsync({ quality: 0.8 });
      setPhotos((prev: any) => [...prev, photo.uri]);
    }
  };

  const done = () => {
    if (route?.params?.from === "Pickup") {
      console.log("enter in Pickup");

      PickUpDataSave?.setData?.([...photos]);
    } else {
      // Default — save photos to delivery data context
      DeliveyDataSave?.setData?.([...photos]);
    }
    cameraRef.current?.resumePreview();

    router.back()
  };
  // const done = () => {
  //   DeliveyDataSave?.setData([...photos])
  //   navigation.goBack();
  // };

  useEffect(() => {
    requestPermission();
  }, []);

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
            {t(
              "We need your permission to access the camera for taking photos."
            )}
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
      />

      <TouchableOpacity
        style={styles.flashButton}
        onPress={() => setTorch(!torch)}
        activeOpacity={0.8}
      >
        <Ionicons
          name={torch ? "flash" : "flash-off"}
          size={28}
          color={torch ? Colors.white : Colors.litegray}
        />
      </TouchableOpacity>

      <FlatList
        data={photos}
        horizontal
        keyExtractor={(_, i) => i.toString()}
        showsHorizontalScrollIndicator={false}
        bounces={false}
        contentContainerStyle={{ paddingLeft: 10, paddingRight: 25 }}
        style={{ position: "absolute", bottom: 100 }}
        renderItem={({ item }) => (
          <Image source={{ uri: item }} style={styles.AllClickImage} />
        )}
      />

      <TouchableOpacity
        onPress={takePhoto}
        activeOpacity={0.8}
        style={styles.captureOuter}
      >
        <View style={styles.captureInner} />
      </TouchableOpacity>

      <TouchableOpacity
        disabled={!(photos?.length > 0)}
        onPress={done}
        style={[
          styles.DoneBtn,
          photos?.length > 0 && { backgroundColor: Colors.primary },
        ]}
      >
        <Text style={styles.Text}>
          {t("Done")} ({photos.length})
        </Text>
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
    bottom: 30,
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

  captureInner: {
    width: 40,
    height: 40,
    backgroundColor: Colors.white,
    borderRadius: 30,
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
  AllClickImage: {
    width: 80,
    height: 80,
    marginRight: 8,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  DoneBtn: {
    position: "absolute",
    top: 40,
    right: 20,
    backgroundColor: "rgba(255,255,255,0.3)",
    padding: 10,
    borderRadius: 10,
  },
  flashButton: {
    position: "absolute",
    top: 40,
    left: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    padding: 10,
    borderRadius: 10,
  },
  title: {
    fontFamily: "SemiBold",
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
    fontFamily: "regular",
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
    fontFamily: "Medium",
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
    fontFamily: "Medium",
    fontSize: 15,
  },
});
