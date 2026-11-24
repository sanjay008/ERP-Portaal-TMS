import type { DriverRouteMapData } from "@/src/screens/RouteMap/types";
import {
  buildRouteMapHtml,
  buildRouteMapPayload,
} from "@/src/screens/RouteMap/routeMapHtml";
import React, { useEffect, useMemo, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";

type Props = {
  apiKey: string;
  mapData?: DriverRouteMapData | null;
  onStopPress: (stopKey: string) => void;
  onMapsIssue?: (reason: string, extra?: Record<string, unknown>) => void;
  onMapReady?: () => void;
};

export default function RouteMapView({
  apiKey,
  mapData,
  onStopPress,
  onMapsIssue,
  onMapReady,
}: Props) {
  const webRef = useRef<WebView>(null);
  const issueRef = useRef(onMapsIssue);
  const onStopPressRef = useRef(onStopPress);
  const onMapReadyRef = useRef(onMapReady);
  const mapReadyRef = useRef(false);
  const latestPayloadRef = useRef(buildRouteMapPayload(mapData));

  issueRef.current = onMapsIssue;
  onStopPressRef.current = onStopPress;
  onMapReadyRef.current = onMapReady;
  latestPayloadRef.current = buildRouteMapPayload(
    mapData,
    mapData?.region_color,
  );

  // HTML shell depends only on apiKey — map stays loaded while route data updates.
  const html = useMemo(() => buildRouteMapHtml(apiKey), [apiKey]);

  const pushRouteToMap = () => {
    if (!mapReadyRef.current || !webRef.current) return;
    const payload = latestPayloadRef.current;
    const js = `
      (function(){
        try {
          if (typeof window.__updateRouteMap === 'function') {
            window.__updateRouteMap(${JSON.stringify(payload)});
          }
        } catch (e) {}
        true;
      })();
    `;
    webRef.current.injectJavaScript(js);
  };

  useEffect(() => {
    pushRouteToMap();
  }, [mapData]);

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
        cacheEnabled
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
              onStopPressRef.current(String(msg.data.stop_key));
              return;
            }
            if (msg?.type === "map_ready") {
              console.log("[GoogleMapsKey] map_ready");
              mapReadyRef.current = true;
              onMapReadyRef.current?.();
              // Push latest route (may have arrived while map was booting).
              pushRouteToMap();
              return;
            }
            if (msg?.type === "route_rendered") {
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
    backgroundColor: "#eef2f6",
  },
});
