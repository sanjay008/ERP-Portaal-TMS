import { Images } from "@/src/assets/images";
import {
  formatDate,
  parseSafeDate,
  toApiDateString,
} from "@/src/components/DateFormate";
import DropDownBox from "@/src/components/DropDownBox";
import { useErrorHandle } from "@/src/components/ErrorHandle";
import { GlobalContextData } from "@/src/context/GlobalContext";
import {
  checkLocationPermission,
  getSafeCurrentPosition,
} from "@/src/hooks/useUserGPS";
import RouteMapView from "@/src/screens/RouteMap/RouteMapView";
import StopDetailCard from "@/src/screens/RouteMap/StopDetailCard";
import type {
  DriverAssignedRegion,
  DriverRouteMapData,
  RouteMapStop,
} from "@/src/screens/RouteMap/types";
import { toFiniteNumber } from "@/src/screens/RouteMap/types";
import { getDateByTimezone, resolveAppTimeZone } from "@/src/utils/appDateTime";
import { getChauffeurLocation } from "@/src/utils/chauffeurLocationCache";
import { Colors } from "@/src/utils/colors";
import {
  fetchDriverAssignedRegions,
  fetchDriverRouteMap,
  parseAssignedRegionsData,
  parseRouteMapData,
} from "@/src/utils/driverRouteMapApi";
import {
  logGoogleMapsIssue,
  resolveGoogleMapsApiKey,
} from "@/src/utils/googleMapsApiKey";
import {
  doesShiftBelongToUser,
  isShiftActive,
} from "@/src/utils/shiftSession";
import { FONTS } from "@/src/utils/storeData";
import { Ionicons } from "@expo/vector-icons";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import changeNavigationBarColor from "react-native-navigation-bar-color";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

/** 3 snap points: peek (small) → mid → full. Index -1 = fully hidden. */
const SHEET_SNAP = {
  HIDDEN: -1,
  PEEK: 0,
  MID: 1,
  FULL: 2,
} as const;

function ymdToDate(ymd: string): Date {
  const parsed = parseSafeDate(ymd);
  return parsed || new Date();
}

function dateToYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

type SheetMode = "filter" | "stops";

function resolveStopDestination(stop: RouteMapStop): {
  lat: number;
  lng: number;
  query?: string;
} | null {
  const dest = stop.google_maps_destination;
  const lat = toFiniteNumber(dest?.lat) ?? toFiniteNumber(stop.latitude);
  const lng = toFiniteNumber(dest?.lng) ?? toFiniteNumber(stop.longitude);
  if (lat == null || lng == null) return null;
  return {
    lat,
    lng,
    query: dest?.query ? String(dest.query) : undefined,
  };
}

