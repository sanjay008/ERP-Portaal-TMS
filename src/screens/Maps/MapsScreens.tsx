// import apiConstants from "@/src/api/apiConstants";
// import { Images } from "@/src/assets/images";
// import DetailsHeader from "@/src/components/DetailsHeader";
// import { useErrorHandle } from "@/src/components/ErrorHandle";
// import LoadingModal from "@/src/components/LoadingModal";
// import { GlobalContextData } from "@/src/context/GlobalContext";
// import ApiService from "@/src/utils/Apiservice";
// import { Colors } from "@/src/utils/colors";
// import { SimpleFlex, token } from "@/src/utils/storeData";
// import { useIsFocused } from "@react-navigation/native";
// import * as Location from "expo-location";
// import React, { useContext, useRef, useState } from "react";
// import { useTranslation } from "react-i18next";
// import {
//   Alert,
//   Image,
//   Linking,
//   Platform,
//   Text,
//   TouchableOpacity,
//   View,
// } from "react-native";
// import MapView, { Marker, Polyline } from "react-native-maps";
// import Animated, {
//   useAnimatedProps,
//   useSharedValue,
//   withTiming,
// } from "react-native-reanimated";
// import { SafeAreaView } from "react-native-safe-area-context";
// import Svg, { Circle, Path } from "react-native-svg";
// import { styles } from "./styles";
// export default function MapsScreens({ route }: any) {
//   const { data } = route?.params || "";
//   const { t } = useTranslation();
//   const { ErrorHandle } = useErrorHandle();
//   const [IsLoading, setIsLoading] = useState<boolean>(false);
//   const GoogleMapsRef = useRef<any>(null);
//   const {
//     GOOGLE_API_KEY,
//     setToast,
//     UserData,
//     SelectActiveRegionData,
//     setSelectActiveRegionData,
//     SelectActiveDate,setSelectActiveDate
//   } = useContext(GlobalContextData);
//   const [AllDestinationRegionData, setAllDestinationRegionData] = useState<
//     any[]
//   >([]);
//   const IsFocused = useIsFocused();
//   const [UserCurrentLocation, setUserCurrentLocation] = useState<Object | any>(
//     null
//   );
//   const AnimatedMarker = Animated.createAnimatedComponent(Marker);
//   const AnimatedUser = useSharedValue({
//     latitude: 0,
//     longitude: 0,
//   });
//   const [MarkerData, setMarkerData] = useState<any>([]);
//   const camera: any = {
//     coordinates: { latitude: 28.6139, longitude: 77.209 },
//     zoom: 6,
//   };

//   const IntialRoute = {
//     latitude: 28.6139,
//     longitude: 77.209,
//     latitudeDelta: 0.2,
//     longitudeDelta: 0.2,
//   };

//   const getDirectDropboxLink = (sharedLink: string) => {
//     if (!sharedLink) return "";

//     let url = sharedLink
//       .replace("www.dropbox.com", "dl.dropboxusercontent.com")
//       .replace("dropbox.com", "dl.dropboxusercontent.com");

//     url = url.replace(/[?&](dl|raw)=\d/, "");

//     url += (url.includes("?") ? "&" : "?") + "raw=1";

//     return url;
//   };

//   const WhatsaapRedirectFun = async (type: number) => {
//     let person = data?.customer;
//     try {
//       let countryCode = person?.country_code || "";
//       if (!countryCode.startsWith("+")) {
//         countryCode = `+${countryCode}`;
//       }

//       const phoneNumber = `${countryCode}${person?.mobiel || ""}`;
//       const message = t("Hello! This is a test message.");
//       let url = "";

//       if (type === 1) {
//         url = `https://api.whatsapp.com/send/?phone=${phoneNumber.replace(
//           "+",
//           ""
//         )}&type=phone_number&app_absent=0`;
//       } else if (type === 2) {
//         const encodedMsg = encodeURIComponent(message);
//         url = `https://api.whatsapp.com/send/?phone=${phoneNumber.replace(
//           "+",
//           ""
//         )}&text=${encodedMsg}&type=phone_number&app_absent=0`;
//       } else {
//         setToast({
//           top: 45,
//           text: t("Invalid type — please pass 1 or 2 only."),
//           type: "error",
//           visible: true,
//         });
//         return;
//       }

