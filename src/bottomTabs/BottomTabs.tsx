import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import React, { useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Image, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import apiConstants from "../api/apiConstants";
import { Images } from "../assets/images";
import CustomHeader from "../components/CustomHeader";
import Loader from "../components/loading";
import { GlobalContextData } from "../context/GlobalContext";
import LoadedScreens from "../screens/Loaded/LoadedScreens";
import Parcel from "../screens/Parcel/Parcel";
import Profile from "../screens/Profile/Profile";
import ApiService from "../utils/Apiservice";
import { Colors } from "../utils/colors";
import { getData, height, token } from "../utils/storeData";

export default function BottomTabs() {
  const Tab = createBottomTabNavigator();
  const { t } = useTranslation();
  const [IsLoading, setLoading] = useState<boolean>(false);
  const { Permission, setPermission, UserData, setUserData, setCompanysData } =
    useContext(GlobalContextData);
  useEffect(() => {
    const getUserData = async () => {
      let compay = await getData("COMPANYLOGIN");
      setCompanysData(compay);
      try {
        let data = await getData("USERDATA");
        setUserData(data?.data);
        getPermision(data?.data);
      } catch (error) {
        console.log("get User Data Error:-", error);
      }
    };
    const getPermision = async (user: any) => {
      setLoading(true);
      try {
        let permissionData = await ApiService(apiConstants.permission, {
          customData: {
            token: token,
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
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.white }}>
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
        <Tab.Navigator
          initialRouteName={
            Permission?.tms_driver_loaded_and_parcel_menu?.read == "1"
              ? "Loaded"
              : "Profile"
          }
          screenOptions={{
            tabBarStyle: {
              height: height * 0.09,
              paddingTop: height * 0.01,
            },

            header: () => <CustomHeader />,
            tabBarActiveTintColor: Colors.primary,
            tabBarInactiveTintColor: Colors.inActive,
            tabBarLabelStyle: {
              fontSize: 12,
              fontFamily: "Medium",
              marginTop: 5,
              bottom: 0,
              backgroundColor: Colors.white,
            },
          }}
        >
          {Permission?.tms_driver_loaded_and_parcel_menu?.read == "1" && (
            <Tab.Screen
              name="Loaded"
              component={LoadedScreens}
              options={{
                title: t("Loaded"),
                tabBarLabel: t("Loaded"),
                tabBarIcon: ({ color }) => (
                  <Image
                    source={Images.Loading}
                    style={{ width: 25, height: 25 }}
                    tintColor={color}
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
                tabBarIcon: ({ color }) => (
                  <Image
                    source={Images.Parcel}
                    style={{ width: 25, height: 25 }}
                    tintColor={color}
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
              tabBarIcon: ({ color }) => (
                <Image
                  source={Images.user}
                  style={{ width: 25, height: 25 }}
                  tintColor={color}
                />
              ),
            }}
          />
        </Tab.Navigator>
      )}
    </SafeAreaView>
  );
}
