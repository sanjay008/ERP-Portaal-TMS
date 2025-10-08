import React from "react";
import { Image, StyleSheet, View } from "react-native";
import { Images } from "../assets/images";
import { Colors } from "../utils/colors";

export default function CustomHeader() {
  return (
    <View style={styles.container}>
      <Image source={Images.logo} style={styles.logo} resizeMode="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: Colors.white,
    elevation: 4,
    shadowColor: Colors.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.10,
    shadowRadius: 2.84,
  },
  logo: {
    width: 175,
    height: 40,
  },
});
