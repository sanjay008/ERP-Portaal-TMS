import type { RouteMapStop } from "@/src/screens/RouteMap/types";
import { Colors } from "@/src/utils/colors";
import { FONTS } from "@/src/utils/storeData";
import { Ionicons } from "@expo/vector-icons";
import React, { memo } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  stop: RouteMapStop;
  indexLabel?: number | string;
  highlighted?: boolean;
  onAddressPress: (stop: RouteMapStop) => void;
  onOrderPress: (stop: RouteMapStop) => void;
  onLayoutY?: (stopKey: string, y: number) => void;
};

function resolveTypeBadge(stop: RouteMapStop, t: (k: string) => string) {
  const rawType = String(stop.order_type || "")
    .trim()
    .toLowerCase();
  const labelFromApi =
    stop.order_type_label != null && String(stop.order_type_label).trim() !== ""
      ? String(stop.order_type_label)
      : null;

  if (rawType === "pickup") {
    return {
      label: labelFromApi || t("Pickup"),
      bg: Colors.litegreen,
      fg: Colors.ReadyText,
    };
  }
  if (rawType === "delivery") {
    return {
      label: labelFromApi || t("Delivery"),
      bg: Colors.primarylite,
      fg: Colors.primary,
    };
  }
  if (rawType === "additional_address") {
    return {
      label: labelFromApi || t("Additional stop"),
      bg: Colors.litegray1,
      fg: Colors.orderdark,
    };
  }
  if (labelFromApi) {
    return {
      label: labelFromApi,
      bg: Colors.primarylite,
      fg: Colors.primary,
    };
  }
  return null;
}

