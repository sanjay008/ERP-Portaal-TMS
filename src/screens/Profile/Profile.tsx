import { Images } from "@/src/assets/images";
import ConformationModal from "@/src/components/ConformationModal";
import LoadingModal from "@/src/components/LoadingModal";
import ProfileImageViewer from "@/src/components/ProfileImageViewer";
import ProfileItem from "@/src/components/ProfileItem";
import { GlobalContextData } from "@/src/context/GlobalContext";
import { resetChauffeurLocationSession } from "@/src/hooks/useChauffeurLocation";
import { Colors } from "@/src/utils/colors";
import { clearUserSessionStorage } from "@/src/utils/logoutSession";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import React, { useCallback, useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  SharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { styles } from "./styles";

type ArrayProps = {
  id?: number;
  Background: string;
  Icon: any;
  Title: string;
  onPress: () => void;
};

const ITEM_HEIGHT = 64;
const HEADER_HEIGHT = 90;

type AnimatedProfileRowProps = {
  item: ArrayProps;
  index: number;
  scrollY: SharedValue<number>;
};

function AnimatedProfileRow({ item, index, scrollY }: AnimatedProfileRowProps) {
  const animatedStyle = useAnimatedStyle(() => {
    const itemOffset = HEADER_HEIGHT + index * ITEM_HEIGHT;
    const opacity = interpolate(
      scrollY.value,
      [itemOffset - ITEM_HEIGHT, itemOffset],
      [1, 0],
      Extrapolation.CLAMP
    );
    const scale = interpolate(
      scrollY.value,
      [itemOffset - ITEM_HEIGHT, itemOffset],
      [1, 0.8],
      Extrapolation.CLAMP
    );

    return {
      opacity,
      transform: [{ scale }],
    };
  });

  return (
    <Animated.View style={animatedStyle}>
      <ProfileItem
        id={item?.id}
        item={item}
        Icon={item?.Icon}
        Title={item?.Title}
        IconBoxBackground={item?.Background}
        onPress={item?.onPress}
      />
    </Animated.View>
  );
}

type AnimatedProfileHeaderProps = {
  imageUri: any;
  username: string;
  companyName: string;
  scrollY: SharedValue<number>;
};

function AnimatedProfileHeader({
  imageUri,
  username,
  companyName,
  scrollY,
}: AnimatedProfileHeaderProps) {
  const animatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [0, HEADER_HEIGHT],
      [1, 0],
      Extrapolation.CLAMP
    );
    const scale = interpolate(
      scrollY.value,
      [0, HEADER_HEIGHT],
      [1, 0.8],
      Extrapolation.CLAMP
    );

    return {
      opacity,
      transform: [{ scale }],
    };
  });

  return (
    <Animated.View style={[styles.SimpleFlex, animatedStyle]}>
      <ProfileImageViewer imageUri={imageUri} />
      <View style={{ gap: 5 }}>
        <Text style={styles.Text}>{username}</Text>
        <Text style={styles.darkText}>{companyName}</Text>
      </View>
    </Animated.View>
  );
}

export default function Profile({ navigation }: any) {
  const {
    UserData,
    setUserData,
    CompanysData,
    setPermission,
    activeShift,
    setActiveShift,
    setIsGpsTracking,
  } = useContext(GlobalContextData);
  const [CurrentVersion, setCurrentVersion] = useState<string>("1");
  const [logoutLoading, setLogoutLoading] = useState(false);
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

  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const retrieveAppVersion = async () => {
    try {
      const version = Constants.expoConfig?.version || "Beta";
      const versionCode = Constants.expoConfig?.android?.versionCode ?? 0;
      setCurrentVersion(`${t("Version")} ${version} ${t("Build")} ${versionCode}`);
    } catch (error) {
      console.error("Error retrieving app version:", error);
    }
  };

  const finishLogout = useCallback(async () => {
    setLogoutLoading(true);
    try {
      const { closeActiveShiftSilent } = await import(
        '@/src/utils/shiftLocationGuard'
      );
      await closeActiveShiftSilent(UserData, activeShift);
      resetChauffeurLocationSession();
      setActiveShift(null);
      setIsGpsTracking(false);
      setUserData(null);
      setPermission([]);
      await clearUserSessionStorage();
      navigation?.replace("OnBoarding");
    } finally {
      setLogoutLoading(false);
    }
  }, [
    UserData,
    activeShift,
    navigation,
    setActiveShift,
    setIsGpsTracking,
    setPermission,
    setUserData,
  ]);

  const OnLogOutFun = useCallback(() => {
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
        await finishLogout();
      },
    });
  }, [finishLogout, t]);

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
      id: 1,
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
      id: 2,
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
      id: 3,
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
      id: 4,
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
      id: 5,
      Background: Colors.primary,
      Icon: Images.Client,
      Title: t("Driver Company"),
      onPress: () => navigation.navigate("DriverCompany"),
    },
    {
      id:8,
      Background: Colors.primary,
      Icon: Images.documentlogo,
      Title: t("Upload Documents"),
      onPress: () => navigation.navigate("UploadDocuments"),
    },
    {
      id:9,
      Background: Colors.primary,
      Icon: Images.user,
      Title: t("Driver Profile"),
      onPress: () => navigation.navigate("DriverProfile"),
    },
    {
      id: 6,
      Background: Colors.primary,
      Icon: Images.LangaugeIcon,
      Title: t("Language"),
      onPress: () => navigation.navigate("Language"),
    },
    {
      id: 7,
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
      <Animated.FlatList
        style={styles.FlatContainerStyle}
        contentContainerStyle={styles.ContentContainerStyle}
        data={ProfileItems}
        bounces={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        ListHeaderComponent={() => (
          <AnimatedProfileHeader
            imageUri={UserData?.user?.profile_image}
            username={
              UserData?.user?.username?.length > 0
                ? UserData.user.username
                : UserData?.relaties?.display_name || ""
            }
            companyName={CompanysData}
            scrollY={scrollY}
          />
        )}
        ListFooterComponent={() => (
          <View style={{ paddingVertical: 20, minHeight: 40, paddingBottom: 35 }}>
            <Text
              style={[styles.Text, { textAlign: "center" }]}
            >{`V${CurrentVersion}`}</Text>
          </View>
        )}
        renderItem={({ item, index }) => (
          <AnimatedProfileRow item={item} index={index} scrollY={scrollY} />
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

      <LoadingModal visible={logoutLoading} />
    </View>
  );
}