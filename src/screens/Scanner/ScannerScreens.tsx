import { Images } from "@/src/assets/images";
import { Colors } from "@/src/utils/colors";
import { height, width } from "@/src/utils/storeData";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Audio } from "expo-av";
import { goBack } from "expo-router/build/global-state/routing";
import React, { useCallback, useEffect, useState } from "react";
import { Image, TouchableOpacity, Vibration, View } from "react-native";
import ScanbotBarcodeSDK, {
  ScanbotBarcodeCameraView,
} from "react-native-scanbot-barcode-scanner-sdk";
import { styles } from "./styles";

export default function ScannerScreens() {
  const [lastDetectedBarcode, setLastDetectedBarcode] = useState("");
  const [flashEnabled, setFlashEnabled] = useState<boolean>(false);
  const [finderEnabled, setFinderEnabled] = useState<boolean>(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const LICENSE_KEY =
    "OzexDAU091kkg3uiX03iXHwUqmQ4xc" +
    "umvTbCwwB1sjg1kFHs6WjYyadRIJiM" +
    "pbP+k+SVgSAnGcdUi5GCBtbrhqZDnw" +
    "7QiWnmKgX4ow0rf+9OFc7eDqYBuluu" +
    "y16NP7ea2Uetu4kfmQEWl4tsgR2xw5" +
    "0pCllJBJdrmpwzKv7iUeyiOTHIHxEM" +
    "1HELldj6WDkh0m0UjXxlODV8lfUdJj" +
    "s6m/1ALY/804kD8ZglEXqT5QnVzjRE" +
    "OEmMQVbrKpf969KIbXMrHWaDV7soDB" +
    "4oALd3WhLZsgB9H6FzyD5IUTvOWkRG" +
    "6LWMaM0vou0w7IpW3YjggEP1DLu2YV" +
    "8YDYCfYgLflw==\nU2NhbmJvdFNESw" +
    "pjb20uZXJwcG9ydGFhbC5FUlBfUG9y" +
    "dGFhbF9UTVMKMTc2MDY1OTE5OQo4Mz" +
    "g4NjA3CjE5\n";

  const playBeep = useCallback(async () => {
    const { sound } = await Audio.Sound.createAsync(Images.ScannerSound);
    await sound.playAsync();
  }, []);

  useEffect(() => {
    const initScanner = async () => {
      try {
        const result = await ScanbotBarcodeSDK.initializeSdk({
          licenseKey: LICENSE_KEY,
        });
        console.log("Scanbot initialized:", result);
        Vibration.vibrate(500);
        setIsInitialized(true);
      } catch (err) {
        console.error("Error initializing scanner:", err);
      }
    };
    initScanner();
  }, []);

  const onBarcodeScan = useCallback(
    async (barcodes: any[]) => {
      if (barcodes.length > 0) {
        const text = barcodes.map((b) => `${b.text} (${b.format})`).join("\n");
        if (text !== lastDetectedBarcode) {
          Vibration.vibrate(500);
          console.log("code Data", text);
          await playBeep();
          setLastDetectedBarcode(text);
          goBack()
        }
      }
    },
    [lastDetectedBarcode]
  );

  return (
    <View style={styles.container}>
      {isInitialized && (
        <ScanbotBarcodeCameraView
          style={styles.container}
          barcodeFormats={["QR_CODE", "EAN_13", "CODE_128"]}
          finderConfig={{
            viewFinderEnabled: finderEnabled,
            overlayColor: "rgba(0,0,0,0.6)",
          }}
          flashEnabled={flashEnabled}
          onBarcodeScannerResult={onBarcodeScan}
        >
          <Image
            source={Images.ScannerCenter}
            style={{ width: width, height: height }}
          />
          <View style={styles.TopIcon}>
            <TouchableOpacity
              style={styles.Button}
              onPress={() => setFlashEnabled((pre) => !pre)}
            >
              <Ionicons
                name={flashEnabled ? "flash-sharp" : "flash-outline"}
                size={24}
                color={Colors.white}
              />
            </TouchableOpacity>

            <TouchableOpacity style={styles.Button} onPress={goBack}>
              <Image source={Images.Close} style={styles.Icons} />
            </TouchableOpacity>
          </View>
        </ScanbotBarcodeCameraView>
      )}
    </View>
  );
}
