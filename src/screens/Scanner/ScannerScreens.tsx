import apiConstants from "@/src/api/apiConstants";
import { Images } from "@/src/assets/images";
import { useErrorHandle } from "@/src/components/ErrorHandle";
import Loader from "@/src/components/loading";
import LoadingModal from "@/src/components/LoadingModal";
import PickUpBox from "@/src/components/PickUpBox";
import ScannerInfoModal from "@/src/components/ScannerInfoModal";
import { GlobalContextData } from "@/src/context/GlobalContext";
import ApiService from "@/src/utils/Apiservice";
import { Colors } from "@/src/utils/colors.js";
import { height, token, width } from "@/src/utils/storeData";
import Ionicons from "@expo/vector-icons/Ionicons";
import BottomSheet, {
  BottomSheetFlatList,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { useIsFocused } from "@react-navigation/native";
import axios from "axios";
import { Audio } from "expo-av";
import {
  Camera,
  CameraType,
  CameraView,
  useCameraPermissions,
} from "expo-camera";
import { goBack } from "expo-router/build/global-state/routing";
import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

export default function ScannerScreens({ navigation, route }: any) {
  const { fun = () => {} } = route?.params || {};
  const [permission, requestPermission] = useCameraPermissions();
  const [IsLoading, setIsLoading] = useState<boolean>(false);
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
    ProductItem: [],
  });

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [lastDetectedBarcode, setLastDetectedBarcode] = useState<string>("");
  const [flashEnabled, setFlashEnabled] = useState<boolean>(false);
  const [AllRecentScanData, setAllRecentScanData] = useState<number[]>([]);
  const [AllScanedData, setAllScanedData] = useState<object[]>([]);
  const [DataLoader, setDataLoader] = useState(false);
  const cameraRef = useRef(null);
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [GetConformationQuestion, setGetConformationQuestion] =
    useState<string>("");
  const [facing, setFacing] = useState<CameraType>("back");
  const { UserData, setToast } = useContext(GlobalContextData);
  const { t } = useTranslation();
  const { ErrorHandle } = useErrorHandle();
  const playBeep = useCallback(async () => {
    const { sound } = await Audio.Sound.createAsync(Images.ScannerSound);
    await sound.playAsync();
  }, []);
  const Focused = useIsFocused();
  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
    })();

    if (permission && permission.granted === false) {
      requestPermission();
    }

    if (ConformationModalOpen?.visible) {
      setConformationModal((prev: any) => ({
        ...prev,
        visible: false,
      }));
    }
  }, [permission, Focused]);

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
          relaties_id: UserData?.relaties?.id,
          user_id: UserData?.user?.id,
          item_id: data?.item_id,
          order_id: data?.order_id,
        },
      });
      // setAllRecentScanData((prev) => {
      //   if (prev.includes(data.order_id)) {
      //     return prev.filter((id) => id !== data.order_id);
      //   } else {
      //     return [...prev, data.order_id];
      //   }
      // });

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
          order_id: data?.order_id,
          ProductItem: res?.data?.order_data?.items || [],
          type: res?.data?.order_data?.tmsstatus?.id == 2 ? 2 : 1,
        };

        if (res?.data?.isscaned) {
          if (res?.data?.order_data?.tmsstatus?.id == 4) {
            modalConfig.onPress = async () => {
              navigation.navigate("Delivery", { item: res?.data, fun });
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
    setIsLoading(true);
    let copy = [...AllRecentScanData];
    try {
      let res = await ApiService(apiConstants.status_update, {
        customData: {
          token: token,
          role: UserData?.user?.role,
          relaties_id: UserData?.relaties?.id,
          user_id: UserData?.user?.id,
          item_id: data?.item_id,
          order_id: data?.order_id,
        },
      });
      if (res?.status) {
        console.log("Success!", res);
        fun();
        // goBack();
        setAllRecentScanData((prev) => {
          if (prev.includes(data.order_id)) {
            return prev.filter((id) => id !== data.order_id); // remove if already there
          }
          copy = [...prev, data.order_id];
          return [...prev, data.order_id]; // add if not there
        });
          setConformationModal((prev: any[]) => ({
            ...prev,
            visible: false,
          }))
        await GetScanedOrderDataLatestFun(copy);
      }
    } catch (error) {
      console.log("Status Update Error:", error);
      setToast({
        top: 45,
        text: ErrorHandle(error).message,
        type: "error",
        visible: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const GetScanedOrderDataLatestFun = async (data: any) => {
    setDataLoader(true);
    const formData = new FormData();

    formData.append("token", token);
    formData.append("user_id", UserData?.user?.id);
    formData.append("role", UserData?.user?.role);
    formData.append("relaties_id", "1307");

    // Assuming AllRecentScanData or some array like dataIds[] contains the IDs
    data.forEach((id: any) => {
      console.log("id", id);

      formData.append("order_ids[]", id);
    });

    console.log("Multiple Data reqData", formData);
    console.log("AllRecentScanData", data);

    try {
      const response = await axios.post(
        apiConstants.getMultipleOrderData,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      let res = response?.data;
      if (Boolean(res.status)) {
        setAllScanedData(res?.data || []);
      }
    } catch (error: any) {
      console.log("Get Scaned Data Error:-", error?.message);
      if (axios.isAxiosError(error)) {
        console.log({
          message: error.message,
          status: error.response?.status,
          response: error.response?.data,
        });
      } else {
        console.log("Unexpected Error:", error);
      }
      setToast({
        top: 45,
        text: ErrorHandle(error).message,
        type: "error",
        visible: true,
      });
    } finally {
      setDataLoader(false);
    }
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <CameraView
        ref={cameraRef}
        enableTorch={flashEnabled}
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

      <ScannerInfoModal
        InfoTitle={ConformationModalOpen.title}
        type={ConformationModalOpen?.type || 0}
        visible={ConformationModalOpen?.visible}
        personData={ConformationModalOpen?.personData}
        RText={ConformationModalOpen.RButtonText}
        LText={ConformationModalOpen.LButtonText}
        onPress={ConformationModalOpen.onPress}
        ProductItem={ConformationModalOpen?.ProductItem}
        OrderId={ConformationModalOpen.order_id}
        onClose={() =>
          setConformationModal((prev: any[]) => ({
            ...prev,
            visible: false,
          }))
        }
      />
      <LoadingModal visible={IsLoading} message={t("Please wait…")} />
      <BottomSheet snapPoints={["15%", "90%"]} ref={bottomSheetRef}>
        <BottomSheetView style={styles.contentContainer}>
          <BottomSheetFlatList
          style={{width:width,margin:0}}
            data={AllScanedData}
            ListFooterComponent={() =>
              DataLoader && (
                <View style={styles.ListFooterContainer}>
                  <Loader />
                </View>
              )
            }
            ListEmptyComponent={() =>
              !DataLoader && (
                <View style={styles.ListFooterContainer}>
                  <Text style={styles.Text}>{t("No Scan Order")}</Text>
                </View>
              )
            }
            keyExtractor={(item:any,index:number) => `${index}`}
            renderItem={({ item, index }: any) => (
              <PickUpBox
                index={index}
                LableStatus={item?.tmsstatus?.status_name}
                OrderId={item?.id}
                ProductItem={item?.items}
                LableBackground={item?.tmsstatus?.color}
                // onPress={() => navigation.navigate("Details", { item: item })}
                start={item?.pickup_location}
                end={item?.deliver_location}
                customerData={item?.customer}
                statusData={item?.tmsstatus}
                LacationProgress={false}
              />
            )}
            contentContainerStyle={styles.contentContainer}
          />
        </BottomSheetView>
      </BottomSheet>
    </GestureHandlerRootView>
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
  contentContainer: {
    flex: 1,
    padding: 15,
    alignItems: "center",
    gap: 10,
  },
  ListFooterContainer: {
    width: "100%",
    height: width / 2,
    justifyContent: "center",
    alignItems: "center",
  },
  Text: {
    fontSize: 14,
    fontFamily: "Medium",
    color: Colors.black,
  },
});
