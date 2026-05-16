import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Colors } from "../utils/colors";
import { FONTS } from "../utils/storeData";

type Props = {
  icon: any;
  title: string;
  color: string;
  onPress?:()=> void;
};

export default function ItemBox({ icon, title, color, onPress }: Props) {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={[styles.Box,{backgroundColor:color}]}>
        <Image source={icon} style={styles.IconStyle} />
      </View>
      <Text style={styles.Title}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.white,
    borderRadius: 10,
    elevation: 6,
    shadowColor: Colors.gray,
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.6,
    shadowRadius: 0.6, 
    paddingHorizontal:15,
    paddingVertical:10
  },

  Box: {
    width: 40,
    height: 40,
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  IconStyle: {
    width: 22,
    height: 22,
    tintColor:Colors.white
  },
  Title: {
    fontSize: 14,
    fontFamily: FONTS.Regular,
    color: Colors.black,
  },
});
