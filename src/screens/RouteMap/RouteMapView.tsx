import type { DriverRouteMapData } from "@/src/screens/RouteMap/types";
import { buildRouteMapHtml } from "@/src/screens/RouteMap/routeMapHtml";
import React, { useMemo, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";

type Props = {
  apiKey: string;
  mapData: DriverRouteMapData;
  onStopPress: (stopKey: string) => void;
  onMapsIssue?: (reason: string, extra?: Record<string, unknown>) => void;
};

export default function RouteMapView({
  apiKey,
  mapData,
  onStopPress,
  onMapsIssue,
}: Props) {
  const webRef = useRef<WebView>(null);
  const issueRef = useRef(onMapsIssue);
  issueRef.current = onMapsIssue;

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
        onLoadEnd={() => {
          console.log("[GoogleMapsKey] RouteMapView WebView load end", {
            stops: mapData?.stops?.length ?? 0,
          });
        }}
        onError={(event) => {
          const desc = event?.nativeEvent?.description;
          console.log("[GoogleMapsKey] RouteMapView WebView onError", desc);
          issueRef.current?.("webview_onError", { description: desc });
        }}
        onHttpError={(event) => {
          const status = event?.nativeEvent?.statusCode;
          console.log("[GoogleMapsKey] RouteMapView WebView httpError", status);
          issueRef.current?.("webview_httpError", { statusCode: status });
        }}
        onMessage={(event) => {
          try {
            const msg = JSON.parse(event.nativeEvent.data);
            if (msg?.type === "marker_press" && msg?.data?.stop_key) {
              onStopPress(String(msg.data.stop_key));
              return;
            }
            if (msg?.type === "map_ready") {
              console.log("[GoogleMapsKey] map_ready", msg?.data);
              return;
            }
            if (msg?.type === "map_error") {
              console.log("[GoogleMapsKey] map_error from JS", msg?.data);
              issueRef.current?.("map_js_error", msg?.data || {});
              return;
            }
            if (msg?.type === "maps_auth_failure") {
              console.log("[GoogleMapsKey] maps_auth_failure", msg?.data);
              issueRef.current?.("maps_auth_failure", msg?.data || {});
            }
          } catch (error) {
            console.log("[GoogleMapsKey] bad WebView message", error);
            issueRef.current?.("webview_bad_message", {
              raw: event?.nativeEvent?.data,
            });
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
