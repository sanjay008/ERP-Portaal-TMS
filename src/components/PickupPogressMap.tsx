import React from "react";
import { useTranslation } from "react-i18next";
import { Image, StyleSheet, Text, View } from "react-native";
import DashedLine from "react-native-dashed-line";
import { Images } from "../assets/images";
import { Colors } from "../utils/colors";
type Props = {
  start: string;
  end: string;
  DeliveryLable:boolean;
};

export default function PickupPogressMap({ start = "", end = "" , DeliveryLable=false}: Props) {
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      <View style={styles.MiniHandle}>
        <View style={styles.Location}>
          <Image source={Images.StartPoint} style={{ width: 20, height: 20 ,marginBottom:5}} />

          <DashedLine
            dashLength={4}
            dashThickness={2}
            dashGap={4}
            style={{ height: 80 }}
            axis="vertical"
            dashColor={Colors.black}
          />

          <Image source={Images.EndPoint} style={{ width: 20, height: 20,marginTop:5 }} />
        </View>
        <View style={styles.locateName}>
          <Text style={styles.DarkText}>{t("Pick Up")}</Text>

          <Text style={styles.DarkText}>{DeliveryLable ? t("To Deliver") : t("Warehouse")}</Text>
        </View>
      </View>
      <View style={styles.AddressContainer}>
        <Text style={styles.Address}>{start}</Text>
        <Text style={styles.Address}>{end}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  MiniHandle: {
    maxWidth: "40%",
    flexDirection: "row",
    gap: 10,
    justifyContent:'center'
  },
  SimpleFlex: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  DarkText: {
    color: Colors.darkText,
    fontFamily: "Medium",
    fontSize: 14,
  },
  Location: {
    width: "10%",
    alignItems: "center",
  },
  locateName: {
    justifyContent: "space-between",
  },
  AddressContainer: {
    width: "60%",
    justifyContent: "space-between",
  },
  Address: {
    fontSize: 13,
    fontFamily: "Medium",
    color: Colors.black,
  },
});
