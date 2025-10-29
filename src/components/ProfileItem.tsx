import React from "react";
import { useTranslation } from "react-i18next";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Images } from "../assets/images";
import { Colors } from "../utils/colors";

type Props = {
  Icon?: object | any;
  Title?: string;
  onPress?: () => void;
  IconBoxBackground?: string;
  IconStyle?: object;
  TitleStyle?: object;
};

export default function ProfileItem({
  Icon,
  Title,
  onPress,
  IconBoxBackground,
  IconStyle,
  TitleStyle,
}: Props) {
  const { t } = useTranslation();
  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={styles.SimpleFlex}>
        <View
          style={[
            styles.IconBox,
            { backgroundColor: IconBoxBackground || Colors.background },
          ]}
        >
          <Image source={Icon} style={[styles.Icon, IconStyle]} />
        </View>
        <Text style={styles.Text}>{Title}</Text>
      </View>
      <Image source={Images.RightIcon} style={styles.RightIcon} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    padding: 10,
    backgroundColor: Colors.white,
    borderRadius: 7,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    // elevation:2,
    borderWidth: 1,
    borderColor: Colors.Boxgray,
  },
  SimpleFlex: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
  },
  IconBox: {
    width: 30,
    height: 30,
    backgroundColor: Colors.background,
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  Icon: {
    width: 16,
    height: 16,
  },
  Text: {
    fontSize: 13,
    fontFamily: "Medium",
    color: Colors.black,
  },
  RightIcon: {
    width: 16,
    height: 16,
  },
});
