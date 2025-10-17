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
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { StatusBar } from "expo-status-bar";
import React, { useContext, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  Text,
  View
} from "react-native";
import FastImage from "react-native-fast-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { styles } from "./styles";
export default function DetailsScreens({ navigation, route }: any) {
  const { item } = route?.params || "";
  const { ErrorHandle } = useErrorHandle();
  const { UserData, setUserData, Toast, setToast } =
    useContext(GlobalContextData);
  const [comment, setComment] = useState<boolean | any>(false);
  const [AllSelectImage, setAllSelectImage] = useState<any[]>([]);
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
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(t("Permission required", "Please allow camera access"));
        return;
      }

      let result = await ImagePicker.launchCameraAsync();
      if (!result.canceled) {
        const imagesToSend = result.assets.map((asset, index) => ({
          uri: asset.uri,
          name: asset.fileName || `image_${index}.jpg`,
          type: asset.type === "image" ? "image/jpeg" : asset.type,
        }));
        setAllSelectImage((pre: any) => [...pre, ...imagesToSend]);
      }
    } catch (err) {
      console.log(err);
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

  const AddImageOrCommentFun = async (comment: string = "", data = []) => {
    setIsLoading(true);
    try {
      let formData: any = new FormData();

      formData.append("token", token);
      formData.append("role", UserData?.user?.role);
      formData.append("relaties_id", 1307);
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
          name: img.name || `image_${Date.now()}.jpg`,
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

  function getMergedImages(item: any, AllSelectImage: any) {
    if (!item) return [...AllSelectImage];

    const backendImages = (item.tmslogdata_itemcomment || [])
      .filter((el: any) => el.tmsimgdata && el.tmsimgdata.length > 0)
      .flatMap((el: any) => el.tmsimgdata);

    const mergedImages = [...backendImages, ...AllSelectImage];

    return mergedImages;
  }

  const BackOrderFun = async () => {};

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="white" />
      <DetailsHeader
        title={t("Delivery")}
        button={true}
        buttonText={item?.tmsstatus?.id == 1 ? t("Back Order") : t("Missed")}
      />

      <ScrollView
        style={[
          styles.ViewContainer,
          { paddingTop: 15, gap: 15, backgroundColor: Colors.background },
        ]}
        contentContainerStyle={[styles.ContainerStyle, { paddingBottom: 50 }]}
        bounces={false}
      >
        <PickUpBox
          LableStatus={item?.tmsstatus?.status_name}
          OrderId={item?.id}
          ProductItem={item?.items}
          LableBackground={item?.tmsstatus?.color}
          start={item?.pickup_location}
          end={item?.deliver_location}
          customerData={item?.customer}
          contact={true}
        />

        <MapsViewBox />

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

        <FlatList
          horizontal
          style={{ flexGrow:1,margin:-15,marginVertical:10}}
          ListEmptyComponent={() => (
            <View style={styles.FooterContainer}>
              <Text style={[styles.Text, { color: Colors.darkText }]}>
                {t("No Order Found")}
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
          contentContainerStyle={{ gap: 10, paddingRight: 50,paddingLeft:15 }}
          data={getMergedImages(item, AllSelectImage)}
          renderItem={({ item, index }) => {
            const uri = item.shared_link
              ? getDirectDropboxLink(item.shared_link)
              : item.uri;
              if (!uri) return null;
            return (
              <View style={styles.Image}>
                <FastImage
                  source={{ uri: uri,priority:FastImage.priority.normal }}
                  style={{ borderRadius: 7, width: "100%", height: "100%" }}
                  resizeMode={FastImage.resizeMode.cover}
                />
              </View>
            );
          }}
          keyExtractor={(item, index) =>
            item.id?.toString() || index.toString()
          }
        />

        <Pressable onPress={() => setComment(true)}>
          <TwoTypeInput
            Icon={Images.comment}
            placeholder={t("Write Comment")}
            edit={false}
          />
        </Pressable>

        <CommentViewBox data={item?.tmslogdata_itemcomment} />
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

      <LoadingModal visible={IsLoading} message={t("Please wait…")} />
    </SafeAreaView>
  );
}
