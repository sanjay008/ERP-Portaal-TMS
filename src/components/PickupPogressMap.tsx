import * as Clipboard from 'expo-clipboard';
import React, { useCallback, useContext } from "react";
import { useTranslation } from "react-i18next";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import DashedLine from "react-native-dashed-line";
import { Images } from "../assets/images";
import { GlobalContextData } from "../context/GlobalContext";
import { Colors } from "../utils/colors";
import { FONTS } from "../utils/storeData";
import { formatDate, formatDateWithWeekday } from "./DateFormate";

type Props = {
  start: string;
  end: string;
  ItemData?: any;
  DeliveryLable: boolean;
};

export { formatDateWithWeekday };

export default function PickupProgressMap({
  start = "",
  end = "",
  ItemData = null,
}: Props) {
  const { t } = useTranslation();
  const { SelectLanguage, GloblyTypeSlide, setToast } = useContext(GlobalContextData);

  const routeStop = ItemData?.route_stop;
  const hasETA = !!routeStop?.eta_time_formatted;
  const hasEtaKm = routeStop?.leg_distance_km != null;

  const PicukUpDate = ItemData?.pickup_date || "";
  const DeliveryDate = ItemData?.deliver_date || "";
  const pickupFormatted = formatDateWithWeekday(PicukUpDate, SelectLanguage || "en");
  const deliveryFormatted = formatDateWithWeekday(DeliveryDate, SelectLanguage || "en");

  const isPickupDropoff =
    GloblyTypeSlide === "pickup_dropoff" || GloblyTypeSlide === "driver_loading";
  const onlyPickup = isPickupDropoff && ItemData?.stop_data?.stop_type == "pickup";
  const onlyDelivery =
    isPickupDropoff && ItemData?.stop_data?.stop_type == "deliver";
  const showPickup = !onlyDelivery;
  const showDelivery = !onlyPickup;
  const showBothStops = showPickup && showDelivery;

  const copyAddress = useCallback(
    async (address: string) => {
      const value = address?.trim();
      if (!value) return;
      await Clipboard.setStringAsync(value)
    },
    [setToast, t],
  );

  const renderEtaBox = () => (
    <View style={styles.etaBox}>
      <Text style={styles.etaLabel}>{t("ETA")}</Text>
      <Text style={styles.etaTime}>{routeStop?.eta_time_formatted}</Text>
      {hasEtaKm && (
        <>
          <View style={styles.etaDivider} />
          <Text style={styles.etaKm}>
            {Number(routeStop?.leg_distance_km).toFixed(2)} {t("KM")}
          </Text>
        </>
      )}
    </View>
  );

  const renderEtaConnectorRow = () => (
    <View style={styles.row}>
      <View style={styles.iconCell}>
        <View style={styles.lineFull} pointerEvents="none">
          <DashedLine
            dashLength={5}
            dashThickness={2}
            dashGap={4}
            style={styles.dashed}
            axis="vertical"
            dashColor={Colors.black}
          />
        </View>
      </View>
      <View style={styles.etaWrap}>{renderEtaBox()}</View>
    </View>
  );

  const renderStopRow = ({
    icon,
    weekday,
    date,
    dateFallback,
    address,
    regionName,
    regionStyle,
    regionTextStyle,
    showLineBelow,
    isSingleStop,
  }: {
    icon: any;
    weekday: string;
    date: string;
    dateFallback: string;
    address: string;
    regionName?: string;
    regionStyle: object;
    regionTextStyle: object;
    showLineBelow: boolean;
    isSingleStop: boolean;
  }) => (
    <View style={[styles.row, isSingleStop ? styles.singleStopRow : styles.pickupRow]}>
      <View style={styles.iconCell}>
        <Image source={icon} style={styles.icon} />
        {showLineBelow && (
          <View style={styles.lineBelow} pointerEvents="none">
            <DashedLine
              dashLength={5}
              dashThickness={2}
              dashGap={4}
              style={styles.dashed}
              axis="vertical"
              dashColor={Colors.black}
            />
          </View>
        )}
      </View>

      <View style={styles.labelCol}>
        <Text style={styles.labelWeekday} numberOfLines={1}>
          {weekday}
        </Text>
        <Text style={styles.labelDate} numberOfLines={1}>
          {date || dateFallback}
        </Text>
      </View>

      <View style={[styles.addressCol, isSingleStop && styles.singleAddressCol]}>
        <Pressable
          onPress={() => copyAddress(address)}
          disabled={!address?.trim()}
          style={({ pressed }) => [pressed && styles.addressPressed]}
        >
          <Text style={styles.addressText}>{address}</Text>
        </Pressable>
        {!!regionName && (
          <View style={[styles.regionPill, regionStyle]}>
            <Text style={[styles.regionText, regionTextStyle]} numberOfLines={1}>
              {regionName}
            </Text>
          </View>
        )}
        {isSingleStop && hasETA && (
          <View style={styles.singleStopEta}>{renderEtaBox()}</View>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {showPickup &&
        renderStopRow({
          icon: Images.StartPoint,
          weekday: pickupFormatted.weekday,
          date: pickupFormatted.date,
          dateFallback: formatDate(PicukUpDate, SelectLanguage || "en"),
          address: start,
          regionName: ItemData?.pickup_region_data?.name,
          regionStyle: styles.pickupPill,
          regionTextStyle: styles.pickupText,
          showLineBelow: showBothStops && (hasETA || showDelivery),
          isSingleStop: !showBothStops,
        })}

      {hasETA && showBothStops && renderEtaConnectorRow()}

      {showDelivery &&
        renderStopRow({
          icon: Images.EndPoint,
          weekday: deliveryFormatted.weekday,
          date: deliveryFormatted.date,
          dateFallback: formatDate(DeliveryDate, SelectLanguage || "en"),
          address: end,
          regionName: ItemData?.delivery_region_data?.name,
          regionStyle: styles.deliveryPill,
          regionTextStyle: styles.deliveryText,
          showLineBelow: false,
          isSingleStop: !showBothStops,
        })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  pickupRow: {
    minHeight: 52,
  },
  singleStopRow: {
    minHeight: 48,
  },
  iconCell: {
    width: 28,
    alignSelf: "stretch",
    alignItems: "center",
    position: "relative",
    paddingTop: 1,
  },
  icon: {
    width: 22,
    height: 22,
  },
  lineBelow: {
    position: "absolute",
    top: 22,
    bottom: -2,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  lineFull: {
    position: "absolute",
    top: -2,
    bottom: -2,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  dashed: {
    flex: 1,
  },
  labelCol: {
    width: 92,
    marginLeft: 6,
    paddingTop: 1,
  },
  labelWeekday: {
    color: "#3730A3",
    fontFamily: FONTS.SemiBold,
    fontSize: 13,
  },
  labelDate: {
    color: Colors.textgray,
    fontFamily: FONTS.Medium,
    fontSize: 12,
    marginTop: 1,
  },
  etaWrap: {
    flex: 1,
    marginLeft: 6,
  },
  etaBox: {
    alignSelf: "flex-start",
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#86EFAC",
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 10,
    alignItems: "center",
    marginVertical: 4,
  },
  singleStopEta: {
    marginTop: 10,
    alignSelf: "flex-start",
  },
  etaLabel: {
    fontSize: 9,
    fontFamily: FONTS.Medium,
    color: "#15803D",
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  etaTime: {
    fontSize: 11,
    fontFamily: FONTS.Medium,
    color: Colors.darkText,
    textAlign: "center",
  },
  etaDivider: {
    width: "55%",
    height: 1,
    backgroundColor: "#86EFAC",
    marginVertical: 3,
  },
  etaKm: {
    fontSize: 10,
    fontFamily: FONTS.Medium,
    color: "#15803D",
    textAlign: "center",
  },
  addressCol: {
    flex: 1,
    paddingLeft: 10,
    paddingBottom: 6,
  },
  singleAddressCol: {
    paddingBottom: 2,
  },
  addressText: {
    fontSize: 13,
    fontFamily: FONTS.Medium,
    color: Colors.black,
    lineHeight: 19,
  },
  addressPressed: {
    opacity: 0.65,
  },
  regionPill: {
    alignSelf: "flex-start",
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 3,
    marginTop: 5,
  },
  pickupPill: {
    backgroundColor: "#DCFCE7",
  },
  deliveryPill: {
    backgroundColor: "#FEE2E2",
  },
  regionText: {
    fontSize: 10,
    fontFamily: FONTS.Medium,
  },
  pickupText: {
    color: "#166534",
  },
  deliveryText: {
    color: "#991B1B",
  },
});
