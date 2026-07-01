import React, { useContext, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Image, Linking, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Images } from "../assets/images";
import { GlobalContextData } from "../context/GlobalContext";
import {
  areLocationServicesEnabled,
  checkLocationPermission,
  getSafeCurrentPosition,
} from "../hooks/useUserGPS";
import { Colors } from "../utils/colors";
import { resolveOrderNavigationDestination } from "../utils/regionCoordinates";
import { FONTS, width } from "../utils/storeData";
import { useErrorHandle } from "./ErrorHandle";
import LoadingModal from "./LoadingModal";

type MapsData = {
  data?: string[] | any;
  onPress?: () => void;
  msg?: any | string;
  orderStatusId?: number | string | null;
  pickupRegionData?: unknown;
  deliveryRegionData?: unknown;
  orderData?: Record<string, unknown> | null;
};

export default function MapsViewBox({
  onPress,
  msg = null,
  orderStatusId = null,
  pickupRegionData = null,
  deliveryRegionData = null,
  orderData = null,
}: MapsData) {
  const { t } = useTranslation();
  const { setToast } = useContext(GlobalContextData);
  const { ErrorHandle } = useErrorHandle();
  const [IsLoading, setIsLoading] = useState(false);

  const destination = useMemo(
    () =>
      resolveOrderNavigationDestination({
        orderData,
      }),
    [orderStatusId, pickupRegionData, deliveryRegionData, orderData],
  );

  const MapAppRedirectFun = async () => {
    if (onPress) {
      onPress();
      return;
    }

    console.log("[MapsViewBox] Start pressed", {
      orderStatusId,
      pickupRegionData,
      deliveryRegionData,
      resolvedDestination: destination,
    });

    if (!destination) {
      console.log("[MapsViewBox] Destination unavailable", {
        orderStatusId,
        pickupRegionData,
        deliveryRegionData,
      });
      setToast({
        top: 45,
        text: t(msg ?? "Destination location is unavailable"),
        type: "error",
        visible: true,
      });
      return;
    }

    try {
      setIsLoading(true);

      const [permission, servicesEnabled] = await Promise.all([
        checkLocationPermission(),
        areLocationServicesEnabled(),
      ]);

      if (!permission.granted) {
        setToast({
          top: 45,
          text: t("Location permission denied"),
          type: "error",
          visible: true,
        });
        return;
      }

      if (!servicesEnabled) {
        setToast({
          top: 45,
          text: t("Current location is unavailable. Make sure that location services are enabled"),
          type: "error",
          visible: true,
        });
        return;
      }

      const current = await getSafeCurrentPosition();
      if (!current?.coords) {
        setToast({
          top: 45,
          text: t("Current location is unavailable. Make sure that location services are enabled"),
          type: "error",
          visible: true,
        });
        return;
      }

      const { latitude: startLat, longitude: startLng } = current.coords;
      const { latitude: destLat, longitude: destLng } = destination;

      console.log("[MapsViewBox] Navigation route", {
        currentLocation: { latitude: startLat, longitude: startLng },
        destination: { latitude: destLat, longitude: destLng },
        pickupRegionData,
        deliveryRegionData,
        orderStatusId,
      });

      const googleUrl = `https://www.google.com/maps/dir/?api=1&origin=${startLat},${startLng}&destination=${destLat},${destLng}&travelmode=driving`;
      const appleUrl = `http://maps.apple.com/?saddr=${startLat},${startLng}&daddr=${destLat},${destLng}`;
      const urlToOpen = Platform.OS === "ios" ? appleUrl : googleUrl;

      try {
        await Linking.openURL(urlToOpen);
      } catch {
        await Linking.openURL(googleUrl);
      }
    } catch (error: any) {
      setToast({
        top: 45,
        text: ErrorHandle(error).message,
        type: "error",
        visible: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Image source={Images.MapsImage} style={styles.MapStyle} />
      <TouchableOpacity style={styles.Button} onPress={MapAppRedirectFun}>
        <Text style={styles.Text}>{t("Start")}</Text>
      </TouchableOpacity>
      <LoadingModal visible={IsLoading} message={t("Please wait…")} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    borderRadius: 4,
    backgroundColor: Colors.white,
    padding: 15,
  },
  MapStyle: {
    width: "100%",
    height: width / 2,
  },
  Button: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: Colors.primary,
    borderRadius: 5,
    position: "absolute",
    right: 25,
    bottom: 25,
  },
  Text: {
    fontSize: 14,
    color: Colors.white,
    fontFamily: FONTS.Medium,
  },
});
