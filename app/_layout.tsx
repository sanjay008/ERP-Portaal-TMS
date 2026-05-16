// import LayoutHeader from "@/src/components/_LayoutHeader";
// import GlobalContext from "@/src/context/GlobalContext";
// import i18n from "@/src/screens/Translation/i18n";
// import { Stack } from "expo-router";
// import * as SplashScreen from "expo-splash-screen";
// import { StatusBar } from "expo-status-bar";
// import * as Updates from "expo-updates";
// import { useEffect } from "react";
// import { I18nextProvider } from "react-i18next";
// import 'react-native-get-random-values';
// import { MenuProvider } from "react-native-popup-menu";
// SplashScreen.preventAutoHideAsync();

// export default function RootLayout() {
//   useEffect(() => {
//     const prepare = async () => {
//       try {
//         const update = await Updates.checkForUpdateAsync();
//         if (update.isAvailable) {
//           await Updates.fetchUpdateAsync();
//           await Updates.reloadAsync();
//         }
//       } catch (e) {
//         console.log("Update check failed:", e);
//       } finally {
//         await SplashScreen.hideAsync();
//       }
//     };

//     prepare();
//   }, []);

//   return (
//     <I18nextProvider i18n={i18n}>
//       <MenuProvider>
//         <GlobalContext>
//           <LayoutHeader>
//             <StatusBar style="dark" />
//             <Stack
//               screenOptions={{
//                 headerShown: false,
//               }}
//             />
//           </LayoutHeader>
//         </GlobalContext>
//       </MenuProvider>
//     </I18nextProvider>
//   );
// }



import LayoutHeader from "@/src/components/_LayoutHeader";
import GlobalContext from "@/src/context/GlobalContext";
import i18n from "@/src/screens/Translation/i18n";
import * as Notifications from 'expo-notifications';
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import * as Updates from "expo-updates";
import React, { useEffect } from "react";
import { I18nextProvider } from "react-i18next";
import { MenuProvider } from "react-native-popup-menu";
SplashScreen.preventAutoHideAsync();
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});
export default function RootLayout() {
  useEffect(() => {
    const prepare = async () => {
      try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          await Updates.fetchUpdateAsync();
          await Updates.reloadAsync();
        }
      } catch (e) {
        console.log("Update check failed:", e);
      } finally {
        await SplashScreen.hideAsync();
      }
    };

    prepare();
  }, []);

  return (
    <I18nextProvider i18n={i18n}>
      <MenuProvider>
        <GlobalContext>
          <LayoutHeader>
            <StatusBar style="dark" />
            <Stack
              screenOptions={{
                headerShown: false,
              }}
            />
          </LayoutHeader>
        </GlobalContext>
      </MenuProvider>
    </I18nextProvider>
  );
}
