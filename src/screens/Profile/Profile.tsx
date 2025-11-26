import { Images } from "@/src/assets/images";
import ConformationModal from "@/src/components/ConformationModal";
import ProfileItem from "@/src/components/ProfileItem";
import { GlobalContextData } from "@/src/context/GlobalContext";
import { Colors } from "@/src/utils/colors";
import { storeData } from "@/src/utils/storeData";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import React, { useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, Image, Text, View } from "react-native";
import { styles } from "./styles";

type ArrayProps = {
  Background: string;
  Icon: any;
  Title: string;
  onPress: () => void;
};

export default function Profile({ navigation }: any) {
  const {
    UserData,
    setUserData,
    Toast,
    setToast,
    CompanysData,
    setPermission,
    SelectLanguage,
    setSelectLanguage,
  } = useContext(GlobalContextData);
  const [CurrentVersion, setCurrentVersion] = useState<number>(1);
  const [AlertModalOpen, setAlerModalOpen] = useState<any>({
    visible: false,
    title: "",
    Icon: "",
    LButtonText: "",
    RButtonText: "",
    RButtonColor: "",
    RButtonStyle: Object,
    LButtonStyle: Object,
    RButtonIcon: Object,
    LColor: "",
    RColor: "",
    Desctiption: "",
    onPress: "",
    HeaderBgColor: "",
  });
  const { t } = useTranslation();

  const retrieveAppVersion = async () => {

    try {
      const version =
        Constants.expoConfig?.version || Constants.manifest?.version || "Beta";
      setCurrentVersion(version);
    } catch (error) {
      console.error("Error retrieving app version:", error);
    }
  };

  const OnLogOutFun = async () => {
    setAlerModalOpen({
      visible: true,
      title: t("Log Out"),
      Desctiption: t("Are you sure you want to log out your account?"),
      LButtonText: t("Cancel"),
      RButtonText: t("Log Out"),
      Icon: Images.LogOutFullBox,
      RButtonStyle: Colors.red,
      HeaderBgColor: Colors.white,
      RColor: Colors.white,
      onPress: async () => {
        await AsyncStorage.clear();
        console.log("UserData", UserData);
        setUserData(null);
        setPermission([]);
        await storeData("userLanguage", SelectLanguage);
        navigation?.replace("OnBoarding");
      },
    });
  };

  const DeleteAccountFun = async () => {
    setAlerModalOpen({
      visible: true,
      title: t("Delete Account"),
      Desctiption: t("Are you sure you want to log out your delete account?"),
      LButtonText: t("Cancel"),
      RButtonText: t("Delete"),
      Icon: Images.LogOutFullBox,
      RButtonStyle: Colors.red,
      HeaderBgColor: Colors.white,
      RColor: Colors.white,
      onPress: async () => {
        await AsyncStorage.clear();
        navigation?.replace("OnBoarding");
      },
    });
  };

  const ProfileItems: ArrayProps[] = [
    {
      Background: Colors.primary,
      Icon: Images.Info,
      Title: t("About Us"),
      onPress: () =>
        navigation.navigate("WebViewScreeens", {
          title: "About Us",
          url: `https://app.erpportaal.nl/about_app_info/${CurrentVersion}`,
        }),
    },
    {
      Background: Colors.primary,
      Icon: Images.Privacy,
      Title: t("Privacy Policy"),
      onPress: () =>
        navigation.navigate("WebViewScreeens", {
          title: "Privacy Policy",
          url: "",
        }),
    },
    {
      Background: Colors.primary,
      Icon: Images.Terms,
      Title: t("Terms & Conditions"),
      onPress: () =>
        navigation.navigate("WebViewScreeens", {
          title: "Terms & Conditions",
          url: "",
        }),
    },
    {
      Background: Colors.primary,
      Icon: Images.Phone,
      Title: t("Contact Us"),
      onPress: () =>
        navigation.navigate("WebViewScreeens", {
          title: "Contact Us",
          url: "",
        }),
    },
    {
      Background: Colors.primary,
      Icon: Images.LangaugeIcon,
      Title: t("Language"),
      onPress: () => navigation.navigate("Language"),
    },
    {
      Background: Colors.RemoveBg,
      Icon: Images.logout,
      Title: t("Log Out"),
      onPress: () => OnLogOutFun(),
    },
  ];

  useEffect(() => {
    retrieveAppVersion();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.SimpleFlex}>
        <Image
          source={{ uri: UserData?.user?.profile_image }}
          style={styles.UserImage}
        />
        <View style={{ gap: 5 }}>
          <Text style={styles.Text}>
            {UserData?.user?.username?.length > 0
              ? UserData.user.username
              : UserData?.relaties?.display_name || ""}
          </Text>

          <Text style={styles.darkText}>{CompanysData}</Text>
        </View>
      </View>

      <FlatList
        style={styles.FlatContainerStyle}
        contentContainerStyle={styles.ContentContainerStyle}
        data={ProfileItems}
        bounces={false}
        ListFooterComponent={() => (
          <Text
            style={[styles.Text, { textAlign: "center", marginTop: 15 }]}
          >{`V${CurrentVersion}`}</Text>
        )}
        renderItem={({ item }) => (
          <ProfileItem
            Icon={item?.Icon}
            Title={item?.Title}
            IconBoxBackground={item?.Background}
            onPress={item?.onPress}
          />
        )}
      />

      <ConformationModal
        IsVisible={AlertModalOpen?.visible}
        onClose={() =>
          setAlerModalOpen((prev: any[]) => ({
            ...prev,
            visible: false,
          }))
        }
        Title={AlertModalOpen.title}
        Icon={AlertModalOpen.Icon}
        LeftButtonText={AlertModalOpen.LButtonText}
        RightButtonText={AlertModalOpen.RButtonText}
        RightBgColor={AlertModalOpen.RButtonStyle}
        LeftBGColor={AlertModalOpen.LButtonStyle}
        RightButtonIcon={AlertModalOpen.RButtonIcon}
        RTextColor={AlertModalOpen.RColor}
        LTextColor={AlertModalOpen.LColor}
        onPress={AlertModalOpen.onPress}
        Description={AlertModalOpen.Desctiption}
        HeaderBgColor={AlertModalOpen.HeaderBgColor}
      />
    </View>
  );
}
