import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity } from "react-native";
import { Colors } from "../utils/colors";
import { FONTS } from "../utils/storeData";

type Props = {
  Icon?: string | any;
  title?: string;
  onPress?: () => void;
  style?: object;
  TitleStyle?: object;
  IconStyle?: object;
  onlyIcon?: boolean;
};

export default function TwoTypeButton({
  Icon,
  title,
  onPress,
  style,
  TitleStyle,
  IconStyle,
  onlyIcon = false,
}: Props) {
  return (
    <TouchableOpacity style={[styles.container, style]} onPress={onPress}>
      <Image source={Icon} style={[styles.Icon, IconStyle]} />
      {!onlyIcon && <Text style={[styles.Title, TitleStyle]}>{title}</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "48%",
    height: 45,
    backgroundColor: Colors.primary,
    borderRadius: 4,
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  Title: {
    fontSize: 15,
    fontFamily: FONTS.Medium,
    color: Colors.white,
  },
  Icon: {
    width: '60%',
    height: '60%',
    tintColor: Colors.white,
  },
});
