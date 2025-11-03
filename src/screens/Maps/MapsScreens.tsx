import React, { useContext, useRef } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet } from "react-native";
// import MapView from "react-native-maps";
import { GlobalContextData } from "@/src/context/GlobalContext";
import { GoogleMaps } from "expo-maps";
import { SafeAreaView } from "react-native-safe-area-context";


export default function MapsScreens({ data }: any) {
  const { t } = useTranslation();
  const GoogleMapsRef = useRef(null);
  const { GOOGLE_API_KEY } = useContext(GlobalContextData);
  const camera = {
    coordinates: { latitude: 28.6139, longitude: 77.209 },
    zoom: 6,
  };
  return (
    <SafeAreaView style={styles.container}>
      <GoogleMaps.View
        style={StyleSheet.absoluteFill}
        cameraPosition={camera}
        ref={GoogleMapsRef}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
