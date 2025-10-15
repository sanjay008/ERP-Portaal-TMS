import apiConstants from "@/src/api/apiConstants";
import { Images } from "@/src/assets/images";
import ScannerInfoModal from "@/src/components/ScannerInfoModal";
import { GlobalContextData } from "@/src/context/GlobalContext";
import ApiService from "@/src/utils/Apiservice";
import { Colors } from "@/src/utils/colors.js";
import { height, token, width } from "@/src/utils/storeData";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Audio } from "expo-av";
import { Camera, CameraType, CameraView } from "expo-camera";
import { goBack } from "expo-router/build/global-state/routing";
import React, { useCallback, useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Image,
  StyleSheet,
  TouchableOpacity,
  Vibration,
  View,
} from "react-native";

export default function ScannerScreens({ navigation,route }: any) {
  const { fun } = route?.params || "";
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
    personData: [],
    type: 1,
  });

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [lastDetectedBarcode, setLastDetectedBarcode] = useState<string>("");
  const [flashEnabled, setFlashEnabled] = useState<boolean>(false);
  const [GetConformationQuestion, setGetConformationQuestion] =
    useState<string>("");
  const [facing, setFacing] = useState<CameraType>("back");
  const { UserData } = useContext(GlobalContextData);
  const { t } = useTranslation();

  const playBeep = useCallback(async () => {
    const { sound } = await Audio.Sound.createAsync(Images.ScannerSound);
    await sound.playAsync();
  }, []);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
    })();
  }, []);

  const onBarcodeScanned = useCallback(
    async ({ data, type }: { data: string; type: string }) => {
      try {
        if (data && data !== lastDetectedBarcode) {
          console.log("QR Data:", data);
          setLastDetectedBarcode(data);

          let parsedData = {};
          try {
            parsedData = JSON.parse(data);
          } catch {
            throw new Error("Invalid QR data");
          }

          Vibration.vibrate(500);
          await playBeep();
          await QuestiongetApi(parsedData);
        }
      } catch (error) {
        console.log("Invalid QR:", error);
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

  const QuestiongetApi = async (data: any) => {
    console.log("Item ID:", data?.item_id);
    try {
      let res = await ApiService(apiConstants.Verify_status, {
        customData: {
          token: token,
          role: UserData?.user?.role,
          relaties_id: 1307,
          user_id: UserData?.user?.id,
          // user_id: 316,
          item_id: data?.item_id,
          order_id: data?.order_id,
        },
      });
      console.log("res", res);

      if (Boolean(res?.status)) {
        const modalConfig: any = {
          visible: true,
          title: res?.data?.quetion,
          LButtonText: t("Cancel"),
          Icon: Images.OrderIconFull,
          RButtonStyle: Colors.primary,
          RColor: Colors.white,
          personData: res?.data?.order_data || [],
          ConformationModalOpen: data?.order_id,
          type: res?.data?.order_data?.tmsstatus?.id == 2 ? 2 : 1,
        };

        if (res?.data?.isscaned) {
          if (res?.data?.order_data?.tmsstatus?.id == 4) {
            modalConfig.onPress = async () => {
              navigation.navigate("Delivery", { item: res?.data });
            };
          } else {
            modalConfig.onPress = async () => {
              await StatusUpdateFun(data);
            };
          }

          if (res?.data?.btn_lable && res?.data?.btn_lable !== "") {
            modalConfig.RButtonText = res?.data?.btn_lable;
          } else {
            modalConfig.RButtonText = t("Yes");
          }
        }

        setGetConformationQuestion(res?.data || "");
        setConformationModal(modalConfig);
      }
    } catch (error) {
      console.log("Error in QuestiongetApi:", error);
    }
  };

  const StatusUpdateFun = async (data: any) => {
    try {
      let res = await ApiService(apiConstants.status_update, {
        customData: {
          token: token,
          role: UserData?.user?.role,
          relaties_id: 1307,
          user_id: UserData?.user?.id,
          item_id: data?.item_id,
          order_id: data?.order_id,
        },
      });
      if (res?.status) {
        console.log("Success!", res);
        fun();
        goBack();
      }
    } catch (error) {
      console.log("Status Update Error:", error);
    }
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        onBarcodeScanned={onBarcodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: [
            "qr",
            "aztec",
            "ean8",
            "ean13",
            "pdf417",
            "upc_e",
            "code39",
            "code93",
          ],
        }}
      />

      <Image
        source={Images.ScannerCenter}
        style={{ width, height, position: "absolute" }}
      />

      <View style={styles.TopIcon}>
        <TouchableOpacity
          style={styles.Button}
          onPress={() => setFlashEnabled(!flashEnabled)}
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

      {/* <ConformationModal
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
      /> */}

      <ScannerInfoModal
        InfoTitle={ConformationModalOpen.title}
        type={ConformationModalOpen?.type || 0}
        visible={ConformationModalOpen?.visible}
        personData={ConformationModalOpen?.personData}
        RText={ConformationModalOpen.RButtonText}
        LText={ConformationModalOpen.LButtonText}
        onPress={ConformationModalOpen.onPress}
        OrderId={ConformationModalOpen.order_id}
        onClose={() =>
          setConformationModal((prev: any[]) => ({
            ...prev,
            visible: false,
          }))
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
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
