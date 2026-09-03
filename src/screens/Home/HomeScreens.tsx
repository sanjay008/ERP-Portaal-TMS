import apiConstants from "@/src/api/apiConstants";
import { Images } from "@/src/assets/images";
import { useErrorHandle } from "@/src/components/ErrorHandle";
import GpsPermissionSheet from "@/src/components/GpsPermissionSheet";
import GpsTrackingStartPopup from "@/src/components/GpsTrackingStartPopup";
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
import { getChauffeurLocation } from "@/src/utils/chauffeurLocationCache";
import { Colors } from "@/src/utils/colors";
import {
  REQUIRED_CHAUFFEUR_ROLE,
  sendDriverLocationUpdate,
} from "@/src/utils/driverLocationApi";
import { stopNativeDriverTracking } from "@/src/utils/nativeDriverLocation";
import {
  buildDateTime,
  getCurrentTimeString,
  tripOff,
} from "@/src/utils/regionTripApi";
import { disableShiftLocationGuard } from "@/src/utils/shiftLocationGuard";
import {
  doesShiftBelongToUser,
  isShiftActive,
  wipeShiftLocalData,
} from "@/src/utils/shiftSession";
import { getData } from "@/src/utils/storeData";
import React, { useCallback, useContext, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  AppState,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { styles } from "./styles";

const SlideItem = React.memo(
  function SlideItem({ item, onPress }: { item: any; onPress: (item: any) => void }) {
    const { t } = useTranslation();

    const handlePress = useCallback(() => {
      onPress(item);
    }, [item, onPress]);

    return (
      <Pressable
        style={[
          styles.SlideContainer,
          { backgroundColor: item?.color_code || Colors.Boxgray },
        ]}
        onPress={handlePress}
      >
        <Image
          source={item?.item_image ? { uri: item?.item_image } : Images.userblanck}
          style={[styles.Icon]}
        />
        <Text style={[styles.Text]}>{t(item?.item_title)}</Text>
      </Pressable>
    );
  },
  (prevProps, nextProps) =>
    prevProps.item?.id === nextProps.item?.id &&
    prevProps.item?.color_code === nextProps.item?.color_code &&
    prevProps.item?.item_image === nextProps.item?.item_image &&
    prevProps.item?.item_title === nextProps.item?.item_title &&
    prevProps.item?.type === nextProps.item?.type,
);

export default function HomeScreens({ navigation, route }: any) {
  const { refresh } = route?.params || {};
  const [AllSlideData, setAllSlideData] = useState<any[]>([]);
  const [IsLoading, setIsLoading] = useState(false);
  const [IsRefreshing, setIsRefreshing] = useState(false);
  const [isGpsPermissionLoading, setIsGpsPermissionLoading] = useState(false);
  const [gpsPermissionSheet, setGpsPermissionSheet] = useState<{
    visible: boolean;
    reason: LocationAccessStatus | null;
  }>({ visible: false, reason: null });
  const [tripOffPopupVisible, setTripOffPopupVisible] = useState(false);
  const [isTripOffSubmitting, setIsTripOffSubmitting] = useState(false);
  const pendingFilterItemRef = useRef<any>(null);
  const isMountedRef = useRef(true);
  const hasFetchedRef = useRef(false);
  const { t } = useTranslation();
  const {
    UserData,
    setToast,
    setGloblyTypeSlide,
    setTimeZone,
    SelectActiveDate,
    setSelectActiveDate,
    activeShift,
    setActiveShift,
    setIsGpsTracking,
  } = useContext(GlobalContextData);
  const { ErrorHandle } = useErrorHandle();

  const userId = UserData?.user?.id;
  const verifyToken = UserData?.user?.verify_token;
  const userRole = UserData?.user?.role;
  const relatiesId = UserData?.relaties?.id;
  const showTripOffButton =
    userRole === REQUIRED_CHAUFFEUR_ROLE && doesShiftBelongToUser(activeShift, UserData);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const getSliderDataFun = useCallback(
    async (isPullToRefresh = false) => {
      if (isPullToRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        const CompanyLogin = await getData("COMPANYDATA");
        bootstrapAppDateTime(
          CompanyLogin?.default_company?.timezone,
          setTimeZone,
          setSelectActiveDate,
          SelectActiveDate,
        );

        const res = await ApiService(apiConstants.get_AllSlideDataApi, {
          customData: {
            token: verifyToken,
            role: userRole,
            relaties_id: relatiesId,
            user_id: userId,
          },
        });

        if (!isMountedRef.current) return;

        if (Boolean(res?.status)) {
          const rawList = Array.isArray(res?.data) ? res.data : [];
          const limitedList = rawList.slice(0, 30);
          const seenIds = new Set<string>();
          const uniqueList = limitedList.map((slideItem: any, idx: number) => {
            let safeId = slideItem?.id != null ? String(slideItem.id) : `idx-${idx}`;
            if (seenIds.has(safeId)) {
              safeId = `${safeId}-${idx}`;
            }
            seenIds.add(safeId);
            return { ...slideItem, id: safeId };
          });
          setAllSlideData(uniqueList);
        } else {
          setToast({
            top: 45,
            text: t(res?.message),
            type: "error",
            visible: true,
          });
        }
      } catch (error: any) {
        if (!isMountedRef.current) return;
        setToast({
          top: 45,
          text: ErrorHandle(error)?.message,
          type: "error",
          visible: true,
        });
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [
      userId,
      verifyToken,
      userRole,
      relatiesId,
      SelectActiveDate,
      setTimeZone,
      setSelectActiveDate,
      setToast,
      t,
      ErrorHandle,
    ],
  );

  useEffect(() => {
    if (userId != null && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      getSliderDataFun(false);
    }
  }, [userId, getSliderDataFun]);

  useEffect(() => {
    if (refresh && hasFetchedRef.current) {
      getSliderDataFun(false);
    }
  }, [refresh]);

  const handlePullToRefresh = useCallback(() => {
    getSliderDataFun(true);
  }, [getSliderDataFun]);

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
        if (!isMountedRef.current) return;
        handleGpsPermissionResult(status);
      } finally {
        if (isMountedRef.current) {
          setIsGpsPermissionLoading(false);
        }
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
        if (!isMountedRef.current) return;
        handleGpsPermissionResult(status);
        return;
      }

      await openAppSettings();
    } finally {
      if (isMountedRef.current) {
        setIsGpsPermissionLoading(false);
      }
    }
  }, [gpsPermissionSheet.reason, handleGpsPermissionResult]);

  useEffect(() => {
    if (!gpsPermissionSheet.visible) return;

    const subscription = AppState.addEventListener("change", async (nextState) => {
      if (nextState !== "active") return;

      const status = await recheckLocationAccess();
      if (!isMountedRef.current) return;
      handleGpsPermissionResult(status);
    });

    return () => subscription.remove();
  }, [gpsPermissionSheet.visible, handleGpsPermissionResult]);

  const handleSlidePress = useCallback(
    (slideItem: any) => {
      setGloblyTypeSlide(slideItem?.type);
      if (slideItem?.type == "outbound_scan") {
        navigation.navigate("Scanner", { item: slideItem });
      } else if (slideItem?.type == "driver_photos") {
        navigation.navigate("DriverPhotosScanner", {
          type: "driver_photos",
          item: slideItem,
        });
      } else if (slideItem?.type == "AllOrder") {
        navigation.navigate("ScanDetails", { Type: slideItem?.type });
      } else if (slideItem?.type == "warehouse_change") {
        navigation.navigate("ScanManager", { item: slideItem });
      } else {
        navigation.navigate("FilterScreen", { item: slideItem });
      }
    },
    [navigation, setGloblyTypeSlide],
  );

  const handleTripOffConfirm = useCallback(
    async (date: string, time: string) => {
      if (!doesShiftBelongToUser(activeShift, UserData) || !isShiftActive(activeShift)) {
        setTripOffPopupVisible(false);
        return;
      }

      setIsTripOffSubmitting(true);
      try {
        const planning_date = activeShift!.planning_date;
        const ended_at = buildDateTime(date || planning_date, time);
        const response = await tripOff({
          UserData,
          region_id: activeShift!.region_id,
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

        // Same as location-off close: last loc + is_active=0, then wipe local + stop tracking.
        const cached = getChauffeurLocation();
        if (cached.latitude && cached.longitude) {
          await sendDriverLocationUpdate(
            {
              latitude: cached.latitude,
              longitude: cached.longitude,
              heading: null,
              speed: null,
              accuracy: null,
            },
            UserData,
            activeShift!.region_id,
            planning_date,
            0,
          ).catch(() => undefined);
        }

        await stopNativeDriverTracking().catch(() => undefined);
        await disableShiftLocationGuard().catch(() => undefined);
        await wipeShiftLocalData(activeShift!.region_id, "manual_trip_off");
        setActiveShift(null);
        setIsGpsTracking(false);
        setTripOffPopupVisible(false);

        setToast({
          top: 45,
          text: t(response?.message) || t("Shift closed"),
          type: "success",
          visible: true,
        });
      } catch (error: any) {
        setToast({
          top: 45,
          text: ErrorHandle(error)?.message || t("Failed to close shift"),
          type: "error",
          visible: true,
        });
      } finally {
        if (isMountedRef.current) {
          setIsTripOffSubmitting(false);
        }
      }
    },
    [
      UserData,
      activeShift,
      setActiveShift,
      setIsGpsTracking,
      setToast,
      t,
      ErrorHandle,
    ],
  );

  const keyExtractor = useCallback((item: any) => item?.id, []);

  const renderItem = useCallback(
    ({ item }: any) => <SlideItem item={item} onPress={handleSlidePress} />,
    [handleSlidePress],
  );

  const ListEmptyComponent = useCallback(() => {
    if (IsLoading) return null;
    return (
      <View style={styles.EmptyComponents}>
        <Text>{t("No Data Found")}</Text>
      </View>
    );
  }, [IsLoading, t]);

  const ListFooterComponent = useCallback(() => {
    if (!IsLoading) return null;
    return (
      <View style={styles.EmptyComponents}>
        <Loader />
      </View>
    );
  }, [IsLoading]);

  const handleGpsSheetClose = useCallback(() => {
    pendingFilterItemRef.current = null;
    setGpsPermissionSheet({ visible: false, reason: null });
  }, []);

  return (
    <View style={styles.container}>
      <FlatList
        data={AllSlideData}
        ListEmptyComponent={ListEmptyComponent}
        ListFooterComponent={ListFooterComponent}
        keyExtractor={keyExtractor}
        contentContainerStyle={[
          styles.ContentContainerStyle,
          showTripOffButton ? { paddingBottom: 24 } : null,
        ]}
        renderItem={renderItem}
        removeClippedSubviews={true}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={7}
        updateCellsBatchingPeriod={50}
        refreshControl={
          <RefreshControl refreshing={IsRefreshing} onRefresh={handlePullToRefresh} />
        }
      />

      {showTripOffButton ? (
        <View style={styles.TripOffFooter}>
          <Pressable
            style={[
              styles.TripOffButton,
              { opacity: isTripOffSubmitting ? 0.7 : 1 },
            ]}
            onPress={() => setTripOffPopupVisible(true)}
            disabled={isTripOffSubmitting}
          >
            {isTripOffSubmitting ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.TripOffButtonText}>{t("Close shift")}</Text>
            )}
          </Pressable>
        </View>
      ) : null}

      <GpsTrackingStartPopup
        visible={tripOffPopupVisible}
        mode="end"
        initialDate={activeShift?.planning_date || ""}
        initialTime={getCurrentTimeString()}
        regionName={activeShift?.region_name || ""}
        loading={isTripOffSubmitting}
        onClose={() => {
          if (!isTripOffSubmitting) {
            setTripOffPopupVisible(false);
          }
        }}
        onConfirm={handleTripOffConfirm}
      />

      <GpsPermissionSheet
        visible={gpsPermissionSheet.visible}
        reason={gpsPermissionSheet.reason}
        loading={isGpsPermissionLoading}
        onClose={handleGpsSheetClose}
        onPrimaryAction={handleGpsSheetPrimaryAction}
      />
    </View>
  );
}