//       console.log(url);
//       await Linking.openURL(url);
//     } catch (error) {
//       console.log("WhatsApp redirect error:", error);
//       setToast({
//         top: 45,
//         text: t("Something went wrong while opening WhatsApp."),
//         type: "error",
//         visible: true,
//       });
//     }
//   };
//   const animatedProps = useAnimatedProps(() => ({
//     coordinate: {
//       latitude: withTiming(AnimatedUser.value.latitude, { duration: 600 }),
//       longitude: withTiming(AnimatedUser.value.longitude, { duration: 600 }),
//     },
//   }));

//   const getCurrentLocationFun = async () => {
//     const { status } = await Location.requestForegroundPermissionsAsync();
//     if (status !== "granted") {
//       console.log("Permission denied");
//       return;
//     }

//     await Location.watchPositionAsync(
//       {
//         accuracy: Location.Accuracy.High,
//         distanceInterval: 2,
//       },
//       async (loc) => {

//         setUserCurrentLocation(loc.coords);

//         AnimatedUser.value = {
//           latitude: loc.coords.latitude,
//           longitude: loc.coords.longitude,
//         };
//         GoogleMapsRef.current?.animateToRegion(
//           {
//             latitude: loc.coords.latitude,
//             longitude: loc.coords.longitude,
//             latitudeDelta: 0.01,
//             longitudeDelta: 0.01,
//           },
//           1000
//         );
//       }
//     );
//   };

// const MapAppRedirectFun = async () => {
//   try {
//     let coordsArray = [...AllDestinationRegionData];

//     if (!coordsArray.length) {
//       console.warn("No destinations provided.");
//       return;
//     }

//     let { status } = await Location.requestForegroundPermissionsAsync();
//     if (status !== "granted") {
//       Alert.alert("Location permission denied");
//       return;
//     }

//     let current = await Location.getCurrentPositionAsync({});
//     let startLat = current.coords.latitude;
//     let startLng = current.coords.longitude;

//     let googleWaypoints = coordsArray
//       .map((c: any) => `${c.lat},${c.long}`)
//       .join("/");

//     let googleUrl = `https://www.google.com/maps/dir/${startLat},${startLng}/${googleWaypoints}`;


//     let appleWaypoints = coordsArray
//       .map((c: any) => `${c.lat},${c.long}`)
//       .join("+to:");

//     let appleUrl = `http://maps.apple.com/?saddr=${startLat},${startLng}&daddr=${appleWaypoints}`;

//     let urlToOpen = Platform.OS === "ios" ? appleUrl : googleUrl;

//     const supported = await Linking.canOpenURL(urlToOpen);

//     if (supported) {
//       await Linking.openURL(urlToOpen);
//     } else {
//       await Linking.openURL(googleUrl); 
//     }
//   } catch (error: any) {
//     console.log("Map Redirect Error: ", error);

//     setToast({
//       top: 45,
//       text: ErrorHandle(error).message,
//       type: "error",
//       visible: true,
//     });
//   }
// };


//   const GetLocationData = async () => {
//     setIsLoading(true);
//     if (SelectActiveRegionData==null) {
//       setToast({
//         top: 45,
//         text: t("No Region Found"),
//         type: "error",
//         visible: true,
//       });
//       return;
//     }


//     try {
//       let res = await ApiService(apiConstants.get_location_by_region_date, {
//         customData: {
//           token: token,
//           role: UserData?.user?.role,
//           relaties_id: UserData?.relaties?.id,
//           user_id: UserData?.user?.id,
//           region_id: SelectActiveRegionData?.id,
//           date:SelectActiveDate
//         },
//       });
//       if (res?.status) {
//         setAllDestinationRegionData(res?.orders || []);
//         console.log("res?.orders",res?.orders);

