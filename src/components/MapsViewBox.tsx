import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Images } from "../assets/images";
import { Colors } from "../utils/colors";
import { width } from "../utils/storeData";

export default function MapsViewBox({ data }: any) {
  return (
    <View style={styles.container}>
      <Image source={Images.MapsImage} style={styles.MapStyle} />
      <TouchableOpacity style={styles.Button}>
        <Text style={styles.Text}>Start</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    borderRadius: 4,
    backgroundColor: Colors.white,
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
    right:5,
    bottom:10
  },
  Text:{
    fontSize:14,
    color:Colors.white,
    fontFamily:"Medium"
  }
});
