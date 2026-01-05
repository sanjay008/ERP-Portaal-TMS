import * as Location from "expo-location";
import React, { useContext, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Image, Linking, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Images } from "../assets/images";
import { GlobalContextData } from "../context/GlobalContext";
import { Colors } from "../utils/colors";
import { FONTS, width } from "../utils/storeData";
import { useErrorHandle } from "./ErrorHandle";
import LoadingModal from "./LoadingModal";
type MapsData = {
  data?: string[] | any,
  onPress?: () => void,
  msg?:any | string,
}

export default function MapsViewBox({ data, onPress ,msg = null}: MapsData) {
  const { t } = useTranslation();
  const {
    UserData,
    setUserData,
    Toast,
    setToast,
    setPickUpDataSave,
    setDeliveyDataSave,

  } = useContext(GlobalContextData);
  const { ErrorHandle } = useErrorHandle();
  const [IsLoading,setIsLoading] = useState(false)
  const MapAppRedirectFun = async () => {
    if (data?.length === 0) {
      setToast({
        top: 45,
        text: t(msg),
        type: "error",
        visible: true,
      });
      return;
    }

    try {
      setIsLoading(true)
      let coordsArray = [...data];

      if (!coordsArray.length) return;

      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Location permission denied");
        return;
      }

      let current = await Location.getCurrentPositionAsync({});
      let startLat = current.coords.latitude;
      let startLng = current.coords.longitude;

      let googleWaypoints = coordsArray
        .map((c: any) => `${c.lat},${c.long}`)
        .join("/");

      let googleUrl = `https://www.google.com/maps/dir/${startLat},${startLng}/${googleWaypoints}`;

      let appleWaypoints = coordsArray
        .map((c: any) => `${c.lat},${c.long}`)
        .join("+to:");

      let appleUrl = `http://maps.apple.com/?saddr=${startLat},${startLng}&daddr=${appleWaypoints}`;

      let urlToOpen = Platform.OS === "ios" ? appleUrl : googleUrl;

      const supported = await Linking.canOpenURL(urlToOpen);

      await Linking.openURL(supported ? urlToOpen : googleUrl);
    } catch (error: any) {
      console.log("Map Redirect Error: ", error);

      setToast({
        top: 45,
        text: ErrorHandle(error).message,
        type: "error",
        visible: true,
      });
    }
    finally{
      setIsLoading(false)
    }
  };
  return (
    <View style={styles.container}>
      <Image source={Images.MapsImage} style={styles.MapStyle} />
      <TouchableOpacity style={styles.Button} onPress={()=>MapAppRedirectFun()}>
        <Text style={styles.Text}>{t("Start")}</Text>
      </TouchableOpacity>
         <LoadingModal
        visible={IsLoading}
        message={t("Please wait…")}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    borderRadius: 4,
    backgroundColor: Colors.white,
    padding: 15
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
    position: 'absolute',
    right: 25,
    bottom: 25
  },
  Text: {
    fontSize: 14,
    color: Colors.white,
    fontFamily: FONTS.Medium
  }
});
