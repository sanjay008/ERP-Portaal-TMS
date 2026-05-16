import LottieView from "lottie-react-native";
import React from "react";
import { StyleSheet, View } from "react-native";
import { Images } from '../../assets/images';
import { width } from '../../utils/storeData';
export default function NoInternet() {
  return (
    <View style={styles.container}>
      <LottieView
        source={Images.NoInternet} 
        style={{width:width / 1.5,height:width / 1.5}}
        resizeMode="contain"
        autoPlay
        loop
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
