import BottomTabs from "@/src/bottomTabs/BottomTabs";
import LayoutHeader from "@/src/components/_LayoutHeader";
import CustomCamera from "@/src/components/CustomCamera";
import GlobalContext from "@/src/context/GlobalContext";
import Chat from "@/src/screens/Chat/Chat";
import DeliveryScreens from "@/src/screens/Delivery/DeliveryScreens";
import DetailsScreens from "@/src/screens/Details/DetailsScreens";
import FilterScreen from "@/src/screens/FilterDataScreen/FilterScreen";
import HomeScreens from "@/src/screens/Home/HomeScreens";
import LanguageScreens from "@/src/screens/Language/LanguageScreens";
import LoadedScreens from "@/src/screens/Loaded/LoadedScreens";
import MapsScreens from "@/src/screens/Maps/MapsScreens";
import NoInternet from "@/src/screens/NoInternet/NoInternet";
import Parcel from "@/src/screens/Parcel/Parcel";
import Profile from "@/src/screens/Profile/Profile";
import ScannerScreens from "@/src/screens/Scanner/ScannerScreens";
import SelectLanguage from "@/src/screens/selectionLan/Selectionlan";
import SplashScreens from "@/src/screens/SplashScreens/SplashScreens";
import i18n from "@/src/screens/Translation/i18n";
import WebViewScreeens from "@/src/screens/WebView/WebViewScreeens";
import { Colors } from "@/src/utils/colors";
import NetInfo from "@react-native-community/netinfo";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React, { useEffect, useState } from "react";
import { I18nextProvider } from "react-i18next";
import changeNavigationBarColor from 'react-native-navigation-bar-color';
import { MenuProvider } from "react-native-popup-menu";
import OnBoarding from "../src/screens/onbording";
import Otp from "../src/screens/otp";
import Password from "../src/screens/password";
import Register from "../src/screens/register";
import Staff from "../src/screens/staff";
export default function index() {
  const Stack = createNativeStackNavigator();
  const [isConnected, setIsConnected] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: any) => {
      setIsConnected(state.isConnected);
    });
    navigationBackground();
    return () => unsubscribe();
  }, []);

  const navigationBackground = async () => {
    try {
      const response = await changeNavigationBarColor(Colors.white);
      console.log(response);
    } catch (e) {
      console.log(e); 
    }
  };

  const withLayoutHeader =
    (Component: React.ComponentType<any>) => (props: any) =>
      (
        <LayoutHeader>
          <Component {...props} />
        </LayoutHeader>
      );

  return (
    <>
      <I18nextProvider i18n={i18n}>
        <MenuProvider>
          <GlobalContext>
            {isConnected ? (
              <Stack.Navigator
                initialRouteName={"SplashScreens"}
                screenOptions={{
                  headerShown: false,
                  animation: "simple_push",
                }}
              >
                <Stack.Screen name="SplashScreens" component={SplashScreens} />
                <Stack.Screen name="OnBoarding" component={OnBoarding} />
                <Stack.Screen name="Otp" component={Otp} />
                <Stack.Screen name="Password" component={Password} />
                <Stack.Screen name="Register" component={Register} />
                <Stack.Screen name="Staff" component={Staff} />
                <Stack.Screen
                  name="Details"
                  component={withLayoutHeader(DetailsScreens)}
                  options={{ statusBarAnimation: "slide" }}
                />
                <Stack.Screen
                  name="BottomTabs"
                  component={withLayoutHeader(BottomTabs)}
                />
                <Stack.Screen
                  name="Scanner"
                  component={withLayoutHeader(ScannerScreens)}
                />
                <Stack.Screen
                  name="Select"
                  component={withLayoutHeader(SelectLanguage)}
                />
                <Stack.Screen
                  name="Loading"
                  component={withLayoutHeader(LoadedScreens)}
                />
                <Stack.Screen
                  name="Parcel"
                  component={withLayoutHeader(Parcel)}
                />
                <Stack.Screen name="Chat" component={withLayoutHeader(Chat)} />
                <Stack.Screen
                  name="Profile"
                  component={withLayoutHeader(Profile)}
                />
                <Stack.Screen
                  name="MapsScreens"
                  component={withLayoutHeader(MapsScreens)}
                />
                <Stack.Screen
                  name="Language"
                  component={withLayoutHeader(LanguageScreens)}
                />
                <Stack.Screen
                  name="Delivery"
                  component={withLayoutHeader(DeliveryScreens)}
                />
                <Stack.Screen
                  name="WebViewScreeens"
                  component={withLayoutHeader(WebViewScreeens)}
                />
                <Stack.Screen
                  name="Home"
                  component={withLayoutHeader(HomeScreens)}
                />
                <Stack.Screen
                  name="MapScreens"
                  options={{
                    animation: "slide_from_right",
                  }}
                  component={withLayoutHeader(MapsScreens)}
                />
                <Stack.Screen
                  name="FilterScreen"
                  component={withLayoutHeader(FilterScreen)}
                />
                <Stack.Screen
                  name="Camera"
                  component={withLayoutHeader(CustomCamera)}
                />
              </Stack.Navigator>
            ) : (
              <Stack.Navigator
                initialRouteName={"NoInternet"}
                screenOptions={{
                  headerShown: false,
                  animation: "simple_push",
                }}
              >
                <Stack.Screen name="NoInternet" component={NoInternet} />
              </Stack.Navigator>
            )}
          </GlobalContext>
        </MenuProvider>
      </I18nextProvider>
    </>
  );
}
