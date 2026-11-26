import apiConstants from "@/src/api/apiConstants";
import { Images } from "@/src/assets/images";
import {
  formatDate,
  parseSafeDate,
  toApiDateString,
} from "@/src/components/DateFormate";
import DropDownBox from "@/src/components/DropDownBox";
import { useErrorHandle } from "@/src/components/ErrorHandle";
import GpsPermissionSheet from "@/src/components/GpsPermissionSheet";
import { GlobalContextData } from "@/src/context/GlobalContext";
import {
  checkLocationPermission,
  getSafeCurrentPosition,
  openAppSettings,
  recheckLocationAccess,
  resolveLocationAccess,
  retryLocationPermission,
  type LocationAccessStatus,
} from "@/src/hooks/useUserGPS";
import RouteMapView, {
  type RouteMapViewHandle,
} from "@/src/screens/RouteMap/RouteMapView";
import StopDetailCard from "@/src/screens/RouteMap/StopDetailCard";
import type {
  DriverAssignedRegion,
  DriverRouteMapData,
  RouteMapStop,
} from "@/src/screens/RouteMap/types";
import {
  getTodoStopsInRouteOrder,
  toFiniteNumber,
} from "@/src/screens/RouteMap/types";
import ApiService from "@/src/utils/Apiservice";
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
  AppState,
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

  /** On trip wins over the screen the user was browsing. */
  const preferredDate = useMemo(() => {
    if (tripOn && activeShift?.planning_date) {
      return toApiDateString(activeShift.planning_date) || activeShift.planning_date;
    }
    if (route?.params?.date) {
      return toApiDateString(route.params.date) || String(route.params.date);
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
    if (tripOn && activeShift?.region_id != null) {
      return String(activeShift.region_id);
    }
    return null;
  }, [activeShift?.region_id, tripOn]);

  const [selectDate, setSelectDate] = useState<string>(preferredDate || today);
  const [regions, setRegions] = useState<DriverAssignedRegion[]>([]);
  const initialRegion = useMemo<DriverAssignedRegion | null>(() => {
    if (tripOn && activeShift?.region_id != null) {
      return {
        region_id: activeShift.region_id,
        region_name: activeShift.region_name,
      };
    }
    return null;
  }, [activeShift?.region_id, activeShift?.region_name, tripOn]);

  const [selectedRegion, setSelectedRegion] =
    useState<DriverAssignedRegion | null>(initialRegion);
  const [regionsLoading, setRegionsLoading] = useState(false);
  const [mapData, setMapData] = useState<DriverRouteMapData | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  /** Map-marker highlight only — list always shows all todo stops. */
  const [highlightedKey, setHighlightedKey] = useState<string | null>(null);
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
  const [locating, setLocating] = useState(false);
  const [gpsSheet, setGpsSheet] = useState<{
    visible: boolean;
    reason: LocationAccessStatus | null;
  }>({ visible: false, reason: null });

  const snapPoints = useMemo(() => ["22%", "48%", "78%"], []);
  const bottomSheetRef = useRef<BottomSheet>(null);
  const mapViewRef = useRef<RouteMapViewHandle>(null);
  const pickupSlideRef = useRef<any>(null);
  const listScrollRef = useRef<any>(null);
  const stopOffsetsRef = useRef<Record<string, number>>({});

  const mountedRef = useRef(true);
  const regionsReqRef = useRef(0);
  const routeReqRef = useRef(0);
  const userDataRef = useRef(UserData);
  const errorHandleRef = useRef(ErrorHandle);
  const setToastRef = useRef(setToast);
  const mapDataRef = useRef<DriverRouteMapData | null>(null);
  const preferredRegionIdRef = useRef(preferredRegionId);
  const lastAutoKeyRef = useRef<string>("");
  const userConfirmedRef = useRef(false);
  const pickedRegionRef = useRef(false);
  const sheetModeRef = useRef<SheetMode>(sheetMode);

  userDataRef.current = UserData;
  errorHandleRef.current = ErrorHandle;
  setToastRef.current = setToast;
  mapDataRef.current = mapData;
  preferredRegionIdRef.current = preferredRegionId;
  sheetModeRef.current = sheetMode;

  // Trip on: that region + date, and that route's stop list.
  // Otherwise quick jump from pickup/dropoff uses the screen's date + region.
  useEffect(() => {
    if (tripOn && activeShift?.region_id != null && activeShift?.planning_date) {
      const tripDate =
        toApiDateString(activeShift.planning_date) ||
        String(activeShift.planning_date);
      if (tripDate && tripDate !== selectDate) {
        preferredRegionIdRef.current = String(activeShift.region_id);
        lastAutoKeyRef.current = "";
        setSelectDate(tripDate);
      }
      return;
    }

    const incomingDate = route?.params?.date
      ? toApiDateString(route.params.date) || String(route.params.date)
      : "";
    if (incomingDate && incomingDate !== selectDate) {
      setSelectDate(incomingDate);
    }
  }, [
    activeShift?.planning_date,
    activeShift?.region_id,
    route?.params?.date,
    selectDate,
    tripOn,
  ]);

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
        if (!tripOn || activeShift?.region_id == null) {
          setRegions([]);
          setSelectedRegion(null);
          setMapData(null);
          return;
        }
        const tripRegionId = String(activeShift.region_id);
        const tripRegion =
          nextRegions.find((region) => String(region.region_id) === tripRegionId) || {
            region_id: activeShift.region_id,
            region_name: activeShift.region_name,
          };
        preferredRegionIdRef.current = tripRegionId;
        setRegions([tripRegion]);
        setSelectedRegion((prev) => {
          if (String(prev?.region_id ?? "") !== tripRegionId) {
            lastAutoKeyRef.current = "";
            setMapData(null);
          }
          return tripRegion;
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
  }, [activeShift?.region_id, activeShift?.region_name, selectDate, tripOn]);

  const snapSheetTo = useCallback((index: number) => {
    const next = Math.max(SHEET_SNAP.HIDDEN, Math.min(SHEET_SNAP.FULL, index));
    setSheetIndex(next);
  }, []);

  // No trip: do not keep a region or its stop list on screen.
  useEffect(() => {
    if (tripOn) return;
    userConfirmedRef.current = false;
    pickedRegionRef.current = false;
    lastAutoKeyRef.current = "";
    setSelectedRegion(null);
    setMapData(null);
    setHighlightedKey(null);
    setSheetMode("filter");
    snapSheetTo(SHEET_SNAP.MID);
  }, [snapSheetTo, tripOn]);

  // Trip on: dropdown and stop list stay on that one region. Other regions are not shown.
  useEffect(() => {
    if (!tripOn || activeShift?.region_id == null || regionsLoading) return;
    const tripId = String(activeShift.region_id);
    const match =
      regions.find((region) => String(region.region_id) === tripId) || {
        region_id: activeShift.region_id,
        region_name: activeShift.region_name,
      };
    const onlyThisTrip = regions.length === 1 && String(regions[0]?.region_id) === tripId;
    if (!onlyThisTrip) {
      setRegions([match]);
    }
    if (String(selectedRegion?.region_id ?? "") !== tripId) {
      lastAutoKeyRef.current = "";
      setMapData(null);
      setSelectedRegion(match);
    } else if (
      mapDataRef.current?.region_id != null &&
      String(mapDataRef.current.region_id) !== tripId
    ) {
      lastAutoKeyRef.current = "";
      setMapData(null);
    }
    setSheetMode("stops");
    snapSheetTo(SHEET_SNAP.MID);
  }, [
    activeShift?.region_id,
    activeShift?.region_name,
    regions,
    regionsLoading,
    selectedRegion?.region_id,
    snapSheetTo,
    tripOn,
  ]);

  // Keep region/date Change sheet open until a region is chosen.
  useEffect(() => {
    if (regionsLoading) return;
    const hasTripRegion = regions.some(
      (region) =>
        (region?.trip_started_at && !region?.trip_ended_at) ||
        (tripOn &&
          activeShift?.region_id != null &&
          String(region.region_id) === String(activeShift.region_id)),
    );
    if (hasTripRegion) return;
    if (selectedRegion?.region_id == null) {
      setSheetMode("filter");
      snapSheetTo(SHEET_SNAP.MID);
    }
  }, [
    activeShift?.region_id,
    regions,
    regionsLoading,
    selectedRegion?.region_id,
    snapSheetTo,
    tripOn,
  ]);

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
            setHighlightedKey(null);
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

        // Drop highlight if that stop is gone / done.
        setHighlightedKey((prev) => {
          if (!prev) return null;
          const still = nextStops.find(
            (s) =>
              s &&
              s.is_done !== true &&
              String(s.stop_key) === String(prev),
          );
          return still ? prev : null;
        });

        // Don't kick user out of Change sheet / don't collapse stop sheet on silent refresh.
        if (!opts?.silent && sheetModeRef.current !== "filter") {
          setSheetMode("stops");
          // Show full todo list under the map by default.
          snapSheetTo(SHEET_SNAP.MID);
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

  // Route list loads for the on trip, or after the user confirms a region.
  useEffect(() => {
    if (!tripOn && !userConfirmedRef.current) return;
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
  }, [regionsLoading, selectDate, selectedRegion?.region_id, tripOn]);

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

  const showMyLocationOnMap = useCallback(async () => {
    setLocating(true);
    try {
      const position = await getSafeCurrentPosition();
      const lat = position?.coords?.latitude;
      const lng = position?.coords?.longitude;
      if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
        setToast({
          top: 45,
          text: t("Destination location is unavailable"),
          type: "error",
          visible: true,
        });
        return;
      }
      mapViewRef.current?.focusMyLocation(lat, lng);
    } finally {
      setLocating(false);
    }
  }, [setToast, t]);

  /** Lazy GPS: only when the button is pressed. Same permission flow as other screens. */
  const onMyLocationPress = useCallback(async () => {
    if (locating) return;
    setLocating(true);
    try {
      const status = await resolveLocationAccess();
      if (status !== "granted") {
        setLocating(false);
        setGpsSheet({ visible: true, reason: status });
        return;
      }
      setGpsSheet({ visible: false, reason: null });
      await showMyLocationOnMap();
    } catch {
      setLocating(false);
      setGpsSheet({ visible: true, reason: "denied" });
    }
  }, [locating, showMyLocationOnMap]);

  const onGpsSheetPrimary = useCallback(async () => {
    const reason = gpsSheet.reason;
    if (!reason || reason === "granted") return;
    setLocating(true);
    try {
      if (reason === "denied" || reason === "services_disabled") {
        const status = await retryLocationPermission();
        if (status === "granted") {
          setGpsSheet({ visible: false, reason: null });
          await showMyLocationOnMap();
          return;
        }
        setGpsSheet({ visible: true, reason: status });
        return;
      }
      await openAppSettings();
    } finally {
      setLocating(false);
    }
  }, [gpsSheet.reason, showMyLocationOnMap]);

  useEffect(() => {
    if (!gpsSheet.visible) return;
    const sub = AppState.addEventListener("change", async (next) => {
      if (next !== "active") return;
      const status = await recheckLocationAccess();
      if (status === "granted") {
        setGpsSheet({ visible: false, reason: null });
        await showMyLocationOnMap();
      }
    });
    return () => sub.remove();
  }, [gpsSheet.visible, showMyLocationOnMap]);

  /** Same home slide the pickup/dropoff filter uses (title + type). */
  const resolvePickupSlide = useCallback(async () => {
    if (pickupSlideRef.current?.type === "pickup_dropoff" && pickupSlideRef.current?.item_title) {
      return pickupSlideRef.current;
    }
    try {
      const res = await ApiService(apiConstants.get_AllSlideDataApi, {
        customData: {
          token: UserData?.user?.verify_token,
          role: UserData?.user?.role,
          relaties_id: UserData?.relaties?.id,
          user_id: UserData?.user?.id,
        },
      });
      const list = Array.isArray(res?.data) ? res.data : [];
      const slide = list.find((row: any) => row?.type === "pickup_dropoff");
      if (slide) {
        pickupSlideRef.current = slide;
        return slide;
      }
    } catch {
      // Keep the jump working even if the slider call fails.
    }
    return { type: "pickup_dropoff", item_title: pickupSlideRef.current?.item_title };
  }, [UserData?.relaties?.id, UserData?.user?.id, UserData?.user?.role, UserData?.user?.verify_token]);

  /** Quick jump to pickup/dropoff list with this screen's date + region. */
  const goToPickupDropoff = useCallback(async () => {
    const date = toApiDateString(selectDate) || selectDate;
    const regionId = selectedRegion?.region_id ?? mapData?.region_id;
    const regionPayload =
      regionId != null
        ? {
            id: regionId,
            name:
              selectedRegion?.region_name ??
              mapData?.region_name ??
              "",
            region_color:
              selectedRegion?.region_color ?? mapData?.region_color,
          }
        : null;
    if (date) setSelectActiveDate(String(date));
    if (regionPayload) {
      setSelectRegionData(regionPayload);
      setSelectActiveRegionData(regionPayload);
    }
    const pickupSlide = await resolvePickupSlide();
    const pickupTitle = pickupSlide?.item_title ? String(pickupSlide.item_title) : "";
    setGloblyTypeSlide("pickup_dropoff");
    if (pickupTitle) setGloblySlideTitle(pickupTitle);
    navigation.navigate("FilterScreen", {
      item: {
        ...(pickupSlide || {}),
        type: "pickup_dropoff",
        ...(pickupTitle ? { item_title: pickupTitle } : {}),
      },
      Type: "pickup_dropoff",
      date,
      region_id: regionPayload?.id,
      region_name: regionPayload?.name,
      region_color: regionPayload?.region_color,
    });
  }, [
    mapData?.region_color,
    mapData?.region_id,
    mapData?.region_name,
    navigation,
    selectDate,
    selectedRegion?.region_color,
    selectedRegion?.region_id,
    selectedRegion?.region_name,
    resolvePickupSlide,
    setGloblySlideTitle,
    setGloblyTypeSlide,
    setSelectActiveDate,
    setSelectActiveRegionData,
    setSelectRegionData,
  ]);

  useEffect(() => {
    void resolvePickupSlide();
  }, [resolvePickupSlide]);

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

  /** Full under-map list: all todo stops in API planning order. */
  const listStops = useMemo(
    () => getTodoStopsInRouteOrder(mapData?.stops),
    [mapData?.stops],
  );

  const scrollToStopCard = useCallback((stopKey: string) => {
    const y = stopOffsetsRef.current[String(stopKey)];
    if (y == null || !listScrollRef.current?.scrollTo) return;
    listScrollRef.current.scrollTo({
      y: Math.max(0, y - 8),
      animated: true,
    });
  }, []);

  const onStopPress = useCallback(
    (stopKey: string) => {
      const key = String(stopKey);
      const stop = stopByKey.get(key);
      if (stop?.is_done) return;
      // Highlight + scroll to card — list stays full (not selected-only).
      setHighlightedKey(key);
      openSheet("stops", SHEET_SNAP.FULL);
      requestAnimationFrame(() => {
        setTimeout(() => scrollToStopCard(key), 80);
      });
    },
    [openSheet, scrollToStopCard, stopByKey],
  );

  const onStopCardLayoutY = useCallback((stopKey: string, y: number) => {
    stopOffsetsRef.current[String(stopKey)] = y;
  }, []);

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
            onPress={goToPickupDropoff}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityLabel={t("Orders")}
            style={({ pressed }) => [
              styles.quickJumpBtn,
              pressed && styles.changeRouteBtnPressed,
            ]}
          >
            <Ionicons name="list-outline" size={22} color={Colors.primary} />
          </Pressable>
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
              ref={mapViewRef}
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

          <Pressable
            onPress={onMyLocationPress}
            disabled={locating}
            accessibilityLabel={t("Current location")}
            style={({ pressed }) => [
              styles.myLocationBtn,
              pressed && { opacity: 0.7 },
            ]}
          >
            {locating ? (
              <ActivityIndicator color={Colors.primary} size="small" />
            ) : (
              <Ionicons name="locate" size={22} color={Colors.primary} />
            )}
          </Pressable>

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
          handleIndicatorStyle={styles.sheetHandle}
          style={styles.sheet}
        >
          <BottomSheetScrollView
            ref={listScrollRef}
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

                <View style={styles.filterBlock}>
                  <Text style={styles.fieldLabel}>{t("Select date")}</Text>
                  <TouchableOpacity
                    activeOpacity={0.75}
                    onPress={openNativeDatePicker}
                    style={styles.dateField}
                  >
                    <View style={styles.fieldIcon}>
                      <Ionicons
                        name="calendar-outline"
                        size={18}
                        color={Colors.primary}
                      />
                    </View>
                    <View style={styles.fieldTextWrap}>
                      <Text style={styles.fieldCaption}>{t("Date")}</Text>
                      <Text style={styles.dateFieldText} numberOfLines={1}>
                        {dateLabel}
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-down"
                      size={18}
                      color={Colors.primary}
                    />
                  </TouchableOpacity>

                  <Text style={[styles.fieldLabel, styles.fieldLabelSpaced]}>
                    {t("Select region")}
                  </Text>
                  <DropDownBox
                    data={regions}
                    value={selectedRegion}
                    setValue={(region) => {
                      pickedRegionRef.current = true;
                      setSelectedRegion(region);
                    }}
                    labelFieldKey="region_name"
                    valueFieldKey="region_id"
                    placeholder="Select Region"
                    dropdownPosition="top"
                    ContainerStyle={styles.regionDropdown}
                  />
                </View>

                {regionsLoading || routeLoading ? (
                  <View style={styles.inlineLoading}>
                    <ActivityIndicator color={Colors.primary} />
                  </View>
                ) : tripOn && regions.length === 0 ? (
                  <Text style={styles.emptyText}>
                    {t("No regions assigned for this date")}
                  </Text>
                ) : tripOn ? (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={[
                      styles.doneFilterBtn,
                      !selectedRegion?.region_id && { opacity: 0.45 },
                    ]}
                    disabled={!selectedRegion?.region_id}
                    onPress={() => {
                      if (!selectedRegion?.region_id) return;
                      if (!tripOn) {
                        userConfirmedRef.current = true;
                        lastAutoKeyRef.current = "";
                      }
                      loadRouteRef.current({
                        region_id: selectedRegion.region_id,
                        date: toApiDateString(selectDate) || selectDate,
                      });
                      openSheet("stops", SHEET_SNAP.MID);
                    }}
                  >
                    <Text style={styles.doneFilterText}>{t("Done")}</Text>
                  </TouchableOpacity>
                ) : null}
              </>
            ) : (
              <>
                <View style={styles.stopsHeader}>
                  <View>
                    <Text style={styles.sheetEyebrow}>{t("Route stops")}</Text>
                    <Text style={styles.sheetTitle}>{t("Stop details")}</Text>
                  </View>
                  {listStops.length > 0 ? (
                    <Text style={styles.stopsCount}>
                      {listStops.length}
                    </Text>
                  ) : null}
                </View>

                {routeLoading && listStops.length === 0 ? (
                  <View style={styles.inlineLoading}>
                    <ActivityIndicator color={Colors.primary} />
                  </View>
                ) : listStops.length === 0 ? (
                  <Text style={styles.emptyHint}>
                    {t("No stops for this route")}
                  </Text>
                ) : (
                  listStops.map((stop, index) => {
                    const key = String(stop.stop_key ?? `stop-${index}`);
                    return (
                      <StopDetailCard
                        key={key}
                        stop={stop}
                        indexLabel={stop.stop_number ?? index + 1}
                        highlighted={
                          highlightedKey != null &&
                          String(highlightedKey) === key
                        }
                        onLayoutY={onStopCardLayoutY}
                        onAddressPress={openAddressInMaps}
                        onOrderPress={openOrderDetails}
                      />
                    );
                  })
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

      <GpsPermissionSheet
        visible={gpsSheet.visible}
        reason={gpsSheet.reason}
        loading={locating}
        onClose={() => setGpsSheet({ visible: false, reason: null })}
        onPrimaryAction={onGpsSheetPrimary}
      />
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
  myLocationBtn: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 20,
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
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
    borderRadius: 0,
  },
  sheetBackground: {
    backgroundColor: Colors.white,
    borderRadius: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
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
  filterBlock: {
    marginTop: 16,
  },
  dateField: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
    paddingHorizontal: 12,
    height: 56,
  },
  fieldIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: Colors.primarylite,
    alignItems: "center",
    justifyContent: "center",
  },
  fieldTextWrap: {
    flex: 1,
  },
  fieldCaption: {
    fontFamily: FONTS.Medium,
    fontSize: 11,
    color: Colors.darkText,
    marginBottom: 1,
  },
  dateFieldText: {
    fontFamily: FONTS.SemiBold,
    fontSize: 15,
    color: Colors.black,
  },
  regionDropdown: {
    marginVertical: 0,
  },
  fieldLabelSpaced: {
    marginTop: 16,
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
  fieldLabel: {
    fontFamily: FONTS.SemiBold,
    fontSize: 12,
    letterSpacing: 0.3,
    color: Colors.orderdark,
    marginBottom: 8,
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
  stopsCount: {
    minWidth: 28,
    height: 28,
    borderRadius: 10,
    paddingHorizontal: 8,
    backgroundColor: Colors.primarylite,
    overflow: "hidden",
    textAlign: "center",
    textAlignVertical: "center",
    fontFamily: FONTS.SemiBold,
    fontSize: 13,
    color: Colors.primary,
    lineHeight: 28,
  },
  quickJumpBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
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
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
  },
  doneFilterText: {
    fontFamily: FONTS.SemiBold,
    fontSize: 15,
    color: Colors.white,
  },
});