function StopDetailCard({
  stop,
  indexLabel,
  highlighted = false,
  onAddressPress,
  onOrderPress,
  onLayoutY,
}: Props) {
  const { t } = useTranslation();
  const numberLabel = indexLabel ?? stop.stop_number ?? "";
  const customerName =
    (stop.customer_name != null && String(stop.customer_name).trim() !== ""
      ? String(stop.customer_name)
      : null) ||
    (stop.name != null && String(stop.name).trim() !== ""
      ? String(stop.name)
      : null);
  const typeBadge = resolveTypeBadge(stop, t);
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
  const stopKey = stop.stop_key != null ? String(stop.stop_key) : "";

  return (
    <View
      style={[styles.card, highlighted && styles.cardHighlighted]}
      onLayout={(e) => {
        if (!stopKey || !onLayoutY) return;
        onLayoutY(stopKey, e.nativeEvent.layout.y);
      }}
    >
      <View style={styles.topRow}>
        <View style={styles.topLeft}>
          <Text style={styles.label}>{t("Ordernr")}</Text>
          {orderLabel && hasOrder ? (
            <Pressable onPress={() => onOrderPress(stop)} hitSlop={6}>
              <Text style={styles.orderValue}>#{orderLabel}</Text>
            </Pressable>
          ) : (
            <Text style={styles.orderValue}>
              {orderLabel ? `#${orderLabel}` : t("Stop")} {numberLabel}
            </Text>
          )}
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{String(numberLabel)}</Text>
        </View>
      </View>

      {(customerName || typeBadge) && (
        <View style={styles.nameRow}>
          {!!customerName && (
            <Text style={styles.name} numberOfLines={2}>
              {customerName}
            </Text>
          )}
          {typeBadge ? (
            <View style={[styles.typeBadge, { backgroundColor: typeBadge.bg }]}>
              <Text style={[styles.typeBadgeText, { color: typeBadge.fg }]}>
                {typeBadge.label}
              </Text>
            </View>
          ) : null}
        </View>
      )}

      <View style={styles.timeline}>
        <View style={styles.timelineRail}>
          <View style={styles.dotPrimary}>
            <Ionicons name="location" size={12} color={Colors.white} />
          </View>
          <View style={styles.dash} />
          <View style={styles.dotMuted}>
            <Ionicons name="time-outline" size={12} color={Colors.primary} />
          </View>
        </View>

        <View style={styles.timelineBody}>
          {!!stop.address ? (
            <Pressable onPress={() => onAddressPress(stop)} hitSlop={4}>
              <Text style={styles.addressLabel}>{t("Address")}</Text>
              <Text style={styles.addressValue}>{String(stop.address)}</Text>
            </Pressable>
          ) : (
            <Text style={styles.addressValue}>{t("No address")}</Text>
          )}

          {!!stop.eta && (
            <View style={styles.etaBlock}>
              <Text style={styles.addressLabel}>{t("ETA")}</Text>
              <Text style={styles.etaValue}>{String(stop.eta)}</Text>
            </View>
          )}
        </View>

        <View style={styles.actions}>
          <Pressable
            style={styles.actionMuted}
            onPress={() => onAddressPress(stop)}
            hitSlop={6}
          >
            <Ionicons name="navigate-outline" size={18} color={Colors.darkText} />
          </Pressable>
          {hasOrder ? (
            <Pressable
              style={styles.actionPrimary}
              onPress={() => onOrderPress(stop)}
              hitSlop={6}
            >
              <Ionicons name="open-outline" size={18} color={Colors.white} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {!!stop.driver_instructions && (
        <View style={styles.instructionsBox}>
          <Text style={styles.instructionsText}>
            {String(stop.driver_instructions)}
          </Text>
        </View>
      )}
    </View>
  );
}

export default memo(StopDetailCard);

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.litegray,
  },
  cardHighlighted: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primarylite,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  topLeft: {
    flex: 1,
    paddingRight: 10,
  },
  label: {
    fontFamily: FONTS.Regular,
    fontSize: 12,
    color: Colors.darkText,
    marginBottom: 2,
  },
  orderValue: {
    fontFamily: FONTS.SemiBold,
    fontSize: 20,
    color: Colors.black,
    letterSpacing: -0.3,
  },
  badge: {
    minWidth: 36,
    height: 36,
    borderRadius: 12,
    paddingHorizontal: 10,
    backgroundColor: Colors.primarylite,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    fontFamily: FONTS.SemiBold,
    fontSize: 15,
    color: Colors.primary,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 12,
  },
  name: {
    flex: 1,
    fontFamily: FONTS.Medium,
    fontSize: 15,
    color: Colors.black,
    lineHeight: 20,
  },
  typeBadge: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: "flex-start",
  },
  typeBadgeText: {
    fontFamily: FONTS.SemiBold,
    fontSize: 12,
  },
  timeline: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 12,
  },
  timelineRail: {
    width: 22,
    alignItems: "center",
    paddingTop: 2,
  },
  dotPrimary: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  dash: {
    flex: 1,
    width: 2,
    marginVertical: 4,
    borderRadius: 1,
    backgroundColor: Colors.Boxgray,
    minHeight: 18,
  },
  dotMuted: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primarylite,
    alignItems: "center",
    justifyContent: "center",
  },
  timelineBody: {
    flex: 1,
    paddingTop: 2,
    gap: 10,
  },
  addressLabel: {
    fontFamily: FONTS.Regular,
    fontSize: 12,
    color: Colors.darkText,
  },
  addressValue: {
    marginTop: 2,
    fontFamily: FONTS.Medium,
    fontSize: 14,
    color: Colors.black,
    lineHeight: 20,
  },
  etaBlock: {
    marginTop: 2,
  },
  etaValue: {
    marginTop: 2,
    fontFamily: FONTS.SemiBold,
    fontSize: 14,
    color: Colors.primary,
  },
  actions: {
    justifyContent: "center",
    gap: 8,
  },
  actionMuted: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: Colors.litegray1,
    alignItems: "center",
    justifyContent: "center",
  },
  actionPrimary: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  instructionsBox: {
    marginTop: 14,
    backgroundColor: Colors.commentBg,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  instructionsText: {
    fontFamily: FONTS.Regular,
    fontSize: 13,
    color: Colors.black,
    lineHeight: 18,
  },
});
