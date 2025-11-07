import apiConstants from "@/src/api/apiConstants";
import { Images } from "@/src/assets/images";
import ConformationModal from "@/src/components/ConformationModal";
import DetailsHeader from "@/src/components/DetailsHeader";
import DropDownBox from "@/src/components/DropDownBox";
import { useErrorHandle } from "@/src/components/ErrorHandle";
import LoadingModal from "@/src/components/LoadingModal";
import PickUpBox from "@/src/components/PickUpBox";
import TwoTypeButton from "@/src/components/TwoTypeButton";
import TwoTypeInput from "@/src/components/TwoTypeInput";
import { GlobalContextData } from "@/src/context/GlobalContext";
import ApiService from "@/src/utils/Apiservice";
import { Colors } from "@/src/utils/colors";
import { token, width } from "@/src/utils/storeData";
import axios from "axios";
// import { Image } from "expo-image";
import AddCommentModal from "@/src/components/AddCommentModal";
import CommentViewBox from "@/src/components/CommentViewBox";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import React, { useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { styles } from "./style";
export default function DeliveryScreens({ route, navigation }: any) {
  const { item, fun } = route?.params || "";

  const [ItemsData, setItemsData] = useState<any>(null);
  const [DropData, setDropData] = useState<object[]>([]);
  const [SelectPlace, setSelectPlace] = useState<object | any>(null);
  const { ErrorHandle } = useErrorHandle();
  const [IsLoading, setIsLoading] = useState<boolean>(false);
  const [PlaceSelectToHideShow, setPlaceSelectToHideShow] =
    useState<boolean>(false);
  const [comment, setComment] = useState<boolean | any>(false);
  const [AllSelectImage, setAllSelectImage] = useState<any[]>([]);
  const { UserData, setUserData, Toast, setToast } =
    useContext(GlobalContextData);
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
  const { t } = useTranslation();

  const openCamera = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(t("Permission required", "Please allow camera access"));
        return;
      }

      let result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled) {
        console.log("Captured photo URI:", result.assets[0].uri);
        setAllSelectImage((pre) => [...pre, result.assets[0].uri]);
      }
    } catch (err) {
      console.log(err);
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
      onPress: () =>
        setAllSelectImage((prev) => prev.filter((_, i) => i !== index)),
    });
  };

  const DropDataSet = () => {
    const mapping = item?.order_label_mapping || {};

    const dataArray = Object.entries(mapping).map(([id, name]) => ({
      id,
      name,
    }));
    console.log("dataArray", dataArray);
    setPlaceSelectToHideShow(item?.tmsstatus?.id > 4);
    setDropData(dataArray);
  };

  const StatusUpdateFun = async (selectReason: any) => {
    setIsLoading(true);
    try {
      let res = await ApiService(apiConstants.status_update, {
        customData: {
          token: token,
          role: UserData?.user?.role,

          relaties_id: UserData?.relaties?.id,
          user_id: UserData?.user?.id,
          item_id: item?.order_data?.items[0]?.id,
          order_id: item?.order_data?.items[0]?.tms_order_id,
          delivered_lable_id: selectReason?.id,
        },
      });
      if (res?.status) {
        await GetIdByOrderFun();
        fun();
        setToast({
          top: 45,
          text: res?.message || t("Status Update Success!"),
          type: "success",
          visible: true,
        });
        console.log("Success!", res);
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

  const AddImageOrCommentFun = async (comment: string = "", data = []) => {
    if (!SelectPlace) {
      setToast({
        top: 45,
        text: t("Please select a reason."),
        type: "error",
        visible: true,
      });
      return;
    }

    if (!Array.isArray(AllSelectImage) || AllSelectImage.length === 0) {
      setToast({
        top: 45,
        text: t("Please select at least one picture."),
        type: "error",
        visible: true,
      });
      return;
    }
    setIsLoading(true);
    try {
      let formData: any = new FormData();

      formData.append("token", token);
      formData.append("role", UserData?.user?.role);
      formData.append("relaties_id", UserData?.relaties?.id);
      formData.append("user_id", UserData?.user?.id);
      formData.append("order_comment", comment?.trim());
      formData.append("order_id", ItemsData?.id);

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

      for (const img of AllSelectImage) {
        const compressed: any = await ImageManipulator?.manipulateAsync(
          img.uri,
          [{ resize: { width: 800 } }],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
        );

        formData.append("doc[]", {
          uri: compressed.uri,
          name: `image_${Date.now()}.jpg`,
          type: img.type || "image/jpeg",
        } as any);
      }
      let res: any = await axios.post(
        apiConstants.store_image_comment,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      if (Boolean(res?.data.status)) {
        await GetIdByOrderFun();
        setToast({
          top: 45,
          text: res?.data?.message,
          type: "success",
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

  const openGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      alert("Permission required to access gallery");
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

  const GetIdByOrderFun = async () => {
    try {
      let res = await ApiService(apiConstants.get_order_data_by_id, {
        customData: {
          token: token,
          role: UserData?.user?.role,
          relaties_id: UserData?.relaties?.id,
          user_id: UserData?.user?.id,
          order_id: item?.order_data?.items[0]?.tms_order_id,
        },
      });
      if (res?.status) {
        setItemsData(res?.data);
        // let productLatestData = res?.data?.items?.find(el => el?.id == item?.id)
        setPlaceSelectToHideShow(res?.data?.tmsstatus?.id > 4);
        console.log("Success!", res);
      }
    } catch (error) {
      console.log("GetIdByOrderFun Error:-", error);
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
      .flatMap((el: any) => el?.tmsimgdata)
      .map((img: any) => ({
        // Ensure URI format
        uri: img?.shared_link
          ? getDirectDropboxLink(img.shared_link)
          : img?.uri ?? "",
      }))
      .filter((img: any) => img.uri !== "");
    console.log("Proper Images", [...backendImages, ...safeImages]);

    return [...backendImages, ...safeImages];
  }

  useEffect(() => {
    if (item) {
      // GetIdByOrderFun();
      GetIdByOrderFun();
      console.log("item Data", item);

      DropDataSet();
    }
  }, [item]);

  return (
    <SafeAreaView style={styles.container}>
      <DetailsHeader title={t("Which order did you place?")} />
      <ScrollView
        style={styles.ContentContainer}
        contentContainerStyle={{ paddingBottom: 50 }}
      >
        <PickUpBox
          IndexActive={false}
          index={
            ItemsData && ItemsData !== null
              ? ItemsData?.id
              : item?.order_data?.id
          }
          LableStatus={
            ItemsData && ItemsData !== null
              ? ItemsData?.tmsstatus?.status_name
              : item?.order_data?.tmsstatus?.status_name
          }
          OrderId={
            ItemsData && ItemsData !== null
              ? ItemsData?.id
              : item?.order_data?.id
          }
          ProductItem={
            ItemsData && ItemsData !== null
              ? ItemsData?.items
              : item?.order_data?.items
          }
          LableBackground={
            ItemsData && ItemsData !== null
              ? ItemsData?.tmsstatus?.color
              : item?.order_data?.tmsstatus?.color
          }
          start={
            ItemsData && ItemsData !== null
              ? ItemsData?.pickup_location
              : item?.order_data?.pickup_location
          }
          end={
            ItemsData && ItemsData !== null
              ? ItemsData?.deliver_location
              : item?.order_data?.deliver_location
          }
          customerData={
            ItemsData && ItemsData !== null
              ? ItemsData?.customer
              : item?.order_data?.customer
          }
          statusData={
            ItemsData && ItemsData !== null
              ? ItemsData?.tmsstatus
              : item?.order_data?.tmsstatus
          }
          DeliveryLable={true}
        />

        {!PlaceSelectToHideShow && SelectPlace == null && (
          <View style={{ marginTop: 10 }}>
            <DropDownBox
              data={DropData || []}
              placeholder={t("Select Place")}
              value={SelectPlace}
              setValue={setSelectPlace}
              labelFieldKey="name"
              valueFieldKey="id"
              // fun={StatusUpdateFun}
              ContainerStyle={{ width: "100%" }}
              // disbled={true}
            />
          </View>
        )}

        <View style={{ marginTop: 20 }}>
          <View style={[styles.Flex, { marginVertical: 20 }]}>
            <TwoTypeButton
              Icon={Images.Photos}
              title={t("Camera")}
              style={{ width: "48%" }}
              onPress={openCamera}
              IconStyle={{ width: 22, height: 22 }}
            />
            <TwoTypeButton
              Icon={Images.GalleryIcon}
              title={t("Upload Photo")}
              onPress={openGallery}
              IconStyle={{ width: 22, height: 22 }}
            />
          </View>

          {getMergedImages(ItemsData, AllSelectImage)?.length && ItemsData && (
            <FlatList
              horizontal
              style={{ width: width }}
              contentContainerStyle={{ gap: 10, paddingRight: 20 }}
              data={getMergedImages(ItemsData, AllSelectImage)}
              renderItem={({ item, index }) => {
                return (
                  <View style={styles.Image}>
                    <Image
                      source={{ uri: item?.uri || "" }}
                      style={{
                        borderRadius: 7,
                        width: "100%",
                        height: "100%",
                      }}
                    />
                  </View>
                );
              }}
            />
          )}

          <Pressable
            style={{ marginVertical: 15 }}
            onPress={() => setComment(true)}
          >
            <TwoTypeInput
              Icon={Images.comment}
              placeholder={t("Write Comment")}
              edit={false}
            />
          </Pressable>
        </View>

        <AddCommentModal
          IsVisible={comment}
          setIsVisible={setComment}
          fun={AddImageOrCommentFun}
        />

        <CommentViewBox data={ItemsData?.tmslogdata_itemcomment} />
      </ScrollView>

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

      <LoadingModal visible={IsLoading} message={t("Please wait…")} />
    </SafeAreaView>
  );
}
