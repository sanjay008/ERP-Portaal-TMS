import apiConstants from "@/src/api/apiConstants";
import { Images } from "@/src/assets/images";
import DetailsHeader from "@/src/components/DetailsHeader";
import { useErrorHandle } from "@/src/components/ErrorHandle";
import LoadingModal from "@/src/components/LoadingModal";
import { GlobalContextData } from "@/src/context/GlobalContext";
import ApiService from "@/src/utils/Apiservice";
import { Colors } from "@/src/utils/colors";
import { SimpleFlex, token } from "@/src/utils/storeData";
import { useIsFocused } from "@react-navigation/native";
import * as Location from "expo-location";
import React, { useContext, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Image,
  Linking,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";
import { styles } from "./styles";
export default function MapsScreens({ route }: any) {
  const { data } = route?.params || "";
  const { t } = useTranslation();
  const { ErrorHandle } = useErrorHandle();
  const [IsLoading, setIsLoading] = useState<boolean>(false);
  const GoogleMapsRef = useRef<any>(null);
  const {
    GOOGLE_API_KEY,
    setToast,
    UserData,
    SelectActiveRegionData,
    setSelectActiveRegionData,
    SelectActiveDate,setSelectActiveDate
  } = useContext(GlobalContextData);
  const [AllDestinationRegionData, setAllDestinationRegionData] = useState<
    any[]
  >([]);
  const IsFocused = useIsFocused();
  const [UserCurrentLocation, setUserCurrentLocation] = useState<Object | any>(
    null
  );
  const AnimatedMarker = Animated.createAnimatedComponent(Marker);
  const AnimatedUser = useSharedValue({
    latitude: 0,
    longitude: 0,
  });
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
  const animatedProps = useAnimatedProps(() => ({
    coordinate: {
      latitude: withTiming(AnimatedUser.value.latitude, { duration: 600 }),
      longitude: withTiming(AnimatedUser.value.longitude, { duration: 600 }),
    },
  }));

  const getCurrentLocationFun = async () => {
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

        setUserCurrentLocation(loc.coords);
        
        AnimatedUser.value = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        };
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
  };

const MapAppRedirectFun = async () => {
  try {
    let coordsArray = [...AllDestinationRegionData];

    if (!coordsArray.length) {
      console.warn("No destinations provided.");
      return;
    }

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

    if (supported) {
      await Linking.openURL(urlToOpen);
    } else {
      await Linking.openURL(googleUrl); 
    }
  } catch (error: any) {
    console.log("Map Redirect Error: ", error);

    setToast({
      top: 45,
      text: ErrorHandle(error).message,
      type: "error",
      visible: true,
    });
  }
};


  const GetLocationData = async () => {
    setIsLoading(true);
    if (SelectActiveRegionData==null) {
      setToast({
        top: 45,
        text: t("No Region Found"),
        type: "error",
        visible: true,
      });
      return;
    }

    
    try {
      let res = await ApiService(apiConstants.get_location_by_region_date, {
        customData: {
          token: token,
          role: UserData?.user?.role,
          relaties_id: UserData?.relaties?.id,
          user_id: UserData?.user?.id,
          region_id: SelectActiveRegionData?.id,
          date:SelectActiveDate
        },
      });
      if (res?.status) {
        setAllDestinationRegionData(res?.orders || []);
        console.log("res?.orders",res?.orders);
        
      } else {
        setToast({
          top: 45,
          text: res?.message,
          type: "error",
          visible: true,
        });
      }
    } catch (error) {
      console.log("Get Locations Data Error:-", error);
      setToast({
        top: 45,
        text: ErrorHandle(error)?.message || "Something went wrong",
        type: "error",
        visible: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if(IsFocused && SelectActiveDate){
      getCurrentLocationFun();
      GetLocationData();
    }
  }, [SelectActiveDate]);

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
          <AnimatedMarker
            animatedProps={animatedProps}
            anchor={{ x: 0.5, y: 0.5 }}
            flat
            image={Images.MapsMarkerVehicalIcon}
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

        {/* All Button For Position use */}
      </MapView>

      <TouchableOpacity
        style={styles.GetLocationButton}
        onPress={getCurrentLocationFun}
      >
        <Image
          source={Images.MapsMarkerVehicalIcon}
          style={styles.LogoUserCurrentLocate}
        />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.MapsButton}
        onPress={() => MapAppRedirectFun()}
      >
        <Text style={styles.MapsButtonText}>{t("Go To Maps")}</Text>
      </TouchableOpacity>
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
      <LoadingModal visible={IsLoading} message={t("Please wait…")} />
    </SafeAreaView>
  );
}