//       } else {
//         setToast({
//           top: 45,
//           text: res?.message,
//           type: "error",
//           visible: true,
//         });
//       }
//     } catch (error) {
//       console.log("Get Locations Data Error:-", error);
//       setToast({
//         top: 45,
//         text: ErrorHandle(error)?.message || "Something went wrong",
//         type: "error",
//         visible: true,
//       });
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   // useEffect(() => {
//   //   if(IsFocused && SelectActiveDate){
//   //     getCurrentLocationFun();
//   //     GetLocationData();
//   //   }
//   // }, [SelectActiveDate]);

//   return (
//     <SafeAreaView style={styles.container}>
//       <View style={styles.HeaderContainer}>
//         <DetailsHeader title={t("Map")} />
//       </View>
//       <MapView
//         ref={GoogleMapsRef}
//         provider="google"
//         style={{ flexGrow: 1 }}
//         initialRegion={{
//           latitude: UserCurrentLocation?.latitude ?? IntialRoute.latitude,
//           longitude: UserCurrentLocation?.longitude ?? IntialRoute.longitude,
//           latitudeDelta: 0.01,
//           longitudeDelta: 0.01,
//         }}
//       >
//         {UserCurrentLocation && (
//           <AnimatedMarker
//             animatedProps={animatedProps}
//             anchor={{ x: 0.5, y: 0.5 }}
//             flat
//             image={Images.MapsMarkerVehicalIcon}
//           />
//         )}
//         {/* 
//         {UserCurrentLocation && (
//           <Marker
//             coordinate={{
//               latitude: data.pickup_ad_latitude,
//               longitude: data.pickup_ad_longitude,
//             }}
//             anchor={{ x: 0.5, y: 0.5 }}
//             flat={true}
//           >
//             <Svg width={35} height={35} viewBox="0 0 64 64">
//               <Path
//                 d="M32 2C19 2 8 13 8 26c0 12 20 35 22 37a2 2 0 0 0 3 0c2-2 22-25 22-37C55 13 45 2 32 2Z"
//                 fill="#FF3B30"
//               />
//               <Circle cx="32" cy="26" r="8" fill="white" />
//               <Circle cx="32" cy="26" r="4" fill="#FF3B30" />
//             </Svg>
//           </Marker>
//         )} */}

//         {IntialRoute && (
//           <Marker
//             coordinate={{
//               latitude: IntialRoute.latitude,
//               longitude: IntialRoute.longitude,
//             }}
//             anchor={{ x: 0.5, y: 0.5 }}
//             flat={true}
//           >
//             <Svg width={35} height={35} viewBox="0 0 64 64">
//               <Path
//                 d="M32 2C19 2 8 13 8 26c0 12 20 35 22 37a2 2 0 0 0 3 0c2-2 22-25 22-37C55 13 45 2 32 2Z"
//                 fill="#FF3B30"
//               />
//               <Circle cx="32" cy="26" r="8" fill="white" />
//               <Circle cx="32" cy="26" r="4" fill="#FF3B30" />
//             </Svg>
//           </Marker>
//         )}

//         {UserCurrentLocation !== null && (
//           <Polyline
//             coordinates={[
//               {
//                 latitude: UserCurrentLocation?.latitude,
//                 longitude: UserCurrentLocation?.longitude,
//               },
//               {
//                 latitude: IntialRoute.latitude,
//                 longitude: IntialRoute.longitude,
//               },
//             ]}
//             strokeWidth={5}
//             strokeColor={Colors.MapLine}
//           />
//         )}

//         {/* All Button For Position use */}
//       </MapView>

//       <TouchableOpacity
//         style={styles.GetLocationButton}
//         onPress={getCurrentLocationFun}
//       >
//         <Image
//           source={Images.MapsMarkerVehicalIcon}
//           style={styles.LogoUserCurrentLocate}
//         />
//       </TouchableOpacity>
//       <TouchableOpacity
//         style={styles.MapsButton}
//         onPress={() => MapAppRedirectFun()}
//       >
//         <Text style={styles.MapsButtonText}>{t("Go To Maps")}</Text>
//       </TouchableOpacity>
//       <View style={styles.BottomBox}>
//         <Text style={styles.Text}>{t("Customer Contact")}</Text>
//         <View style={SimpleFlex.Flex}>
//           <TouchableOpacity onPress={() => WhatsaapRedirectFun(1)}>
//             <Image source={Images.WhatsApp} style={styles.Icon} />
//           </TouchableOpacity>

