import apiConstants from "@/src/api/apiConstants";
import { Images } from "@/src/assets/images";
import AdditionalStopBox from "@/src/components/AdditionalStopBox";
import AnimatedTooltip from "@/src/components/AnimatedTooltip";
import CalenderDate from "@/src/components/CalenderDate";
import CustomHeader from "@/src/components/CustomHeader";
import DropDownBox from "@/src/components/DropDownBox";
import { useErrorHandle } from "@/src/components/ErrorHandle";
import GpsPermissionSheet from "@/src/components/GpsPermissionSheet";
import GpsTrackingStartPopup from "@/src/components/GpsTrackingStartPopup";
import Loader from "@/src/components/loading";
import ParcelVerifyOverlays from "@/src/components/ParcelVerifyOverlays";
import PickUpBox from "@/src/components/PickUpBox";
import SearchInput from "@/src/components/SearchInput";
import TwoTypeButton from "@/src/components/TwoTypeButton";
import { GlobalContextData } from "@/src/context/GlobalContext";
import { useParcelVerifyFlow } from "@/src/hooks/useParcelVerifyFlow";
import {
  type LocationAccessStatus,
  openAppSettings,
  recheckLocationAccess,
  resolveLocationAccess,
  retryLocationPermission,
} from "@/src/hooks/useUserGPS";
import ApiService from "@/src/utils/Apiservice";
import { Colors } from "@/src/utils/colors";
import {
  buildDateTime,
  getCurrentTimeString,
  tripOn,
} from "@/src/utils/regionTripApi";
import {
  deactivateActiveShift,
  loadShiftFromRegistry,
  saveActiveShift,
  saveShiftToRegistry,
  saveTrackingRegion,
  isShiftActiveForRegion,
  type ActiveShiftSession,
} from "@/src/utils/shiftSession";
import { Ionicons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AppState,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { styles } from "./styles";

export default function FilterScreen({ navigation, route }: any) {
  const { item, Type } = route?.params || {};
  const [SlideType, setSlideType] = useState(item?.type || Type);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [tooltipMessage, setTooltipMessage] = useState('');
  const Focused = useIsFocused();
  const [ScanerbtnDisableTiptool, setScanerbtnDisableTiptool] = useState(false);
  const {
    UserData,
    setUserData,
    Toast,
    setToast,
    AllRegion,
    setAllRegion,
    SelectCurrentDate,
    GloblyTypeSlide,
    setSelectCurrentDate,
    AllDeliveyLabel, setAllDeliveyLabel,
    setSelectCurrentDeliveryLabel,
    AllDamageListReason, setAllDamageListReason,
    selectRegionData, setSelectRegionData,
    isGpsTracking, setIsGpsTracking,
    activeShift, setActiveShift,
    SelectActiveDate, setSelectActiveDate,

  } = useContext(GlobalContextData);
  const [SelectDate, setSelectDate] = useState<string>(SelectActiveDate || "");
  const [IsLoading, setLoading] = useState<boolean>(false);
  const [AllFilterData, setAllFilterDataGet] = useState<object[]>([]);
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [isCollapsed, setisCollapsed] = useState<boolean>(true);
  const { ErrorHandle } = useErrorHandle();
  const [ScanBTNAvailble, setScanBTNAvailble] = useState<boolean>(
    !(GloblyTypeSlide == "pickup_dropoff")
  );
  const [RegionOrderData, setRegionOrderData] = useState([]);
  const [TemopryryDataStore, setTemopryryDataStore] = useState([]);
  const [TotalCountParcel, setTotalCountParcel] = useState<{ pickup: number, dropoff: number }>({ pickup: 0, dropoff: 0 });
  const [isGpsPermissionLoading, setIsGpsPermissionLoading] = useState(false);
  const [gpsPermissionSheet, setGpsPermissionSheet] = useState<{
    visible: boolean;
    reason: LocationAccessStatus | null;
  }>({ visible: false, reason: null });
  const [gpsStartPopupVisible, setGpsStartPopupVisible] = useState(false);
  const [gpsTrackingStartDate, setGpsTrackingStartDate] = useState("");
  const [gpsTrackingStartTime, setGpsTrackingStartTime] = useState("");
  const [isTripSubmitting, setIsTripSubmitting] = useState(false);
  const [Loading, setIsLoading] = useState(false);
  const [deviceLocationStatus, setDeviceLocationStatus] =
    useState<LocationAccessStatus>('denied');

  const isPickupDropoffChauffeur = useMemo(
    () =>
      (GloblyTypeSlide === 'pickup_dropoff' || SlideType === 'pickup_dropoff') &&
      UserData?.user?.role === 'chauffeur',
    [GloblyTypeSlide, SlideType, UserData?.user?.role],
  );

  const isDeviceLocationReady = deviceLocationStatus === 'granted';

  const isShiftReadyForRegion = useMemo(
    () => isShiftActiveForRegion(activeShift, selectRegionData?.id),
    [activeShift, selectRegionData?.id],
  );

  const isRouteReady = isDeviceLocationReady && isShiftReadyForRegion;

  const shiftBlockedMessage = t(
    'Please start your shift for the selected region before continuing.',
  );
  const selectRegionFirstMessage = t(
    'Please select a region first, then start your shift.',
  );

  const syncTrackingFlag = useCallback(
    (locationStatus: LocationAccessStatus, shiftActive: boolean) => {
      setDeviceLocationStatus(locationStatus);
      if (UserData?.user?.role === 'chauffeur') {
        setIsGpsTracking(true);
        return;
      }
      setIsGpsTracking(locationStatus === 'granted' && shiftActive);
    },
    [setIsGpsTracking, UserData?.user?.role],
  );

  const handleGpsPermissionResult = useCallback(
    (status: LocationAccessStatus) => {
      if (status === 'granted') {
        setGpsPermissionSheet({ visible: false, reason: null });
        syncTrackingFlag('granted', isShiftReadyForRegion);
        return;
      }

      syncTrackingFlag(status, isShiftReadyForRegion);
      setGpsPermissionSheet({ visible: true, reason: status });
    },
    [isShiftReadyForRegion, syncTrackingFlag],
  );

  const handleLocationIconPress = useCallback(async () => {
    setIsGpsPermissionLoading(true);
    try {
      const status = await resolveLocationAccess();
      handleGpsPermissionResult(status);
    } finally {
      setIsGpsPermissionLoading(false);
    }
  }, [handleGpsPermissionResult]);

  const handleShiftIconPress = useCallback(async () => {
    if (!isDeviceLocationReady) {
      await handleLocationIconPress();
      return;
    }

    if (!selectRegionData) {
      setTooltipMessage(selectRegionFirstMessage);
      setTooltipVisible(true);
      return;
    }

    setGpsTrackingStartDate(SelectDate || '');
    setGpsTrackingStartTime(getCurrentTimeString());
    setGpsStartPopupVisible(true);
  }, [
    SelectDate,
    handleLocationIconPress,
    isDeviceLocationReady,
    selectRegionData,
    selectRegionFirstMessage,
    t,
  ]);

  const handleGpsStartConfirm = useCallback(
    async (date: string, time: string) => {
      if (!selectRegionData) {
        setTooltipMessage(selectRegionFirstMessage);
        setTooltipVisible(true);
        return;
      }

      setIsGpsPermissionLoading(true);
      let access: LocationAccessStatus;
      try {
        access = await resolveLocationAccess();
      } finally {
        setIsGpsPermissionLoading(false);
      }
      if (access !== "granted") {
        setGpsStartPopupVisible(false);
        handleGpsPermissionResult(access);
        return;
      }

      setGpsTrackingStartDate(date);
      setGpsTrackingStartTime(time);
      setIsTripSubmitting(true);

      try {
        const started_at = buildDateTime(date, time);
        const response = await tripOn({
          UserData,
          selectRegionData,
          planning_date: date,
          started_at,
        });

        if (!response?.status) {
          setToast({
            top: 45,
            text: t(response?.message) || t("Failed to start trip"),
            type: "error",
            visible: true,
          });
          return;
        }

        const session: ActiveShiftSession = {
          shiftActive: true,
          region_id: selectRegionData?.id,
          region_name: selectRegionData?.name || "",
          planning_date: date,
          started_at,
          user_id: UserData?.user?.id,
          relaties_id: UserData?.relaties?.id,
          role: UserData?.user?.role,
        };
        await saveActiveShift(session);
        await saveShiftToRegistry(session);
        setActiveShift(session);
        setSelectCurrentDate(date);
        await saveTrackingRegion({
          region_id: selectRegionData?.id,
          planning_date: date,
        });
        console.log('[Shift] ON', session);

        setGpsStartPopupVisible(false);
        syncTrackingFlag('granted', true);
      } catch (error: any) {
        setToast({
          top: 45,
          text: ErrorHandle(error)?.message || t("Failed to start trip"),
          type: "error",
          visible: true,
        });
      } finally {
        setIsTripSubmitting(false);
      }
    },
    [
      UserData,
      selectRegionData,
      selectRegionFirstMessage,
      handleGpsPermissionResult,
      syncTrackingFlag,
      setActiveShift,
      setSelectCurrentDate,
      setToast,
      t,
      ErrorHandle,
    ],
  );

  const handleGpsSheetPrimaryAction = useCallback(async () => {
    const reason = gpsPermissionSheet.reason;
    if (!reason || reason === 'granted') return;

    setIsGpsPermissionLoading(true);
    try {
      if (reason === 'denied' || reason === 'services_disabled') {
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

    const subscription = AppState.addEventListener('change', async (nextState) => {
      if (nextState !== 'active') return;

      const status = await recheckLocationAccess();
      if (status === 'granted') {
        setGpsPermissionSheet({ visible: false, reason: null });
        syncTrackingFlag('granted', isShiftReadyForRegion);
        return;
      }

      syncTrackingFlag(status, isShiftReadyForRegion);
      setGpsPermissionSheet((prev) =>
        prev.visible ? { visible: true, reason: status } : prev,
      );
    });

    return () => subscription.remove();
  }, [gpsPermissionSheet.visible, isShiftReadyForRegion, syncTrackingFlag]);

  const shouldMonitorDeviceGps =
    Focused && isPickupDropoffChauffeur;

  useEffect(() => {
    if (!shouldMonitorDeviceGps) return;

    let cancelled = false;

    const syncDeviceGpsStatus = async () => {
      if (cancelled) return;

      const status = await recheckLocationAccess();
      if (cancelled) return;

      if (status === 'granted') {
        setGpsPermissionSheet((prev) =>
          prev.visible ? { visible: false, reason: null } : prev,
        );
        syncTrackingFlag('granted', isShiftReadyForRegion);
        return;
      }

      syncTrackingFlag(status, isShiftReadyForRegion);
      setGpsPermissionSheet({ visible: true, reason: status });
    };

    syncDeviceGpsStatus();
    const intervalId = setInterval(syncDeviceGpsStatus, 4000);
    const appStateSub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        syncDeviceGpsStatus();
      }
    });

    return () => {
      cancelled = true;
      clearInterval(intervalId);
      appStateSub.remove();
    };
  }, [shouldMonitorDeviceGps, isShiftReadyForRegion, syncTrackingFlag]);

  useEffect(() => {
    if (SelectActiveDate && !SelectDate) {
      setSelectDate(SelectActiveDate);
    }
  }, [SelectActiveDate, SelectDate]);

  useEffect(() => {
    if (
      !isPickupDropoffChauffeur ||
      !isShiftReadyForRegion ||
      !selectRegionData?.id ||
      !SelectDate
    ) {
      return;
    }

    saveTrackingRegion({
      region_id: selectRegionData.id,
      planning_date: SelectDate,
    }).catch(() => undefined);
  }, [
    isPickupDropoffChauffeur,
    isShiftReadyForRegion,
    selectRegionData?.id,
    SelectDate,
  ]);

  useEffect(() => {
    if (
      !isPickupDropoffChauffeur ||
      !isShiftReadyForRegion ||
      !SelectDate ||
      !activeShift?.region_id
    ) {
      return;
    }

    if (activeShift.planning_date === SelectDate) {
      return;
    }

    const updated: ActiveShiftSession = {
      ...activeShift,
      planning_date: SelectDate,
    };
    setActiveShift(updated);
    saveActiveShift(updated).catch(() => undefined);
    saveShiftToRegistry(updated).catch(() => undefined);
    saveTrackingRegion({
      region_id: updated.region_id,
      planning_date: SelectDate,
    }).catch(() => undefined);
  }, [
    SelectDate,
    activeShift,
    isPickupDropoffChauffeur,
    isShiftReadyForRegion,
    setActiveShift,
  ]);

  const getFilterDataFun = useCallback(async () => {
    try {
      const payload = {
        token: UserData?.user?.verify_token,
        role: UserData?.user?.role,
        relaties_id: UserData?.relaties?.id,
        user_id: UserData?.user?.id,
        date: SelectDate,
        type: GloblyTypeSlide ?? item?.type ?? Type,
      };

      const response = await ApiService(apiConstants.getOrderByDriver, {
        customData: payload,
      });

      if (response?.status) {
        setTemopryryDataStore(response?.data || []);
        const newData = Array.isArray(response?.data)
          ? response.data
          : [];

        setAllFilterDataGet(newData);

        if (newData.length === 0) {
          setRegionOrderData([]);
          if (selectRegionData?.id) {
            await RegionDetailsDataFun(selectRegionData);
          }
          return;
        }

        const matchedRegion = newData.find(
          (item: any) => item?.id === selectRegionData?.id,
        );

        const selectedRegion = matchedRegion
          ? matchedRegion
          : selectRegionData?.id
            ? selectRegionData
            : newData?.[0] || null;

        setTotalCountParcel({
          pickup: matchedRegion?.pickup_orders?.length || 0,
          dropoff: matchedRegion?.deliver_orders?.length || 0,
        });

        if (selectedRegion?.id && selectedRegion !== selectRegionData) {
          setSelectRegionData(selectedRegion);
        } else if (!selectRegionData?.id && selectedRegion?.id) {
          setSelectRegionData(selectedRegion);
        }

        const regionForDetails = selectedRegion?.id
          ? selectedRegion
          : selectRegionData;

        if (regionForDetails?.id) {
          await RegionDetailsDataFun(regionForDetails);
        } else {
          setRegionOrderData([]);
        }
      } else {
        setAllFilterDataGet([]);
        if (!selectRegionData?.id) {
          setSelectRegionData(null);
        }
        setRegionOrderData([]);

        if (response?.message && response?.message !== 'No Data Found.') {
          setToast({
            top: 45,
            text: response?.message || 'Something went wrong',
            type: 'error',
            visible: true,
          });
        }
      }
    } catch (error: any) {
      console.error('Get FilterWise Data Error:', error);

      setAllFilterDataGet([]);
      if (!selectRegionData?.id) {
        setSelectRegionData(null);
      }
      setRegionOrderData([]);

      setToast({
        top: 45,
        text: ErrorHandle(error)?.message || 'Something went wrong',
        type: 'error',
        visible: true,
      });
    }
  }, [
    SelectDate,
    UserData,
    GloblyTypeSlide,
    item?.type,
    Type,
    selectRegionData?.id,
  ]);

  const parcelVerifyFlow = useParcelVerifyFlow({
    slideType: SlideType ?? GloblyTypeSlide ?? item?.type ?? Type,
    selectCurrentDate: SelectDate || SelectCurrentDate,
    source: 'filter',
    isScanRoute: false,
    isManualDirectVerify: true,
    onSuccess: getFilterDataFun,
    onGoToListPage: getFilterDataFun,
  });

  const handleParcelManualVerify = useCallback(
    ({ order_id, item_id }: { order_id: number | string; item_id: number | string }) => {
      if (isPickupDropoffChauffeur && !isRouteReady) {
        if (!isDeviceLocationReady) {
          handleLocationIconPress();
          return;
        }
        setTooltipMessage(shiftBlockedMessage);
        setTooltipVisible(true);
        return;
      }
      parcelVerifyFlow.startVerify({ order_id, item_id });
    },
    [
      isPickupDropoffChauffeur,
      isRouteReady,
      isDeviceLocationReady,
      handleLocationIconPress,
      shiftBlockedMessage,
      parcelVerifyFlow,
    ],
  );

  useEffect(() => {

    setSelectCurrentDeliveryLabel(null);
    if (UserData !== null && Focused && SelectDate) {
      getFilterDataFun();
      if (SelectDate) {
        setSelectCurrentDate(SelectDate);
      }
    }
    const currentType = Type || item?.type;
    setSlideType(currentType);
    const shouldAllowNavigation = currentType === "pickup_dropoff";
    setScanBTNAvailble(!shouldAllowNavigation);
  }, [SelectDate, UserData, Focused, Type, item]);

  const RegionDetailsDataFun = async (
    selectRegion = selectRegionData,
  ) => {
    if (!selectRegion?.id) {
      setRegionOrderData([]);
      return null;
    }

    try {
      setLoading(true);

      const payload = {
        token: UserData?.user?.verify_token,
        role: UserData?.user?.role,
        relaties_id: UserData?.relaties?.id,
        user_id: UserData?.user?.id,
        date: SelectDate,
        type: GloblyTypeSlide ?? item?.type ?? Type,
        region_id: selectRegion?.id,
      };

      const response = await ApiService(
        apiConstants.get_tms_orders_flat_by_region,
        {
          customData: payload,
        },
      );

      if (response?.status) {
        if (AllDamageListReason?.length == 0) {
          setAllDamageListReason(response?.damaged_parcel || [])
        }
        if (AllDeliveyLabel?.length == 0) {
          setAllDeliveyLabel(response?.delivery_label_title_map || []);
        }
        setRegionOrderData(
          Array.isArray(response?.data)
            ? response.data
            : [],
        );
      } else {
        setRegionOrderData([]);

        if (response?.message !== 'No Data Found.') {
          setToast({
            top: 45,
            text: response?.message || 'Something went wrong',
            type: 'error',
            visible: true,
          });
        }
      }

      return response;
    } catch (error: any) {
      setRegionOrderData([]);

      setToast({
        top: 45,
        text: ErrorHandle(error)?.message || 'Something went wrong',
        type: 'error',
        visible: true,
      });

      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleRegionSelect = useCallback(
    async (region: any) => {
      if (!region?.id) {
        setSelectRegionData(null);
        setRegionOrderData([]);
        return;
      }

      setSelectRegionData(region);

      if (!isPickupDropoffChauffeur) {
        await RegionDetailsDataFun(region);
        return;
      }

      if (isShiftActiveForRegion(activeShift, region.id)) {
        await saveTrackingRegion({
          region_id: region.id,
          planning_date: SelectDate,
        });
        syncTrackingFlag(deviceLocationStatus, true);
        await RegionDetailsDataFun(region);
        return;
      }

      const storedShift = await loadShiftFromRegistry(region.id);
      if (storedShift) {
        const restored: ActiveShiftSession = {
          ...storedShift,
          planning_date: SelectDate || storedShift.planning_date,
        };
        await saveActiveShift(restored);
        setActiveShift(restored);
        await saveTrackingRegion({
          region_id: restored.region_id,
          planning_date: restored.planning_date,
        });
        syncTrackingFlag(deviceLocationStatus, true);
        await RegionDetailsDataFun(region);
        return;
      }

      if (activeShift?.shiftActive) {
        await deactivateActiveShift(activeShift);
        setActiveShift({ ...activeShift, shiftActive: false });
      }
      syncTrackingFlag(deviceLocationStatus, false);
      await RegionDetailsDataFun(region);
    },
    [
      SelectDate,
      activeShift,
      deviceLocationStatus,
      isPickupDropoffChauffeur,
      setActiveShift,
      syncTrackingFlag,
    ],
  );

const FilterData = useMemo(() => {
  const q = search?.trim().toLowerCase();
  if (!q) return RegionOrderData ?? [];

  const cleaned = q.startsWith('#') ? q.slice(1) : q;
  const parts = cleaned.split(/\s+/);
  const idPart = parts[0];
  const namePart = parts.slice(1).join(' ').trim();

  return (RegionOrderData ?? []).filter((item: any) => {
    const isAdditionalStop = item?.row_type === 'additional_address';
    const itemId = item?.id?.toString().toLowerCase() ?? '';
    const itemName = isAdditionalStop
      ? (item?.name?.toLowerCase() ?? '')
      : (item?.display_name?.toLowerCase() ?? '');
    const itemExtId = item?.external_order_id?.toString().toLowerCase() ?? '';
    const itemAddress = isAdditionalStop
      ? (item?.address?.toLowerCase() ?? '')
      : '';
    const itemRoute = isAdditionalStop
      ? (item?.route_name?.toLowerCase() ?? '')
      : '';

    if (namePart) {
      return itemId.includes(idPart) && itemName.includes(namePart);
    }

    return (
      itemId.includes(cleaned) ||
      itemName.includes(cleaned) ||
      itemExtId.includes(cleaned) ||
      itemAddress.includes(cleaned) ||
      itemRoute.includes(cleaned)
    );
  });
}, [search, RegionOrderData]);

  const ReversParcelFun = async (order_id = null, item_id = null) => {
    try {
      setIsLoading(true);
      const payload: any = {
        token: UserData?.user?.verify_token,
        role: UserData?.user?.role,
        relaties_id: UserData?.relaties?.id,
        user_id: UserData?.user?.id,
        item_id: item_id,
        order_id: order_id,
        type:  GloblyTypeSlide,
      };
      const res = await ApiService(apiConstants.revert_order_item_status, {
        customData: payload,
      });
      console.log("ReversParcelFun", res);

      if (res?.status) {
        setToast({
          top: 45,
          text: t(res?.message) || t("Success to update status"),
          type: "success",
          visible: true,
        });
        

      
      } else {
        setToast({
          top: 45,
          text: t(res?.message) || t("Failed to update status"),
          type: "error",
          visible: true,
        });
      }
    } catch (error) {
      setToast({
        top: 45,
        text: ErrorHandle(error).message,
        type: "error",
        visible: true,
      });
    }
    finally {
      setIsLoading(false);

    }
  }

  useEffect(() => {
    if (selectRegionData?.id) {
      const matchedRegion = TemopryryDataStore.find(
        (item: any) => item?.id === selectRegionData?.id,
      );
      setTotalCountParcel({ pickup: matchedRegion?.pickup_orders?.length || 0, dropoff: matchedRegion?.deliver_orders?.length || 0 })
    } else {
      setTotalCountParcel({ pickup: 0, dropoff: 0 });
    }
    if (!isShiftReadyForRegion) {
      syncTrackingFlag(deviceLocationStatus, false);
    }
  }, [
    selectRegionData,
    TemopryryDataStore,
    isShiftReadyForRegion,
    deviceLocationStatus,
    syncTrackingFlag,
  ]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.wrapper}>
        <View style={styles.Header}>
          <CustomHeader />
        </View>
        <ScrollView
          style={{ flex: 1, marginTop: -20, paddingTop: 15 }}
          contentContainerStyle={styles.ContainerStyle}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
          refreshControl={
            <RefreshControl
              refreshing={IsLoading}
              onRefresh={getFilterDataFun}
            />
          }
        >
          <View style={styles.Flex}>
            <View style={{ flex: 1 / 1.05 }}>
              <CalenderDate date={SelectDate} setDate={setSelectDate} />
            </View>
            <TouchableOpacity
              style={[
                styles.CollPadByButton,
                { transform: [{ rotate: !isCollapsed ? "0deg" : "180deg" }] },
              ]}
              onPress={() => setisCollapsed(!isCollapsed)}
            >
              <Image
                source={Images.down}
                style={styles.DownIcon}
                tintColor={Colors.white}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.Flex}>
            <DropDownBox
              data={AllFilterData}
              value={selectRegionData}
              setValue={handleRegionSelect}
              labelFieldKey="name"
              valueFieldKey="id"
              ContainerStyle={{ flex: 1 / 1.05 }}
            />

            <TwoTypeButton
              onlyIcon={true}
              Icon={Images.Scan}
              tintColor={Colors.black}
              style={{ width: 46, height: 46,backgroundColor:Colors.yellow }}
              onPress={async () => {
                if (isPickupDropoffChauffeur && !isRouteReady) {
                  if (!isDeviceLocationReady) {
                    await handleLocationIconPress();
                    return;
                  }
                  setTooltipMessage(shiftBlockedMessage);
                  setTooltipVisible(true);
                  return;
                }
                navigation.navigate('Scanner', {
                  fun: getFilterDataFun,
                  type: SlideType,
                  is_scan: false,
                });
              }}
            />
            <AnimatedTooltip
              visible={ScanerbtnDisableTiptool}
              message={t("GPS/Location Services must be enabled before you can scan.")}
              onClose={() => setScanerbtnDisableTiptool(false)}
              style={{ top: "14%", right: 10 }}
            />
          </View>
          <View style={[styles.Flex, { marginBottom: 10 }]}>
            <SearchInput
              value={search}
              setValue={setSearch}
              suggestions={RegionOrderData}
              placeholder={t("Search by ID or name") + "..."}
              onSelect={() => {}}
              containerStyle={{
                flex:
                  isPickupDropoffChauffeur &&
                  selectRegionData?.id &&
                  !isShiftReadyForRegion
                    ? 1 / 1.05
                    : 1,
              }}
            />
            {isPickupDropoffChauffeur &&
              selectRegionData?.id &&
              !isShiftReadyForRegion && (
              <TouchableOpacity
                style={[
                  styles.button,
                  {
                    backgroundColor: Colors.red,
                    opacity: isGpsPermissionLoading ? 0.6 : 1,
                  },
                ]}
                onPress={
                  isDeviceLocationReady
                    ? handleShiftIconPress
                    : handleLocationIconPress
                }
                activeOpacity={0.8}
                disabled={isGpsPermissionLoading}
              >
                <Ionicons
                  name={isDeviceLocationReady ? 'car-sport' : 'location'}
                  size={22}
                  color={Colors.white}
                />
              </TouchableOpacity>
            )}
          </View>
            <View style={styles.CountContainer}>
              <Text style={styles.CountContainerText}>
                {`${t("Pick")} (${TotalCountParcel.pickup}) - ${t("Drop")} (${TotalCountParcel.dropoff})`}
              </Text>
            </View>

          {selectRegionData && AllFilterData?.length > 0 ? (
            <FlatList
              data={FilterData}
              ListEmptyComponent={() =>
                IsLoading ? null : (
                  <View style={styles.FooterContainer}>
                    <Text style={[styles.Text, { color: Colors.darkText }]}>
                      {t("No Order Found")}
                    </Text>
                  </View>
                )
              }
              ListFooterComponent={() => {
                return IsLoading ? (
                  <View style={styles.FooterContainer}>
                    <Loader />
                  </View>
                ) : null;
              }}
              scrollEnabled={false}
              initialNumToRender={10}
              maxToRenderPerBatch={10}
              windowSize={5}
              removeClippedSubviews={true}
              updateCellsBatchingPeriod={30}
              contentContainerStyle={{ gap: 15 }}
              keyExtractor={(item: any, index) =>
                item?.row_type === 'additional_address'
                  ? `aa-${item?.route_stop_id ?? item?.assignment_id ?? item?.id ?? index}`
                  : `order-${item?.id ?? index}`
              }
              renderItem={({ item, index }) => {
                if (item?.row_type === 'additional_address') {
                  return <AdditionalStopBox item={item} index={index} />;
                }

                return (
                  <PickUpBox
                    AllisCollapsed={isCollapsed}
                    index={index}
                    onParcelManualVerify={handleParcelManualVerify}
                    LableStatus={item?.tmsstatus?.status_name}
                    OrderId={item?.id}
                    ProductItem={item?.items}
                    driver_note={item?.driver_note || ""}
                    LableBackground={item?.tmsstatus?.color}
                    additional_cost_label={item?.additional_cost_label}
                    onPress={() => {
                      if (
                        ScanBTNAvailble ||
                        (isPickupDropoffChauffeur && !isRouteReady)
                      ) {
                        return;
                      }
                      navigation.navigate("Details", { item, type: SlideType });
                    }}
                    start={item?.pickup_location}
                    end={item?.deliver_location}
                    customerData={item?.customer}
                    external_platform_data={item?.display_name}
                    external_order_id={item?.external_order_id}

                    ItemData={item}
                    statusData={item?.tmsstatus}
                    backOrder={true}
                  />
                );
              }}
            />
          ) : IsLoading ? (
            <View style={styles.FooterContainer}>
              <Loader />
            </View>
          ) : (
            <View style={styles.FooterContainer}>
              <Text style={[styles.Text, { color: Colors.darkText }]}>
                {t("No Order Found")}
              </Text>
            </View>
          )}
        </ScrollView>
      </View>

      <AnimatedTooltip
        visible={tooltipVisible}
        message={tooltipMessage}
        onClose={() => setTooltipVisible(false)}
      />

      <GpsTrackingStartPopup
        visible={gpsStartPopupVisible}
        mode="start"
        initialDate={gpsTrackingStartDate || SelectDate}
        initialTime={gpsTrackingStartTime || getCurrentTimeString()}
        regionName={selectRegionData?.name || ""}
        loading={isTripSubmitting || isGpsPermissionLoading}
        onClose={() => setGpsStartPopupVisible(false)}
        onConfirm={handleGpsStartConfirm}
      />

      <GpsPermissionSheet
        visible={gpsPermissionSheet.visible}
        reason={gpsPermissionSheet.reason}
        loading={isGpsPermissionLoading}
        onClose={() => setGpsPermissionSheet({ visible: false, reason: null })}
        onPrimaryAction={handleGpsSheetPrimaryAction}
      />

      <ParcelVerifyOverlays flow={parcelVerifyFlow} navigation={navigation} />
    </SafeAreaView>
  );
}
