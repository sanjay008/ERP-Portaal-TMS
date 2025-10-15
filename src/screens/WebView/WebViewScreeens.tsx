import DetailsHeader from "@/src/components/DetailsHeader";
import React from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { styles } from "./styles";
export default function WebViewScreeens({ route, navigation }: any) {
  const { title, url } = route?.params || "";

  return (
    <SafeAreaView style={styles.container}>
      <DetailsHeader title={title} />

      <View style={styles.Background}>
        <WebView
        style={{width: '100%',height:'100%'}}
          source={{ uri: url }}
          startInLoadingState
        />
      </View>
    </SafeAreaView>
  );
}
