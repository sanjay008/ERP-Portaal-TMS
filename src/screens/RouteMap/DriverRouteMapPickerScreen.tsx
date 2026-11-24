import ButtonComponent from "@/src/components/buttonComponent";
import CalenderDate from "@/src/components/CalenderDate";
import { toApiDateString } from "@/src/components/DateFormate";
import DetailsHeader from "@/src/components/DetailsHeader";
import DropDownBox from "@/src/components/DropDownBox";
import { useErrorHandle } from "@/src/components/ErrorHandle";
import LoadingModal from "@/src/components/LoadingModal";
import { GlobalContextData } from "@/src/context/GlobalContext";
import type { DriverAssignedRegion } from "@/src/screens/RouteMap/types";
import { getDateByTimezone, resolveAppTimeZone } from "@/src/utils/appDateTime";
import { Colors } from "@/src/utils/colors";
import {
  fetchDriverAssignedRegions,
  parseAssignedRegionsData,
} from "@/src/utils/driverRouteMapApi";
import { FONTS } from "@/src/utils/storeData";
import { useNavigation, useRoute } from "@react-navigation/native";
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function DriverRouteMapPickerScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const slideItem = route?.params?.item;
  const { ErrorHandle } = useErrorHandle();
  const {
    UserData,
    setToast,
    SelectActiveDate,
    TimeZone,
    setGloblyTypeSlide,
    setGloblySlideTitle,
  } = useContext(GlobalContextData);

  const today = useMemo(() => {
    const tz = resolveAppTimeZone(TimeZone);
    return getDateByTimezone(tz);
  }, [TimeZone]);

  const initialDate = useMemo(
    () => toApiDateString(SelectActiveDate) || today,
    // Only seed once from context/today — do not re-bind when SelectActiveDate updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const [selectDate, setSelectDate] = useState<string>(initialDate || today);
  const [regions, setRegions] = useState<DriverAssignedRegion[]>([]);
  const [selectedRegion, setSelectedRegion] =
    useState<DriverAssignedRegion | null>(null);
  const [loading, setLoading] = useState(false);

  const userDataRef = useRef(UserData);
  const errorHandleRef = useRef(ErrorHandle);
  const setToastRef = useRef(setToast);
  const requestIdRef = useRef(0);
  const mountedRef = useRef(true);

  userDataRef.current = UserData;
  errorHandleRef.current = ErrorHandle;
  setToastRef.current = setToast;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    setGloblyTypeSlide(slideItem?.type || "driver_route_map");
    setGloblySlideTitle(slideItem?.item_title || "Route");
  }, [slideItem?.type, slideItem?.item_title, setGloblySlideTitle, setGloblyTypeSlide]);

  // Only re-fetch when the date string changes — never when callbacks recreate.
  useEffect(() => {
    const date = toApiDateString(selectDate) || selectDate;
    if (!date) return;

    const requestId = ++requestIdRef.current;
    setLoading(true);

    (async () => {
      try {
        const res = await fetchDriverAssignedRegions(userDataRef.current, date);
        if (!mountedRef.current || requestId !== requestIdRef.current) return;

        const parsed = parseAssignedRegionsData(res);
        const nextRegions = parsed?.regions || [];
        setRegions(nextRegions);
        setSelectedRegion((prev) => {
          if (!nextRegions.length) return null;
          if (!prev) return nextRegions[0];
          const stillThere = nextRegions.find(
            (r) => String(r.region_id) === String(prev.region_id),
          );
          return stillThere || nextRegions[0];
        });

        // Expected empty assignment — show inline empty state, not a toast loop.
        if (!parsed && res?.status_code && Number(res.status_code) !== 404) {
          setToastRef.current({
            top: 45,
            text: res?.message || t("No regions found"),
            type: "error",
            visible: true,
          });
        }
      } catch (error: any) {
        if (!mountedRef.current || requestId !== requestIdRef.current) return;
        setRegions([]);
        setSelectedRegion(null);
        setToastRef.current({
          top: 45,
          text: errorHandleRef.current(error).message,
          type: "error",
          visible: true,
        });
      } finally {
        if (mountedRef.current && requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    })();
  }, [selectDate]);

  const onConfirm = useCallback(() => {
    if (!selectedRegion?.region_id) {
      setToast({
        top: 45,
        text: t("Please select a region"),
        type: "error",
        visible: true,
      });
      return;
    }
    const date = toApiDateString(selectDate) || selectDate;
    navigation.navigate("DriverRouteMap", {
      region_id: selectedRegion.region_id,
      region_name: selectedRegion.region_name,
      region_color: selectedRegion.region_color,
      date,
      item: slideItem,
    });
  }, [navigation, selectDate, selectedRegion, setToast, slideItem, t]);

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <DetailsHeader title={t(slideItem?.item_title || "Route")} />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.sectionTitle}>{t("Select date")}</Text>
        <CalenderDate date={selectDate} setDate={setSelectDate} />

        <Text style={[styles.sectionTitle, { marginTop: 18 }]}>
          {t("Select region")}
        </Text>
        <DropDownBox
          data={regions}
          value={selectedRegion}
          setValue={setSelectedRegion as any}
          labelFieldKey="region_name"
          valueFieldKey="region_id"
          placeholder="Select Region"
          ContainerStyle={{ marginTop: 4 }}
        />

        {!loading && regions.length === 0 ? (
          <Text style={styles.emptyText}>
            {t("No regions assigned for this date")}
          </Text>
        ) : null}

        <ButtonComponent
          title={t("Show route")}
          marginTop={28}
          onPress={onConfirm}
          disabled={!selectedRegion?.region_id || loading}
          loading={loading}
        />
      </ScrollView>
      <LoadingModal visible={loading} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontFamily: FONTS.SemiBold,
    fontSize: 14,
    color: Colors.black,
    marginBottom: 8,
  },
  emptyText: {
    marginTop: 14,
    fontFamily: FONTS.Regular,
    fontSize: 13,
    color: Colors.darkText,
  },
});
