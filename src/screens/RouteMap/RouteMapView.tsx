import React, { useMemo, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";
import type { DriverRouteMapData } from "@/src/screens/RouteMap/types";
import { buildRouteMapHtml } from "@/src/screens/RouteMap/routeMapHtml";

type Props = {
  apiKey: string;
  mapData: DriverRouteMapData;
  onStopPress: (stopKey: string) => void;
};

export default function RouteMapView({
  apiKey,
  mapData,
  onStopPress,
}: Props) {
  const webRef = useRef<WebView>(null);

  // Do not tie selection into HTML — remounting the WebView resets zoom/pan.
  const html = useMemo(
    () =>
      buildRouteMapHtml({
        apiKey,
        mapData,
        regionColor: mapData.region_color,
      }),
    [apiKey, mapData],
  );

  return (
    <View style={styles.wrap}>
      <WebView
        ref={webRef}
        originWhitelist={["*"]}
        source={{ html }}
        style={styles.web}
        javaScriptEnabled
        domStorageEnabled
        mixedContentMode="always"
        setSupportMultipleWindows={false}
        onMessage={(event) => {
          try {
            const msg = JSON.parse(event.nativeEvent.data);
            if (msg?.type === "marker_press" && msg?.data?.stop_key) {
              onStopPress(String(msg.data.stop_key));
            }
          } catch {
            // ignore malformed messages
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    overflow: "hidden",
  },
  web: {
    flex: 1,
    backgroundColor: "#e8eef5",
  },
});
