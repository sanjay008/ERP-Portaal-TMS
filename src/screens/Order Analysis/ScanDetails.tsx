import { Images } from '@/src/assets/images';
import { GlobalContextData } from '@/src/context/GlobalContext';
import { Colors } from '@/src/utils/colors';
import { height, width } from '@/src/utils/storeData';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused, useNavigation } from "@react-navigation/native";
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ScanDetails({ route }: any) {
  const { goBack, navigate } = useNavigation<any>();
  const isFocused = useIsFocused();
  const { t } = useTranslation();
  const [permission, requestPermission] = useCameraPermissions();
  const [flashEnabled, setFlashEnabled] = useState<boolean>(false);
  const [cameraReady, setCameraReady] = useState<boolean>(false);
  const {
    UserData,
    setUserData,
    Toast,
    setToast,
    GloblyTypeSlide,
    QRcodeSearch, setQRcodeSearch,
  } = useContext(GlobalContextData);
  const lastScannedRef = useRef<string>("");
  const isProcessingRef = useRef<boolean>(false);

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [QRcodeSearch]);

  useEffect(() => {
    if (isFocused) {
      lastScannedRef.current = "";
      isProcessingRef.current = false;
      setCameraReady(false);
    }
  }, [isFocused]);

  const onBarcodeScanned = useCallback(
    ({ data }: { data: any; type: string }) => {
      if (!data || isProcessingRef.current) return;
      if (data === lastScannedRef.current) return;

      isProcessingRef.current = true;
      lastScannedRef.current = data;

      try {
        const parsed = JSON.parse(data);
        console.log("Scanned Value:", parsed);
        setQRcodeSearch?.(parsed?.order_id);

        setTimeout(() => {
          navigate("OrderDetails", { order_id: parsed?.order_id, type: GloblyTypeSlide });
          isProcessingRef.current = false;
        }, 1500);
      } catch (err) {
        console.log("Invalid QR format:", data);
        isProcessingRef.current = false;
      }
    },
    [setQRcodeSearch]
  );

  if (!permission) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color={Colors.white} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centeredContainer}>
        <Text style={styles.permissionText}>{t("Camera permission is required to scan QR codes.")}</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>{t("Grant Permission")}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.permissionButton, { marginTop: 10, backgroundColor: 'rgba(255,255,255,0.1)' }]} onPress={goBack}>
          <Text style={styles.permissionButtonText}>{t("Go Back")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {isFocused && permission.granted && (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          enableTorch={flashEnabled}
          onCameraReady={() => setCameraReady(true)}
          onBarcodeScanned={cameraReady ? onBarcodeScanned : undefined}
          barcodeScannerSettings={{
            barcodeTypes: ["qr", "ean13", "ean8", "code128", "code39", "upc_a", "upc_e"],
          }}
        />
      )}

      {!cameraReady && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={Colors.white} />
        </View>
      )}

      <Image
        source={Images.ScannerCenter}
        style={{ width, height, position: "absolute" }}
      />

      <View style={styles.TopIcon}>
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.Button}
          onPress={() => setFlashEnabled(prev => !prev)}
        >
          <Ionicons
            name={flashEnabled ? "flash-sharp" : "flash-outline"}
            size={24}
            color={Colors.white}
          />
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.85} style={styles.Button} onPress={goBack}>
          <Image source={Images.Close} style={styles.Icons} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
  },
  centeredContainer: {
    flex: 1,
    backgroundColor: "black",
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "black",
    justifyContent: "center",
    alignItems: "center",
  },
  permissionText: {
    color: Colors.white,
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },
  permissionButton: {
    backgroundColor: Colors.white,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  permissionButtonText: {
    color: "black",
    fontSize: 15,
    fontWeight: "600",
  },
  TopIcon: {
    position: "absolute",
    top: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 20,
  },
  Button: {
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 10,
    borderRadius: 25,
  },
  Icons: {
    width: 24,
    height: 24,
    tintColor: Colors.white,
  },
});