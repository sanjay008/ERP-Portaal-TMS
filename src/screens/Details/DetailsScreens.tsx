import apiConstants from "@/src/api/apiConstants";
import { Images } from "@/src/assets/images";
import AddCommentModal from "@/src/components/AddCommentModal";
import CommentViewBox from "@/src/components/CommentViewBox";
import ConformationModal from "@/src/components/ConformationModal";
import DetailsHeader from "@/src/components/DetailsHeader";
import { useErrorHandle } from "@/src/components/ErrorHandle";
import LoadingModal from "@/src/components/LoadingModal";
import MapsViewBox from "@/src/components/MapsViewBox";
import PickUpBox from "@/src/components/PickUpBox";
import TwoTypeButton from "@/src/components/TwoTypeButton";
import TwoTypeInput from "@/src/components/TwoTypeInput";
import { GlobalContextData } from "@/src/context/GlobalContext";
import { Colors } from "@/src/utils/colors";
import { token } from "@/src/utils/storeData";
import axios from "axios";
import * as IntentLauncher from "expo-intent-launcher";
// import { Image } from "expo-image";
import ApiService from "@/src/utils/Apiservice";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { StatusBar } from "expo-status-bar";
import React, { useContext, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  FlatList,
  Image,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { styles } from "./styles";
export default function DetailsScreens({ navigation, route }: any) {
  const { item } = route?.params || "";
  const { ErrorHandle } = useErrorHandle();
  const { UserData, setUserData, Toast, setToast } =
    useContext(GlobalContextData);
  const [ItemsData, setItemsData] = useState(item);
  const [comment, setComment] = useState<boolean | any>(false);
  const [AllSelectImage, setAllSelectImage] = useState<any[]>([]);
  const [LableLoading, setLableLoading] = useState<boolean>(false);
  const [IsLoading, setIsLoading] = useState<boolean>(false);
  const { t } = useTranslation();
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
  // const openCamera = async () => {
  //   try {
  //     const permission = await ImagePicker.requestCameraPermissionsAsync();
  //     if (!permission.granted) {
  //       Alert.alert(t("Permission required", "Please allow camera access"));
  //       return;
  //     }

  //     let result = await ImagePicker.launchCameraAsync({
  //       allowsEditing: true,
  //       quality: 1,
  //     });

  //     if (!result.canceled) {
  //       const imagesToSend = result.assets.map((asset, index) => ({
  //         uri: asset.uri,
  //         name: asset.fileName || `image_${Date.now()}.jpg`,
  //         type: asset.type === "image" ? "image/jpeg" : asset.type,
  //       }));
  //       setAllSelectImage((pre) => [...pre, ...imagesToSend]);
  //     }
  //   } catch (err) {
  //     console.log(err);
  //   }
  // };

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
    try {
      let res = await ApiService(apiConstants.get_order_data_by_id, {
        customData: {
          token: token,
          role: UserData?.user?.role,
          relaties_id: UserData?.relaties?.id,
          user_id: UserData?.user?.id,
          order_id: ItemsData?.id || ItemsData?.order_data?.id,
        },
      });
      if (res?.status) {
        setItemsData(res?.data);
        // console.log("Success!", res);
      }
    } catch (error) {
      console.log("GetIdByOrderFun Error:-", error);
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
      formData.append("item_id", "");

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

      console.log("respone commm", res);
   
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
        // Ensure URI format
        uri: img?.shared_link
          ? getDirectDropboxLink(img.shared_link)
          : img?.uri ?? "",
      }))
      .filter((img: any) => img.uri !== "");

    return [...backendImages, ...safeImages];
  }

  const BackOrderFun = async (lable: string) => {
    setLableLoading(true);
    try {
      let res = await ApiService(apiConstants.missed_backorder, {
        customData: {
          token: token,
          role: UserData?.user?.role,
          relaties_id: UserData?.relaties?.id,
          user_id: UserData?.user?.id,
          order_id: ItemsData?.id || ItemsData?.order_data?.id,
          item_lable: lable,
        },
      });
      if (res?.status) {
        // console.log("Success!", res);
        setToast({
          top: 45,
          text: res?.message,
          type: "success",
          visible: true,
        });
        GetIdByOrderFun();
      }
    } catch (error) {
      console.log("Lable Change Data Error:-", error);
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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="white" />
      <DetailsHeader
        title={t("Delivery")}
        // button={true}
        // Scan={true}
        // onPress={}
        // buttonText={item?.tmsstatus?.id == 1 ? t("Back Order") : t("Missed")}
      />

      <ScrollView
        style={[
          styles.ViewContainer,
          { paddingTop: 15, gap: 15, backgroundColor: Colors.background },
        ]}
        contentContainerStyle={[styles.ContainerStyle, { paddingBottom: 50 }]}
        bounces={false}
      >
        <View style={styles.Flex}>
          <TouchableOpacity
            style={[styles.BackButton]}
            onPress={() =>
              BackOrderFun(
                ItemsData?.tmsstatus?.id == 1 ? "Backorder" : "Missed"
              )
            }
          >
            <Text style={[styles.Text, { color: Colors.white }]}>
              {ItemsData?.tmsstatus?.id == 1
                ? t("Back Order")
                : t("Missing") || t("title")}
            </Text>
          </TouchableOpacity>
          <TwoTypeButton
            onlyIcon={true}
            Icon={Images.Scan}
            style={{ width: 46, height: 46 }}
            onPress={() =>
              navigation.navigate("Scanner", { fun: GetIdByOrderFun })
            }
          />
        </View>
        <PickUpBox
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
          onPress={() => navigation.navigate("MapScreens", { data: ItemsData })}
        />

        <View style={styles.Flex}>
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
                      style={{ borderRadius: 7, width: "100%", height: "100%" }}
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

        <Pressable onPress={() => setComment(true)}>
          <TwoTypeInput
            Icon={Images.comment}
            placeholder={t("Write Comment")}
            edit={false}
          />
        </Pressable>

        <CommentViewBox data={ItemsData?.tmslogdata_itemcomment} />
      </ScrollView>
      <AddCommentModal
        IsVisible={comment}
        setIsVisible={setComment}
        fun={AddImageOrCommentFun}
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

      <LoadingModal
        visible={IsLoading || LableLoading}
        message={t("Please wait…")}
      />
    </SafeAreaView>
  );
}
