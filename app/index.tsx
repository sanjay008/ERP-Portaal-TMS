import BottomTabs from "@/src/bottomTabs/BottomTabs";
import GlobalContext from "@/src/context/GlobalContext";
import NoInternet from "@/src/screens/NoInternet/NoInternet";
import SplashScreens from "@/src/screens/SplashScreens/SplashScreens";
import NetInfo from "@react-native-community/netinfo";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React, { useEffect, useState } from "react";

import DetailsScreens from "@/src/screens/Details/DetailsScreens";
import OnBoarding from "../src/screens/onbording";
import Otp from "../src/screens/otp";
import Password from "../src/screens/password";
import Register from "../src/screens/register";
import Staff from "../src/screens/staff";
import ScannerScreens from "@/src/screens/Scanner/ScannerScreens";

export default function Index() {
  const Stack = createNativeStackNavigator();
  const [isConnected, setIsConnected] = useState<boolean>(true);

  useEffect(() => {
  
    const unsubscribe = NetInfo.addEventListener((state: any) => {
      setIsConnected(state.isConnected);
    });

    return () => unsubscribe();
  }, []);
  return (
    <>
    
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
            <Stack.Screen name="Details" component={DetailsScreens} />
            <Stack.Screen name="BottomTabs" component={BottomTabs} />
            <Stack.Screen name="Scanner" component={ScannerScreens} />
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
    </>
  );
}
