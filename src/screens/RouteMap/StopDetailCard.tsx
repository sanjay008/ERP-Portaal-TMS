import { Colors } from "@/src/utils/colors";
import { FONTS } from "@/src/utils/storeData";
import React from "react";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { RouteMapStop } from "@/src/screens/RouteMap/types";

type Props = {
  stop: RouteMapStop;
  indexLabel?: number | string;
  onAddressPress: (stop: RouteMapStop) => void;
  onOrderPress: (stop: RouteMapStop) => void;
};

export default function StopDetailCard({
  stop,
  indexLabel,
  onAddressPress,
  onOrderPress,
}: Props) {
  const { t } = useTranslation();
  const numberLabel = indexLabel ?? stop.stop_number ?? "";
  const hasOrder =
    stop.order_id != null &&
    String(stop.order_id).trim() !== "" &&
    String(stop.order_id) !== "0";
  const orderLabel =
    stop.ordernr != null && String(stop.ordernr).trim() !== ""
      ? String(stop.ordernr)
      : hasOrder
        ? String(stop.order_id)
        : null;

  return (
    <View style={styles.card}>
      <View style={styles.numberBadge}>
        <Text style={styles.numberText}>{String(numberLabel)}</Text>
      </View>

      <View style={styles.body}>
        {!!stop.name && <Text style={styles.name}>{stop.name}</Text>}

        {!!stop.eta && (
          <Text style={styles.meta}>
            <Text style={styles.metaLabel}>{t("ETA")}: </Text>
            {String(stop.eta)}
          </Text>
        )}

        {!!stop.address && (
          <Pressable onPress={() => onAddressPress(stop)} hitSlop={6}>
            <Text style={styles.link}>
              <Text style={styles.metaLabel}>{t("Address")}: </Text>
              {String(stop.address)}
            </Text>
          </Pressable>
        )}

        {orderLabel ? (
          hasOrder ? (
            <Pressable onPress={() => onOrderPress(stop)} hitSlop={6}>
              <Text style={styles.link}>
                <Text style={styles.metaLabel}>{t("Ordernr")}: </Text>
                {orderLabel}
              </Text>
            </Pressable>
          ) : (
            <Text style={styles.meta}>
              <Text style={styles.metaLabel}>{t("Ordernr")}: </Text>
              {orderLabel}
            </Text>
          )
        ) : null}

        {!!stop.driver_instructions && (
          <View style={styles.instructionsBox}>
            <Text style={styles.instructionsText}>
              {String(stop.driver_instructions)}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.Boxgray,
    padding: 12,
    gap: 12,
    marginBottom: 10,
  },
  numberBadge: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: Colors.black,
    alignItems: "center",
    justifyContent: "center",
  },
  numberText: {
    color: Colors.white,
    fontFamily: FONTS.SemiBold,
    fontSize: 18,
  },
  body: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontFamily: FONTS.SemiBold,
    fontSize: 15,
    color: Colors.black,
  },
  meta: {
    fontFamily: FONTS.Regular,
    fontSize: 13,
    color: Colors.darkText,
  },
  metaLabel: {
    fontFamily: FONTS.Medium,
    color: Colors.orderdark,
  },
  link: {
    fontFamily: FONTS.Regular,
    fontSize: 13,
    color: Colors.primary,
    textDecorationLine: "underline",
  },
  instructionsBox: {
    marginTop: 6,
    backgroundColor: Colors.commentBg,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  instructionsText: {
    fontFamily: FONTS.Regular,
    fontSize: 13,
    color: Colors.black,
  },
});
