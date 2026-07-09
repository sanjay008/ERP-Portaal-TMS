import apiConstants from "@/src/api/apiConstants";
import { Images } from "@/src/assets/images";
import { useErrorHandle } from "@/src/components/ErrorHandle";
import GpsPermissionSheet from "@/src/components/GpsPermissionSheet";
import Loader from "@/src/components/loading";
import { GlobalContextData } from "@/src/context/GlobalContext";
import {
  type LocationAccessStatus,
  openAppSettings,
  recheckLocationAccess,
  resolveLocationAccess,
  retryLocationPermission,
} from "@/src/hooks/useUserGPS";
import ApiService from "@/src/utils/Apiservice";
import { bootstrapAppDateTime } from "@/src/utils/appDateTime";
import { Colors } from "@/src/utils/colors";
import { getData } from "@/src/utils/storeData";
import React, { useCallback, useContext, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { AppState, FlatList, Image, Pressable, Text, View } from "react-native";
import { styles } from "./styles";

export default function HomeScreens({ navigation, route }: any) {
  const { refresh } = route?.params || {};
  const [AllSlideData, setAllSlideData] = useState([]);
  const [IsLoading, setIsLoading] = useState(false);
  const [isGpsPermissionLoading, setIsGpsPermissionLoading] = useState(false);
  const [gpsPermissionSheet, setGpsPermissionSheet] = useState<{
    visible: boolean;
    reason: LocationAccessStatus | null;
  }>({ visible: false, reason: null });
  const pendingFilterItemRef = useRef<any>(null);
  const { t } = useTranslation();
  const {
    UserData,
    setToast,
    setGloblyTypeSlide,
    TimeZone,
    setTimeZone,
    SelectActiveDate,
    setSelectActiveDate,
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

      console.log("apiConstants.get_AllSlideDataApi", apiConstants.get_AllSlideDataApi, {
        token: UserData?.user?.verify_token,
        role: UserData?.user?.role,
        relaties_id: UserData?.relaties?.id,
        user_id: UserData?.user?.id,
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

  const navigateToFilterScreen = useCallback(
    (slideItem: any) => {
      setGloblyTypeSlide(slideItem?.type);
      navigation.navigate("FilterScreen", { item: slideItem });
    },
    [navigation, setGloblyTypeSlide],
  );

  const handleGpsPermissionResult = useCallback(
    (status: LocationAccessStatus) => {
      if (status === "granted") {
        setGpsPermissionSheet({ visible: false, reason: null });
        const pendingItem = pendingFilterItemRef.current;
        pendingFilterItemRef.current = null;
        if (pendingItem) {
          navigateToFilterScreen(pendingItem);
        }
        return;
      }

      setGpsPermissionSheet({ visible: true, reason: status });
    },
    [navigateToFilterScreen],
  );

  const handlePickupDropoffPress = useCallback(
    async (slideItem: any) => {
      pendingFilterItemRef.current = slideItem;
      setIsGpsPermissionLoading(true);
      try {
        const status = await resolveLocationAccess();
        handleGpsPermissionResult(status);
      } finally {
        setIsGpsPermissionLoading(false);
      }
    },
    [handleGpsPermissionResult],
  );

  const handleGpsSheetPrimaryAction = useCallback(async () => {
    const reason = gpsPermissionSheet.reason;
    if (!reason || reason === "granted") return;

    setIsGpsPermissionLoading(true);
    try {
      if (reason === "denied" || reason === "services_disabled") {
        const status = await retryLocationPermission();
        handleGpsPermissionResult(status);
        return;
      }

      await openAppSettings();
    } finally {
      setIsGpsPermissionLoading(false);
    }
  }, [gpsPermissionSheet.reason, handleGpsPermissionResult]);

  useEffect(() => {
    if (!gpsPermissionSheet.visible) return;

    const subscription = AppState.addEventListener("change", async (nextState) => {
      if (nextState !== "active") return;

      const status = await recheckLocationAccess();
      handleGpsPermissionResult(status);
    });

    return () => subscription.remove();
  }, [gpsPermissionSheet.visible, handleGpsPermissionResult]);

  const handleSlidePress = useCallback(
    (slideItem: any) => {
      if (slideItem?.type === "pickup_dropoff") {
        handlePickupDropoffPress(slideItem);
        return;
      }

      setGloblyTypeSlide(slideItem?.type);
      if (slideItem?.type == "outbound_scan") {
        navigation.navigate("Scanner", { item: slideItem });
      } else if (slideItem?.type == "AllOrder") {
        navigation.navigate("ScanDetails", { Type: slideItem?.type });
      } else if (slideItem?.type == "warehouse_change") {
        navigation.navigate("ScanManager", { item: slideItem });
      } else {
        navigation.navigate("FilterScreen", { item: slideItem });
      }
    },
    [handlePickupDropoffPress, navigation, setGloblyTypeSlide],
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
              onPress={() => handleSlidePress(item)}
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
      <GpsPermissionSheet
        visible={gpsPermissionSheet.visible}
        reason={gpsPermissionSheet.reason}
        loading={isGpsPermissionLoading}
        onClose={() => {
          pendingFilterItemRef.current = null;
          setGpsPermissionSheet({ visible: false, reason: null });
        }}
        onPrimaryAction={handleGpsSheetPrimaryAction}
      />
    </View>
  );
}