export default function DriverRouteMapScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { ErrorHandle } = useErrorHandle();
  const slideItem = route?.params?.item;

  const {
    UserData,
    setToast,
    GOOGLE_API_KEY,
    setGOOGLE_API_KEY,
    SelectActiveDate,
    TimeZone,
    activeShift,
    SelectLanguage,
    setSelectActiveDate,
    setSelectRegionData,
    setSelectActiveRegionData,
    setGloblyTypeSlide,
    setGloblySlideTitle,
  } = useContext(GlobalContextData);

  const today = useMemo(() => {
    const tz = resolveAppTimeZone(TimeZone);
    return getDateByTimezone(tz);
  }, [TimeZone]);

  const tripOn = useMemo(
    () =>
      isShiftActive(activeShift) &&
      doesShiftBelongToUser(activeShift, UserData),
    [activeShift, UserData],
  );

  /** Active pickup_dropoff trip region+date, else today / first region. */
  const preferredDate = useMemo(() => {
    if (route?.params?.date) {
      return toApiDateString(route.params.date) || String(route.params.date);
    }
    if (tripOn && activeShift?.planning_date) {
      return toApiDateString(activeShift.planning_date) || activeShift.planning_date;
    }
    return toApiDateString(SelectActiveDate) || today;
  }, [
    SelectActiveDate,
    activeShift?.planning_date,
    route?.params?.date,
    today,
    tripOn,
  ]);

  const preferredRegionId = useMemo(() => {
    if (route?.params?.region_id != null) return String(route.params.region_id);
    if (tripOn && activeShift?.region_id != null) {
      return String(activeShift.region_id);
    }
    return null;
  }, [activeShift?.region_id, route?.params?.region_id, tripOn]);

  const [selectDate, setSelectDate] = useState<string>(preferredDate || today);
  const [regions, setRegions] = useState<DriverAssignedRegion[]>([]);
  const initialRegion = useMemo<DriverAssignedRegion | null>(() => {
    if (route?.params?.region_id != null) {
      return {
        region_id: route.params.region_id,
        region_name: route.params.region_name,
        region_color: route.params.region_color,
      };
    }
    if (tripOn && activeShift?.region_id != null) {
      return {
        region_id: activeShift.region_id,
        region_name: activeShift.region_name,
      };
    }
    return null;
  }, [
    activeShift?.region_id,
    activeShift?.region_name,
    route?.params?.region_color,
    route?.params?.region_id,
    route?.params?.region_name,
    tripOn,
  ]);

  const [selectedRegion, setSelectedRegion] =
    useState<DriverAssignedRegion | null>(initialRegion);
  const [regionsLoading, setRegionsLoading] = useState(false);
  const [mapData, setMapData] = useState<DriverRouteMapData | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  /** No region yet → keep Change (date/region) sheet open. */
  const [sheetMode, setSheetMode] = useState<SheetMode>(
    initialRegion ? "stops" : "filter",
  );
  const [sheetIndex, setSheetIndex] = useState<number>(
    initialRegion ? SHEET_SNAP.PEEK : SHEET_SNAP.MID,
  );
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [iosDateDraft, setIosDateDraft] = useState(() =>
    ymdToDate(preferredDate || today),
  );
  const [resolvedApiKey, setResolvedApiKey] = useState(
    String(GOOGLE_API_KEY || "").trim(),
  );
  const [mapsKeySource, setMapsKeySource] = useState("context");

  const snapPoints = useMemo(() => ["22%", "48%", "78%"], []);
  const bottomSheetRef = useRef<BottomSheet>(null);

  const mountedRef = useRef(true);
  const regionsReqRef = useRef(0);
  const routeReqRef = useRef(0);
  const userDataRef = useRef(UserData);
  const errorHandleRef = useRef(ErrorHandle);
  const setToastRef = useRef(setToast);
  const mapDataRef = useRef<DriverRouteMapData | null>(null);
  const preferredRegionIdRef = useRef(preferredRegionId);
  const lastAutoKeyRef = useRef<string>("");
  const sheetModeRef = useRef<SheetMode>(sheetMode);

  userDataRef.current = UserData;
  errorHandleRef.current = ErrorHandle;
  setToastRef.current = setToast;
  mapDataRef.current = mapData;
  preferredRegionIdRef.current = preferredRegionId;
  sheetModeRef.current = sheetMode;

  useEffect(() => {
    mountedRef.current = true;
    setGloblyTypeSlide(slideItem?.type || "driver_route_map");
    setGloblySlideTitle(slideItem?.item_title || "Route");
    return () => {
      mountedRef.current = false;
    };
  }, [
    slideItem?.item_title,
    slideItem?.type,
    setGloblySlideTitle,
    setGloblyTypeSlide,
  ]);

  // Regions for picker — only when date changes (no callback-dep loop).
  useEffect(() => {
    const date = toApiDateString(selectDate) || selectDate;
    if (!date) return;
    const requestId = ++regionsReqRef.current;
    setRegionsLoading(true);

    (async () => {
      try {
        const res = await fetchDriverAssignedRegions(userDataRef.current, date);
        if (!mountedRef.current || requestId !== regionsReqRef.current) return;
        const parsed = parseAssignedRegionsData(res);
        const nextRegions = parsed?.regions || [];
        setRegions(nextRegions);
        setSelectedRegion((prev) => {
          if (!nextRegions.length) return null;
          // 1) Active trip / route params region
          const preferId = preferredRegionIdRef.current;
          if (preferId) {
            const tripRegion = nextRegions.find(
              (r) => String(r.region_id) === preferId,
            );
            if (tripRegion) return tripRegion;
          }
          // 2) Keep current selection if still in list
          if (prev) {
            const still = nextRegions.find(
              (r) => String(r.region_id) === String(prev.region_id),
            );
            if (still) return still;
          }
          // 3) Default: first region in dropdown [0]
          return nextRegions[0];
        });
      } catch (error: any) {
        if (!mountedRef.current || requestId !== regionsReqRef.current) return;
        setRegions([]);
        setSelectedRegion(null);
        setToastRef.current({
          top: 45,
          text: errorHandleRef.current(error).message,
          type: "error",
          visible: true,
        });
      } finally {
        if (mountedRef.current && requestId === regionsReqRef.current) {
          setRegionsLoading(false);
        }
      }
    })();
  }, [selectDate]);

  const snapSheetTo = useCallback((index: number) => {
    const next = Math.max(SHEET_SNAP.HIDDEN, Math.min(SHEET_SNAP.FULL, index));
    setSheetIndex(next);
  }, []);

  // Keep region/date Change sheet open until a region is chosen.
  useEffect(() => {
    if (regionsLoading) return;
    if (selectedRegion?.region_id == null) {
      setSheetMode("filter");
      snapSheetTo(SHEET_SNAP.MID);
    }
  }, [regionsLoading, selectedRegion?.region_id, snapSheetTo]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const resolved = await resolveGoogleMapsApiKey(GOOGLE_API_KEY);
      if (cancelled) return;
      setResolvedApiKey(resolved.key);
      setMapsKeySource(resolved.source);
      if (resolved.key && resolved.key !== String(GOOGLE_API_KEY || "").trim()) {
        setGOOGLE_API_KEY(resolved.key);
      }
      if (!resolved.key) {
        logGoogleMapsIssue("Route map — google_maps_api_key missing", {
          source: resolved.source,
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [GOOGLE_API_KEY, setGOOGLE_API_KEY]);

  const loadRoute = useCallback(
    async (opts?: {
      region_id?: string | number;
      date?: string;
      silent?: boolean;
    }) => {
      const region_id = opts?.region_id ?? selectedRegion?.region_id;
      const date = toApiDateString(opts?.date || selectDate) || selectDate;
      if (!region_id || !date) {
        setSheetMode("filter");
        snapSheetTo(SHEET_SNAP.MID);
        if (!opts?.silent) {
          setToastRef.current({
            top: 45,
            text: t("Please select a region"),
            type: "error",
            visible: true,
          });
        }
        return;
      }

      const requestId = ++routeReqRef.current;
      if (!opts?.silent) setRouteLoading(true);

      try {
        const res = await fetchDriverRouteMap(userDataRef.current, {
          region_id,
          date,
        });
        if (!mountedRef.current || requestId !== routeReqRef.current) return;

        const parsed = parseRouteMapData(res);
        if (!parsed) {
          // Silent refresh: keep current map/stops — don't wipe the sheet list.
          if (!opts?.silent) {
            setMapData(null);
            setSelectedKeys([]);
            setToastRef.current({
              top: 45,
              text: res?.message || t("Unable to load route map"),
              type: "error",
              visible: true,
            });
          }
          return;
        }

        const nextStops = Array.isArray(parsed.stops) ? parsed.stops : [];
        setMapData({ ...parsed, stops: nextStops });

        // Soft refresh: keep selection, drop done/missing keys only.
        // Hard load: reset selection.
        setSelectedKeys((prev) => {
          if (!opts?.silent) return [];
          const valid = new Set(
            nextStops
              .filter((s) => s && !s.is_done && s.stop_key != null)
              .map((s) => String(s.stop_key)),
          );
          return prev.filter((k) => valid.has(String(k)));
        });

        // Don't kick user out of Change sheet / don't collapse stop sheet on silent refresh.
        if (!opts?.silent && sheetModeRef.current !== "filter") {
          setSheetMode("stops");
          snapSheetTo(SHEET_SNAP.PEEK);
        }
        setSelectActiveDate(date);
        setSelectRegionData({
          id: parsed.region_id ?? region_id,
          name: parsed.region_name ?? selectedRegion?.region_name,
          region_color: parsed.region_color ?? selectedRegion?.region_color,
        });
      } catch (error: any) {
        if (!mountedRef.current || requestId !== routeReqRef.current) return;
        if (!opts?.silent) {
          setToastRef.current({
            top: 45,
            text: errorHandleRef.current(error).message,
            type: "error",
            visible: true,
          });
        }
      } finally {
        if (mountedRef.current && requestId === routeReqRef.current) {
          setRouteLoading(false);
        }
      }
    },
    [
      selectDate,
      selectedRegion?.region_color,
      selectedRegion?.region_id,
      selectedRegion?.region_name,
      setSelectActiveDate,
      setSelectRegionData,
      snapSheetTo,
      t,
    ],
  );

  const loadRouteRef = useRef(loadRoute);
  loadRouteRef.current = loadRoute;

  // Auto-show route only after a region is selected (trip/params or user pick).
  useEffect(() => {
    const date = toApiDateString(selectDate) || selectDate;
    const regionId = selectedRegion?.region_id;
    if (!date || regionId == null || regionsLoading) return;

    const key = `${date}|${regionId}`;
    if (lastAutoKeyRef.current === key) return;
    lastAutoKeyRef.current = key;

    loadRouteRef.current({
      region_id: regionId,
      date,
      silent: Boolean(mapDataRef.current),
    });
  }, [selectDate, selectedRegion?.region_id, regionsLoading]);

  useFocusEffect(
    useCallback(() => {
      mountedRef.current = true;

      // Android 3-button / gesture bar: black bg + light icons (visible).
      // light=false → light-colored system buttons (needed on dark bar).
      if (Platform.OS === "android") {
        try {
          changeNavigationBarColor("#000000", false);
        } catch {}
      }

      // Soft refresh after returning from Maps / Details — keep sheet list stable.
      if (mapDataRef.current) {
        loadRouteRef.current({ silent: true });
      }

      return () => {
        mountedRef.current = false;
        if (Platform.OS === "android") {
          try {
            // Restore app default: white bar + dark buttons.
            changeNavigationBarColor(Colors.white, true);
          } catch {}
        }
      };
    }, []),
  );

  const openSheet = useCallback(
    (mode: SheetMode = "stops", index: number = SHEET_SNAP.MID) => {
      setSheetMode(mode);
      snapSheetTo(index);
    },
    [snapSheetTo],
  );

  const onSheetChange = useCallback((index: number) => {
    setSheetIndex(index);
  }, []);

  /** Cycle handle: full → mid → peek → hide (classic 3-step sheet). */
  const onSheetHandlePress = useCallback(() => {
    if (sheetIndex >= SHEET_SNAP.FULL) {
      snapSheetTo(SHEET_SNAP.MID);
      return;
    }
    if (sheetIndex === SHEET_SNAP.MID) {
      snapSheetTo(SHEET_SNAP.PEEK);
      return;
    }
    // Peek → hide (only when a region is already selected)
    if (selectedRegion?.region_id != null) {
      snapSheetTo(SHEET_SNAP.HIDDEN);
      return;
    }
    snapSheetTo(SHEET_SNAP.MID);
  }, [selectedRegion?.region_id, sheetIndex, snapSheetTo]);

  /** Strong header Change — always opens date/region sheet properly. */
  const openChangeSheet = useCallback(() => {
    setDatePickerOpen(false);
    openSheet("filter", SHEET_SNAP.MID);
  }, [openSheet]);

  const onNativeDateChange = useCallback(
    (event: DateTimePickerEvent, selected?: Date) => {
      if (Platform.OS === "android") {
        setDatePickerOpen(false);
        if (event.type === "dismissed" || !selected) return;
        setSelectDate(dateToYmd(selected));
        return;
      }
      if (selected) setIosDateDraft(selected);
    },
    [],
  );

  const openNativeDatePicker = useCallback(() => {
    setIosDateDraft(ymdToDate(selectDate));
    setDatePickerOpen(true);
  }, [selectDate]);

  const dateLabel = useMemo(
    () => formatDate(selectDate, SelectLanguage || "en") || selectDate,
    [SelectLanguage, selectDate],
  );

  const stopByKey = useMemo(() => {
    const map = new Map<string, RouteMapStop>();
    (mapData?.stops || []).forEach((stop) => {
      if (stop?.stop_key != null) map.set(String(stop.stop_key), stop);
    });
    return map;
  }, [mapData?.stops]);

  const selectedStops = useMemo(() => {
    const out: RouteMapStop[] = [];
    for (const key of selectedKeys) {
      const stop = stopByKey.get(String(key));
      if (!stop || stop.is_done || stop.stop_key == null) continue;
      out.push(stop);
    }
    return out;
  }, [selectedKeys, stopByKey]);

  const onStopPress = useCallback(
    (stopKey: string) => {
      const key = String(stopKey);
      const stop = stopByKey.get(key);
      if (stop?.is_done) return;
      // Stop selected → expand sheet toward full (3-point bottom sheet).
      openSheet("stops", SHEET_SNAP.FULL);
      setSelectedKeys((prev) => {
        if (prev.includes(key)) return [key, ...prev.filter((k) => k !== key)];
        return [...prev, key];
      });
    },
    [openSheet, stopByKey],
  );

  const openAddressInMaps = useCallback(
    async (stop: RouteMapStop) => {
      const dest = resolveStopDestination(stop);
      if (!dest) {
        setToast({
          top: 45,
          text: t("Destination location is unavailable"),
          type: "error",
          visible: true,
        });
        return;
      }

      let originLat: number | null = null;
      let originLng: number | null = null;
      const cached = getChauffeurLocation();
      if (
        cached?.latitude &&
        cached?.longitude &&
        Number(cached.latitude) !== 0 &&
        Number(cached.longitude) !== 0
      ) {
        originLat = Number(cached.latitude);
        originLng = Number(cached.longitude);
      } else {
        try {
          const permission = await checkLocationPermission();
          if (permission.granted) {
            const current = await getSafeCurrentPosition();
            if (current?.coords) {
              originLat = current.coords.latitude;
              originLng = current.coords.longitude;
            }
          }
        } catch {
          // destination-only
        }
      }

      const destinationParam =
        dest.query && dest.query.includes(",")
          ? dest.query
          : `${dest.lat},${dest.lng}`;
      const url =
        originLat != null && originLng != null
          ? `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLng}&destination=${encodeURIComponent(
              destinationParam,
            )}&travelmode=driving`
          : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
              destinationParam,
            )}&travelmode=driving`;

      try {
        await Linking.openURL(url);
      } catch (error: any) {
        setToast({
          top: 45,
          text: ErrorHandle(error).message,
          type: "error",
          visible: true,
        });
      }
    },
    [ErrorHandle, setToast, t],
  );

  const openOrderDetails = useCallback(
    (stop: RouteMapStop) => {
      if (stop.order_id == null || String(stop.order_id).trim() === "") return;
      const current = mapDataRef.current;
      const planningDate = String(
        current?.planning_date || toApiDateString(selectDate) || selectDate,
      );
      const regionPayload = {
        id: current?.region_id ?? selectedRegion?.region_id,
        name: current?.region_name ?? selectedRegion?.region_name,
        region_color: current?.region_color ?? selectedRegion?.region_color,
      };
      setSelectActiveDate(planningDate);
      setSelectRegionData(regionPayload);
      setSelectActiveRegionData(regionPayload);
      setGloblyTypeSlide("pickup_dropoff");
      // Same Details screen as pickup/drop — pass region+date so actions/labels load.
      navigation.navigate("Details", {
        item: {
          id: stop.order_id,
          ordernr: stop.ordernr,
          name: stop.name,
        },
        order_id: stop.order_id,
        type: "pickup_dropoff",
        region_id: regionPayload.id,
        date: planningDate,
      });
    },
    [
      navigation,
      selectDate,
      selectedRegion?.region_color,
      selectedRegion?.region_id,
      selectedRegion?.region_name,
      setGloblyTypeSlide,
      setSelectActiveDate,
      setSelectActiveRegionData,
      setSelectRegionData,
    ],
  );

  const headerTitle = mapData?.region_name
    ? String(mapData.region_name)
    : t(slideItem?.item_title || "Route");

  const statsLine = mapData
    ? `${mapData.stops_todo ?? 0} ${t("todo")} · ${mapData.stops_done ?? 0} ${t("done")} · ${mapData.stops_total ?? 0} ${t("total")}`
    : "";

  const apiKey = resolvedApiKey;

  const sheetHidden = sheetIndex < 0;
  const canCloseSheet = selectedRegion?.region_id != null;
  const handleHint =
    sheetIndex >= SHEET_SNAP.FULL
      ? t("Half")
      : sheetIndex === SHEET_SNAP.MID
        ? t("Peek")
        : canCloseSheet
          ? t("Hide")
          : t("Expand");

  return (
    <GestureHandlerRootView style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
      <SafeAreaView style={styles.safeRoot} edges={["top", "left", "right", "bottom"]}>
        <View style={styles.header} pointerEvents="box-none">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={styles.backBtn}
          >
            <Image source={Images.back} style={styles.backIcon} />
          </TouchableOpacity>
          <View style={styles.headerTextWrap} pointerEvents="none">
            <Text style={styles.headerTitle} numberOfLines={1}>
              {headerTitle}
            </Text>
            {!!statsLine && (
              <Text style={styles.headerSub} numberOfLines={1}>
                {statsLine}
              </Text>
            )}
          </View>
          <Pressable
            onPress={openChangeSheet}
            hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
            android_ripple={{ color: "transparent" }}
            style={({ pressed }) => [
              styles.changeRouteBtn,
              pressed && styles.changeRouteBtnPressed,
            ]}
          >
            <Ionicons
              name="swap-horizontal"
              size={18}
              color={Colors.primary}
            />
            <Text style={styles.changeRouteText}>{t("Change")}</Text>
          </Pressable>
        </View>

        <View style={styles.body}>
        <View style={styles.mapPane}>
          {apiKey ? (
            <RouteMapView
              apiKey={apiKey}
              mapData={mapData}
              onStopPress={onStopPress}
              onMapsIssue={(reason, extra) =>
                logGoogleMapsIssue(reason, { ...extra, source: mapsKeySource })
              }
            />
          ) : (
            <View style={styles.mapPlaceholder}>
              <View style={styles.mapEmptyIcon}>
                <Ionicons name="key-outline" size={26} color={Colors.primary} />
              </View>
              <Text style={styles.placeholderText}>
                {t("Google Maps key is missing")}
              </Text>
            </View>
          )}

          {routeLoading ? (
            <View style={styles.routeLoadingBadge} pointerEvents="none">
              <ActivityIndicator color={Colors.primary} size="small" />
              <Text style={styles.routeLoadingText}>{t("Loading route...")}</Text>
            </View>
          ) : null}

          {sheetHidden ? (
            <TouchableOpacity
              activeOpacity={0.85}
              delayPressIn={0}
              onPress={() =>
                openSheet(
                  sheetMode === "filter" ? "filter" : "stops",
                  sheetMode === "filter" ? SHEET_SNAP.MID : SHEET_SNAP.PEEK,
                )
              }
              style={[
                styles.showSheetBtn,
                { bottom: Math.max(insets.bottom, 12) + 16 },
              ]}
            >
              <Ionicons name="chevron-up" size={18} color={Colors.white} />
              <Text style={styles.showSheetBtnText}>
                {sheetMode === "filter" ? t("Change") : t("Stop details")}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <BottomSheet
          ref={bottomSheetRef}
          index={sheetIndex}
          snapPoints={snapPoints}
          enablePanDownToClose={canCloseSheet}
          enableDynamicSizing={false}
          animateOnMount
          onChange={onSheetChange}
          onClose={() => setSheetIndex(SHEET_SNAP.HIDDEN)}
          handleComponent={() => (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={onSheetHandlePress}
              style={styles.sheetHandleHit}
            >
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetHandleHint}>{handleHint}</Text>
            </TouchableOpacity>
          )}
          backgroundStyle={styles.sheetBackground}
          style={styles.sheet}
        >
          <BottomSheetScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.sheetContent,
              { paddingBottom: Math.max(insets.bottom, 18) },
            ]}
          >
            {sheetMode === "filter" ? (
              <>
                <Text style={styles.sheetEyebrow}>{t("Route")}</Text>
                <Text style={styles.sheetTitle}>{t("Change")}</Text>
                <Text style={styles.sheetHint}>
                  {t("Choose date and region — route updates automatically")}
                </Text>

                <Text style={styles.fieldLabel}>{t("Select date")}</Text>
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={openNativeDatePicker}
                  style={styles.dateField}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={20}
                    color={Colors.primary}
                  />
                  <Text style={styles.dateFieldText}>{dateLabel}</Text>
                  <Ionicons
                    name="chevron-down"
                    size={18}
                    color={Colors.darkText}
                  />
                </TouchableOpacity>

                <Text style={[styles.fieldLabel, { marginTop: 14 }]}>
                  {t("Select region")}
                </Text>
                <DropDownBox
                  data={regions}
                  value={selectedRegion}
                  setValue={setSelectedRegion as any}
                  labelFieldKey="region_name"
                  valueFieldKey="region_id"
                  placeholder="Select Region"
                  dropdownPosition="top"
                />

                {regionsLoading || routeLoading ? (
                  <View style={styles.inlineLoading}>
                    <ActivityIndicator color={Colors.primary} />
                  </View>
                ) : regions.length === 0 ? (
                  <Text style={styles.emptyText}>
                    {t("No regions assigned for this date")}
                  </Text>
                ) : (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={[
                      styles.doneFilterBtn,
                      !selectedRegion?.region_id && { opacity: 0.45 },
                    ]}
                    disabled={!selectedRegion?.region_id}
                    onPress={() => {
                      if (!selectedRegion?.region_id) return;
                      openSheet("stops", SHEET_SNAP.PEEK);
                    }}
                  >
                    <Text style={styles.doneFilterText}>{t("Done")}</Text>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <>
                <View style={styles.stopsHeader}>
                  <View>
                    <Text style={styles.sheetEyebrow}>{t("Selected stops")}</Text>
                    <Text style={styles.sheetTitle}>{t("Stop details")}</Text>
                  </View>
                </View>

                {routeLoading ? (
                  <View style={styles.inlineLoading}>
                    <ActivityIndicator color={Colors.primary} />
                  </View>
                ) : selectedStops.length === 0 ? (
                  <Text style={styles.emptyHint}>
                    {t("Tap a stop on the map to see details")}
                  </Text>
                ) : (
                  selectedStops.map((stop, index) => (
                    <StopDetailCard
                      key={String(stop.stop_key ?? `stop-${index}`)}
                      stop={stop}
                      indexLabel={stop.stop_number ?? index + 1}
                      onAddressPress={openAddressInMaps}
                      onOrderPress={openOrderDetails}
                    />
                  ))
                )}
              </>
            )}
          </BottomSheetScrollView>
        </BottomSheet>
        </View>
      </SafeAreaView>

      {/* Native date picker */}
      {datePickerOpen && Platform.OS === "android" ? (
        <DateTimePicker
          value={ymdToDate(selectDate)}
          mode="date"
          display="default"
          onChange={onNativeDateChange}
        />
      ) : null}

      {Platform.OS === "ios" ? (
        <Modal
          visible={datePickerOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setDatePickerOpen(false)}
        >
          <Pressable
            style={styles.datePickerBackdrop}
            onPress={() => setDatePickerOpen(false)}
          >
            <Pressable
              style={styles.datePickerSheet}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.datePickerHeader}>
                <TouchableOpacity onPress={() => setDatePickerOpen(false)}>
                  <Text style={styles.datePickerAction}>{t("Cancel")}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setSelectDate(dateToYmd(iosDateDraft));
                    setDatePickerOpen(false);
                  }}
                >
                  <Text style={[styles.datePickerAction, styles.datePickerDone]}>
                    {t("Done")}
                  </Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={iosDateDraft}
                mode="date"
                display="spinner"
                onChange={onNativeDateChange}
              />
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  safeRoot: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  header: {
    backgroundColor: Colors.white,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    zIndex: 51,
    elevation: 0,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  backIcon: {
    width: 32,
    height: 32,
  },
  headerTextWrap: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: FONTS.SemiBold,
    fontSize: 17,
    color: Colors.black,
    letterSpacing: -0.2,
  },
  headerSub: {
    marginTop: 1,
    fontFamily: FONTS.Regular,
    fontSize: 12,
    color: Colors.darkText,
  },
  body: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  mapPane: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  mapPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    gap: 12,
  },
  mapEmptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: Colors.primarylite,
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: {
    fontFamily: FONTS.Medium,
    fontSize: 14,
    color: Colors.darkText,
    textAlign: "center",
    lineHeight: 20,
  },
  routeLoadingBadge: {
    position: "absolute",
    top: 14,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.white,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  routeLoadingText: {
    fontFamily: FONTS.Medium,
    fontSize: 13,
    color: Colors.black,
  },
  showSheetBtn: {
    position: "absolute",
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 24,
    zIndex: 40,
    elevation: 12,
    shadowColor: Colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  showSheetBtnText: {
    color: Colors.white,
    fontFamily: FONTS.SemiBold,
    fontSize: 14,
  },
  sheet: {
    zIndex: 30,
    elevation: 20,
  },
  sheetBackground: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -6 },
  },
  sheetHandleHit: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 8,
    gap: 4,
  },
  sheetHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.Boxgray,
  },
  sheetHandleHint: {
    fontFamily: FONTS.Medium,
    fontSize: 11,
    color: Colors.darkText,
  },
  sheetContent: {
    paddingHorizontal: 18,
    paddingBottom: 10,
  },
  dateField: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.litegray1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.Boxgray,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  dateFieldText: {
    flex: 1,
    fontFamily: FONTS.Medium,
    fontSize: 15,
    color: Colors.black,
  },
  datePickerBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  datePickerSheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  datePickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.Boxgray,
  },
  datePickerAction: {
    fontFamily: FONTS.Medium,
    fontSize: 15,
    color: Colors.darkText,
  },
  datePickerDone: {
    color: Colors.primary,
    fontFamily: FONTS.SemiBold,
  },
  sheetEyebrow: {
    fontFamily: FONTS.Medium,
    fontSize: 12,
    color: Colors.darkText,
    marginBottom: 2,
  },
  sheetTitle: {
    fontFamily: FONTS.SemiBold,
    fontSize: 22,
    color: Colors.black,
    letterSpacing: -0.4,
  },
  sheetHint: {
    marginTop: 4,
    marginBottom: 14,
    fontFamily: FONTS.Regular,
    fontSize: 13,
    color: Colors.darkText,
    lineHeight: 18,
  },
  fieldLabel: {
    fontFamily: FONTS.Medium,
    fontSize: 13,
    color: Colors.orderdark,
    marginBottom: 6,
  },
  inlineLoading: {
    marginTop: 16,
    alignItems: "center",
    paddingVertical: 8,
  },
  emptyText: {
    marginTop: 12,
    fontFamily: FONTS.Regular,
    fontSize: 13,
    color: Colors.darkText,
  },
  emptyHint: {
    marginTop: 20,
    marginBottom: 10,
    fontFamily: FONTS.Regular,
    fontSize: 13,
    color: Colors.darkText,
    textAlign: "center",
  },
  stopsHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  changeRouteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 14,
    minHeight: 48,
    backgroundColor: "transparent",
    borderWidth: 0,
    elevation: 0,
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    zIndex: 60,
  },
  changeRouteBtnPressed: {
    opacity: 0.55,
  },
  changeRouteText: {
    fontFamily: FONTS.SemiBold,
    fontSize: 14,
    color: Colors.primary,
  },
  doneFilterBtn: {
    marginTop: 18,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  doneFilterText: {
    fontFamily: FONTS.SemiBold,
    fontSize: 15,
    color: Colors.white,
  },
});
