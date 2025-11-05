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
  const { refresh } = route?.parmas || "";
  const [AllSlideData, setAllSlideData] = useState([]);
  const [IsLoading, setIsLoading] = useState(false);
  const { t } = useTranslation();
  const { UserData, setUserData, Toast, setToast, AllRegion, setAllRegion } =
    useContext(GlobalContextData);
  const { ErrorHandle } = useErrorHandle();
  const getSliderDataFun = async () => {
    setIsLoading(true);
 
    try {
      let res = await ApiService(apiConstants.get_AllSlideDataApi, {
        customData: {
          // token: userData?.user?.verify_token,
          token: token,
          role: UserData?.user?.role,
          //   relaties_id: userData?.relaties?.id,
          relaties_id: 1307,
          user_id: UserData?.user?.id,
        },
      });
      //   console.log("res Slide", res);

      if (Boolean(res.status)) {
        setAllSlideData(res?.data || []);
      }
    } catch (error) {
      console.log("Get All Slide Data Error:-", error);
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

  useEffect(() => {
    if (AllSlideData?.length == 0 && UserData!==null) {
      getSliderDataFun();
    }
  }, [UserData]);

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
              onPress={() =>
                navigation.navigate("FilterScreen", { item: item })
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
              <Text style={styles.Text}>{item?.item_title}</Text>
            </Pressable>
          );
        }}
      />
    </View>
  );
}
