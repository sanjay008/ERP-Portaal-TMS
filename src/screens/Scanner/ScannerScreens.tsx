import apiConstants from "@/src/api/apiConstants";
import { Images } from "@/src/assets/images";
import { ApiFormatDate } from "@/src/components/ApiFormatDate";
import { useErrorHandle } from "@/src/components/ErrorHandle";
import Loader from "@/src/components/loading";
import LoadingModal from "@/src/components/LoadingModal";
import NoParcelModal from "@/src/components/NoParcelModal";
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
import * as ImageManipulator from "expo-image-manipulator";
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
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import DashedLine from "react-native-dashed-line";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import Modal from "react-native-modal";

export default function ScannerScreens({ navigation, route }: any) {
  const { fun = () => {}, type, item } = route?.params ?? {};
  const [permission, requestPermission] = useCameraPermissions();
  const [ItemsData, setItemsData] = useState(item);
  const [isNoParcelFlow, setIsNoParcelFlow] = useState(false);
  // const [NoParcelItemIds, setNoParcelItemIds] = useState<number[]>([]);
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
  const [SecondModal, setSecondModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    buttons: {
      text: string;
      type?: "primary" | "secondary";
      onPress?: () => void;
    }[];
  }>({
    visible: false,
    title: "",
    message: "",
    buttons: [],
  });

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [lastDetectedBarcode, setLastDetectedBarcode] = useState<string>("");
  const [flashEnabled, setFlashEnabled] = useState<boolean>(false);
  const [AllRecentScanData, setAllRecentScanData] = useState<number[]>([]);
  const [AllScanedData, setAllScanedData] = useState<object[]>([]);
  const [DataLoader, setDataLoader] = useState(false);
  const [Description, setDescrition] = useState<string>("");
  const [Commenterror, setCommentError] = useState<string>("");
  const [SelectPlace, setSelectPlace] = useState<object | any>(null);
  const [comment, setComment] = useState<boolean | any>(false);
  const [AllSelectImage, setAllSelectImage] = useState<any[]>([]);
  const [AllSlideData, setAllSlideData] = useState([]);
  const [UpdateStatusHandle, setUpdateStatusHandle] = useState<null | boolean>(
    null
  );
  const [NoParcelModalVisible, setNoParcelModalVisible] = useState(false);
  const [NoParcelOptions, setNoParcelOptions] = useState<any []>([]);
  const cameraRef = useRef(null);
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [ScannerModalOpen, setScannerModalOpen] = useState<{
    visible: boolean;
    InfoTitle?: string;
    type?: number;
    RText?: string;
    LText?: string;
    personData?: any;
    ProductItem?: any;
    OrderId?: number;
    delivery_btn?: any;
    onPress?: () => void;
  }>({
    visible: false,
    InfoTitle: "",
    type: 0,
    RText: "Take Photo",
    LText: "Cancel",
    personData: null,
    ProductItem: null,
    OrderId: 0,
    delivery_btn: null,
    onPress: undefined,
  });
  const [GetConformationQuestion, setGetConformationQuestion] =
    useState<string>("");
  const [facing, setFacing] = useState<CameraType>("back");
  const {
    UserData,
    setToast,
    SelectCurrentDate,
    setSelectCurrentDate,
    PickUpDataSave,
    setPickUpDataSave,
    DeliveyDataSave,
    setDeliveyDataSave,
    GloblyTypeSlide,
    NoParcelItemIds, // ✅ Same global state
    setNoParcelItemIds, // ✅ Same global setter
    SelectDeliveryReason,
    setSelectDeliveryReson,
    OrderDeliveryMapingLableOption,
    setOrderDeliveryMapingLableOption,
  } = useContext(GlobalContextData);
  const { t } = useTranslation();
  const { ErrorHandle } = useErrorHandle();
  const playBeep = useCallback(async () => {
    const { sound } = await Audio.Sound.createAsync(Images.ScannerSound);
    await sound.playAsync();
  }, []);
  const Focused = useIsFocused();

  useEffect(() => {
    const recheckPermission = async () => {
      try {
        const { status } = await Camera.requestCameraPermissionsAsync();
        setHasPermission(status === "granted");
      } catch (err) {
        console.error("Camera permission error:", err);
      }
    };

    // 🔁 When screen comes into focus (Focused true)
    if (Focused) {
      console.log("🔁 Scanner focused — refreshing camera");

      // Close modal if open
      if (ConformationModalOpen?.visible) {
        setConformationModal((prev: any) => ({
          ...prev,
          visible: false,
        }));
      }

      // Ensure permission
      if (!permission || permission?.granted === false) {
        requestPermission();
      } else {
        recheckPermission();
      }

      // 🔧 Optional small delay before setting hasPermission
      // to let camera session reinitialize smoothly
      setTimeout(() => {
        setHasPermission(true);
      }, 200);
    }
  }, [Focused]);

  useEffect(() => {
    console.log("enter in useeffect (Scanner)");

    // ✅ Always set pickup handler
    setPickUpDataSave({
      setData: (data: any[]) => {
        console.log("📸 Received pickup photo data:", data);
        if (data?.length > 0) {
          setAllSelectImage(data);
          setComment(true);
        }
      },
    });

    setDeliveyDataSave({
      setData: (data: any[]) => {
        console.log("📦 Received delivery photo data:", data);
        if (data?.length > 0) {
          setAllSelectImage(data);
          setComment(true);
        }
      },
    });

    return () => {
      setPickUpDataSave(null);
      setDeliveyDataSave(null);
    };
  }, [Focused]);

  const onBarcodeScanned = useCallback(
    async ({ data, type }: { data: string; type: string }) => {
      console.log("Scanned QR Raw Data:", data);

      try {
        if (!data || data === lastDetectedBarcode) return;

        setLastDetectedBarcode(data);

        let parsedData: any;
        try {
          parsedData = JSON.parse(data);
        } catch (err) {
          console.log("❌ Invalid QR JSON:", err);
          setToast({
            top: 45,
            text: t("Invalid QR code format"),
            type: "error",
            visible: true,
          });
          return;
        }

        console.log("✅ Parsed QR Data:", parsedData);

        if (!parsedData?.item_id || !parsedData?.order_id) {
          console.log("Missing IDs in QR:", parsedData);
          setToast({
            top: 45,
            text: t("Invalid QR: Missing item or order ID"),
            type: "error",
            visible: true,
          });
          return;
        }

        // Optional: give user feedback
        // Vibration.vibrate(500);
        // await playBeep();

        await QuestiongetApi(parsedData);
      } catch (error) {
        console.log("⚠️ QR Processing Error:", error);
        setConformationModal({
          visible: true,
          Icon: Images.InValidScanner,
          title: t("Invalid QR code. Please try again."),
          LButtonText: t("Cancel"),
          RColor: Colors.white,
        });
      }
    },
    [lastDetectedBarcode]
  );

  const QuestiongetApi = async (data: any) => {
    console.log("Calling Verify Status API with:", data);

    try {
      const payload = {
        token: token,
        role: UserData?.user?.role,
        relaties_id: UserData?.relaties?.id,
        user_id: UserData?.user?.id,
        item_id: data?.item_id,
        order_id: data?.order_id,
        date: GloblyTypeSlide == "outbound_scan" ?  ApiFormatDate(new Date()) : ApiFormatDate(SelectCurrentDate),
        type: type ?? GloblyTypeSlide
      };

      if (!payload.item_id || !payload.order_id) {
        console.log("Missing item/order_id in payload:", payload);
        setToast({
          top: 45,
          text: t("Invalid QR: Missing item or order ID"),
          type: "error",
          visible: true,
        });
        return;
      }

      let res = await ApiService(apiConstants.Verify_status, {
        customData: payload,
      });

      console.log("✅ Verify API Response:", res);

      if (Boolean(res?.status)) {
        setOrderDeliveryMapingLableOption(res?.data?.order_label_mapping || []);
        setItemsData(res?.data?.order_data);
        const modalConfig: any = {
          visible: true,
          title: res?.data?.quetion,
          Icon: Images.OrderIconFull,
          // LButtonText: t("Cancel"),
          LButtonText:
            res?.data?.delivery_btn == 1 ? t("No delivery") : t("Cancel"),
          RButtonText: res?.data?.btn_lable,
          RButtonStyle: Colors.primary,
          RColor: Colors.white,
          personData: res?.data?.order_data || [],
          ProductItem: res?.data?.order_data?.items || [],
          order_id: data?.order_id,
          type: res?.data?.order_data?.tmsstatus?.id == 2 ? 2 : 1,
          delivery_btn: res?.data?.delivery_btn,
        };
        console.log("responseeeee", res.data);

        // Save current selection
        setSelectPlace({
          item_id: data?.item_id,
          order_id: data?.order_id,
        });

        if (res?.data?.isscaned) {
          if (res?.data?.order_data?.tmsstatus?.id == 4) {
            modalConfig.onPress = () =>
              navigation.navigate("Delivery", { item: res?.data, fun });
          } else {
            modalConfig.onPress = async () => {
              await StatusUpdateFun(data, true);
            };
          }
        }

        setGetConformationQuestion(res?.data || "");
        setConformationModal(modalConfig);
      } else {
        setToast({
          top: 45,
          text: res?.message || t("Something went wrong"),
          type: "error",
          visible: true,
        });
      }
    } catch (error) {
      console.log("❌ Error in QuestiongetApi:", error);
      setToast({
        top: 45,
        text: ErrorHandle(error).message,
        type: "error",
        visible: true,
      });
    }
  };

  const StatusUpdateFun = async (data: any, scan = false) => {
    if (!scan) return;
    setIsLoading(true);

    try {
      const payload = {
        token: token,
        role: UserData?.user?.role,
        relaties_id: UserData?.relaties?.id,
        user_id: UserData?.user?.id,
        item_id: data?.item_id,
        order_id: data?.order_id,
        type:type ?? GloblyTypeSlide
      };

      if (!payload.item_id || !payload.order_id) {
        console.log("❌ Missing item/order_id for update:", payload);
        setToast({
          top: 45,
          text: t("Missing order details. Please rescan."),
          type: "error",
          visible: true,
        });
        return;
      }

      console.log("➡️ Calling Status Update API with:", payload);
      const res = await ApiService(apiConstants.status_update, {
        customData: payload,
      });

      if (res?.status) {
        console.log("✅ Status Updated:", res);
        fun?.();

        setAllRecentScanData((prev) =>
          prev.includes(data?.order_id) ? prev : [...prev, data?.order_id]
        );

        setConformationModal((prev: any) => ({ ...prev, visible: false }));
        await GetScanedOrderDataLatestFun([
          ...AllRecentScanData,
          data?.order_id,
        ]);
      } else {
        setToast({
          top: 45,
          text: res?.message || t("Failed to update status"),
          type: "error",
          visible: true,
        });
      }
    } catch (error) {
      console.log("❌ Status Update Error:", error);
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
    formData.append("relaties_id", UserData?.relaties?.id);

    data.forEach((id: any) => {
      console.log("id", id);

      formData.append("order_ids[]", id);
    });

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
        return 0;
      } else {
        setToast({
          top: 45,
          text: res?.message,
          type: "error",
          visible: true,
        });
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

  const getSliderDataFun = async () => {
    setIsLoading(true);

    try {
      let res = await ApiService(apiConstants.get_AllSlideDataApi, {
        customData: {
          token: token,
          role: UserData?.user?.role,
          relaties_id: UserData?.relaties?.id,
          user_id: UserData?.user?.id,
        },
      });
      console.log(
        "customData",
        token,
        UserData?.user?.role,
        UserData?.relaties?.id,
        UserData?.user?.id
      );

      if (Boolean(res.status)) {
        const data = res?.data || [];
        console.log("datadatadata", data);

        setAllSlideData(data);
        navigation.navigate("FilterScreen", { Type: type });
      } else {
        setToast({
          top: 45,
          text: res?.message,
          type: "error",
          visible: true,
        });
      }
    } catch (error: any) {
      console.error("Get All Slide Data Error:-", error?.response.data);
      setToast({
        top: 45,
        text: ErrorHandle(error)?.message,
        type: "error",
        visible: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const AddImageOrCommentFun = async (
    comment: string = "",
    data: any[] = []
  ) => {
    let id = ItemsData?.id || ItemsData?.order_data?.id;
    setIsLoading(true);
    try {
      let formData: any = new FormData();

      formData.append("token", token);
      formData.append("role", UserData?.user?.role);
      formData.append("relaties_id", UserData?.relaties?.id);
      formData.append("user_id", UserData?.user?.id);
      formData.append("order_comment", Description?.trim());
      formData.append("order_id", id ? id : SelectPlace?.id);

      const imagesToSend = data?.length > 0 ? data : AllSelectImage;

      console.log("REquestDataFromImgeAndComment", formData);

      if (imagesToSend?.length === 0) {
        setToast({
          top: 45,
          text: t("Please image upload!"),
          type: "error",
          visible: true,
        });
        return;
      }

      for (const uri of imagesToSend) {
        const compressed = await ImageManipulator.manipulateAsync(
          uri,
          [{ resize: { width: 800 } }],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
        );

        const finalUri = compressed.uri.startsWith("file://")
          ? compressed.uri
          : "file://" + compressed.uri;

        formData.append("doc[]", {
          uri: finalUri,
          name: `image_${Date.now()}.jpeg`,
          type: "image/jpeg",
        });
      }

      const res: any = await axios.post(
        apiConstants.store_image_comment,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          transformRequest: (data) => data,
        }
      );

      if (Boolean(res?.data.status)) {
        // Alert.alert("success");
        setAllSelectImage([]);
        setPickUpDataSave([]);
        setDeliveyDataSave([]);
        setDescrition("");
        setToast({
          top: 45,
          text: res?.data?.message,
          type: "success",
          visible: true,
        });
        await GetIdByOrderFun();
      } else {
        setToast({
          top: 45,
          text: res?.data?.message,
          type: "error",
          visible: true,
        });
      }
    } catch (error) {
      console.log("AddImageOrCommentFun Error:-", error);
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

  const CommentFun = async () => {
    try {
      if (!Description.trim()) {
        setCommentError(t("Please enter a comment"));
        return;
      }

      // console.log("data",AllSelectImage,Description);
      // return

      if (!SelectPlace?.item_id || !SelectPlace?.order_id) {
        setToast({
          top: 45,
          text: t("Invalid or missing order details. Please rescan."),
          type: "error",
          visible: true,
        });
        return;
      }

      if (isNoParcelFlow) {
        console.log("🟢 No Parcel flow detected → Calling BackOrderFun()");
        await BackOrderFun(ConformationModalOpen?.ProductItem || []);
        setIsNoParcelFlow(false);
        setComment(false);
        return;
      }

      setIsLoading(true);

      const payload = {
        token: token,
        role: UserData?.user?.role,
        relaties_id: UserData?.relaties?.id,
        user_id: UserData?.user?.id,
        item_id: SelectPlace?.item_id,
        order_id: SelectPlace?.order_id,
        ...(SelectDeliveryReason !== null && {
          delivered_lable_id: SelectDeliveryReason?.id,
        }),
      };

      const res = await ApiService(apiConstants.status_update, {
        customData: payload,
      });

      if (res?.status) {
        await AddImageOrCommentFun();
        if (SelectDeliveryReason !== null) {
          setSelectDeliveryReson(null);
        }
        console.log("✅ Comment & Status updated successfully:", res);

        fun?.();
        setComment(false);

        // ✅ Calculate actual remaining items (excluding No Parcel items)
        const actualRemaining =
          Number(res?.remaining_item) - NoParcelItemIds.length;

        console.log("📊 Total remaining from API:", res?.remaining_item);
        console.log("📦 No Parcel items count:", NoParcelItemIds.length);
        console.log("✅ Actual remaining:", actualRemaining);

        if (Number(res?.remaining_item) === 0) {
          // All items done (scanned + no parcel)
          setSecondModal({
            visible: true,
            title: "All Parcels Scanned Successfully!",
            message: res?.remaining_item_message || "",
            buttons: [
              {
                text: "Go to List Page",
                type: "primary",
                onPress: () => {
                  setSecondModal((p: any) => ({ ...p, visible: false }));
                  setNoParcelItemIds([]); // ✅ Reset
                  getSliderDataFun();
                },
              },
            ],
          });
        } else {
          // Still items to scan
          setSecondModal({
            visible: true,
            title: "There are Parcels Remaining",
            message: res?.remaining_item_message,
            buttons: [
              {
                text: "No Parcel",
                type: "secondary",
                onPress: async () => {
                  setSecondModal((p: any) => ({ ...p, visible: false }));

                  console.log(
                    "ItemsData?.id || item",
                    ItemsData?.id || ItemsData?.order_data?.id,
                    ItemsData,
                    item
                  );

                  navigation.navigate("Details", {
                    type: "scanner_noparcel",
                    item: ItemsData,
                    // order_id: item?.id || item?.order_data?.id,
                  });

                  // setTimeout(async () => {
                  //   const missingItems = await GetIdByOrderFun(SelectPlace?.order_id);

                  //   // ✅ Filter out already marked No Parcel items
                  //   const filteredItems = missingItems.filter(
                  //     (item: any) => !NoParcelItemIds.includes(item.id)
                  //   );

                  //   if (filteredItems.length > 0) {
                  //     setNoParcelOptions(filteredItems);
                  //     setNoParcelModalVisible(true);
                  //   } else {
                  //     setToast({
                  //       top: 45,
                  //       text: t("All items are scanned!"),
                  //       type: "info",
                  //       visible: true,
                  //     });
                  //   }
                  // }, 1000);
                },
              },
              {
                text: "Open Scanner",
                type: "primary",
                onPress: () => {
                  setSecondModal((p: any) => ({ ...p, visible: false }));
                  setLastDetectedBarcode("");
                  setSelectPlace(null);
                  setDescrition("");
                  setCommentError("");

                  setTimeout(async () => {
                    try {
                      const { status } =
                        await Camera.requestCameraPermissionsAsync();
                      if (status === "granted") {
                        setHasPermission(true);
                      } else {
                        await requestPermission();
                      }
                    } catch (error) {
                      console.log("❌ Error reopening scanner:", error);
                    }
                  }, 400);
                },
              },
            ],
          });
        }

        setAllRecentScanData((prev) =>
          prev.includes(SelectPlace?.order_id)
            ? prev
            : [...prev, SelectPlace?.order_id]
        );

        await GetScanedOrderDataLatestFun([
          ...AllRecentScanData,
          SelectPlace?.order_id,
        ]);
      }
    } catch (error) {
      console.log("❌ CommentFun error:", error);
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

  const GetIdByOrderFun = async (order_id?: string) => {
    const id = order_id || ItemsData?.id || ItemsData?.order_data?.id;

    if (!id) {
      console.log("No order_id available for API call");
      return [];
    }

    try {
      const res = await ApiService(apiConstants.get_order_data_by_id, {
        customData: {
          token: token,
          role: UserData?.user?.role,
          relaties_id: UserData?.relaties?.id,
          user_id: UserData?.user?.id,
          order_id: id,
          type: type,
        },
      });

      if (res?.status) {
        setItemsData(res?.data);
        console.log("response-=-=-", res?.data);

        // const labelsForModal = res.data.items
        //   .filter((item: any) => Number(item.scan_qty) === 0)
        //   .map((item: any) => ({
        //     id: item.id,
        //     label: item.tms_product_name || `Item ${item.id}`,
        //   }));

        // setNoParcelOptions(labelsForModal);
        const labelsForModal = res.data.items
          .filter(
            (item: any) =>
              Number(item.scan_qty) === 0 && item?.item_label == null
          )
          .map((item: any) => ({
            id: item.id,
            label: item.tms_product_name || `Item ${item.id}`,
          }));
          console.log("labelsForModal",labelsForModal);
          
        setNoParcelOptions(labelsForModal);

        return labelsForModal;
      } else {
        console.log("❌ API error:", res?.message);
        return [];
      }
    } catch (error) {
      console.log("❌ GetIdByOrderFun Error:", error);
      return [];
    }
  };

  const BackOrderFun = async (selectedItems: any[] = []) => {
    if (!selectedItems || selectedItems.length === 0) {
      setToast({
        top: 45,
        text: "Please select at least 1 item!",
        type: "error",
        visible: true,
      });
      return;
    }

    // ✅ Use SelectPlace.order_id instead of ItemsData
    if (!SelectPlace?.order_id) {
      setToast({
        top: 45,
        text: "Order ID missing. Please rescan.",
        type: "error",
        visible: true,
      });
      return;
    }

    try {
      let formData: any = new FormData();

      formData.append("token", token);
      formData.append("role", UserData?.user?.role);
      formData.append("relaties_id", UserData?.relaties?.id);
      formData.append("user_id", UserData?.user?.id);

      // ✅ Use SelectPlace.order_id (from scanned QR)
      formData.append("order_id", SelectPlace.order_id);
      formData.append("item_lable", "Backorder");

      selectedItems?.forEach((item) => {
        formData.append("item_id[]", item.id);
      });

      let res: any = await axios.post(apiConstants.missed_backorder, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      console.log("✅ Backorder response:", res.data);

      if (res?.data?.status) {
        // ✅ Add selected items to NoParcelItemIds
        if (AllSelectImage?.length > 0) {
          await AddImageOrCommentFun();
        }
        setNoParcelItemIds((prev: any) => [
          ...prev,
          ...selectedItems.map((item) => item.id),
        ]);

        console.log("res?.remaining_item", res?.data.remaining_item);

        if (Number(res?.data.remaining_item) == 0) {
          setSecondModal({
            visible: true,
            title: "All Parcels Scanned Successfully!",
            message: res?.data.remaining_item_message || "",
            buttons: [
              {
                text: "Go to List Page",
                type: "primary",
                onPress: () => {
                  setSecondModal((p: any) => ({ ...p, visible: false }));
                  setNoParcelItemIds([]); // Reset
                  getSliderDataFun();
                },
              },
            ],
          });
        } else {
          // ✅ Calculate actual remaining (excluding newly marked items)
          const actualRemaining =
            Number(res?.data.remaining_item) - selectedItems.length;

          setSecondModal({
            visible: true,
            title: "There are Parcels Remaining",
            message: `${actualRemaining} parcel(s) remaining to scan.`,
            buttons: [
              {
                text: "No Parcel",
                type: "secondary",
                onPress: async () => {
                  setSecondModal((p: any) => ({ ...p, visible: false }));

                  setTimeout(async () => {
                    const missingItems = await GetIdByOrderFun(
                      SelectPlace?.order_id
                    );

                    // ✅ Filter out already marked items
                    const filteredItems = missingItems.filter(
                      (item: any) => !NoParcelItemIds.includes(item.id)
                    );

                    if (filteredItems.length > 0) {
                      setNoParcelOptions(filteredItems);
                      setNoParcelModalVisible(true);
                    } else {
                      setToast({
                        top: 45,
                        text: t("All items are scanned!"),
                        type: "info",
                        visible: true,
                      });
                    }
                  }, 1000);
                },
              },
              {
                text: "Open Scanner",
                type: "primary",
                onPress: () => {
                  setSecondModal((p: any) => ({ ...p, visible: false }));
                  setLastDetectedBarcode("");
                  setSelectPlace(null);
                  setDescrition("");
                  setCommentError("");

                  setTimeout(async () => {
                    try {
                      const { status } =
                        await Camera.requestCameraPermissionsAsync();
                      if (status === "granted") {
                        setHasPermission(true);
                      }
                    } catch (error) {
                      console.log("❌ Error reopening scanner:", error);
                    }
                  }, 400);
                },
              },
            ],
          });
        }

        await GetIdByOrderFun(SelectPlace.order_id);

        setToast({
          top: 45,
          text: res?.data?.message,
          type: "success",
          visible: true,
        });
      } else {
        setToast({
          top: 45,
          text: res?.data?.message,
          type: "error",
          visible: true,
        });
      }
    } catch (error) {
      console.log("BackOrderFun Error:", error);

      // ✅ Better error logging
      if (axios.isAxiosError(error)) {
        console.log("📛 API Error Details:", {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message,
        });
      }

      setToast({
        top: 45,
        text: ErrorHandle(error).message,
        type: "error",
        visible: true,
      });
    }
  };

  useEffect(() => {
    // Reset local data, re-run API calls etc.
    console.log("🔁 Refresh triggered!");
    setLastDetectedBarcode("");
  }, [route.params?.refreshTime]);

  return (
    <GestureHandlerRootView style={styles.container}>
      {/* <CameraView
        ref={cameraRef}
        enableTorch={flashEnabled}
        style={StyleSheet.absoluteFill}
        onBarcodeScanned={onBarcodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ["qr"],
        }}
      /> */}
      {hasPermission && !SecondModal.visible && !comment ? (
        <CameraView
          ref={cameraRef}
          enableTorch={flashEnabled}
          style={StyleSheet.absoluteFill}
          onBarcodeScanned={onBarcodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ["qr"],
          }}
        />
      ) : (
        <View style={StyleSheet.absoluteFill} />
      )}
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
        onPress={() => {
          if (ConformationModalOpen.RButtonText === "Take Photo") {
            navigation.navigate("Camera", {
              from: "Pickup",
            });
          } else {
            ConformationModalOpen.onPress?.();
          }
        }}
        ProductItem={ConformationModalOpen?.ProductItem}
        OrderId={ConformationModalOpen.order_id}
        onClose={() =>
          setConformationModal((prev: any[]) => ({
            ...prev,
            visible: false,
          }))
        }
        delivery_btn={ConformationModalOpen?.delivery_btn}
      />
      <ScannerInfoModal
        InfoTitle={ScannerModalOpen.InfoTitle}
        type={ScannerModalOpen.type}
        visible={ScannerModalOpen.visible}
        personData={ScannerModalOpen.personData}
        RText={ScannerModalOpen.RText}
        LText={ScannerModalOpen.LText}
        onPress={ScannerModalOpen.onPress}
        ProductItem={ScannerModalOpen.ProductItem}
        OrderId={ScannerModalOpen.OrderId}
        onClose={() =>
          setScannerModalOpen((prev) => ({ ...prev, visible: false }))
        }
        delivery_btn={ScannerModalOpen.delivery_btn}
      />

      <LoadingModal visible={IsLoading} message={t("Please wait…")} />
      <BottomSheet snapPoints={["15%", "90%"]} ref={bottomSheetRef}>
        <BottomSheetView style={styles.contentContainer}>
          <BottomSheetFlatList
            style={{ width: width }}
            data={AllScanedData}
            nestedScrollEnabled={true}
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
            keyExtractor={(item: any, index: number) => `${index}`}
            renderItem={({ item, index }: { item: any; index: number }) => (
              <PickUpBox
                index={index}
                AllisCollapsed={true}
                downButton={true}
                LableStatus={item?.tmsstatus?.status_name}
                OrderId={item?.id}
                ProductItem={item?.items}
                LableBackground={item?.tmsstatus?.color}
                start={item?.pickup_location}
                end={item?.deliver_location}
                customerData={item?.customer}
                statusData={item?.tmsstatus}
                LacationProgress={false}
              />
            )}
            contentContainerStyle={[
              styles.contentContainer,
              { paddingBottom: 50 },
            ]}
          />
        </BottomSheetView>
      </BottomSheet>
      <NoParcelModal
        visible={NoParcelModalVisible}
        title={t("Select Missing Items")}
        options={NoParcelOptions}
        personData={ItemsData?.customer}
        OrderId={ItemsData?.id}
        type={1}
        onClose={() => setNoParcelModalVisible(false)}
        onSubmit={(selectedIds) => {
          console.log(
            "🧩 Selected IDs received from NoParcelModal:",
            selectedIds
          );
          if (!selectedIds || selectedIds.length === 0) {
            setToast({
              top: 45,
              text: t("Please select at least 1 item!"),
              type: "error",
              visible: true,
            });
            return;
          }

          // ✅ Store the No Parcel item IDs
          setNoParcelItemIds(selectedIds);

          const selectedItems = selectedIds
            .map((id) => ItemsData?.items.find((i: any) => i.id === id))
            .filter(Boolean);

          setIsNoParcelFlow(true);
          setNoParcelModalVisible(false);

          setScannerModalOpen({
            visible: true,
            InfoTitle: t("Scanner Info"),
            type: 1,
            RText: t("Take Photo"),
            LText: t("Cancel"),
            personData: ItemsData?.customer.display_name,
            ProductItem: selectedItems,
            OrderId: ItemsData?.id,
            onPress: () => {
              setScannerModalOpen((prev) => ({ ...prev, visible: false }));
              navigation.navigate("Camera", { from: "Pickup" });
            },
          });
        }}
      />
      <Modal
        isVisible={comment}
        style={{ margin: 0, flex: 1 }}
        animationIn={"bounceInUp"}
        animationOut={"bounceOutDown"}
      >
        <KeyboardAwareScrollView
          style={{ flexGrow: 1 }}
          // extraHeight={100}
          contentContainerStyle={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
          }}
          enableOnAndroid={true}
          // extraScrollHeight={50}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.CommentBox}>
            <DashedLine
              dashLength={4}
              dashThickness={2}
              dashGap={5}
              style={styles.Line}
              dashColor={Colors.otherBorder}
            />

            <View>
              <Text style={styles.Text}>{t("Name")}</Text>
              <View style={styles.InputBox}>
                <TextInput
                  style={styles.Input}
                  editable={false}
                  placeholderTextColor={Colors.darkText}
                  placeholder={t("Enter your name")}
                  returnKeyType="next"
                  textContentType="familyName"
                  value={UserData?.user?.username || ""}
                  onChangeText={setComment}
                />
                <Image source={Images.user} style={{ width: 18, height: 18 }} />
              </View>
            </View>

            <View>
              <Text style={styles.Text}>{t("Description")}</Text>
              <TextInput
                style={styles.TextArea}
                value={Description}
                onChangeText={setDescrition}
                placeholder={t("Type here...")}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
              />
              {Commenterror && <Text style={styles.Error}>{Commenterror}</Text>}
            </View>

            <TouchableOpacity style={styles.ButtonSubmit} onPress={CommentFun}>
              <Text style={[styles.Text, { color: Colors.white }]}>
                {t("Submit")}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAwareScrollView>
      </Modal>

      {SecondModal?.visible && (
        <>
          <Modal
            isVisible={SecondModal.visible}
            style={{ margin: 0, flex: 1 }}
            animationIn={"bounceInUp"}
            animationOut={"bounceOutDown"}
          >
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
                backgroundColor: "rgba(0,0,0,0.6)",
              }}
            >
              <View
                style={{
                  backgroundColor: Colors.white,
                  borderRadius: 14,
                  width: "80%",
                  paddingVertical: 25,
                  paddingHorizontal: 20,
                  alignItems: "center",
                }}
              >
                {SecondModal?.title ? (
                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: "600",
                      textAlign: "center",
                      color: "#000",
                      marginBottom: 10,
                    }}
                  >
                    {SecondModal?.title}
                  </Text>
                ) : null}

                {SecondModal?.message ? (
                  <Text
                    style={{
                      fontSize: 14,
                      color: Colors.gray,
                      textAlign: "center",
                      marginBottom: 20,
                    }}
                  >
                    {SecondModal?.message}
                  </Text>
                ) : null}

                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "center",
                    width: "100%",
                  }}
                >
                  {SecondModal?.buttons?.map((btn: any, index: number) => (
                    <TouchableOpacity
                      key={index}
                      style={{
                        backgroundColor:
                          btn.type === "primary" ? Colors.primary : "#E0E0E0",
                        paddingVertical: 10,
                        paddingHorizontal: 20,
                        borderRadius: 8,
                        marginHorizontal: 5,
                        flex: 1,
                        alignItems: "center",
                      }}
                      onPress={btn.onPress}
                    >
                      <Text
                        style={{
                          color:
                            btn.type === "primary"
                              ? Colors.white
                              : Colors.black,
                          fontFamily: "Medium",
                        }}
                      >
                        {btn.text}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          </Modal>
        </>
      )}
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
    // flex: 1,
    width: "100%",
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
  CommentContainer: {
    padding: 15,
    borderRadius: 4,
    backgroundColor: Colors.white,
  },
  TextArea: {
    borderRadius: 10,
    padding: 10,
    fontSize: 14,
    backgroundColor: Colors.white,
    minHeight: 120,
    fontFamily: "regular",
    color: Colors.black,
    marginTop: 10,
  },
  ButtonSubmit: {
    width: "100%",
    height: 50,
    backgroundColor: Colors.primary,
    borderRadius: 7,
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 15,
  },
  Error: {
    fontSize: 13,
    color: Colors.red,
    fontFamily: "regular",
    marginTop: 10,
    marginLeft: 5,
  },
  Line: {
    marginVertical: 10,
  },
  Input: {
    width: "80%",
    fontSize: 14,
    fontFamily: "Medium",
    color: Colors.black,
  },
  InputBox: {
    width: "100%",
    backgroundColor: Colors.white,
    paddingHorizontal: 15,
    paddingVertical: Platform.OS == "android" ? 5 : 10,
    borderRadius: 7,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 10,
  },
  CommentBox: {
    width: "90%",
    padding: 15,
    marginHorizontal: "auto",
    // height:'80%',
    backgroundColor: Colors.background,
    borderTopRightRadius: 10,
    borderTopLeftRadius: 10,
    paddingBottom: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    width: "80%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 8,
  },
  modalMsg: {
    fontSize: 14,
    textAlign: "center",
    color: "#555",
    marginBottom: 16,
  },
  btnRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  modalBtn: {
    flex: 1,
    marginHorizontal: 5,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  primaryBtn: {
    backgroundColor: "#007bff",
  },
  secondaryBtn: {
    backgroundColor: "#eee",
  },
  btnText: {
    fontSize: 15,
    fontWeight: "500",
  },
  primaryText: {
    color: "#fff",
  },
  secondaryText: {
    color: "#333",
  },
});
