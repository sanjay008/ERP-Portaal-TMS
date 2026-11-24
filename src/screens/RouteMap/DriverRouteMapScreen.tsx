import DetailsHeader from "@/src/components/DetailsHeader";
import { useErrorHandle } from "@/src/components/ErrorHandle";
import LoadingModal from "@/src/components/LoadingModal";
import { GlobalContextData } from "@/src/context/GlobalContext";
import {
  checkLocationPermission,
  getSafeCurrentPosition,
} from "@/src/hooks/useUserGPS";
import RouteMapView from "@/src/screens/RouteMap/RouteMapView";
import StopDetailCard from "@/src/screens/RouteMap/StopDetailCard";
import type {
  DriverRouteMapData,
  RouteMapStop,
} from "@/src/screens/RouteMap/types";
import { toFiniteNumber } from "@/src/screens/RouteMap/types";
import { getChauffeurLocation } from "@/src/utils/chauffeurLocationCache";
import { Colors } from "@/src/utils/colors";
import {
  fetchDriverRouteMap,
  parseRouteMapData,
} from "@/src/utils/driverRouteMapApi";
import { FONTS, getData } from "@/src/utils/storeData";
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
  Linking,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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
  const { ErrorHandle } = useErrorHandle();
  const {
    UserData,
    setToast,
    GOOGLE_API_KEY,
    setGOOGLE_API_KEY,
    setSelectActiveDate,
    setSelectRegionData,
    setSelectActiveRegionData,
    setGloblyTypeSlide,
  } = useContext(GlobalContextData);

  const regionId = route?.params?.region_id;
  const regionName = route?.params?.region_name;
  const regionColor = route?.params?.region_color;
  const date = route?.params?.date;

  const [mapData, setMapData] = useState<DriverRouteMapData | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);

  const hasLoadedRef = useRef(false);
  const requestIdRef = useRef(0);
  const mountedRef = useRef(true);
  const userDataRef = useRef(UserData);
  const errorHandleRef = useRef(ErrorHandle);
  const setToastRef = useRef(setToast);
  const mapDataRef = useRef<DriverRouteMapData | null>(null);

  userDataRef.current = UserData;
  errorHandleRef.current = ErrorHandle;
  setToastRef.current = setToast;
  mapDataRef.current = mapData;

  const title = useMemo(() => {
    const name = mapData?.region_name || regionName || t("Route");
    return String(name);
  }, [mapData?.region_name, regionName, t]);

  const stopByKey = useMemo(() => {
    const map = new Map<string, RouteMapStop>();
    (mapData?.stops || []).forEach((stop) => {
      if (stop?.stop_key != null) map.set(String(stop.stop_key), stop);
    });
    return map;
  }, [mapData?.stops]);

  /** Under-map list: selected stops that are not done. */
  const selectedStops = useMemo(() => {
    return selectedKeys
      .map((key) => stopByKey.get(key))
      .filter((stop): stop is RouteMapStop => Boolean(stop) && !stop.is_done);
  }, [selectedKeys, stopByKey]);

  const loadMap = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!regionId || !date) return;

      const requestId = ++requestIdRef.current;
      if (opts?.silent) setRefreshing(true);
      else setLoading(true);

      try {
        const res = await fetchDriverRouteMap(userDataRef.current, {
          region_id: regionId,
          date,
        });
        if (!mountedRef.current || requestId !== requestIdRef.current) return;

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
        const todoKeys = new Set(
          (parsed.stops || [])
            .filter((s) => !s.is_done)
            .map((s) => String(s.stop_key)),
        );
        setSelectedKeys((prev) => prev.filter((key) => todoKeys.has(String(key))));
      } catch (error: any) {
        if (!mountedRef.current || requestId !== requestIdRef.current) return;
        setToastRef.current({
          top: 45,
          text: errorHandleRef.current(error).message,
          type: "error",
          visible: true,
        });
      } finally {
        if (mountedRef.current && requestId === requestIdRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [date, regionId, t],
  );

  useFocusEffect(
    useCallback(() => {
      mountedRef.current = true;
      loadMap({ silent: hasLoadedRef.current });
      hasLoadedRef.current = true;
      return () => {
        mountedRef.current = false;
      };
    }, [loadMap]),
  );

  const onStopPress = useCallback(
    (stopKey: string) => {
      const key = String(stopKey);
      const stop = stopByKey.get(key);
      if (stop?.is_done) return;

      setSelectedKeys((prev) => {
        if (prev.includes(key)) {
          return [key, ...prev.filter((k) => k !== key)];
        }
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
          // fall through to destination-only URL
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
      if (stop.order_id == null || String(stop.order_id).trim() === "") {
        return;
      }

      const current = mapDataRef.current;
      const regionPayload = {
        id: current?.region_id ?? regionId,
        name: current?.region_name ?? regionName,
        region_color: current?.region_color ?? regionColor,
      };
      setSelectActiveDate(String(current?.planning_date || date));
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
      date,
      navigation,
      regionColor,
      regionId,
      regionName,
      setGloblyTypeSlide,
      setSelectActiveDate,
      setSelectActiveRegionData,
      setSelectRegionData,
    ],
  );

  // Context can be empty after cold start — hydrate from company-login storage.
  useEffect(() => {
    if (String(GOOGLE_API_KEY || "").trim()) return;
    let cancelled = false;
    (async () => {
      try {
        const stored =
          (await getData("GOOGLE_API_KEY")) ||
          (await getData("google_maps_api_key")) ||
          "";
        if (!cancelled && stored) {
          setGOOGLE_API_KEY(String(stored));
        }
      } catch {
        // ignore storage read errors
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [GOOGLE_API_KEY, setGOOGLE_API_KEY]);

  const apiKey = String(GOOGLE_API_KEY || "").trim();
  const statsLine = mapData
    ? `${mapData.stops_todo ?? 0} ${t("todo")} · ${mapData.stops_done ?? 0} ${t("done")} · ${mapData.stops_total ?? 0} ${t("total")}`
    : "";

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <DetailsHeader title={title} />

      <View style={styles.mapPane}>
        {apiKey && mapData ? (
          <RouteMapView
            apiKey={apiKey}
            mapData={mapData}
            onStopPress={onStopPress}
          />
        ) : (
          <View style={styles.mapPlaceholder}>
            <Text style={styles.placeholderText}>
              {!apiKey
                ? t("Google Maps key is missing")
                : loading
                  ? t("Loading...")
                  : t("No route data")}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.detailsPane}>
        <View style={styles.detailsHeaderRow}>
          <Text style={styles.detailsTitle}>{t("Stop details")}</Text>
          {!!statsLine && <Text style={styles.statsText}>{statsLine}</Text>}
        </View>

        <ScrollView
          style={styles.detailsScroll}
          contentContainerStyle={styles.detailsContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadMap({ silent: true })}
            />
          }
        >
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
      </View>

      <LoadingModal visible={loading && !mapData} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  mapPane: {
    flex: 1.15,
    backgroundColor: "#e8eef5",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.Boxgray,
  },
  mapPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  placeholderText: {
    fontFamily: FONTS.Medium,
    fontSize: 14,
    color: Colors.darkText,
    textAlign: "center",
  },
  detailsPane: {
    flex: 1,
    backgroundColor: Colors.white,
    borderTopWidth: 2,
    borderTopColor: Colors.red,
    paddingTop: 10,
  },
  detailsHeaderRow: {
    paddingHorizontal: 16,
    marginBottom: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  detailsTitle: {
    fontFamily: FONTS.SemiBold,
    fontSize: 15,
    color: Colors.black,
  },
  statsText: {
    fontFamily: FONTS.Regular,
    fontSize: 12,
    color: Colors.darkText,
    flexShrink: 1,
    textAlign: "right",
  },
  detailsScroll: {
    flex: 1,
  },
  detailsContent: {
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === "ios" ? 24 : 16,
  },
  emptyHint: {
    marginTop: 18,
    fontFamily: FONTS.Regular,
    fontSize: 13,
    color: Colors.darkText,
    textAlign: "center",
  },
});
