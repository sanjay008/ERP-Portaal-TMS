import apiConstants from "@/src/api/apiConstants";
import { Images } from "@/src/assets/images";
import { useErrorHandle } from "@/src/components/ErrorHandle";
import Loader from "@/src/components/loading";
import { GlobalContextData } from "@/src/context/GlobalContext";
import ApiService from "@/src/utils/Apiservice";
import { Colors } from "@/src/utils/colors";
import { token } from "@/src/utils/storeData";
import React, { useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, Image, Pressable, Text, View } from "react-native";
import { styles } from "./styles";

export default function HomeScreens({ navigation, route }: any) {
  const { refresh } = route?.params || {};
  const [AllSlideData, setAllSlideData] = useState([]);
  const [IsLoading, setIsLoading] = useState(false);
  const { t } = useTranslation();
  const { UserData, setUserData, Toast, setToast, AllRegion, setAllRegion,GloblyTypeSlide,setGloblyTypeSlide} =
    useContext(GlobalContextData);
  const { ErrorHandle } = useErrorHandle();

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

      if (Boolean(res.status)) {
        setAllSlideData(res?.data || []);
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

  useEffect(() => {
    if (UserData !== null) {
      getSliderDataFun();
    }
  }, [UserData, refresh]);

  return (
    <View style={styles.container}>
      <FlatList
        data={AllSlideData}
        ListEmptyComponent={() =>
          !IsLoading && (
            <View style={styles.EmptyComponents}>
              <Text>{t("No Data Found")}</Text>
            </View>
          )
        }
        ListFooterComponent={() =>
          IsLoading && (
            <View style={styles.EmptyComponents}>
              <Loader />
            </View>
          )
        }
        contentContainerStyle={styles.ContentContainerStyle}
        renderItem={({ item, index }: any) => {
          return (
            <Pressable
              key={item?.id}
              style={[
                styles.SlideContainer,
                { backgroundColor: item?.color_code || Colors.Boxgray },
              ]}
              onPress={() =>{
                setGloblyTypeSlide(item?.type)
                if(item?.type == "outbound_scan"){
                  navigation.navigate("Scanner", { item: item })
                }else{
                  navigation.navigate("FilterScreen", { item: item })
                }
              }
              }
            >
              <Image
                source={
                  item?.item_image
                    ? { uri: item?.item_image }
                    : Images.userblanck
                }
                style={styles.Icon}
              />
              <Text style={styles.Text}>{t(item?.item_title)}</Text>
            </Pressable>
          );
        }}
      />
    </View>
  );
}
