import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import React, { useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import apiConstants from "../api/apiConstants";
import CustomHeader from "../components/CustomHeader";
import Loader from "../components/loading";
import { GlobalContextData } from "../context/GlobalContext";
import HomeScreens from "../screens/Home/HomeScreens";
import LoadedScreens from "../screens/Loaded/LoadedScreens";
import Parcel from "../screens/Parcel/Parcel";
import Profile from "../screens/Profile/Profile";
import ApiService from "../utils/Apiservice";
import { Colors } from "../utils/colors";
import { getStoredUserLanguage } from "../utils/languagePreference";
import { FONTS, getData, height } from "../utils/storeData";

const Tab = createBottomTabNavigator();

function TabIcon({
  focused,
  color,
  active,
  inactive,
}: {
  focused: boolean;
  color: string;
  active: keyof typeof Ionicons.glyphMap;
  inactive: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <Ionicons
      name={focused ? active : inactive}
      size={24}
      color={color}
    />
  );
}

export default function BottomTabs({ navigation }: any) {
  const { t } = useTranslation();
  const {top,bottom} = useSafeAreaInsets();
  const [IsLoading, setLoading] = useState<boolean>(false);
  const {
    Permission,
    setPermission,
    UserData,
    setUserData,
    setCompanysData,
    SelectLanguage,
    setSelectLanguage,
  } = useContext(GlobalContextData);
  useEffect(() => {


    const getUserData = async () => {
      let compay = await getData("COMPANYLOGIN");
      if (!SelectLanguage) {
        const languagesData = await getStoredUserLanguage();
        if (languagesData) setSelectLanguage(languagesData);
      }
      setCompanysData(compay);
      try {
        let data = await getData("USERDATA");

        setUserData(data?.data);
        if (Permission?.length == 0) {
          getPermision(data?.data);
        }
      } catch (error) {
        console.log("get User Data Error:-", error);
      }
    };
    const getPermision = async (user: any) => {
      setLoading(true);
      try {
        let permissionData = await ApiService(apiConstants.permission, {
          customData: {
            token: user?.user?.verify_token,
            role: user?.user.role,
            relaties_id: user?.relaties?.id,
            user_id: user?.user?.id,
          },
        });

        if (permissionData?.status) {
          setPermission(permissionData?.data);
        }
      } catch (apiError) {
        console.log("API fetch error:", apiError);
        return;
      } finally {
        setLoading(false);
      }
    };

    getUserData();
  }, []);
  return (
    <View style={{ flex: 1, backgroundColor: Colors.white, paddingBottom: bottom * 0.55, paddingTop: top }}>
      {IsLoading ? (
        <View
          style={{
            flexGrow: 1,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Loader />
        </View>
      ) : (
        <>
        <Tab.Navigator
          id="BottomTabs"
          initialRouteName={"Home"}
          screenOptions={{
            tabBarStyle: {
              minHeight: 75,  
              paddingTop: height * 0.01,
              backgroundColor: Colors.white,
              elevation: 0,
              shadowOpacity: 0,
              borderTopWidth: 0,
            },

            header: () => <CustomHeader />,
            tabBarActiveTintColor: Colors.primary,
            tabBarInactiveTintColor: Colors.inActive,
            tabBarLabelStyle: {
              fontSize: 12,
              fontFamily: FONTS.Medium,
              marginTop: 5,
              bottom: 0,
              backgroundColor: Colors.white,
            },
          }}
        >
          <Tab.Screen
            name="Home"
            component={HomeScreens}
            options={{
              title: t("Home"),
              tabBarLabel: t("Home"),
              tabBarIcon: ({ color, focused }) => (
                <TabIcon
                  focused={focused}
                  color={color}
                  active="home"
                  inactive="home-outline"
                />
              ),
            }}
            listeners={({ navigation }) => ({
              tabPress: (e) => {
                const state = navigation.getState();
                const focusedRouteName = state.routes[state.index].name;
                if (focusedRouteName === "Home") {
                  navigation.navigate("Home", { refresh: Date.now() });
                }
              },
            })}
          />
          {Permission?.tms_driver_loaded_and_parcel_menu?.read == "1" && (
            <Tab.Screen
              name="Loaded"
              component={LoadedScreens}
              options={{
                title: t("Loaded"),
                tabBarLabel: t("Loaded"),
                tabBarIcon: ({ color, focused }) => (
                  <TabIcon
                    focused={focused}
                    color={color}
                    active="file-tray-full"
                    inactive="file-tray-outline"
                  />
                ),
              }}
              listeners={({ navigation }) => ({
                tabPress: (e) => {
                  const state = navigation.getState();
                  const focusedRouteName = state.routes[state.index].name;
                  if (focusedRouteName === "Loaded") {
                    navigation.navigate("Loaded", { refresh: Date.now() });
                  }
                },
              })}
            />
          )}
          {Permission?.tms_driver_loaded_and_parcel_menu?.read == "1" && (
            <Tab.Screen
              name="Parcel"
              component={Parcel}
              options={{
                title: t("Parcel"),
                tabBarLabel: t("Parcel"),
                tabBarIcon: ({ color, focused }) => (
                  <TabIcon
                    focused={focused}
                    color={color}
                    active="cube"
                    inactive="cube-outline"
                  />
                ),
              }}
              listeners={({ navigation }) => ({
                tabPress: (e) => {
                  const state = navigation.getState();
                  const focusedRouteName = state.routes[state.index].name;
                  if (focusedRouteName === "Parcel") {
                    navigation.navigate("Parcel", { refresh: Date.now() });
                  }
                },
              })}
            />
          )}

          <Tab.Screen
            name="Profile"
            component={Profile}
            options={{
              title: t("Profile"),
              tabBarLabel: t("Profile"),
              tabBarIcon: ({ color, focused }) => (
                <TabIcon
                  focused={focused}
                  color={color}
                  active="person"
                  inactive="person-outline"
                />
              ),
            }}
          />
        </Tab.Navigator>
        </>
      )}
    </View>
  );
}
