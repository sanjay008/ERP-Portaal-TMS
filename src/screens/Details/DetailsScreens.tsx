import apiConstants from "@/src/api/apiConstants";
import { Images } from "@/src/assets/images";
import AddCommentModal from "@/src/components/AddCommentModal";
import { ApiFormatDate } from "@/src/components/ApiFormatDate";
import CommentViewBox from "@/src/components/CommentViewBox";
import ConformationModal from "@/src/components/ConformationModal";
import DetailsHeader from "@/src/components/DetailsHeader";
import { useErrorHandle } from "@/src/components/ErrorHandle";
import Loader from "@/src/components/loading";
import LoadingModal from "@/src/components/LoadingModal";
import MapsViewBox from "@/src/components/MapsViewBox";
import NoParcelModal from "@/src/components/NoParcelModal";
import PickUpBox from "@/src/components/PickUpBox";
import ScannerInfoModal from "@/src/components/ScannerInfoModal";
import TwoTypeButton from "@/src/components/TwoTypeButton";
import { GlobalContextData } from "@/src/context/GlobalContext";
import ApiService from "@/src/utils/Apiservice";
import { Colors } from "@/src/utils/colors";
import { token } from "@/src/utils/storeData";
import { useIsFocused } from "@react-navigation/native";
import axios from "axios";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import * as IntentLauncher from "expo-intent-launcher";
import { StatusBar } from "expo-status-bar";
import React, { useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  FlatList,
  Image,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import Modal from "react-native-modal";
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
    SelectActiveRegionData,
  } = useContext(GlobalContextData);
  const [ItemsData, setItemsData] = useState(item);
  const Focused = useIsFocused();
  const [comment, setComment] = useState<boolean | any>(false);
  const [PermissionData, setPermissionData] = useState<any>(null);
  const [AllSelectImage, setAllSelectImage] = useState<any[]>([]);
  const [LableLoading, setLableLoading] = useState<boolean>(false);
  const [IsLoading, setIsLoading] = useState<boolean>(false);
  const [BackButtonAvailble, setBackButtonAvailble] = useState(false);
  const { t } = useTranslation();
  const [DataLoading, setDataLoading] = useState<boolean>(false);
  const [NoParcelModalVisible, setNoParcelModalVisible] = useState(false);
  const [NoParcelOptions, setNoParcelOptions] = useState<any[]>([]);
  const [AllSlideData, setAllSlideData] = useState([]);
  const [SelectedNoParcelItems, setSelectedNoParcelItems] = useState<any[]>([]);
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
  const IsFocused = useIsFocused();
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

  

  const GetLocationData = async () => {
    setIsLoading(true);
    if (SelectActiveRegionData == null) {
      setToast({
        top: 45,
        text: t("No Region Found"),
        type: "error",
        visible: true,
      });
      return;
    }
    console.log("REkmegjerg",{
      token: token,
      role: UserData?.user?.role,
      relaties_id: UserData?.relaties?.id,
      user_id: UserData?.user?.id,
      region_id: SelectActiveRegionData?.id,
      date: ApiFormatDate(SelectActiveDate),
    },);
    

    try {
      let res = await ApiService(apiConstants.get_location_by_region_date, {
        customData: {
          token: token,
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
        console.log("res?.orders", [
          { ...baseLocation },
          ...orders,
          { ...baseLocation },
        ]);
      }
    } catch (error) {
      console.log("Get Locations Data Error:-", error);
      setToast({
        top: 45,
        text: ErrorHandle(error)?.message || "Something went wrong",
        type: "error",
        visible: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (type) {
      GetIdByOrderFun();

      if (type === "scanner_noparcel") {
        setNoParcelModalVisible(true);
      }
    }
  }, [type]);

  useEffect(() => {
    if (!IsFocused) return;
    if (!SelectActiveDate) return;
    if (!SelectActiveRegionData) return;
    if (AllDestinationRegionData?.length == 0) {
      GetLocationData();
    }
  }, [IsFocused, SelectActiveDate, SelectActiveRegionData]);

  useEffect(() => {
    setPickUpDataSave({
      setData: (data: any[]) => {
        console.log("Received pickup photo data:", data);
        setAllSelectImage(data)
        if (data?.length > 0) {
          setComment(true);
        }
      },
    });
    setDeliveyDataSave({
      setData: (data: any[]) => {
        console.log("📦 Received delivery photo data:", data);
        setAllSelectImage(data)
        if (data?.length > 0) {
          setComment(true);
        }
      },
    });

    return () => {
      setPickUpDataSave(null);
      setDeliveyDataSave(null);
    };
  }, [Focused]);

  const openCamera = async () => {
    try {
      const { granted } = await ImagePicker.requestCameraPermissionsAsync();
      if (!granted) {
        Alert.alert("Permission required", "Please allow camera access");
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
      console.log("Camera open error:", err);
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
        navigation.navigate("Camera", {
          from: "Pickup",
        });
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
    console.log("order_id=-=-=-=-=", order_id);

    setDataLoading(true);
    console.log("hgfhfhyfhy", {
      token: token,
      role: UserData?.user?.role,
      relaties_id: UserData?.relaties?.id,
      user_id: UserData?.user?.id,
      order_id: ItemsData?.id || ItemsData?.order_data?.id || order_id,
      type: type,
    });

    try {
      let res = await ApiService(apiConstants.get_order_data_by_id, {
        customData: {
          token: token,
          role: UserData?.user?.role,
          relaties_id: UserData?.relaties?.id,
          user_id: UserData?.user?.id,
          order_id: ItemsData?.id || ItemsData?.order_data?.id,
          type: type,
        },
      });

      if (res?.status) {
        setItemsData(res?.data);
        setPermissionData(res?.permissions_data);
        console.log("Success!", res.data);

        // ✅ Filter out items that are already marked as "No Parcel"
        const labelsForModal = res.data.items
          .filter(
            (item: any) =>
              Number(item.scan_qty) === 0 && !NoParcelItemIds.includes(item.id) // 🔹 આ line add કરો
          )
          .map((item: any) => ({
            id: item.id,
            label: item.tms_product_name || `Item ${item.id}`,
          }));

        setNoParcelOptions(labelsForModal);
      } else {
        setToast({
          top: 45,
          text: res?.message,
          type: "error",
          visible: true,
        });
      }
    } catch (error) {
      console.log("GetIdByOrderFun Error:-", error);
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

  const AddImageOrCommentFun = async (comment: string = "", data = []) => {
    setIsLoading(true);
    try {
      let formData: any = new FormData();

      formData.append("token", token);
      formData.append("role", UserData?.user?.role);
      formData.append("relaties_id", UserData?.relaties?.id);
      formData.append("user_id", UserData?.user?.id);
      formData.append("order_comment", comment?.trim());
      formData.append("order_id", item?.id);

      const imagesToSend = data && data.length > 0 ? data : AllSelectImage;

      if (imagesToSend?.length == 0) {
        setToast({
          top: 45,
          text: t("Please image upload!"),
          type: "error",
          visible: true,
        });
        return;
      }

      // ✅ Loop over `imagesToSend`, not `AllSelectImage`
      for (const uri of imagesToSend) {
        const compressed = await ImageManipulator.manipulateAsync(
          uri,
          [{ resize: { width: 800 } }],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
        );
      
        formData.append("doc[]", {
          uri: compressed.uri,
          name: `image_${Date.now()}.jpg`,
          type: "image/jpeg",
        });
      }

      let res: any = await axios.post(
        apiConstants.store_image_comment,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      if (Boolean(res?.data.status)) {
        setPickUpDataSave([])
        setDeliveyDataSave([])
        setAllSelectImage([])
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
      .flatMap((el: any) => el.tmsimgdata )
      .map((img: any) => ({
        uri: img?.shared_link
          ? getDirectDropboxLink(img.shared_link)
          : img?.uri ?? "",
      }))
      .filter((img: any) => img.uri !== "");

    return [...backendImages, ...safeImages];
  }
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
        navigation.navigate("FilterScreen", { Type: type || GloblyTypeSlide });
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
  

  const BackOrderFun = async (
    lable = "",
    comment: string = "",
    // images: any[] = [],
    selectedItems: any[] = []
  ) => {
    if (!selectedItems || selectedItems.length === 0) {
      setToast({
        top: 45,
        text: "Please select at least 1 item!",
        type: "error",
        visible: true,
      });
      return;
    }

    setLableLoading(true);
    try {
      let formData: any = new FormData();

      formData.append("token", token);
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

      console.log("✅ Backorder response:", res.data);

      if (res?.data?.status) {
        await AddImageOrCommentFun(comment)
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
                  setNoParcelItemIds([]);
                  getSliderDataFun();
                },
              },
            ],
          });
        } else {
          setSecondModal({
            visible: true,
            title: "There are Parcels Remaining",
            message: res?.data.remaining_item_message || "",
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
                  });
                },
              },
            ],
          });
        }

        await GetIdByOrderFun();

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
  
  
  useEffect(() => {
    GetIdByOrderFun();
  }, [item, Focused]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="white" />
      <DetailsHeader title={t("Details")} Backbutton={BackButtonAvailble} />
      {DataLoading ? (
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
          {PermissionData?.can_scan_order && (
            <View style={styles.Flex}>
              <TouchableOpacity
                style={[styles.BackButton]}
                onPress={() =>
                  BackOrderFun(
                    ItemsData?.tmsstatus?.status_name == "Scheduled"
                      ? "Backorder"
                      : "Missed"
                  )
                }
              >
                <Text style={[styles.Text, { color: Colors.white }]}>
                  {ItemsData?.tmsstatus?.status_name == "Scheduled"
                    ? t("Back Order")
                    : t("Missing")}
                </Text>
              </TouchableOpacity>
              <TwoTypeButton
                onlyIcon={true}
                Icon={Images.Scan}
                style={{ width: 46, height: 46 }}
                onPress={() =>
                  navigation.navigate("Scanner", {
                    fun: GetIdByOrderFun,
                    type: type,
                  })
                }
              />
            </View>
          )}
          <PickUpBox
            AllisCollapsed={true}
            downButton={true}
            data={ItemsData}
            LableStatus={ItemsData?.tmsstatus?.status_name}
            OrderId={ItemsData?.id}
            ProductItem={ItemsData?.items}
            LableBackground={ItemsData?.tmsstatus?.color}
            start={ItemsData?.pickup_location}
            end={ItemsData?.deliver_location}
            customerData={ItemsData?.customer}
            contact={true}
          />

          <MapsViewBox
            data={AllDestinationRegionData}
          />

          {PermissionData?.can_scan_order && (
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
                  })
                }
                IconStyle={{ width: 22, height: 22 }}
              />
            </View>
          )}
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

                return (
                  <View style={styles.Image}>
                    {uri ? (
                      <Image
                        source={{ uri }}
                        style={{
                          borderRadius: 7,
                          width: "100%",
                          height: "100%",
                        }}
                      />
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

          {/* {PermissionData?.can_scan_order && (
            <Pressable onPress={() => setComment(true)}>
              <TwoTypeInput
                Icon={Images.comment}
                placeholder={t("Write Comment")}
                edit={false}
              />
            </Pressable>
          )} */}

          {ItemsData?.tmslogdata_itemcomment?.length > 0 && (
            <CommentViewBox data={ItemsData?.tmslogdata_itemcomment} />
          )}
        </ScrollView>
      )}
      <AddCommentModal
        IsVisible={comment}
        setIsVisible={setComment}
        fun={(commentText: string, data: any[]) => {
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

          return BackOrderFun(
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
        OrderId={ItemsData?.id}
        type={1}
        onClose={() => setNoParcelModalVisible(false)}
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
          console.log("ItemsData", ItemsData?.customer?.display_name);

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
              navigation.navigate("Camera", { from: "Pickup" });
            },
          });
        }}
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
                      color: "#444",
                      textAlign: "center",
                      marginBottom: 20,
                    }}
                  >
                    {SecondModal?.message}
                  </Text>
                ) : null}

                {/* 🔹 Buttons */}
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
                          btn.type === "primary" ? "#007BFF" : "#E0E0E0",
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
                          color: btn.type === "primary" ? "#fff" : "#000",
                          fontWeight: "500",
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
      <LoadingModal
        visible={IsLoading || LableLoading}
        message={t("Please wait…")}
      />
    </SafeAreaView>
  );
}
