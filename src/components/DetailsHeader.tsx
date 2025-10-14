import { useNavigation } from "@react-navigation/native";
import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Images } from "../assets/images";
import { Colors } from "../utils/colors";

export default function DetailsHeader({ title }: { title: string }) {
    const {goBack} = useNavigation<any>();
  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={goBack}>
        <Image source={Images.back} style={styles.BackIcon} />
      </TouchableOpacity>
      <Text style={styles.Title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    backgroundColor: Colors.white,
    paddingVertical: 10,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    elevation: 0,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 1.5,
    borderBottomWidth: 0.3,
    borderColor: Colors.Boxgray,
  },
  BackIcon: {
    width: 34,
    height: 34,
  },
  Title: {
    fontSize: 15,
    fontFamily: "SemiBold",
    color: Colors.black,
  },
});
