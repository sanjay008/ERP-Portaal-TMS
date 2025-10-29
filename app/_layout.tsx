import { StatusBar } from "expo-status-bar";
import { Stack } from "expo-router";
import GlobalContext from "@/src/context/GlobalContext";
import { I18nextProvider } from "react-i18next";
import i18n from "@/src/screens/Translation/i18n";
import { MenuProvider } from "react-native-popup-menu";
import LayoutHeader from "@/src/components/_LayoutHeader";

export default function RootLayout() {
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
