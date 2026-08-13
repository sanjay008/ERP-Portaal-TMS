import React, { ReactNode, useContext } from "react";
import { useTranslation } from "react-i18next";
import { StatusBar, StyleSheet, View } from "react-native";
import { GlobalContextData } from "../context/GlobalContext";
import { Colors } from "../utils/colors";
import ToastMessage from "./ToastMessage";

interface LayoutHeaderProps {
  children: ReactNode;
}


export default function LayoutHeader({ children }: LayoutHeaderProps) {
  const { Toast, setToast, UserData } = useContext(GlobalContextData);
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <StatusBar barStyle={"dark-content"} backgroundColor={Colors.white} />
      <ToastMessage
        type={Toast.type}
        visible={Toast.visible}
        text={Toast.text}
        top={Toast.top}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
});
