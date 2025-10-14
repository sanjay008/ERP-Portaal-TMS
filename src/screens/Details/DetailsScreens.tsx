import { Images } from "@/src/assets/images";
import AddCommentModal from "@/src/components/AddCommentModal";
import CommentViewBox from "@/src/components/CommentViewBox";
import ConformationModal from "@/src/components/ConformationModal";
import DetailsHeader from "@/src/components/DetailsHeader";
import MapsViewBox from "@/src/components/MapsViewBox";
import PickUpBox from "@/src/components/PickUpBox";
import TwoTypeButton from "@/src/components/TwoTypeButton";
import TwoTypeInput from "@/src/components/TwoTypeInput";
import { Colors } from "@/src/utils/colors";
import { width } from "@/src/utils/storeData";
import * as ImagePicker from "expo-image-picker";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { styles } from "./styles";
export default function DetailsScreens({ navigation, route }: any) {
  const { item } = route?.params || "";
  const [comment, setComment] = useState<boolean | any>(false);
  const [AllSelectImage, setAllSelectImage] = useState<string[]>([]);
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
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="white" />
      <DetailsHeader title={t("Delivery")} />

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
          {/* <TwoTypeButton
            Icon={Images.Scan}
            title={t("Scan")}
            onPress={() =>
              navigation.navigate("Scanner", {
                AlertModalOpen,
                setAlerModalOpen,
              })
            }
          /> */}
          <TwoTypeButton
            Icon={Images.Photos}
            title={t("Photo")}
            style={{ width: "100%" }}
            onPress={openCamera}
          />
        </View>

        {AllSelectImage?.length > 0 && (
          <FlatList
            horizontal
            style={{ width: width }}
            contentContainerStyle={{ gap: 10, paddingRight: 20 }}
            data={AllSelectImage}
            renderItem={({ item, index }) => {
              return (
                <View style={styles.Image}>
                  <TouchableOpacity
                    style={styles.RemoveButton}
                    onPress={() => CloseDocument(index)}
                  >
                    <Image
                      source={Images?.RemoveParcel}
                      style={{ width: "100%", height: "100%" }}
                    />
                  </TouchableOpacity>
                  <Image
                    source={{ uri: item }}
                    style={{ borderRadius: 7, width: "100%", height: "100%" }}
                  />
                </View>
              );
            }}
          />
        )}

        <Pressable onPress={() => setComment(true)}>
          <TwoTypeInput
            Icon={Images.comment}
            placeholder={t("Write Comment")}
            edit={false}
          />
        </Pressable>

        <CommentViewBox data={[]} />
      </ScrollView>
      <AddCommentModal IsVisible={comment} setIsVisible={setComment} />
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
    </SafeAreaView>
  );
}
