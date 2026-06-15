import apiConstants from "@/src/api/apiConstants";
import { Images } from "@/src/assets/images";
import BottomButton from "@/src/components/BottomButton";
import { useErrorHandle } from "@/src/components/ErrorHandle";
import GpsTrackingStartPopup from "@/src/components/GpsTrackingStartPopup";
import Loader from "@/src/components/loading";
import { GlobalContextData } from "@/src/context/GlobalContext";
import ApiService from "@/src/utils/Apiservice";
import { bootstrapAppDateTime } from "@/src/utils/appDateTime";
import {
  buildDateTime,
  getCurrentTimeString,
  tripOff,
} from "@/src/utils/regionTripApi";
import { clearActiveShift } from "@/src/utils/shiftSession";
import { Colors } from "@/src/utils/colors";
import { getData } from "@/src/utils/storeData";
import React, { useCallback, useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { BackHandler, FlatList, Image, Platform, Pressable, Text, View } from "react-native";
import { styles } from "./styles";

export default function HomeScreens({ navigation, route }: any) {
  const { refresh } = route?.params || {};
  const [AllSlideData, setAllSlideData] = useState([]);
  const [IsLoading, setIsLoading] = useState(false);
  const [tripEndPopupVisible, setTripEndPopupVisible] = useState(false);
  const [tripEndDate, setTripEndDate] = useState("");
  const [tripEndTime, setTripEndTime] = useState("");
  const [isTripEnding, setIsTripEnding] = useState(false);
  const { t } = useTranslation();
  const {
    UserData,
    isGpsTracking,
    setIsGpsTracking,
    activeShift,
    setActiveShift,
    setToast,
    setGloblyTypeSlide,
    TimeZone,
    setTimeZone,
    SelectActiveDate,
    setSelectActiveDate,
    SelectCurrentDate,
    selectRegionData,
  } = useContext(GlobalContextData);
  const { ErrorHandle } = useErrorHandle();
  const getSliderDataFun = async () => {
    setIsLoading(true);
    const CompanyLogin = await getData("COMPANYDATA");
    bootstrapAppDateTime(
      CompanyLogin?.default_company?.timezone,
      setTimeZone,
      setSelectActiveDate,
      SelectActiveDate,
    );


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
        setAllSlideData(res?.data || []);
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

  useEffect(() => {
    if (UserData !== null) {
      getSliderDataFun();
    }
  }, [UserData, refresh]);

  const handleCloseShiftPress = useCallback(() => {
    setTripEndDate(activeShift?.planning_date || SelectCurrentDate || SelectActiveDate || "");
    setTripEndTime(getCurrentTimeString());
    setTripEndPopupVisible(true);
  }, [activeShift?.planning_date, SelectCurrentDate, SelectActiveDate]);

  const handleTripEndConfirm = useCallback(
    async (date: string, time: string) => {
      setTripEndDate(date);
      setTripEndTime(time);
      setIsTripEnding(true);

      try {
        const planning_date =
          activeShift?.planning_date || date;
        const ended_at = buildDateTime(planning_date, time);
        const response = await tripOff({
          UserData,
          region_id: activeShift?.region_id,
          selectRegionData,
          planning_date,
          ended_at,
        });

        if (!response?.status) {
          setToast({
            top: 45,
            text: t(response?.message) || t("Failed to close shift"),
            type: "error",
            visible: true,
          });
          return;
        }

        setTripEndPopupVisible(false);
        setIsGpsTracking(false);

        await new Promise((resolve) => setTimeout(resolve, 150));

        await clearActiveShift();
        setActiveShift(null);
        console.log('[Shift] OFF');
        setToast({
          top: 45,
          text: t("Shift closed successfully"),
          type: "success",
          visible: true,
        });

        if (Platform.OS === "android") {
          setTimeout(() => {
            BackHandler.exitApp();
          }, 2000);
        }
      } catch (error: any) {
        setToast({
          top: 45,
          text: ErrorHandle(error)?.message || t("Failed to close shift"),
          type: "error",
          visible: true,
        });
      } finally {
        setIsTripEnding(false);
      }
    },
    [
      UserData,
      activeShift,
      selectRegionData,
      setActiveShift,
      setIsGpsTracking,
      setToast,
      t,
      ErrorHandle,
    ],
  );

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
              onPress={() => {
                setGloblyTypeSlide(item?.type)
                if (item?.type == "outbound_scan") {
                  navigation.navigate("Scanner", { item: item })
                } else if (item?.type == "AllOrder") {
                  navigation.navigate("ScanDetails", { Type: item?.type })
                } else {
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
      {
        UserData?.user?.role === "chauffeur" &&
        <BottomButton
          visible={Boolean(activeShift?.shiftActive)}
          label={t("Close shift")}
          onPress={handleCloseShiftPress}
        />
      }
      <GpsTrackingStartPopup
        visible={tripEndPopupVisible}
        mode="end"
        initialDate={tripEndDate || activeShift?.planning_date || SelectCurrentDate || SelectActiveDate}
        initialTime={tripEndTime || getCurrentTimeString()}
        regionName={activeShift?.region_name || ""}
        loading={isTripEnding}
        onClose={() => setTripEndPopupVisible(false)}
        onConfirm={handleTripEndConfirm}
      />
    </View>
  );
}
