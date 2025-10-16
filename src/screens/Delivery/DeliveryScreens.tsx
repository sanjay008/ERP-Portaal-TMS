import apiConstants from "@/src/api/apiConstants";
import { Images } from "@/src/assets/images";
import AddCommentModal from "@/src/components/AddCommentModal";
import ConformationModal from "@/src/components/ConformationModal";
import DetailsHeader from "@/src/components/DetailsHeader";
import DropDownBox from "@/src/components/DropDownBox";
import PickUpBox from "@/src/components/PickUpBox";
import TwoTypeButton from "@/src/components/TwoTypeButton";
import TwoTypeInput from "@/src/components/TwoTypeInput";
import { GlobalContextData } from "@/src/context/GlobalContext";
import ApiService from "@/src/utils/Apiservice";
import { Colors } from "@/src/utils/colors";
import { token, width } from "@/src/utils/storeData";
import * as ImagePicker from "expo-image-picker";
import React, { useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  FlatList,
  Image,
  Pressable,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { styles } from "./style";
export default function DeliveryScreens({ route, navigation}: any) {
  const { item } = route?.params || "";
  const [DropData, setDropData] = useState<object[]>([]);
  const [SelectPlace, setSelectPlace] = useState<object | any>(null);
  const [comment, setComment] = useState<boolean | any>(false);
  const [AllSelectImage, setAllSelectImage] = useState<string[]>([]);
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

    setDropData(dataArray);
  };

  useEffect(()=>{
    DropDataSet();
  },[item])

  const StatusUpdateFun = async (selectReason:string) => {
    console.log(selectReason);
    // return
    
    try {
      let res = await ApiService(apiConstants.status_update, {
        customData: {
          token: token,
          role: UserData?.user?.role,
          relaties_id: 1307,
          user_id: UserData?.user?.id,
          item_id:item?.order_data?.items[0]?.id,
          order_id: item?.order_data?.items[0]?.tms_order_id,
        },
      });
      if (res?.status) {
        console.log("Success!", res);
        // fun();
       navigation.pop(2);
      }
    } catch (error) {
      console.log("Status Update Error:", error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <DetailsHeader title={t("Which order did you place?")} />
      <View style={styles.ContentContainer}>
        <PickUpBox
          IndexActive={false}
          index={item?.order_data?.id}
          LableStatus={item?.order_data?.tmsstatus?.status_name}
          OrderId={item?.order_data?.id}
          ProductItem={item?.order_data?.items}
          LableBackground={item?.order_data?.tmsstatus?.color}
          start={item?.order_data?.pickup_location}
          end={item?.order_data?.deliver_location}
          customerData={item?.order_data?.customer}
          statusData={item?.order_data?.tmsstatus}
          DeliveryLable = {true}
        />

        <View style={{ marginTop: 10 }}>
          <DropDownBox
            data={DropData || []}
            placeholder={t("Select Place")}
            value={SelectPlace}
            setValue={setSelectPlace}
            labelFieldKey="name"
            valueFieldKey="id"
            fun={StatusUpdateFun}
            ContainerStyle={{ width: "100%" }}
            // disbled={true}
          />
        </View>

        {!(SelectPlace !== null && SelectPlace) && (
          <View>
            <View style={{ marginVertical: 10 }}>
              <TwoTypeButton
                Icon={Images.UploadPhoto}
                title={t("Upload Photo")}
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

            <Pressable onPress={() => setComment(true)}>
              <TwoTypeInput
                Icon={Images.comment}
                placeholder={t("Write Comment")}
                edit={false}
              />
            </Pressable>
          </View>
        )}
      </View>
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
