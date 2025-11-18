import apiConstants from "@/src/api/apiConstants";
import { Images } from "@/src/assets/images";
import ConformationModal from "@/src/components/ConformationModal";
import DetailsHeader from "@/src/components/DetailsHeader";
import DropDownBox from "@/src/components/DropDownBox";
import { useErrorHandle } from "@/src/components/ErrorHandle";
import LoadingModal from "@/src/components/LoadingModal";
import PickUpBox from "@/src/components/PickUpBox";
import { GlobalContextData } from "@/src/context/GlobalContext";
import ApiService from "@/src/utils/Apiservice";
import { Colors } from "@/src/utils/colors";
import { token, width } from "@/src/utils/storeData";
import axios from "axios";
// import { Image } from "expo-image";
import CommentViewBox from "@/src/components/CommentViewBox";
import { useIsFocused } from "@react-navigation/native";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import * as IntentLauncher from "expo-intent-launcher";
import React, { useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  FlatList,
  Image,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import DashedLine from "react-native-dashed-line";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import Modal from "react-native-modal";
import { SafeAreaView } from "react-native-safe-area-context";
import { styles } from "./style";
export default function DeliveryScreens({ route, navigation }: any) {
  const params = route?.params ?? {};
  const { item, fun } = params;
  const Focused = useIsFocused();
  const [ItemsData, setItemsData] = useState<any>(null);
  const [DropData, setDropData] = useState<object[]>([]);
  const [SelectPlace, setSelectPlace] = useState<object | any>(null);
  const { ErrorHandle } = useErrorHandle();
  const [IsLoading, setIsLoading] = useState<boolean>(false);
  const [Description, setDescrition] = useState<string>("");
  // const [MenuButtonShow,setMenuButtonShow] = useState<boolean>(false);
  const [Commenterror, setCommentError] = useState<string>("");
  const [PlaceSelectToHideShow, setPlaceSelectToHideShow] =
    useState<boolean>(false);
  const [comment, setComment] = useState<boolean | any>(false);
  const [AllSelectImage, setAllSelectImage] = useState<any[]>([]);
  const {
    UserData,
    setUserData,
    Toast,
    setToast,
    DeliveyDataSave,
    setDeliveyDataSave,
    GloblyTypeSlide,
    setGloblyTypeSlide,
  } = useContext(GlobalContextData);
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
      setToast({
        top: 45,
        text: ErrorHandle(err).message,
        type: "error",
        visible: true,
      });
      console.log("Camera open error:", err);
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

  // const DropDataSet = () => {
  //   const mapping = item?.order_label_mapping || {};

  //   // const dataArray = Object.entries(mapping).map(([id, title]) => ({
  //   //   id,
  //   //   title,
  //   // }));
  //   setDropData(mapping);
  //   console.log("mapping",mapping);

  // };
  const DropDataSet = () => {
    const mapping = item?.order_label_mapping || {};

    // Convert the mapping object to an array of {id, title}
    const dataArray = Object.entries(mapping)
      .filter(([key]) => key !== "_index") // remove unwanted keys
      .map(([id, title]) => ({
        id,
        title,
      }));

    setDropData(dataArray);
    console.log("Dropdown Data Array:", dataArray);
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
        fun();
        setToast({
          top: 45,
          text: res?.message || t("Status Update Success!"),
          type: "success",
          visible: true,
        });
        await AddImageOrCommentFun();
        console.log("Success!", res);
      } else {
        setToast({
          top: 45,
          text: res?.message || t("Status Update Faild!"),
          type: "error",
          visible: true,
        });
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
      const formData = new FormData();

      formData.append("token", token);
      formData.append("role", UserData?.user?.role);
      formData.append("relaties_id", UserData?.relaties?.id);
      formData.append("user_id", UserData?.user?.id);
      formData.append("order_comment", Description?.trim());
      formData.append("order_id", ItemsData?.id);

      const imagesToSend = data && data.length > 0 ? data : AllSelectImage;

      if (!comment.trim() && imagesToSend.length === 0) {
        setToast({
          top: 45,
          text: t("Please add a comment or upload an image!"),
          type: "error",
          visible: true,
        });
        setIsLoading(false);
        return;
      }

      const compressedImages = await Promise.all(
        imagesToSend.map(async (img: any, index: number) => {
          const uri = typeof img === "string" ? img : img?.uri;

          if (!uri || typeof uri !== "string") {
            console.warn("Skipping invalid image:", img);
            return null;
          }

          if (uri.startsWith("http")) {
            return {
              uri,
              name:
                (typeof img === "object" && img.name) || `image_${index}.jpg`,
              type: (typeof img === "object" && img.type) || "image/jpeg",
            };
          }

          const compressed = await ImageManipulator.manipulateAsync(
            uri,
            [{ resize: { width: 800 } }],
            { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
          );

          return {
            uri: compressed.uri,
            name: (typeof img === "object" && img.name) || `image_${index}.jpg`,
            type: (typeof img === "object" && img.type) || "image/jpeg",
          };
        })
      );

      const validImages = compressedImages.filter(Boolean);

      validImages.forEach((img) => {
        formData.append("doc[]", img as any);
      });

      const res = await axios.post(apiConstants.store_image_comment, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (Boolean(res?.data?.status)) {
        setDescrition("");
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
          text: res?.data?.message || t("Request Failed"),
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

  const openGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      setToast({
        top: 45,
        text: t("Permission required to access gallery"),
        type: "success",
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
        const productLatestData = res?.data?.items?.find(
          (el: any) => String(el?.id) === String(item?.order_data?.items[0]?.id)
        );

        setPlaceSelectToHideShow(
          productLatestData?.tmsstatus?.status_name === "In Transit to Drop"
        );
        console.log(
          "My Condition",
          productLatestData?.tmsstatus?.status_name === "In Transit to Drop",
          res?.data?.items
        );

        // setPlaceSelectToHideShow(res?.data?.tmsstatus?.id > 4);
        console.log("Success!", res);
      } else {
        setToast({
          top: 45,
          text: res?.message || t("Request Faild"),
          type: "error",
          visible: true,
        });
      }
    } catch (error) {
      console.log("GetIdByOrderFun Error:-", error);
      setToast({
        top: 45,
        text: ErrorHandle(error)?.message || t("Request Faild"),
        type: ErrorHandle(error)?.type,
        visible: true,
      });
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

    return [...backendImages, ...safeImages];
  }

  useEffect(() => {
    if (item) {
      // GetIdByOrderFun();
      GetIdByOrderFun();
      // console.log("item Data", item);

      DropDataSet();
    }
  }, [item]);

  const CommentFun = async () => {
    setCommentError("");
    if (Description.trim() == "") {
      setCommentError(t("Enter a comment"));
      return;
    }
    await StatusUpdateFun(SelectPlace);

    setComment(false);
  };

  useEffect(() => {
    if (DeliveyDataSave !== null) {
      console.log("DeliveyDataSave", DeliveyDataSave);
      setDeliveyDataSave({
        setData: (data: any[]) => {
          // setPhotos(data);
          console.log("Images Data", data);

          setAllSelectImage(data);
          if (data?.length > 0) {
            setComment(true);
          }
        },
      });
    }
  }, [Focused]);
  const goBackToScreen = (screenName: string) => {
    const state = navigation.getState();
    const routes = state.routes;

    // find the index of target screen
    const targetIndex = routes.findIndex((r: any) => r.name === screenName);

    if (targetIndex !== -1) {
      const currentIndex = state.index;
      const screensToPop = currentIndex - targetIndex;
      if (screensToPop > 0) {
        navigation.pop(screensToPop);
      }
    } else {
      // fallback if screen not found — navigate to it fresh
      navigation.navigate(screenName);
    }
  };
  return (
    <SafeAreaView style={styles.container}>
      <DetailsHeader
        title={t("Which order did you place?")}
        Backbutton={false}
      />
      <ScrollView
        style={styles.ContentContainer}
        contentContainerStyle={{ paddingBottom: 50 }}
      >
        <PickUpBox
          IndexActive={false}
          AllisCollapsed={true}
          // defaultExpand={true}
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

        {PlaceSelectToHideShow && (
          <View style={{ marginTop: 10 }}>
            <DropDownBox
              data={DropData || []}
              placeholder={t("Select Place")}
              value={SelectPlace}
              setValue={setSelectPlace}
              labelFieldKey="title"
              valueFieldKey="id"
              fun={(item) => {
                setAlerModalOpen({
                  visible: true,
                  title: t("Camera"),
                  Desctiption: t("You have to take a picture for proof ?"),
                  LButtonText: t("Cancel"),
                  RButtonText: t("Camera"),
                  Icon: Images.UploadPhoto,
                  RButtonStyle: Colors.primary,
                  RColor: Colors.white,
                  onPress: () => {
                    // console.log("items",item);
                    setDeliveyDataSave({
                      Data: ItemsData,
                      selectReason: item,
                      setData: setAllSelectImage,
                    });
                    navigation.navigate("Camera");
                    setAlerModalOpen((prev: any[]) => ({
                      ...prev,
                      visible: false,
                    }));
                  },
                });
              }}
              ContainerStyle={{ width: "100%" }}
              //  StatusUpdateFun
              // disbled={true}
            />
          </View>
        )}

        <View>
          {getMergedImages(ItemsData, AllSelectImage)?.length > 0 && (
            <View style={{ margin: -15 }}>
              <FlatList
                horizontal
                style={{ width: width, padding: 15 }}
                contentContainerStyle={{
                  gap: 10,
                  paddingRight: 30,
                  marginTop: 10,
                }}
                data={getMergedImages(ItemsData, AllSelectImage)}
                renderItem={({ item, index }) => {
                  return (
                    <View style={styles.Image}>
                      <Image
                        source={{ uri: item?.uri || item }}
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
            </View>
          )}

          {!PlaceSelectToHideShow && ItemsData !== null && (
            <FlatList
              scrollEnabled={false}
              contentContainerStyle={styles.ButtonContent}
              data={SelectPlace?.sub_labels || []}
              renderItem={({ item, index }) => {
                return (
                  <TouchableOpacity
                    style={styles.ButtonData}
                    onPress={() => {
                      if (item?.action === "go_back_to_home") {
                        goBackToScreen("FilterScreen");
                      } else if (item?.action === "need_to_scan") {
                        navigation.navigate("Scanner", {
                          type: GloblyTypeSlide,
                        });
                      } else if (item?.action === "reschedule_order") {
                      }
                    }}
                  >
                    <Text style={[styles.Text, { color: Colors.white }]}>
                      {t(item?.title)}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>

        {ItemsData?.tmslogdata_itemcomment?.length > 0 && (
          <View style={{ marginTop: 15 }}>
            <CommentViewBox data={ItemsData?.tmslogdata_itemcomment} />
          </View>
        )}
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
            {/* <View style={styles.Flex}>
                    <Text style={styles.Text}>{t("Write Comment")}</Text>
                    <TouchableOpacity
                      style={styles.CloseButton}
                      onPress={() => setComment(false)}
                    >
                      <Image
                        source={Images.Close}
                        style={{ width: 18, height: 18 }}
                        tintColor={Colors.black}
                      />
                    </TouchableOpacity>
                  </View> */}

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

            <TouchableOpacity style={styles.Button} onPress={CommentFun}>
              <Text style={[styles.Text, { color: Colors.white }]}>
                {t("Submit")}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAwareScrollView>
      </Modal>

      <LoadingModal visible={IsLoading} message={t("Please wait…")} />
    </SafeAreaView>
  );
}
