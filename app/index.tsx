import BottomTabs from "@/src/bottomTabs/BottomTabs";
import LayoutHeader from "@/src/components/_LayoutHeader";
import GlobalContext from "@/src/context/GlobalContext";
import Chat from "@/src/screens/Chat/Chat";
import DetailsScreens from "@/src/screens/Details/DetailsScreens";
import LoadedScreens from "@/src/screens/Loaded/LoadedScreens";
import MapsScreens from "@/src/screens/Maps/MapsScreens";
import NoInternet from "@/src/screens/NoInternet/NoInternet";
import Parcel from "@/src/screens/Parcel/Parcel";
import Profile from "@/src/screens/Profile/Profile";
import ScannerScreens from "@/src/screens/Scanner/ScannerScreens";
import SelectLanguage from "@/src/screens/selectionLan/Selectionlan";
import SplashScreens from "@/src/screens/SplashScreens/SplashScreens";
import NetInfo from "@react-native-community/netinfo";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React, { useEffect, useState } from "react";
import { MenuProvider } from "react-native-popup-menu";
import OnBoarding from "../src/screens/onbording";
import Otp from "../src/screens/otp";
import Password from "../src/screens/password";
import Register from "../src/screens/register";
import Staff from "../src/screens/staff";

export default function Index() {
  const Stack = createNativeStackNavigator();
  const [isConnected, setIsConnected] = useState<boolean>(true);

  useEffect(() => {
  
    const unsubscribe = NetInfo.addEventListener((state: any) => {
      setIsConnected(state.isConnected);
    });

    return () => unsubscribe();
  }, []);

  const withLayoutHeader = (Component: React.ComponentType<any>) => (props: any) => (
  <LayoutHeader>
    <Component {...props} />
  </LayoutHeader>
);

  return (
    <>
 
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
            <Stack.Screen name="Details" component={withLayoutHeader(DetailsScreens)} />
            <Stack.Screen name="BottomTabs" component={withLayoutHeader(BottomTabs)} />
            <Stack.Screen name="Scanner" component={withLayoutHeader(ScannerScreens)} />
            <Stack.Screen name="Select" component={withLayoutHeader(SelectLanguage)} />
            <Stack.Screen name="Loading" component={withLayoutHeader(LoadedScreens)} />
            <Stack.Screen name="Parcel" component={withLayoutHeader(Parcel)} />
            <Stack.Screen name="Chat" component={withLayoutHeader(Chat)} />
            <Stack.Screen name="Profile" component={withLayoutHeader(Profile)} />
            <Stack.Screen name="MapsScreens" component={withLayoutHeader(MapsScreens)} />
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
      
    </>
  );
}
