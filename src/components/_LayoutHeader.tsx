import React, { ReactNode, useContext } from "react";
import { StatusBar, StyleSheet, View } from "react-native";
import { GlobalContextData } from "../context/GlobalContext";
import { Colors } from "../utils/colors";
import ToastAnimated from "./Toast";
import ToastMessage from "./ToastMessage";

interface LayoutHeaderProps {
  children: ReactNode;
}

export default function LayoutHeader({ children }: LayoutHeaderProps) {
  const { Toast } = useContext(GlobalContextData);

  return (
    <View style={styles.container}>
      <StatusBar barStyle={"dark-content"} backgroundColor={Colors.white} />
      <ToastMessage
        type={Toast.type}
        visible={Toast.visible}
        text={Toast.text}
        top={Toast.top}
      />
      <ToastAnimated />
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
