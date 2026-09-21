import LayoutHeader from "@/src/components/_LayoutHeader";
import { StoreInAppUpdateGate } from "@/src/components/StoreUpdatePopup";
import GlobalContext from "@/src/context/GlobalContext";
import { ParcelVerifySessionProvider } from "@/src/context/ParcelVerifySessionContext";
import DropboxProvider from "@/src/context/UploadProider";
import i18n from "@/src/screens/Translation/i18n";
import { hydrateApiBaseUrl } from "@/src/utils/apiBaseUrl";
import * as Notifications from 'expo-notifications';
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import * as Updates from "expo-updates";
import React, { useEffect, useState } from "react";
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
  const [bootReady, setBootReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const prepare = async () => {
      await hydrateApiBaseUrl();
      if (!cancelled) {
        setBootReady(true);
      }
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
    return () => {
      cancelled = true;
    };
  }, []);

  if (!bootReady) {
    return null;
  }

  return (
    <I18nextProvider i18n={i18n}>
      <DropboxProvider>
        <MenuProvider>
          <GlobalContext>
            <ParcelVerifySessionProvider>
              <LayoutHeader>
                <StatusBar style="dark" />
                <Stack
                  screenOptions={{
                    headerShown: false,
                  }}
                />
                <StoreInAppUpdateGate />
              </LayoutHeader>
            </ParcelVerifySessionProvider>
          </GlobalContext>
        </MenuProvider>
      </DropboxProvider>
    </I18nextProvider>
  );
}
