import React from "react";
import { useTranslation } from "react-i18next";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Images } from "../assets/images";
import { Colors } from "../utils/colors";
import { width } from "../utils/storeData";

export default function MapsViewBox({ data }: any) {
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      <Image source={Images.MapsImage} style={styles.MapStyle} />
      <TouchableOpacity style={styles.Button}>
        <Text style={styles.Text}>{t("Start")}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    borderRadius: 4,
    backgroundColor: Colors.white,
    padding:15
  },
  MapStyle: {
    width: "100%",
    height: width / 2,
  },
  Button:{
    paddingVertical:10,
    paddingHorizontal:15,
    backgroundColor:Colors.primary,
    borderRadius:5,
    position:'absolute',
    right:25,
    bottom:25
  },
  Text:{
    fontSize:14,
    color:Colors.white,
    fontFamily:"Medium"
  }
});
