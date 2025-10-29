import apiConstants from "@/src/api/apiConstants";
import { Images } from "@/src/assets/images";
import { GlobalContextData } from "@/src/context/GlobalContext";
import ApiService from "@/src/utils/Apiservice";
import { getData } from "@/src/utils/storeData";
import * as Font from "expo-font";
import React, { useContext, useEffect, useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import i18n from "../Translation/i18n";

export default function SplashScreens({ navigation }: any) {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const {
    setGOOGLE_API_KEY,
    setCompanyLogo,
    setPermission,
    setSelectLanguage,
    setCompanysData,
  } = useContext(GlobalContextData);

  const loadFonts = async () => {
    await Font.loadAsync({
      regular: require("../../assets/fonts/Lexend-Regular.ttf"),
      Bold: require("../../assets/fonts/Lexend-Bold.ttf"),
      SemiBold: require("../../assets/fonts/Lexend-SemiBold.ttf"),
      ExtraBold: require("../../assets/fonts/Lexend-ExtraBold.ttf"),
      ExtraLight: require("../../assets/fonts/Lexend-ExtraLight.ttf"),
      Medium: require("../../assets/fonts/Lexend-Medium.ttf"),
      Thin: require("../../assets/fonts/Lexend-Thin.ttf"),
    });
    setFontsLoaded(true);
  };

  useEffect(() => {
    loadFonts();
  }, []);

  const getAuthData = async () => {
    try {
      const [auth, company, languages, logo, companyData] = await Promise.all([
        getData("AUTH"),
        getData("USERDATA"),
        getData("userLanguage"),
        getData("COMPANYLOGO"),
        getData("COMPANYLOGIN"),
      ]);

      if (companyData) setCompanysData(companyData);
      if (logo) setCompanyLogo(logo);

      // Language Check
      if (languages) {
        await i18n.changeLanguage(languages);
        setSelectLanguage(languages);
      } else {
        navigation.replace("Select");
        return null;
      }

      // Auth Check
      if (!auth) {
        navigation.replace("OnBoarding");
        return null;
      }

      const client = company?.data?.user;
      if (!client) {
        navigation.replace("OnBoarding");
        return null;
      }

      // Permissions Fetch
      let permissionData = null;
      try {
        permissionData = await ApiService(apiConstants.permission, {
          customData: {
            token: client?.verify_token ?? "",
            role: client?.role ?? "",
            relaties_id: company?.data?.relaties?.id ?? "",
            user_id: client?.id ?? "",
          },
        });
      } catch (apiError) {
        navigation.replace("BottomTabs");
        return null;
      }

      if (permissionData?.status) {
        setPermission(permissionData.data);
      }

      navigation.replace("BottomTabs");
    } catch (error) {
      console.log("Splash Init Error:", error);
      navigation.replace("OnBoarding");
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (fontsLoaded) getAuthData();
    }, 1200);
    return () => clearTimeout(timer);
  }, [fontsLoaded]);

  return (
    <View style={styles.container}>
      <Image source={Images.splash} style={{ width: "100%", height: "100%" }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
