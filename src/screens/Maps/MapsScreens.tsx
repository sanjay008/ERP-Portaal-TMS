import React, { useContext, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Image, Linking, Text, TouchableOpacity, View } from "react-native";
// import MapView from "react-native-maps";
import { Images } from "@/src/assets/images";
import DetailsHeader from "@/src/components/DetailsHeader";
import { GlobalContextData } from "@/src/context/GlobalContext";
import { SimpleFlex } from "@/src/utils/storeData";
import * as Location from "expo-location";
// import { GoogleMaps } from "expo-maps";
import MapView, { Marker, Polyline } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { styles } from "./styles";
import { Colors } from "@/src/utils/colors";
export default function MapsScreens({ route }: any) {
  const { data } = route?.params || "";
  const { t } = useTranslation();
  const GoogleMapsRef = useRef<any>(null);
  const { GOOGLE_API_KEY, setToast } = useContext(GlobalContextData);
  const [UserCurrentLocation, setUserCurrentLocation] = useState<Object | any>(
    null
  );
  const [MarkerData, setMarkerData] = useState<any>([]);
  const camera: any = {
    coordinates: { latitude: 28.6139, longitude: 77.209 },
    zoom: 6,
  };

  const IntialRoute = {
    latitude: 28.6139,
    longitude: 77.209,
    latitudeDelta: 0.2,
    longitudeDelta: 0.2,
  };

  const getDirectDropboxLink = (sharedLink: string) => {
    if (!sharedLink) return "";

    let url = sharedLink
      .replace("www.dropbox.com", "dl.dropboxusercontent.com")
      .replace("dropbox.com", "dl.dropboxusercontent.com");

    url = url.replace(/[?&](dl|raw)=\d/, "");

    url += (url.includes("?") ? "&" : "?") + "raw=1";

    return url;
  };

  const WhatsaapRedirectFun = async (type: number) => {
    let person = data?.customer;
    try {
      let countryCode = person?.country_code || "";
      if (!countryCode.startsWith("+")) {
        countryCode = `+${countryCode}`;
      }

      const phoneNumber = `${countryCode}${person?.mobiel || ""}`;
      const message = t("Hello! This is a test message.");
      let url = "";

      if (type === 1) {
        url = `https://api.whatsapp.com/send/?phone=${phoneNumber.replace(
          "+",
          ""
        )}&type=phone_number&app_absent=0`;
      } else if (type === 2) {
        const encodedMsg = encodeURIComponent(message);
        url = `https://api.whatsapp.com/send/?phone=${phoneNumber.replace(
          "+",
          ""
        )}&text=${encodedMsg}&type=phone_number&app_absent=0`;
      } else {
        setToast({
          top: 45,
          text: t("Invalid type — please pass 1 or 2 only."),
          type: "error",
          visible: true,
        });
        return;
      }

      console.log(url);
      await Linking.openURL(url);
    } catch (error) {
      console.log("WhatsApp redirect error:", error);
      setToast({
        top: 45,
        text: t("Something went wrong while opening WhatsApp."),
        type: "error",
        visible: true,
      });
    }
  };

  useEffect(() => {
    // console.log("GoogleMaps",GoogleMaps);

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.log("Permission denied");
        return;
      }

      await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 2,
        },
        async (loc) => {
          const routeCoords: any[] = [
            {
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
            },
            {
              latitude: IntialRoute.latitude,
              longitude: IntialRoute.longitude,
            },
          ];
          setUserCurrentLocation(loc.coords);
          setMarkerData(routeCoords);

          GoogleMapsRef.current?.animateToRegion(
            {
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            },
            1000
          );
        }
      );
    })();
    console.log("data", data);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.HeaderContainer}>
        <DetailsHeader title={t("Map")} />
      </View>
      <MapView
        ref={GoogleMapsRef}
        provider="google"
        style={{ flexGrow: 1 }}
        initialRegion={{
          latitude: UserCurrentLocation?.latitude ?? IntialRoute.latitude,
          longitude: UserCurrentLocation?.longitude ?? IntialRoute.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
      >
        {UserCurrentLocation && (
          <Marker
            coordinate={UserCurrentLocation}
            image={Images.MapsMarkerVehicalIcon}
            flat
            anchor={{ x: 0.5, y: 0.5 }}
          />
        )}
        {/* 
        {UserCurrentLocation && (
          <Marker
            coordinate={{
              latitude: data.pickup_ad_latitude,
              longitude: data.pickup_ad_longitude,
            }}
            anchor={{ x: 0.5, y: 0.5 }}
            flat={true}
          >
            <Svg width={35} height={35} viewBox="0 0 64 64">
              <Path
                d="M32 2C19 2 8 13 8 26c0 12 20 35 22 37a2 2 0 0 0 3 0c2-2 22-25 22-37C55 13 45 2 32 2Z"
                fill="#FF3B30"
              />
              <Circle cx="32" cy="26" r="8" fill="white" />
              <Circle cx="32" cy="26" r="4" fill="#FF3B30" />
            </Svg>
          </Marker>
        )} */}

        {IntialRoute && (
          <Marker
            coordinate={{
              latitude: IntialRoute.latitude,
              longitude: IntialRoute.longitude,
            }}
            anchor={{ x: 0.5, y: 0.5 }}
            flat={true}
          >
            <Svg width={35} height={35} viewBox="0 0 64 64">
              <Path
                d="M32 2C19 2 8 13 8 26c0 12 20 35 22 37a2 2 0 0 0 3 0c2-2 22-25 22-37C55 13 45 2 32 2Z"
                fill="#FF3B30"
              />
              <Circle cx="32" cy="26" r="8" fill="white" />
              <Circle cx="32" cy="26" r="4" fill="#FF3B30" />
            </Svg>
          </Marker>
        )}

        {UserCurrentLocation !== null && (
          <Polyline
            coordinates={[
              {
                latitude: UserCurrentLocation?.latitude,
                longitude: UserCurrentLocation?.longitude,
              },
              {
                latitude: IntialRoute.latitude,
                longitude: IntialRoute.longitude,
              },
            ]}
            strokeWidth={5}
            strokeColor={Colors.MapLine}
          />
        )}
      </MapView>

      <View style={styles.BottomBox}>
        <Text style={styles.Text}>{t("Customer Contact")}</Text>
        <View style={SimpleFlex.Flex}>
          <TouchableOpacity onPress={() => WhatsaapRedirectFun(1)}>
            <Image source={Images.WhatsApp} style={styles.Icon} />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => WhatsaapRedirectFun(2)}>
            <Image source={Images.redWhatsApp} style={styles.Icon} />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
