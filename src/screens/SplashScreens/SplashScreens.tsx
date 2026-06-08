import apiConstants from "@/src/api/apiConstants";
import { Images } from "@/src/assets/images";
import { GlobalContextData } from "@/src/context/GlobalContext";
import { DropboxContext } from "@/src/context/UploadProider";
import ApiService from "@/src/utils/Apiservice";
import { getData } from "@/src/utils/storeData";
import { bootstrapAppDateTime } from "@/src/utils/appDateTime";
import * as Font from "expo-font";
import React, { useContext, useEffect } from "react";
import { Image, StyleSheet, View } from "react-native";
import i18n from "../Translation/i18n";
export default function SplashScreens({ navigation }: any) {
  const {
    GOOGLE_API_KEY, setGOOGLE_API_KEY,
    CompanyLogo, setCompanyLogo,
    Permission, setPermission,
    SelectLanguage, setSelectLanguage,
    CompanysData, setCompanysData,
    AllLanguage,
    setAllLanguage,
    SelectActiveDate,
    setSelectActiveDate,
    setTimeZone,
  } = useContext(GlobalContextData);
  const { setAccessToken,
    setRefreshToken,
    setClientId,
    setClientSecret } = useContext(DropboxContext);
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
  };

  const fetchLanguages = async () => {
    try {
      const data = await ApiService(apiConstants.langauge, {});

      if (data?.status && Array.isArray(data?.data)) {
        setAllLanguage(data?.data || []);
      }
    } catch (err) {
      // language fetch failed — continue startup
    }
  };

  const getAuthData = async () => {
    try {
      const [languages, auth, company, logo, companyData,fullcompany] = await Promise.all([
        getData("userLanguage"),
        getData("AUTH"),
        getData("USERDATA"),
        getData("COMPANYLOGO"),
        getData("COMPANYLOGIN"),
        getData("COMPANYDATA"),
      ]);

      if (languages) {
        await i18n.changeLanguage(languages);
        setSelectLanguage(languages);
      }

      if (companyData) {
        setCompanysData(companyData);
       
      }
      if(fullcompany){   
        if (fullcompany?.default_company) {
          setAccessToken(fullcompany?.default_company?.company_api_dropbox_access_token || "");
          setRefreshToken(fullcompany?.default_company?.company_api_dropbox_refresh_token || "");
          setClientId(fullcompany?.default_company?.company_api_dropbox_client_id || "");
          setClientSecret(fullcompany?.default_company?.company_api_dropbox_secret_id || "");
          bootstrapAppDateTime(
            fullcompany?.default_company?.timezone,
            setTimeZone,
            setSelectActiveDate,
            SelectActiveDate,
          );
        }
      }


      if (logo) setCompanyLogo(logo);

      if (!languages) {
        navigation.replace("Select");
        return;
      }

      if (!auth) {
        navigation.replace("OnBoarding");
        return;
      }

      const client = company?.data?.user;
      if (!client) {
        navigation.replace("OnBoarding");
        return;
      } else {
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
      // auth bootstrap failed
    }
  };

  useEffect(() => {
    const bootstrap = async () => {
      await loadFonts();
      await Promise.all([fetchLanguages(), getAuthData()]);
    };
    bootstrap();
  }, []);

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
