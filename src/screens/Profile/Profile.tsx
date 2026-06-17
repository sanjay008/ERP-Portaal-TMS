import { Images } from "@/src/assets/images";
import ConformationModal from "@/src/components/ConformationModal";
import LogoutShiftSheet from "@/src/components/LogoutShiftSheet";
import ProfileImageViewer from "@/src/components/ProfileImageViewer";
import ProfileItem from "@/src/components/ProfileItem";
import { useErrorHandle } from "@/src/components/ErrorHandle";
import { GlobalContextData } from "@/src/context/GlobalContext";
import { Colors } from "@/src/utils/colors";
import { clearUserSessionStorage } from "@/src/utils/logoutSession";
import {
  buildDateTime,
  getCurrentTimeString,
  tripOff,
} from "@/src/utils/regionTripApi";
import {
  clearActiveShift,
  doesShiftBelongToUser,
} from "@/src/utils/shiftSession";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import React, { useCallback, useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, Text, View } from "react-native";
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
    setToast,
    CompanysData,
    setPermission,
    activeShift,
    setActiveShift,
    setIsGpsTracking,
  } = useContext(GlobalContextData);
  const [CurrentVersion, setCurrentVersion] = useState<string>("1");
  const [logoutShiftSheetVisible, setLogoutShiftSheetVisible] = useState(false);
  const [isLogoutLoading, setIsLogoutLoading] = useState(false);
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
  const { ErrorHandle } = useErrorHandle();

  const retrieveAppVersion = async () => {
    try {
      const version = Constants.expoConfig?.version || "Beta";
      setCurrentVersion(version);
    } catch (error) {
      console.error("Error retrieving app version:", error);
    }
  };

  const finishLogout = useCallback(async () => {
    setActiveShift(null);
    setIsGpsTracking(false);
    setUserData(null);
    setPermission([]);
    await clearUserSessionStorage();
    navigation?.replace("OnBoarding");
  }, [
    navigation,
    setActiveShift,
    setIsGpsTracking,
    setPermission,
    setUserData,
  ]);

  const performLogout = useCallback(
    async (closeShiftFirst: boolean) => {
      setIsLogoutLoading(true);
      try {
        if (closeShiftFirst && doesShiftBelongToUser(activeShift, UserData)) {
          const planning_date = activeShift!.planning_date;
          const ended_at = buildDateTime(planning_date, getCurrentTimeString());
          const response = await tripOff({
            UserData,
            region_id: activeShift!.region_id,
            planning_date,
            ended_at,
          });

          if (!response?.status) {
            setToast({
              top: 45,
              text: t(response?.message) || t("Failed to close shift"),
              type: "error",
              visible: true,
            });
            return;
          }

          await clearActiveShift();
        }

        setLogoutShiftSheetVisible(false);
        await finishLogout();
      } catch (error: any) {
        setToast({
          top: 45,
          text: ErrorHandle(error)?.message || t("Failed to log out"),
          type: "error",
          visible: true,
        });
      } finally {
        setIsLogoutLoading(false);
      }
    },
    [UserData, activeShift, finishLogout, setToast, t, ErrorHandle],
  );

  const OnLogOutFun = useCallback(() => {
    if (doesShiftBelongToUser(activeShift, UserData)) {
      setLogoutShiftSheetVisible(true);
      return;
    }

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
        setAlerModalOpen((prev: any) => ({ ...prev, visible: false }));
        await performLogout(false);
      },
    });
  }, [UserData, activeShift, performLogout, t]);

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
        <ProfileImageViewer imageUri={UserData?.user?.profile_image} />
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

      <LogoutShiftSheet
        visible={logoutShiftSheetVisible}
        loading={isLogoutLoading}
        regionName={activeShift?.region_name || ""}
        planningDate={activeShift?.planning_date || ""}
        onCancel={() => {
          if (!isLogoutLoading) {
            setLogoutShiftSheetVisible(false);
          }
        }}
        onConfirm={() => performLogout(true)}
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
