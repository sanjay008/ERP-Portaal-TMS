import { Images } from "@/src/assets/images";
import CalenderDate from "@/src/components/CalenderDate";
import { toApiDateString } from "@/src/components/DateFormate";
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
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

const SHEET_HIDDEN_Y = 340;
const SPRING = { damping: 22, stiffness: 220, mass: 0.85 };

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
  const [selectedRegion, setSelectedRegion] =
    useState<DriverAssignedRegion | null>(
      route?.params?.region_id
        ? {
            region_id: route.params.region_id,
            region_name: route.params.region_name,
            region_color: route.params.region_color,
          }
        : tripOn && activeShift?.region_id
          ? {
              region_id: activeShift.region_id,
              region_name: activeShift.region_name,
            }
          : null,
    );
  const [regionsLoading, setRegionsLoading] = useState(false);
  const [mapData, setMapData] = useState<DriverRouteMapData | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [sheetMode, setSheetMode] = useState<SheetMode>("stops");
  const [sheetExpanded, setSheetExpanded] = useState(true);
  const [resolvedApiKey, setResolvedApiKey] = useState(
    String(GOOGLE_API_KEY || "").trim(),
  );
  const [mapsKeySource, setMapsKeySource] = useState("context");

  const sheetProgress = useSharedValue(1);

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

  useEffect(() => {
    sheetProgress.value = withSpring(sheetExpanded ? 1 : 0, SPRING);
  }, [sheetExpanded, sheetProgress]);

  // Keep sheet always usable — no floating reopen chip button.
  // Collapse only peeks it; drag-handle / header options brings it back.
  const sheetStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      sheetProgress.value,
      [0, 1],
      [SHEET_HIDDEN_Y * 0.72, 0],
      Extrapolation.CLAMP,
    );
    return {
      transform: [{ translateY }],
    };
  });

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
          const preferId = preferredRegionIdRef.current;
          if (preferId) {
            const tripRegion = nextRegions.find(
              (r) => String(r.region_id) === preferId,
            );
            if (tripRegion) return tripRegion;
          }
          if (prev) {
            const still = nextRegions.find(
              (r) => String(r.region_id) === String(prev.region_id),
            );
            if (still) return still;
          }
          // Default: first region for the date.
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
        setToastRef.current({
          top: 45,
          text: t("Please select a region"),
          type: "error",
          visible: true,
        });
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
          setMapData(null);
          setToastRef.current({
            top: 45,
            text: res?.message || t("Unable to load route map"),
            type: "error",
            visible: true,
          });
          return;
        }

        setMapData(parsed);
        setSelectedKeys([]);
        // Don't kick user out of Change sheet while they are editing filters.
        if (sheetModeRef.current !== "filter") {
          setSheetMode("stops");
          setSheetExpanded(true);
        }
        setSelectActiveDate(date);
        setSelectRegionData({
          id: parsed.region_id ?? region_id,
          name: parsed.region_name ?? selectedRegion?.region_name,
          region_color: parsed.region_color ?? selectedRegion?.region_color,
        });
      } catch (error: any) {
        if (!mountedRef.current || requestId !== routeReqRef.current) return;
        setToastRef.current({
          top: 45,
          text: errorHandleRef.current(error).message,
          type: "error",
          visible: true,
        });
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
      t,
    ],
  );

  const loadRouteRef = useRef(loadRoute);
  loadRouteRef.current = loadRoute;

  // Auto-show route when date + region are ready (trip region or first region).
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
      // Soft refresh after returning from Details so done stops leave the list.
      if (mapDataRef.current) {
        loadRouteRef.current({ silent: true });
      }
      return () => {
        mountedRef.current = false;
      };
    }, []),
  );

  const openChangeSheet = useCallback(() => {
    setSheetMode("filter");
    setSheetExpanded(true);
  }, []);

  const stopByKey = useMemo(() => {
    const map = new Map<string, RouteMapStop>();
    (mapData?.stops || []).forEach((stop) => {
      if (stop?.stop_key != null) map.set(String(stop.stop_key), stop);
    });
    return map;
  }, [mapData?.stops]);

  const selectedStops = useMemo(
    () =>
      selectedKeys
        .map((key) => stopByKey.get(key))
        .filter((stop): stop is RouteMapStop => Boolean(stop) && !stop.is_done),
    [selectedKeys, stopByKey],
  );

  const onStopPress = useCallback(
    (stopKey: string) => {
      const key = String(stopKey);
      const stop = stopByKey.get(key);
      if (stop?.is_done) return;
      setSheetMode("stops");
      setSheetExpanded(true);
      setSelectedKeys((prev) => {
        if (prev.includes(key)) return [key, ...prev.filter((k) => k !== key)];
        return [...prev, key];
      });
    },
    [stopByKey],
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
      const regionPayload = {
        id: current?.region_id ?? selectedRegion?.region_id,
        name: current?.region_name ?? selectedRegion?.region_name,
        region_color: current?.region_color ?? selectedRegion?.region_color,
      };
      setSelectActiveDate(
        String(current?.planning_date || toApiDateString(selectDate) || selectDate),
      );
      setSelectRegionData(regionPayload);
      setSelectActiveRegionData(regionPayload);
      setGloblyTypeSlide("pickup_dropoff");
      navigation.navigate("Details", {
        item: {
          id: stop.order_id,
          ordernr: stop.ordernr,
          name: stop.name,
        },
        order_id: stop.order_id,
        type: "pickup_dropoff",
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

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
      <SafeAreaView style={styles.safeTop} edges={["top", "left", "right"]}>
        <View style={styles.header}>
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={10}
            style={styles.backBtn}
          >
            <Image source={Images.back} style={styles.backIcon} />
          </Pressable>
          <View style={styles.headerTextWrap}>
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
            style={styles.changeRouteBtn}
            hitSlop={8}
          >
            <Ionicons
              name="swap-horizontal"
              size={16}
              color={Colors.primary}
            />
            <Text style={styles.changeRouteText}>{t("Change")}</Text>
          </Pressable>
        </View>
      </SafeAreaView>

      <View style={styles.body}>
        <View style={styles.mapPane}>
          {/* Map boots immediately; route pins inject when API data arrives. */}
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
        </View>

        {/* Always mounted sheet — spring translateY (no LoadingModal). */}
        <Animated.View
          pointerEvents="auto"
          style={[
            styles.sheet,
            sheetStyle,
            { paddingBottom: Math.max(insets.bottom, 14) },
          ]}
        >
          <Pressable
            style={styles.sheetHandleHit}
            onPress={() => setSheetExpanded((prev) => !prev)}
          >
            <View style={styles.sheetHandle} />
          </Pressable>

          {sheetMode === "filter" ? (
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.sheetContent}
              bounces={false}
            >
              <Text style={styles.sheetEyebrow}>{t("Route")}</Text>
              <Text style={styles.sheetTitle}>{t("Change")}</Text>
              <Text style={styles.sheetHint}>
                {t("Choose date and region — route updates automatically")}
              </Text>

              <Text style={styles.fieldLabel}>{t("Select date")}</Text>
              <CalenderDate date={selectDate} setDate={setSelectDate} />

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
                <Pressable
                  style={styles.doneFilterBtn}
                  onPress={() => {
                    setSheetMode("stops");
                    setSheetExpanded(true);
                  }}
                >
                  <Text style={styles.doneFilterText}>{t("Done")}</Text>
                </Pressable>
              )}
            </ScrollView>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.sheetContent}
              bounces={false}
            >
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
                    key={String(stop.stop_key)}
                    stop={stop}
                    indexLabel={stop.stop_number ?? index + 1}
                    onAddressPress={openAddressInMaps}
                    onOrderPress={openOrderDetails}
                  />
                ))
              )}
            </ScrollView>
          )}
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  safeTop: {
    backgroundColor: Colors.white,
  },
  header: {
    backgroundColor: Colors.white,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: "58%",
    backgroundColor: Colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -6 },
    elevation: 18,
  },
  sheetHandleHit: {
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 6,
  },
  sheetHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.Boxgray,
  },
  sheetContent: {
    paddingHorizontal: 18,
    paddingBottom: 10,
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
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: Colors.primarylite,
  },
  changeRouteText: {
    fontFamily: FONTS.Medium,
    fontSize: 12,
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
