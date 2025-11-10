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
    GOOGLE_API_KEY,setGOOGLE_API_KEY,
    CompanyLogo,setCompanyLogo,
    Permission,setPermission,
    SelectLanguage,setSelectLanguage,
    CompanysData,setCompanysData
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
      const [languages, auth, company, logo,companyData] = await Promise.all([
        getData("userLanguage"),
        getData("AUTH"),
        getData("USERDATA"),
        getData("COMPANYLOGO"),
        getData("COMPANYLOGIN")
      ]);

       if (languages) {
        await i18n.changeLanguage(languages);
        setSelectLanguage(languages);
      }

      if(companyData){
      setCompanysData(companyData)
      }

     
      if (logo) setCompanyLogo(logo);

      if (!languages) {
        navigation.replace("Select");
        return;
      }

      if (!auth) {
        navigation.replace("OnBoarding");
        console.log("Login required");
        return;
      }

      const client = company?.data?.user;
      if (!client) {
        console.log("Client data missing");
        navigation.replace("OnBoarding");
        return;
      }else{
      if (company) {
        let permissionData;
        try {
          permissionData = await ApiService(apiConstants.permission, {
            customData: {
              token: client.verify_token,
              role: client.role,
              relaties_id: company?.data?.relaties?.id,
              user_id: client.id,
            },
          });
        } catch (apiError) {
          console.log("API fetch error:", apiError);
          navigation.replace("BottomTabs");
          return;
        }

        if (permissionData?.status) {
          const Permission = permissionData.data;
          setPermission(Permission);

          
            navigation.replace("BottomTabs");
            return;
          
        }

        navigation.replace("BottomTabs");
      }
        }
    } catch (error) {
      console.log("Permission or Auth error:", error);
    }
  };

  useEffect(() => {
    setTimeout(() => {
      getAuthData();
    }, 2000);
  }, []);

  // useEffect(() => {
  //   let timer: any;
  //   if (fontsLoaded) {
  //     timer = setTimeout(() => {
  //       navigation.replace("BottomTabs");
  //     }, 1500);
  //   }
  //   return () => clearTimeout(timer);
  // }, [fontsLoaded]);

  return (
    <View style={styles.container}>
      <Image source={Images.splash} style={{ width: "100%", height: "100%" }} />
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
