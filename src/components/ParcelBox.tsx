import React from "react";
import { useTranslation } from "react-i18next";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Images } from "../assets/images";
import { Colors } from "../utils/colors";
import { SimpleFlex } from "../utils/storeData";

type Props = {
  index: number;
  data: any;
  qty?: number;
  title?:string;
};

export default function ParcelBox({ index, data, qty = 0, title}: Props) {
  const { t } = useTranslation();
  return (
    <Pressable style={styles.container}>
      <View style={SimpleFlex}>
        <View style={styles.NumberBox}>
          <Text style={styles.Text}>{index + 1}</Text>
        </View>
        <Text style={styles.Text}>{title?.slice(0,10) || ""}</Text>
        <Text style={styles.DarkText}>{`(${t("Qty")}: ${qty})`}</Text>
      </View>
      {data?.check ? (
        <Image source={Images.Done} style={styles.NumberBox} />
      ) : (
        <Image source={Images.Plain} style={styles.NumberBox} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    padding: 10,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.Boxgray,
    elevation: 3,
    shadowColor: Colors.gray,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2.5,
    borderRadius: 7,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  NumberBox: {
    width: 40,
    height: 40,
    backgroundColor: Colors.BtnBg,
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  Text: {
    fontSize: 15,
    fontFamily: "SemiBold",
    color: Colors.black,
  },
  DarkText: {
    fontSize: 12,
    fontFamily: "SemiBold",
    color: Colors.darkText,
  },
});
