import React from "react";
import { useTranslation } from "react-i18next";
import { Image, StyleSheet, Text, View } from "react-native";
import DashedLine from "react-native-dashed-line";
import { Images } from "../assets/images";
import { Colors } from "../utils/colors";
import { FONTS } from "../utils/storeData";

type Props = {
  start: string;
  end: string;
  ItemData?: any;
  DeliveryLable: boolean;
};

export default function PickupProgressMap({
  start = "",
  end = "",
  DeliveryLable = false,
  ItemData = null,
}: Props) {
  const { t } = useTranslation();
  const hasETA = !!ItemData?.route_stop?.eta_time_formatted;

  return (
    <View style={styles.container}>
      <View style={styles.iconsCol}>
        <Image source={Images.StartPoint} style={styles.icon} />
        <DashedLine
          dashLength={5}
          dashThickness={2}
          dashGap={4}
          style={styles.dashed}
          axis="vertical"
          dashColor={Colors.black}
        />
        <Image source={Images.EndPoint} style={styles.icon} />
      </View>

      <View style={styles.labelsCol}>
        <View style={styles.labelChip}>
          <Text style={styles.labelChipText} numberOfLines={1}>
            {DeliveryLable ? t("Warehouse") : t("Pick Up")}
          </Text>
        </View>

        {hasETA && (
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
        )}

        <View style={styles.labelChip}>
          <Text style={styles.labelChipText} numberOfLines={1}>
            {DeliveryLable ? t("To Deliver") : t("Warehouse")}
          </Text>
        </View>
      </View>

      <View style={styles.addressCol}>
        <View style={styles.addressBlock}>
          <Text style={styles.addressText}>{start}</Text>
          {!!ItemData?.pickup_region_data?.name && (
            <View style={[styles.regionPill, styles.pickupPill]}>
              <Text style={[styles.regionText, styles.pickupText]} numberOfLines={2}>
                {ItemData.pickup_region_data.name}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.addressBlock}>
          <Text style={styles.addressText}>{end}</Text>
          {!!ItemData?.delivery_region_data?.name && (
            <View style={[styles.regionPill, styles.deliveryPill]}>
              <Text style={[styles.regionText, styles.deliveryText]} numberOfLines={2}>
                {ItemData.delivery_region_data.name}
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    flexDirection: "row",
    alignItems: "stretch",
    minHeight: 100,
  },
  iconsCol: {
    width: 28,
    alignItems: "center",
    paddingVertical: 2,
  },
  icon: {
    width: 22,
    height: 22,
  },
  dashed: {
    flex: 1,
    minHeight: 36,
  },
  labelsCol: {
    flex: 1.2,
    paddingHorizontal: 8,
    paddingVertical: 2,
    justifyContent: "space-between",
  },
  labelChip: {
    backgroundColor: "#EEF2FF",
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 6,
    alignItems: "center",
  },
  labelChipText: {
    color: "#3730A3",
    fontFamily: FONTS.Medium,
    fontSize: 12,
    textAlign: "center",
  },
  etaBox: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#86EFAC",
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 5,
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
    flex: 2,
    paddingLeft: 10,
    paddingVertical: 2,
    justifyContent: "space-between",
  },
  addressBlock: {
    flexShrink: 1,
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