//           <TouchableOpacity onPress={() => WhatsaapRedirectFun(2)}>
//             <Image source={Images.redWhatsApp} style={styles.Icon} />
//           </TouchableOpacity>
//         </View>
//       </View>
//       <LoadingModal visible={IsLoading} message={t("Please wait…")} />
//     </SafeAreaView>
//   );
// }
import * as FileSystem from "expo-file-system/legacy";
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Text,
  TouchableOpacity
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function MapsScreens() {

  const [loading, setLoading] = useState(false)
  const [uploadTime, setUploadTime] = useState(null)

  const accessToken = "sl.u.AGhitzUE15TwfnJoU-3jF2LNjZG-2x26CCB11EpTOvYEIuAWGPd0mkszwJbBXJAaPQalQOK_z7sIj0Hie6cXIFI8FZCXizocdfNLK7lKXe8ZMrnk3m8wNTXZvFPl6NkIQQAVZ4KyiYsBvNGArItWx03EJ0eVenHxSS4DSfkgNOiI5vqARmzmKaO10D6N1rvy_HxvvBkX_DzNMCKtt9v-4dEJMhpH1TjVk6yfDeGHAT5Ix_ynKYifbI6U0e-JRLDPWXafiovi734A4AzQoIhRv-JLOR4ZmzF4LlkQBIgCicBLdNVQxHKwk9kp0eSf0lEvNijKuGXVG4FIr0B0utyB1nI9Eqy_IlPEwd1PQ4_pgjQFW0XEqSYFsjpytbOiPcAofUql1b4rqMNPY3aVi-9ldu4y_woNFuFyYLfYJyR-YOHvBgKC5AoKNDEvWOclpPq3NhQYysWMjRqgIu6l_0wXAiHLpztv88Gz9iOSP0f5HO_ePRDP60wl92QNNn1IwcypFi9bRE-jBucn04YgHnm96x71LfP1HaOds1w0qQAnu8yUaVuRX3aOUmJjfrdtru5kweBN5g2KEPF5Cav9imkqO9l4_E_xzk02G6gfgwKMh7L9MLjk-Af8zXpv2UdOEM6fqG90c5BR1wyDyHWt42p5l60VVomOR2lokhrck6QrLjFzhddzFlaZiM58Hcp7Ac_bd4mVBcTsGwSV9Fdbvrnx8UpgUuCDNjSIFANRHm5SPNvQxfo_TKWnrITxP4v6FnchVak1eAiRun00yxd_3w-_K3HYDPWnYrveP_IkoMP6rQcUZaRAycRFslU7xDAYs4EyR3CsLlnKj3HVEAtHluN1IxUtxu2K3NPxjKsa9ocWQXpn1hFPy_vcLnN18QK6RJhh8G_tS_N_0QTLX-AkiD1lkFHwczgIMFsfNy8inm5MKpyDUmaFKFcANQ0iMthSGpmHe6MfttL7ZvVif_WHtj94ALuNU_ic34kHcp2NsZtwRjPddgWwQNWWbvPBrG1pfDf_3YExyXZt4klvAAxH9rdswKgEnCNRKvP1oVRRJbbSswiWyj7cYrG6f-Z5sgNtF7_ZCg2ff6Udm9BtrgDqkFlCZ9qDh-SNNoygzMIoeqd6JioK73yQpKHrIWvAdrBpJtmrlaXRoZD_ogP_JZ9hYd6Ou_q9hLg41whI71m3FgWMEldVH4AXv4nlX8znZX3RQWzdW4c_iji5PtDZtnVShs39hqvWhQNG26s9GIGqkMg6ycJOielAxH6hB6lX9aAHeqFld_xVvWatwl35LUkUxXDEWw3DYBwIJz53Lf9CBEjgf2BYRycY9mY5kYYRTU7NedUGgX1z5QeVaBImW2jGCKyvyAuHY3kH-LkEjbRzFfUMdx4OWpMaNJ8cgt_DtdOE1UK23p7TlEIa3v_3v35uflbzFOaAJIy_JiiZXqMeDHbpADLdSw"
  const uploadToDropbox = async (...imageUris) => {

    try {

      setLoading(true);

      const uploadedFiles = [];

      const startTime = Date.now();

      for (const imageUri of imageUris) {

        try {

          console.log("Uploading:", imageUri);

          const uploadRes = await FileSystem.uploadAsync(
            "https://content.dropboxapi.com/2/files/upload",
            imageUri,
            {
              httpMethod: "POST",

              uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,

              headers: {
                Authorization: `Bearer ${accessToken}`,

                "Dropbox-API-Arg": JSON.stringify({
                  path: `/photos/${Date.now()}-${Math.random()}.jpg`,
                  mode: "add",
                  autorename: true,
                  mute: false,
                }),

                "Content-Type": "application/octet-stream",
              },
            }
          );

          console.log("Upload Success:", uploadRes);

          uploadedFiles.push(uploadRes);

        } catch (err) {

          console.log("Single image upload failed:", err);
        }
      }

      const endTime = Date.now();

      console.log(
        `Total Upload Time: ${((endTime - startTime) / 1000).toFixed(2)}s`
      );

      console.log("Uploaded Files:", uploadedFiles);

    } catch (e) {

      console.log("Dropbox upload error:", e);

    } finally {

      setLoading(false);
    }
  };

  const refreshAccessToken = async () => {

  try {

    const response = await fetch(
      "https://api.dropbox.com/oauth2/token",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },

        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: "4MQunI3lCdcAAAAAAAAAATeCLz71iQ7X49_nnmijINGjILC4dtk4ZcDrhJGySvzu",
          client_id: "fgawznqj3koscqm",
          client_secret: "vk16poeqv9eaimv",
        }).toString(),
      }
    );

    const data = await response.json();

    if (response.ok) {

      console.log("New Access Token:", data.access_token);

      console.log("Expires In:", data.expires_in);

      // save token
      const accessToken = data.access_token;

      return accessToken;

    } else {

      console.log("Refresh Token Error:", data);

      return null;
    }

  } catch (e) {

    console.log("Refresh Access Token Error:", e);

    return null;
  }
};

  return (
    <SafeAreaView
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >

      <TouchableOpacity
        onPress={() =>
          uploadToDropbox(
            "file:///data/user/0/com.erpportaal.ERP_Portaal_TMS/cache/Camera/13f373f5-a33d-4337-b4c7-48e9237d7786.jpg",
            "file:///data/user/0/com.erpportaal.ERP_Portaal_TMS/cache/Camera/13f373f5-a33d-4337-b4c7-48e9237d7786.jpg",
            "file:///data/user/0/com.erpportaal.ERP_Portaal_TMS/cache/Camera/13f373f5-a33d-4337-b4c7-48e9237d7786.jpg",
          )
        }
        style={{
          backgroundColor: "black",
          paddingHorizontal: 20,
          paddingVertical: 12,
          borderRadius: 10,
        }}
      >

        {
          loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={{ color: "white" }}>
              Upload Image
            </Text>
          )
        }

      </TouchableOpacity>
      <TouchableOpacity
        onPress={() =>
       refreshAccessToken()
        }
        style={{
          backgroundColor: "black",
          paddingHorizontal: 20,
          paddingVertical: 12,
          borderRadius: 10,
        }}
      >

        {
          loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={{ color: "white" }}>
              Refresh Access Token
            </Text>
          )
        }

      </TouchableOpacity>

      {
        uploadTime && (
          <Text
            style={{
              marginTop: 20,
              fontSize: 16,
              fontWeight: "600",
            }}
          >
            Upload Time: {uploadTime}s
          </Text>
        )
      }

    </SafeAreaView>
  )
}