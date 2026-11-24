import ButtonComponent from "@/src/components/buttonComponent";
import CalenderDate from "@/src/components/CalenderDate";
import { toApiDateString } from "@/src/components/DateFormate";
import DropDownBox from "@/src/components/DropDownBox";
import { useErrorHandle } from "@/src/components/ErrorHandle";
import LoadingModal from "@/src/components/LoadingModal";
import { Images } from "@/src/assets/images";
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
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

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

  const [selectDate, setSelectDate] = useState<string>(
    toApiDateString(route?.params?.date || SelectActiveDate) || today,
  );
  const [regions, setRegions] = useState<DriverAssignedRegion[]>([]);
  const [selectedRegion, setSelectedRegion] =
    useState<DriverAssignedRegion | null>(
      route?.params?.region_id
        ? {
            region_id: route.params.region_id,
            region_name: route.params.region_name,
            region_color: route.params.region_color,
          }
        : null,
    );
  const [regionsLoading, setRegionsLoading] = useState(false);
  const [mapData, setMapData] = useState<DriverRouteMapData | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [sheetMode, setSheetMode] = useState<SheetMode>("filter");
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
  const autoShowDoneRef = useRef(false);

  userDataRef.current = UserData;
  errorHandleRef.current = ErrorHandle;
  setToastRef.current = setToast;
  mapDataRef.current = mapData;

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
    sheetProgress.value = withTiming(sheetExpanded ? 1 : 0, {
      duration: 260,
      easing: Easing.out(Easing.cubic),
    });
  }, [sheetExpanded, sheetProgress]);

  const sheetStyle = useAnimatedStyle(() => ({
    maxHeight: 120 + sheetProgress.value * 280,
  }));

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
          if (!prev) return nextRegions[0];
          const still = nextRegions.find(
            (r) => String(r.region_id) === String(prev.region_id),
          );
          return still || nextRegions[0];
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
        setSheetMode("stops");
        setSheetExpanded(true);
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

  // If navigated with region+date already (legacy picker), auto show once.
  useEffect(() => {
    if (autoShowDoneRef.current) return;
    if (route?.params?.region_id && route?.params?.date) {
      autoShowDoneRef.current = true;
      loadRoute({
        region_id: route.params.region_id,
        date: route.params.date,
      });
    }
  }, [loadRoute, route?.params?.date, route?.params?.region_id]);

  const loadRouteRef = useRef(loadRoute);
  loadRouteRef.current = loadRoute;

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
  const emptyMapMessage = !apiKey
    ? t("Google Maps key is missing")
    : routeLoading
      ? t("Loading...")
      : t("Select date & region, then tap Show route");

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
            onPress={() => {
              setSheetMode("filter");
              setSheetExpanded(true);
            }}
            style={styles.headerAction}
            hitSlop={8}
          >
            <Ionicons name="options-outline" size={22} color={Colors.black} />
          </Pressable>
        </View>
      </SafeAreaView>

      <View style={styles.body}>
        <View style={styles.mapPane}>
          {apiKey && mapData ? (
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
              {routeLoading ? (
                <ActivityIndicator color={Colors.primary} />
              ) : (
                <Ionicons
                  name="map-outline"
                  size={42}
                  color={Colors.primary}
                  style={{ marginBottom: 12 }}
                />
              )}
              <Text style={styles.placeholderText}>{emptyMapMessage}</Text>
            </View>
          )}

          {/* Floating reopen chip when sheet collapsed */}
          {!sheetExpanded ? (
            <Pressable
              style={[styles.reopenChip, { bottom: Math.max(insets.bottom, 12) + 12 }]}
              onPress={() => setSheetExpanded(true)}
            >
              <Ionicons name="chevron-up" size={18} color={Colors.white} />
              <Text style={styles.reopenChipText}>
                {sheetMode === "filter" ? t("Show route") : t("Stop details")}
              </Text>
            </Pressable>
          ) : null}
        </View>

        {/* Google Maps–style bottom popup */}
        {sheetExpanded ? (
          <Animated.View
            style={[
              styles.sheet,
              sheetStyle,
              { paddingBottom: Math.max(insets.bottom, 12) },
            ]}
          >
            <Pressable
              style={styles.sheetHandleHit}
              onPress={() => setSheetExpanded(false)}
            >
              <View style={styles.sheetHandle} />
            </Pressable>

            {sheetMode === "filter" ? (
              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.sheetContent}
              >
                <Text style={styles.sheetTitle}>{t("Show route")}</Text>
                <Text style={styles.sheetHint}>
                  {t("Choose date and region to open the route map")}
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

                {!regionsLoading && regions.length === 0 ? (
                  <Text style={styles.emptyText}>
                    {t("No regions assigned for this date")}
                  </Text>
                ) : null}

                <ButtonComponent
                  title={t("Show route")}
                  marginTop={18}
                  onPress={() => loadRoute()}
                  disabled={!selectedRegion?.region_id || routeLoading}
                  loading={routeLoading}
                />
              </ScrollView>
            ) : (
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.sheetContent}
              >
                <View style={styles.stopsHeader}>
                  <Text style={styles.sheetTitle}>{t("Stop details")}</Text>
                  <Pressable
                    onPress={() => setSheetMode("filter")}
                    hitSlop={8}
                    style={styles.changeRouteBtn}
                  >
                    <Ionicons name="swap-horizontal" size={16} color={Colors.primary} />
                    <Text style={styles.changeRouteText}>{t("Change")}</Text>
                  </Pressable>
                </View>

                {selectedStops.length === 0 ? (
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
        ) : null}
      </View>

      <LoadingModal visible={regionsLoading && regions.length === 0 && !mapData} />
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
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.Boxgray,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  backIcon: {
    width: 34,
    height: 34,
  },
  headerTextWrap: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: FONTS.SemiBold,
    fontSize: 16,
    color: Colors.black,
  },
  headerSub: {
    marginTop: 2,
    fontFamily: FONTS.Regular,
    fontSize: 12,
    color: Colors.darkText,
  },
  headerAction: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.litegray1,
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  mapPane: {
    flex: 1,
    backgroundColor: "#e8eef5",
  },
  mapPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  placeholderText: {
    fontFamily: FONTS.Medium,
    fontSize: 14,
    color: Colors.darkText,
    textAlign: "center",
    lineHeight: 20,
  },
  reopenChip: {
    position: "absolute",
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.black,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  reopenChipText: {
    color: Colors.white,
    fontFamily: FONTS.SemiBold,
    fontSize: 13,
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: -4 },
    elevation: 16,
    overflow: "hidden",
  },
  sheetHandleHit: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 4,
  },
  sheetHandle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.Boxgray,
  },
  sheetContent: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  sheetTitle: {
    fontFamily: FONTS.SemiBold,
    fontSize: 17,
    color: Colors.black,
  },
  sheetHint: {
    marginTop: 4,
    marginBottom: 12,
    fontFamily: FONTS.Regular,
    fontSize: 13,
    color: Colors.darkText,
  },
  fieldLabel: {
    fontFamily: FONTS.Medium,
    fontSize: 13,
    color: Colors.orderdark,
    marginBottom: 6,
  },
  emptyText: {
    marginTop: 10,
    fontFamily: FONTS.Regular,
    fontSize: 13,
    color: Colors.darkText,
  },
  emptyHint: {
    marginTop: 16,
    marginBottom: 8,
    fontFamily: FONTS.Regular,
    fontSize: 13,
    color: Colors.darkText,
    textAlign: "center",
  },
  stopsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  changeRouteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.primarylite,
  },
  changeRouteText: {
    fontFamily: FONTS.Medium,
    fontSize: 12,
    color: Colors.primary,
  },
});
