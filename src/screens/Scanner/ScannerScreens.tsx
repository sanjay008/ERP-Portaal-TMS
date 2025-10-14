import apiConstants from "@/src/api/apiConstants";
import { Images } from "@/src/assets/images";
import ConformationModal from "@/src/components/ConformationModal";
import { GlobalContextData } from "@/src/context/GlobalContext";
import ApiService from "@/src/utils/Apiservice";
import { Colors } from "@/src/utils/colors.js";
import { height, token, width } from "@/src/utils/storeData";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Audio } from "expo-av";
import { goBack } from "expo-router/build/global-state/routing";
import React, { useCallback, useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Image, TouchableOpacity, Vibration, View } from "react-native";
import ScanbotBarcodeSDK, {
  ScanbotBarcodeCameraView,
} from "react-native-scanbot-barcode-scanner-sdk";
import { styles } from "./styles";

export default function ScannerScreens() {
    const [ConformationModalOpen, setConformationModal] = useState<any>({
      visible: false,
      title: "",
      Icon: "",
      LButtonText: "",
      RButtonText: "",
      RButtonColor: "",
      RButtonStyle: Object,
      LButtonStyle: Object,
      RButtonIcon: Object,
      LColor: "",
      RColor: "",
      Desctiption: "",
      onPress: "",
    });
  const [lastDetectedBarcode, setLastDetectedBarcode] = useState<object | any>("");
  
  const [flashEnabled, setFlashEnabled] = useState<boolean>(false);
  const [finderEnabled, setFinderEnabled] = useState<boolean>(false);
  const [isInitialized, setIsInitialized] = useState(false);
    const { UserData, setUserData, Toast, setToast, AllRegion, setAllRegion } =
      useContext(GlobalContextData);
  const { t } = useTranslation();

  const [GetConformationQuestion,setGetConformationQuestion] = useState<string>("");

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
      try {
        if (barcodes.length > 0) {
          const text = barcodes
            .map((b) => `${b.text} (${b.format})`)
            .join("\n");

          if (text !== lastDetectedBarcode) {
            Vibration.vibrate(500);
            console.log("code Data", text);
            await playBeep();
            setLastDetectedBarcode(text);

            setConformationModal({
              visible: true,
              title: t("Your QR code has been scanned successfully."),
              LButtonText: t("Cancel"),
              RButtonText: t("Okay"),
              Icon: Images.Success,
              RButtonStyle: Colors.primary,
              RColor: Colors.white,
              onPress:()=>QuestiongetApi(text)
            });

            // goBack();
          }
        } else {
          setConformationModal({
            visible: true,
            Icon: Images.InValidScanner,
            title: t("Invalid QR code. Please try again."),
            LButtonText: t("Cancel"),
            RButtonText: t("Scan"),
            RButtonIcon: Images.Scan,
            RButtonStyle: Colors.primary,
            RColor: Colors.white,
          });
          throw new Error("Invalid or empty QR code.");
        }
      } catch (error) {
        console.log("Barcode scan error:", error);

        setConformationModal({
          visible: true,
          Icon: Images.InValidScanner,
          title: t("Invalid QR code. Please try again."),
          LButtonText: t("Cancel"),
          RButtonText: t("Scan"),
          RButtonIcon: Images.Scan,
          RButtonStyle: Colors.primary,
          RColor: Colors.white,
          
        });
      }
    },
    [lastDetectedBarcode]
  );

const QuestiongetApi = async (data:any) => {

  console.log("data",data);

  
  try {
    let res = await ApiService(apiConstants.Verify_status, {
      customData: {
        token: token,
        role: UserData?.user?.role,
        relaties_id: 1307,
        user_id: UserData?.user?.id,
        item_id: data?.item_id,
        order_id: data?.order_id,
      },
    });

    if (Boolean(res?.status)) {
      setGetConformationQuestion(res?.data || "");
      setConformationModal({
        visible: true,
        Desctiption: res?.data,
        LButtonText: t("No"),
        RButtonText: t("Yes"),
        Icon: Images.OrderIconFull,
        RButtonStyle: Colors.primary,
        RColor: Colors.white,
        onPress: async () => {
          await StatusUpdateFun();
        },
      });
    }
  } catch (error) {
    console.log("Error in QuestiongetApi:", error);
  }
};




  const StatusUpdateFun = async ()=>{
    try {
        let res = await ApiService(apiConstants.Verify_status, {
      customData: { 
        token: token,
        role: UserData?.user?.role,
        relaties_id: 1307,
        user_id: UserData?.user?.id,
        item_id: lastDetectedBarcode?.item_id,
        order_id: lastDetectedBarcode?.order_id,
      },
    
    });
    if(res?.status){
      console.log("success");
      
    }
    } catch (error) {
      console.log("Status Update Error:-",error);
      
    }
  }

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
          {/* <ScannerInfoModal /> */}
        </ScanbotBarcodeCameraView>
      )}
       <ConformationModal
              IsVisible={ConformationModalOpen?.visible}
              onClose={() =>
                setConformationModal((prev: any[]) => ({
                  ...prev,
                  visible: false,
                }))
              }
              Title={ConformationModalOpen.title}
              Icon={ConformationModalOpen.Icon}
              LeftButtonText={ConformationModalOpen.LButtonText}
              RightButtonText={ConformationModalOpen.RButtonText}
              RightBgColor={ConformationModalOpen.RButtonStyle}
              LeftBGColor={ConformationModalOpen.LButtonStyle}
              RightButtonIcon={ConformationModalOpen.RButtonIcon}
              RTextColor={ConformationModalOpen.RColor}
              LTextColor={ConformationModalOpen.LColor}
              onPress={ConformationModalOpen.onPress}
              Description={ConformationModalOpen.Desctiption}
            />
    </View>
  );
}


