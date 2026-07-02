import apiConstants from "@/src/api/apiConstants";
import { Images } from "@/src/assets/images";
import AddCommentModal from "@/src/components/AddCommentModal";
import { ApiFormatDate } from "@/src/components/ApiFormatDate";
import CommentViewBox from "@/src/components/CommentViewBox";
import ConformationModal from "@/src/components/ConformationModal";
import DetailsHeader from "@/src/components/DetailsHeader";
import { useErrorHandle } from "@/src/components/ErrorHandle";
import { goBackOrPopTo } from "@/src/components/goBackOrPopTo";
import Loader from "@/src/components/loading";
import LoadingModal from "@/src/components/LoadingModal";
import MapsViewBox from "@/src/components/MapsViewBox";
import NoParcelModal from "@/src/components/NoParcelModal";
import PickUpBox from "@/src/components/PickUpBox";
import ParcelVerifyOverlays from "@/src/components/ParcelVerifyOverlays";
import ScannerInfoModal from "@/src/components/ScannerInfoModal";
import SecondCustomModal from "@/src/components/SecondCustomModal";
import SignatureModal from "@/src/components/SignatureModal";
import TwoTypeButton from "@/src/components/TwoTypeButton";
import { GlobalContextData } from "@/src/context/GlobalContext";
import { useParcelVerifyFlow } from "@/src/hooks/useParcelVerifyFlow";
import { DropboxContext } from "@/src/context/UploadProider";
import ApiService from "@/src/utils/Apiservice";
import { Colors } from "@/src/utils/colors";
import { appendToLocalUploadQueue } from "@/src/utils/localUploadQueue";
import { isDeliveryOrder, isPickupOrder } from "@/src/utils/orderStatus";
import { isBlankSignatureData } from "@/src/utils/signatureValidation";
import { FONTS } from "@/src/utils/storeData";
import { useIsFocused } from "@react-navigation/native";
import axios from "axios";
import * as ImagePicker from "expo-image-picker";
import * as IntentLauncher from "expo-intent-launcher";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  FlatList,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { styles } from "./styles";
export default function DetailsScreens({ navigation, route }: any) {
  const { item, order_id, type } = route?.params || {};
  const { ErrorHandle } = useErrorHandle();
  const {
    UserData,
    setUserData,
    Toast,
    setToast,
    setPickUpDataSave,
    setDeliveyDataSave,
    GloblyTypeSlide,
    NoParcelItemIds,
    setNoParcelItemIds,
    SelectActiveDate,
    SelectCurrentDate,
    SelectActiveRegionData,
    NoParcelDetailsScreenEvent, setNoParcelDetailsScreenEvent,
    AllDeliveyLabel, setAllDeliveyLabel,
    SelectCurrentDeliveryLabel, setSelectCurrentDeliveryLabel,
    selectRegionData, setSelectRegionData

  } = useContext(GlobalContextData);
  const { setAccessToken,
    AccessToken,
    RefreshToken,
    ClientId,
    ClientSecret,
    LocalImagesUploadbeforeData, setLocalImagesUploadbeforeData,
    DropBoxUploadImageDataQues, setDropBoxUploadImageDataQues
  } = useContext(DropboxContext);
  const [ItemsData, setItemsData] = useState(item);
  const Focused = useIsFocused();
  const [comment, setComment] = useState<boolean | any>(false);
  const [PermissionData, setPermissionData] = useState<any>(null);
  const [AllSelectImage, setAllSelectImage] = useState<any[]>([]);
  const [LableLoading, setLableLoading] = useState<boolean>(false);
  const [IsLoading, setIsLoading] = useState<boolean>(false);
  const [BackButtonAvailble, setBackButtonAvailble] = useState(false);
  const { t } = useTranslation();

  const [NoParcelOpenmodalType, setNoParcelOpenmodalType] = useState(type);
  const [DataLoading, setDataLoading] = useState<boolean>(false);
  const [NoParcelModalVisible, setNoParcelModalVisible] = useState(false);
  const [NoParcelOptions, setNoParcelOptions] = useState<any[]>([]);
  const [AllSlideData, setAllSlideData] = useState([]);
  const [SelectedNoParcelItems, setSelectedNoParcelItems] = useState<any[]>([]);
  const [showSig, setShowSig] = useState<boolean>(false);
  const [SignatureLoader, setSignatureLoader] = useState<boolean>(false);
  const [LocationDataMessage, setLocationDataMessage] = useState<string | null>(null);


  const [AllDestinationRegionData, setAllDestinationRegionData] = useState<
    any[]
  >([]);
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
  const [AlertModalOpen, setAlerModalOpen] = useState<any>({
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
  const [DropBoxUploadImageData, setDropBoxUploadImageData] = useState<any[]>([]);

  const [SecondModal, setSecondModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    buttons: {
      text: string;
      type?: "primary" | "secondary";
      onPress?: () => void;
    }[];
    color: string;
  }>({
    visible: false,
    title: "",
    message: "",
    buttons: [],
    color: "",
  });

  const GetLocationData = async (showBlockingLoader = false) => {
    if (SelectActiveRegionData == null) {
      setToast({
        top: 45,
        text: t("No Region Found"),
        type: "error",
        visible: true,
      });
      return;
    }

    if (showBlockingLoader) {
      setIsLoading(true);
    }

    try {
      let res = await ApiService(apiConstants.get_location_by_region_date, {
        customData: {
          token: UserData?.user?.verify_token,
          role: UserData?.user?.role,
          relaties_id: UserData?.relaties?.id,
          user_id: UserData?.user?.id,
          region_id: SelectActiveRegionData?.id,
          date: ApiFormatDate(SelectActiveDate),
        },
      });
      if (res?.status) {
        const baseLocation = res?.base_location ?? {};
        const orders = Array.isArray(res?.orders) ? res.orders : [];

        setAllDestinationRegionData([
          { ...baseLocation },
          ...orders,
          { ...baseLocation },
        ]);
      } else {
        setLocationDataMessage(res?.message || null);
      }
    } catch (error: any) {
      const msg =
        error?.response?.data?.message ||
        error?.message ||
        "Something went wrong";

      setToast({
        top: 45,
        text: t(msg) ?? ErrorHandle(error)?.message ?? t("Something went wrong"),
        type: "error",
        visible: true,
      });
    } finally {
      if (showBlockingLoader) {
        setIsLoading(false);
      }
    }
  };
  useEffect(() => {
    if (!Focused) return;

    const refreshScreen = async () => {
      await GetIdByOrderFun();
      if (NoParcelDetailsScreenEvent) {
        setNoParcelModalVisible(true);
      }
    };

    refreshScreen();

    if (SelectActiveDate && SelectActiveRegionData) {
      const showLocationLoader = AllDestinationRegionData.length === 0;
      GetLocationData(showLocationLoader);
    }
  }, [Focused, SelectActiveDate, SelectActiveRegionData, type]);

  const openNoParcelPickupCamera = useCallback(() => {
    setPickUpDataSave({
      setData: async (data: any[]) => {
        if (data?.length > 0) {
          setAllSelectImage(data);
          setComment(true);
        }
      },
    });
    navigation.navigate('Camera', { from: 'Pickup' });
  }, [navigation, setPickUpDataSave]);

  const openCamera = async () => {
    try {
      const { granted } = await ImagePicker.requestCameraPermissionsAsync();
      if (!granted) {
        Alert.alert(t("Permission required"), t("Please allow camera access"));
        return;
      }

      if (Platform.OS === "android") {
        await IntentLauncher.startActivityAsync(
          "android.media.action.STILL_IMAGE_CAMERA"
        );
      } else {
        const result = await ImagePicker.launchCameraAsync({
          allowsEditing: false,
          quality: 1,
        });

        if (!result.canceled && result.assets?.length) {
          const imagesToSend = result.assets.map((asset) => ({
            uri: asset.uri,
            name: asset.fileName || `image_${Date.now()}.jpg`,
            type: asset.type || "image/jpeg",
          }));
          setAllSelectImage((prev) => [...prev, ...imagesToSend]);
        }
      }
    } catch (err) {
    }
  };
  const openScannerModal = () => {
    setScannerModalOpen({
      visible: true,
      InfoTitle: t("Scanner Info"),
      type: 0,
      RText: t("Take Photo"),
      LText: t("Cancel"),
      personData: ItemsData?.customer,
      ProductItem: ItemsData?.items,
      OrderId: ItemsData?.id,
      onPress: () => {
        setScannerModalOpen((prev) => ({ ...prev, visible: false }));
        openNoParcelPickupCamera();
      },
    });
  };

  const openGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      alert("Permission required to access gallery");
      setToast({
        top: 45,
        text: t("Permission required to access gallery"),
        type: "error",
        visible: true,
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsMultipleSelection: true,
      quality: 1,
    });

    if (!result.canceled) {
      const imagesToSend = result.assets.map((asset, index) => ({
        uri: asset.uri,
        name: asset.fileName || `image_${index}.jpg`,
        type: asset.type === "image" ? "image/jpeg" : asset.type,
      }));

      setAllSelectImage((prev: any) => [...prev, ...imagesToSend]);
    }
  };

  const CloseDocument = (index: number) => {
    setAlerModalOpen({
      visible: true,
      title: t("Delete Image"),
      Desctiption: t("Are you sure you want to delete the image?"),
      LButtonText: t("Cancel"),
      RButtonText: t("Delete"),
      Icon: Images.DeleteBtn,
      RButtonStyle: Colors.red,
      RColor: Colors.white,
      onPress: () => {
        setAllSelectImage((prev) => {
          const updatedImages: any = prev.filter((_, i) => i !== index);
          return updatedImages;
        });
      },
    });
  };

  const GetIdByOrderFun = async () => {
    const hasPreviewData = Boolean(
      item?.id || ItemsData?.id || ItemsData?.order_data?.id,
    );

    if (!hasPreviewData) {
      setDataLoading(true);
    }

    try {
      let res = await ApiService(apiConstants.get_order_data_by_id, {
        customData: {
          token: UserData?.user?.verify_token,
          role: UserData?.user?.role,
          relaties_id: UserData?.relaties?.id,
          user_id: UserData?.user?.id,
          order_id: ItemsData?.id || ItemsData?.order_data?.id,
          type: type,
          region_id: selectRegionData?.id,
          date: ApiFormatDate(SelectActiveDate),
        },
      });

      if (res?.status) {
        setItemsData(res?.data);
        setPermissionData(res?.permissions_data);

        const labelsForModal = res.data.items
          .filter(
            (item: any) =>
              Number(item.scan_qty) === 0 && item?.tmslabel == null
          )
          .map((item: any) => ({
            id: item.id,
            label: item.tms_product_name || `Item ${item.id}`,
          }));

        setNoParcelOptions(labelsForModal);

      } else {
        setToast({
          top: 45,
          text: t(res?.message),
          type: "error",
          visible: true,
        });
      }
    } catch (error) {
      setToast({
        top: 45,
        text: ErrorHandle(error).message,
        type: "error",
        visible: true,
      });
    } finally {
      setDataLoading(false);
    }
  };

  const parcelVerifyFlow = useParcelVerifyFlow({
    slideType: type ?? GloblyTypeSlide,
    selectCurrentDate: SelectActiveDate || SelectCurrentDate,
    source: 'filter',
    isScanRoute: false,
    isManualDirectVerify: true,
    onSuccess: GetIdByOrderFun,
    onGoToListPage: GetIdByOrderFun,
  });

  const handleParcelManualVerify = useCallback(
    ({ order_id, item_id }: { order_id: number | string; item_id: number | string }) => {
      parcelVerifyFlow.startVerify({ order_id, item_id });
    },
    [parcelVerifyFlow],
  );

  const AddImageOrCommentFun = async (comment: string = "", data = []) => {
    setIsLoading(true);
    try {
      let formData: any = new FormData();

      formData.append("token", UserData?.user?.verify_token);
      formData.append("role", UserData?.user?.role);
      formData.append("relaties_id", UserData?.relaties?.id);
      formData.append("user_id", UserData?.user?.id);
      formData.append("order_comment", comment?.trim());
      formData.append("order_id", item?.id);

      const imagesToSend = data && data.length > 0 ? data : AllSelectImage;



      let res: any = await axios.post(
        apiConstants.store_tms_comment,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      if (Boolean(res?.data.status)) {
        const orderLogId = res?.data?.data?.order_log_id;
        const orderId =
          res?.data?.data?.order_id ??
          ItemsData?.id ??
          ItemsData?.order_data?.id ??
          item?.id ??
          order_id;
        const imageUris = [...(imagesToSend || [])].filter(Boolean);

        if (imageUris.length > 0 && orderLogId != null && orderId != null) {
          appendToLocalUploadQueue(setLocalImagesUploadbeforeData, {
            order_id: orderId,
            image_data: imageUris,
            item_id: null,
            commentId: orderLogId,
          });
        }

        setPickUpDataSave([]);
        setDeliveyDataSave([]);
        setAllSelectImage([]);
        setToast({
          top: 45,
          text: t(res?.data?.message),
          type: "success",
          visible: true,
        });
        await GetIdByOrderFun();
      } else {
        setToast({
          top: 45,
          text: t(res?.data?.message),
          type: "error",
          visible: true,
        });
      }
    } catch (error) {
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

  const UploadImageStoreApiFun = async (orderId: string, OrderLogId: string) => {
    if (DropBoxUploadImageData?.length == 0) {
      return;
    }
    try {

      const formData = new FormData();

      formData.append(
        "token",
        UserData?.user?.verify_token
      );

      formData.append(
        "role",
        UserData?.user?.role
      );

      formData.append(
        "relaties_id",
        UserData?.relaties?.id
      );

      formData.append(
        "user_id",
        UserData?.user?.id
      );

      formData.append(
        "order_id",
        orderId ||
        ItemsData?.id ||
        ItemsData?.order_data?.id ||
        ""
      );

      formData.append(
        "order_log_id",
        OrderLogId
      );


      if (
        DropBoxUploadImageData?.length > 0
      ) {

        DropBoxUploadImageData.forEach(
          (image, index) => {

            formData.append(
              `images[${index}][file_path]`,
              image?.file_path || ""
            );

            formData.append(
              `images[${index}][file]`,
              image?.file || ""
            );

            formData.append(
              `images[${index}][file_extension]`,
              image?.file_extension || ""
            );

            formData.append(
              `images[${index}][dropbox_id]`,
              image?.dropbox_id || ""
            );

            formData.append(
              `images[${index}][shared_link]`,
              image?.shared_link || ""
            );
          }
        );
      }



      const response: any = await axios.post(
        apiConstants.store_tms_comment_img_new,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        },
      );

      const data: any =
        await response?.data;



      if (!(data?.status_code == 200)) {

        throw new Error(
          data?.message ||
          t("Something went wrong")
        );
      }
      setDropBoxUploadImageData([]);

      setToast({
        text: t(data?.message || t("Image uploaded successfully")),
        type: "success",
        visible: true,
      });

    } catch (error) {



      setToast({
        top: 45,
        text:
          ErrorHandle(error).message,
        type: "error",
        visible: true,
      });

      return null;
    }
  };

  const getDirectDropboxLink = (sharedLink: string) => {
    if (!sharedLink) return "";

    let url = sharedLink
      .replace("www.dropbox.com", "dl.dropboxusercontent.com")
      .replace("dropbox.com", "dl.dropboxusercontent.com");

    url = url.replace(/[?&](dl|raw)=\d/, "");

    url += (url.includes("?") ? "&" : "?") + "raw=1";

    return url;
  };

  function getMergedImages(item: any, AllSelectImage: any[]) {
    const safeImages = Array.isArray(AllSelectImage) ? AllSelectImage : [];

    if (!item || !Array.isArray(item?.tmslogdata_itemcomment)) {
      return [...safeImages];
    }


    const backendImages = item.tmslogdata_itemcomment
      .filter(
        (el: any) => Array.isArray(el?.tmsimgdata) && el.tmsimgdata.length > 0
      )
      .flatMap((el: any) => el.tmsimgdata)
      .map((img: any) => ({
        uri: img?.shared_link
          ? getDirectDropboxLink(img.shared_link)
          : img?.uri ?? "",
      }))
      .filter((img: any) => img.uri !== "");
    // 

    return [...backendImages, ...safeImages];
  }
  const getSliderDataFun = async () => {
    setIsLoading(true);

    try {
      let res = await ApiService(apiConstants.get_AllSlideDataApi, {
        customData: {
          token: UserData?.user?.verify_token,
          role: UserData?.user?.role,
          relaties_id: UserData?.relaties?.id,
          user_id: UserData?.user?.id,
        },
      });


      if (Boolean(res.status)) {
        const data = res?.data || [];

        setAllSlideData(data);
        // navigation.navigate("FilterScreen", { Type: type || GloblyTypeSlide });
        goBackOrPopTo(navigation, "FilterScreen", { Type: type || GloblyTypeSlide })

      } else {
        setToast({
          top: 45,
          text: t(res?.message),
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
// console.log(ItemsData);

  const BackOrderFun = async (
    lable = "",
    comment: string = "",
    // images: any[] = [],
    selectedItems: any[] = []
  ) => {
    if (!selectedItems || selectedItems.length === 0) {
      setToast({
        top: 45,
        text: t("Please select at least 1 item!"),
        type: "error",
        visible: true,
      });
      return;
    }

    setLableLoading(true);
    try {
      let formData: any = new FormData();

      formData.append("token", UserData?.user?.verify_token);
      formData.append("role", UserData?.user?.role);
      formData.append("relaties_id", UserData?.relaties?.id);
      formData.append("user_id", UserData?.user?.id);
      formData.append("order_id", ItemsData?.id || ItemsData?.order_data?.id);
      formData.append("item_lable", lable);

      selectedItems.forEach((item) => {
        formData.append("item_id[]", item.id);
      });

      let res: any = await axios.post(apiConstants.missed_backorder, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });


      if (res?.data?.status) {
        await AddImageOrCommentFun(comment);
        setNoParcelItemIds((prev: any) => [
          ...prev,
          ...selectedItems.map((item) => item.id),
        ]);

        if (Number(res?.data.remaining_item) == 0) {
          const buttons: any[] = [];
          const isSignatureAllowed = Number(res?.data?.tms_current_status) === 5 && SelectCurrentDeliveryLabel?.signature_required == 1;

          if (isSignatureAllowed) {
            setShowSig(true);
            setNoParcelItemIds([]);
          } else {
            buttons.push({
              text: t("Go to List Page"),
              type: "primary",
              onPress: () => {
                setSecondModal(p => ({ ...p, visible: false }));
                setNoParcelItemIds([]);
                getSliderDataFun();
              },
            },)
            setTimeout(() => {
              setSecondModal({
                visible: true,
                title: t("All Parcels Scanned Successfully!"),
                message: t(res?.data.remaining_item_message) || "",
                buttons: buttons,
                color: GloblyTypeSlide == "outbound_scan" ? Colors.primary : Colors.green
              });

            }, 100)
          }
        } else if (!(GloblyTypeSlide == "outbound_scan")) {
          setTimeout(() => {
            setSecondModal({
              visible: true,
              title: t("There are Parcels Remaining"),
              message: t(res?.data.remaining_item_message) || "",
              buttons: [
                {
                  text: "No Parcel",
                  type: "secondary",
                  onPress: () => {
                    setSecondModal((p: any) => ({ ...p, visible: false }));

                    if (NoParcelOptions.length > 0) {
                      setNoParcelModalVisible(true);
                    } else {
                      setToast({
                        top: 45,
                        text: t("All items are scanned!"),
                        type: "info",
                        visible: true,
                      });
                    }
                  },
                },
                {
                  text: "Open Scanner",
                  type: "primary",
                  onPress: () => {
                    setSecondModal((p: any) => ({ ...p, visible: false }));

                    navigation.navigate("Scanner", {
                      type: GloblyTypeSlide,
                      restrictedOrderId:
                        ItemsData?.id || ItemsData?.order_data?.id,
                    });
                  },
                },
              ],
              color: Colors.yellow
            });

          }, 100)

        }

        await GetIdByOrderFun();

        setToast({
          top: 45,
          text: t(res?.data?.message),
          type: "success",
          visible: true,
        });
      } else {
        setToast({
          top: 45,
          text: t(res?.data?.message),
          type: "error",
          visible: true,
        });
      }
    } catch (error) {
      setToast({
        top: 45,
        text: ErrorHandle(error).message,
        type: "error",
        visible: true,
      });
    } finally {
      setLableLoading(false);
    }
  };
  const getTextColor = (bgColor: string) => {
    if (!bgColor) return "#000";

    const color = bgColor.replace("#", "");

    const r = parseInt(color.substring(0, 2), 16);
    const g = parseInt(color.substring(2, 4), 16);
    const b = parseInt(color.substring(4, 6), 16);

    // Brightness formula
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;

    return brightness > 128 ? "#000" : "#FFF";
  };
  const CustomerSignatureFun = async (signature: string | null = null, name: string | null = null,) => {
    if (isBlankSignatureData(signature)) {
      setToast({
        top: 45,
        text: t("Signature is required"),
        type: "error",
        visible: true,
      });
      return
    }
    setSignatureLoader(true)
    try {

      const payload = {
        token: UserData?.user?.verify_token,
        role: UserData?.user?.role,
        relaties_id: UserData?.relaties?.id,
        user_id: UserData?.user?.id,
        name,
        signature,
        order_id: ItemsData?.id
      };
      const res = await ApiService(apiConstants.store_customer_signature, {
        customData: payload,
      });

      if (res?.status) {

        setShowSig(false);
        setSecondModal(p => ({ ...p, visible: false }));
        setToast({
          top: 45,
          text: res?.message,
          type: "success",
          visible: true,
        });
      } else {
        setToast({
          top: 45,
          text: res?.message,
          type: "error",
          visible: true,
        });
      }
    } catch (error) {
      setToast({
        top: 45,
        text: ErrorHandle(error).message,
        type: "error",
        visible: true,
      });
    }
    finally {
      setSignatureLoader(false);

    }
  }
  const isVideoUrl = (url?: string): boolean => {
    if (!url) return false;
    return /\.(mp4|mov|avi|mkv|webm|3gp)(\?.*)?$/i.test(url);
  };

  const hasOrderPreview = Boolean(
    item?.id || ItemsData?.id || ItemsData?.order_data?.id,
  );
  const showInitialLoader = DataLoading && !hasOrderPreview;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="white" />
      <DetailsHeader title={t("Details")} Backbutton={BackButtonAvailble} />
      {showInitialLoader ? (
        <View style={styles.LoaderContainer}>
          <Loader />
        </View>
      ) : (
        <ScrollView
          style={[
            styles.ViewContainer,
            { paddingTop: 15, gap: 15, backgroundColor: Colors.background },
          ]}
          contentContainerStyle={[styles.ContainerStyle, { paddingBottom: 50 }]}
          bounces={false}
          overScrollMode="never"
        >
          {/* {PermissionData?.can_scan_order && (
            <View style={styles.Flex}>
              <View />
              <TwoTypeButton
                onlyIcon={true}
                Icon={Images.Scan}
                style={{ width: 46, height: 46 }}
                onPress={() =>
                  navigation.navigate("Scanner", {
                    fun: GetIdByOrderFun,
                    type: type,
                    restrictedOrderId:
                      ItemsData?.id || ItemsData?.order_data?.id,
                  })
                }
              />
            </View>
          )} */}
          <PickUpBox
            AllisCollapsed={true}
            downButton={true}
            data={ItemsData}
            LableStatus={ItemsData?.tmsstatus?.status_name}
            OrderId={ItemsData?.id}
            ProductItem={ItemsData?.items}
            driver_note={null}
            LableBackground={ItemsData?.tmsstatus?.color}
            start={ItemsData?.pickup_location}
            end={ItemsData?.deliver_location}
            ItemData={ItemsData}
            additional_cost_label={ItemsData?.additional_cost_label}
            customerData={ItemsData?.customer}
            external_platform_data={ItemsData?.display_name}
            external_order_id={ItemsData?.external_order_id}
            contact={true}
            showScannerButton={
              PermissionData?.can_scan_order && isPickupOrder(ItemsData)
            }
            onParcelManualVerify={handleParcelManualVerify}
          />

          {
            ItemsData?.driver_note &&
            <View style={styles.DriverBG}>
              <Text style={[styles.Text, { color: "#FFEA00" }]}>{ItemsData?.driver_note || ""}</Text>
            </View>
          }

          <MapsViewBox
            orderStatusId={ItemsData?.tmsstatus?.id ?? ItemsData?.status}
            pickupRegionData={ItemsData?.pickup_region_data}
            deliveryRegionData={ItemsData?.delivery_region_data}
            orderData={ItemsData}
            msg={LocationDataMessage ?? t("Destination location is unavailable")}
          />

          {PermissionData?.can_scan_order && !isDeliveryOrder(ItemsData) ? (
            <View style={styles.Flex}>
              <TwoTypeButton
                title={t("No Parcel")}
                Icon={Images.NoParcel}
                style={{ width: "48%" }}
                IconStyle={{ width: 22, height: 22 }}
                onPress={() => {
                  if (NoParcelOptions.length > 0) {
                    setNoParcelModalVisible(true);
                  } else {
                    setToast({
                      top: 45,
                      text: t("All items are scanned!"),
                      type: "info",
                      visible: true,
                    });
                  }
                }}
              />

              <TwoTypeButton
                Icon={Images.Scan}
                title={t("Open Scanner")}
                style={{ width: "48%" }}
                onPress={() =>
                  navigation.navigate("Scanner", {
                    fun: GetIdByOrderFun,
                    type: type,
                    restrictedOrderId:
                      ItemsData?.id || ItemsData?.order_data?.id,
                  })
                }
                IconStyle={{ width: 22, height: 22 }}
              />
            </View>
          )
            : isDeliveryOrder(ItemsData) &&
            <FlatList
              data={AllDeliveyLabel}
              scrollEnabled={false}
              renderItem={({ item }: any) => {
                const bgColor = item?.color || Colors.Boxgray;


                return (
                  <TouchableOpacity
                    onPress={() => {
                      if (item?.id == 15) {

                        if (NoParcelOptions.length > 0) {
                          setNoParcelModalVisible(true);
                        } else {
                          setToast({
                            top: 45,
                            text: t("All items are scanned!"),
                            type: "info",
                            visible: true,
                          });
                        }

                      } else {

                        navigation.navigate("Scanner", {
                          fun: GetIdByOrderFun,
                          type: type,
                          restrictedOrderId:
                            ItemsData?.id || ItemsData?.order_data?.id,
                        })
                        setSelectCurrentDeliveryLabel(item)
                      }
                    }
                    }
                    activeOpacity={0.85}
                    style={[
                      styles.LabelBtn,
                      {
                        backgroundColor: bgColor,
                      },
                    ]}
                  >
                    <Text
                      style={[styles.Text, {
                        color: Colors.white,
                      },]}
                    >
                      {t(item?.title)}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          }


          {getMergedImages(ItemsData, AllSelectImage)?.length > 0 && (
            <FlatList
              horizontal
              style={{ flexGrow: 1, margin: -15, marginVertical: 10 }}
              ListEmptyComponent={() => (
                <View style={styles.FooterContainer}>
                  <Text style={[styles.Text, { color: Colors.darkText }]}>
                    {t("No Photos")}
                  </Text>
                </View>
              )}
              initialNumToRender={10}
              showsHorizontalScrollIndicator={false}
              maxToRenderPerBatch={10}
              windowSize={5}
              removeClippedSubviews={true}
              updateCellsBatchingPeriod={30}
              getItemLayout={(data, index) => ({
                length: 70,
                offset: 70 * index,
                index,
              })}
              contentContainerStyle={{
                gap: 10,
                paddingRight: 50,
                paddingLeft: 15,
              }}
              data={getMergedImages(ItemsData, AllSelectImage)}
              renderItem={({ item, index }) => {
                const uri = item?.shared_link
                  ? getDirectDropboxLink(item?.shared_link)
                  : item?.uri;

                const isVideo = isVideoUrl(uri);

                return (
                  <View style={styles.Image}>
                    {uri ? (
                      isVideo ? (
                        <View style={{ width: "100%", height: "100%", borderRadius: 7, overflow: "hidden", backgroundColor: "#000" }}>
                          <Image
                            source={{ uri }}
                            style={{ width: "100%", height: "100%", borderRadius: 7 }}
                            resizeMode="cover"
                          />
                          <View
                            style={{
                              ...StyleSheet.absoluteFillObject,
                              backgroundColor: "rgba(0,0,0,0.35)",
                              borderRadius: 7,
                            }}
                          />
                          <View
                            style={{
                              position: "absolute",
                              top: 0, left: 0, right: 0, bottom: 0,
                              justifyContent: "center",
                              alignItems: "center",
                            }}
                          >
                            <View
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: 14,
                                backgroundColor: "rgba(255,255,255,0.85)",
                                justifyContent: "center",
                                alignItems: "center",
                              }}
                            >
                              <View
                                style={{
                                  width: 0,
                                  height: 0,
                                  borderTopWidth: 6,
                                  borderBottomWidth: 6,
                                  borderLeftWidth: 10,
                                  borderTopColor: "transparent",
                                  borderBottomColor: "transparent",
                                  borderLeftColor: "#000",
                                  marginLeft: 2,
                                }}
                              />
                            </View>
                          </View>
                          <View
                            style={{
                              position: "absolute",
                              bottom: 4,
                              left: 5,
                              backgroundColor: "rgba(0,0,0,0.5)",
                              borderRadius: 3,
                              paddingHorizontal: 4,
                              paddingVertical: 1,
                            }}
                          >
                            <Text style={{ fontSize: 8, color: "#fff", fontFamily: FONTS.Medium }}>
                              {t("Video")}
                            </Text>
                          </View>
                        </View>
                      ) : (
                        <Image
                          source={{ uri }}
                          style={{ borderRadius: 7, width: "100%", height: "100%" }}
                          resizeMode="cover"
                        />
                      )
                    ) : (
                      <View
                        style={{
                          width: "100%",
                          height: "100%",
                          borderRadius: 7,
                          backgroundColor: "#ddd",
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        <Text style={{ fontSize: 10, color: "#666" }}>
                          {t("No Image")}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              }}
              keyExtractor={(item, index) =>
                item.id?.toString() || index.toString()
              }
            />
          )}



          {ItemsData?.tmslogdata_itemcomment?.length > 0 && (
            <CommentViewBox data={ItemsData?.tmslogdata_itemcomment} />
          )}
        </ScrollView>
      )}
      <AddCommentModal
        IsVisible={comment}
        setIsVisible={setComment}
        fun={(commentText: string) => {
          const itemsToSend = SelectedNoParcelItems?.length
            ? [...SelectedNoParcelItems]
            : [];

          if (itemsToSend.length === 0) {
            setToast({
              top: 45,
              text: t("Please select at least 1 item!"),
              type: "error",
              visible: true,
            });
            return;
          }

          BackOrderFun(
            ItemsData?.tmsstatus?.status_name == "Scheduled"
              ? "Backorder"
              : "Missed",
            commentText,

            itemsToSend
          );
        }}
      />
      <ConformationModal
        IsVisible={AlertModalOpen?.visible}
        onClose={() =>
          setAlerModalOpen((prev: any[]) => ({
            ...prev,
            visible: false,
          }))
        }
        Title={AlertModalOpen.title}
        Icon={AlertModalOpen.Icon}
        LeftButtonText={AlertModalOpen.LButtonText}
        RightButtonText={AlertModalOpen.RButtonText}
        RightBgColor={AlertModalOpen.RButtonStyle}
        LeftBGColor={AlertModalOpen.LButtonStyle}
        RightButtonIcon={AlertModalOpen.RButtonIcon}
        RTextColor={AlertModalOpen.RColor}
        LTextColor={AlertModalOpen.LColor}
        onPress={AlertModalOpen.onPress}
        Description={AlertModalOpen.Desctiption}
      />
      <NoParcelModal
        visible={NoParcelModalVisible}
        title={t("Select Missing Items")}
        options={NoParcelOptions}
        personData={ItemsData?.customer}
        external_platform_data={ItemsData?.display_name}
        OrderId={ItemsData?.id}
        type={1}
        onClose={() => { setNoParcelModalVisible(false); setNoParcelDetailsScreenEvent(false) }}
        onSubmit={(selectedIds) => {
          if (!selectedIds || selectedIds.length === 0) {
            setToast({
              top: 45,
              text: t("Please select at least 1 item!"),
              type: "error",
              visible: true,
            });
            return;
          }

          const selectedItems = selectedIds
            .map((id) => ItemsData?.items.find((i: any) => i.id === id))
            .filter(Boolean);

          setSelectedNoParcelItems(selectedItems);
          setNoParcelModalVisible(false);
          setNoParcelDetailsScreenEvent(false)
          setTimeout(() => {
            setScannerModalOpen({
              visible: true,
              InfoTitle: t("Scanner Info"),
              type: 1,
              RText: t("Take Photo"),
              LText: t("Cancel"),
              personData: ItemsData,
              ProductItem: selectedItems,
              OrderId: ItemsData?.id,
              onPress: () => {
                setScannerModalOpen((prev) => ({ ...prev, visible: false }));
                openNoParcelPickupCamera();
              },
            });
          }, 500)
        }}
      />

      <SignatureModal
        IsLoading={SignatureLoader}
        visible={showSig}
        defaultName={ItemsData?.display_name}
        onClose={() => setShowSig(false)}
        onSave={(base64, name) => {
          CustomerSignatureFun(base64, name)

        }}
        onClear={() => { }}
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
      />{" "}
      <SecondCustomModal SecondModal={SecondModal} />
      <ParcelVerifyOverlays flow={parcelVerifyFlow} navigation={navigation} />
      <LoadingModal
        visible={IsLoading || LableLoading}
        message={t("Please wait…")}
      />
    </SafeAreaView>
  );
}
