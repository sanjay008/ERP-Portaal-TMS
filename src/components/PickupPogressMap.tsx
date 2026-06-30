import React, { useContext } from "react";
import { useTranslation } from "react-i18next";
import { Image, StyleSheet, Text, View } from "react-native";
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
  DeliveryLable = false,
  ItemData = null,
}: Props) {
  const { t } = useTranslation();
  const hasETA = !!ItemData?.route_stop?.eta_time_formatted;
  const PicukUpDate = ItemData?.pickup_date || "";
  const DeliveryDate = ItemData?.deliver_date || "";
  const { SelectLanguage,GloblyTypeSlide } = useContext(GlobalContextData);
  const pickupFormatted = formatDateWithWeekday(PicukUpDate, SelectLanguage || "en");
  const deliveryFormatted = formatDateWithWeekday(DeliveryDate, SelectLanguage || "en");

  const isPickupDropoff = GloblyTypeSlide === "pickup_dropoff" || GloblyTypeSlide === "driver_loading";
  const statusNum = Number(ItemData?.status ?? ItemData?.tmsstatus?.id);
  const onlyPickup = isPickupDropoff && ItemData?.stop_data?.stop_type == "pickup";
  const onlyDelivery =
    isPickupDropoff && ItemData?.stop_data?.stop_type == "deliver";
  const showPickup = !onlyDelivery;
  const showDelivery = !onlyPickup;
  const showConnector = showPickup && showDelivery;

  return (
    <View style={styles.container}>
      {/* Pickup row */}
      {showPickup && (
      <View style={[styles.row, styles.pickupRow]}>
        <View style={styles.iconCell}>
          <Image source={Images.StartPoint} style={styles.icon} />
          {showConnector && (
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
            {pickupFormatted.weekday}
          </Text>
          <Text style={styles.labelDate} numberOfLines={1}>
            {pickupFormatted.date || formatDate(PicukUpDate, SelectLanguage || "en")}
          </Text>
        </View>

        <View style={styles.addressCol}>
          <Text style={styles.addressText}>{start}</Text>
          {!!ItemData?.pickup_region_data?.name && (
            <View style={[styles.regionPill, styles.pickupPill]}>
              <Text style={[styles.regionText, styles.pickupText]} numberOfLines={1}>
                {ItemData.pickup_region_data.name}
              </Text>
            </View>
          )}
        </View>
      </View>
      )}

      {hasETA && showConnector && (
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
          <View style={styles.etaWrap}>
            <View style={styles.etaBox}>
              <Text style={styles.etaLabel}>{t("ETA")}</Text>
              <Text style={styles.etaTime}>
                {ItemData.route_stop.eta_time_formatted}
              </Text>
              <View style={styles.etaDivider} />
              <Text style={styles.etaKm}>
                {Number(ItemData?.route_stop?.leg_distance_km).toFixed(2)}{" "}
                {t("KM")}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Delivery row */}
      {showDelivery && (
      <View style={styles.row}>
        <View style={styles.iconCell}>
          <Image source={Images.EndPoint} style={styles.icon} />
        </View>

        <View style={styles.labelCol}>
          <Text style={styles.labelWeekday} numberOfLines={1}>
            {deliveryFormatted.weekday}
          </Text>
          <Text style={styles.labelDate} numberOfLines={1}>
            {deliveryFormatted.date || formatDate(DeliveryDate, SelectLanguage || "en")}
          </Text>
        </View>

        <View style={styles.addressCol}>
          <Text style={styles.addressText}>{end}</Text>
          {!!ItemData?.delivery_region_data?.name && (
            <View style={[styles.regionPill, styles.deliveryPill]}>
              <Text style={[styles.regionText, styles.deliveryText]} numberOfLines={1}>
                {ItemData.delivery_region_data.name}
              </Text>
            </View>
          )}
        </View>
      </View>
      )}
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
  // Dashed line is absolutely positioned so it NEVER affects layout height
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
  addressText: {
    fontSize: 13,
    fontFamily: FONTS.Medium,
    color: Colors.black,
    lineHeight: 19,
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