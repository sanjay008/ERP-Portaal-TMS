import { useNavigation, useRoute } from "@react-navigation/native";
import React, { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Colors } from "@/src/utils/colors";

/**
 * Legacy entry — Route now opens the premium map screen directly.
 * Keep this route so old navigations still land on the map popup UI.
 */
export default function DriverRouteMapPickerScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  useEffect(() => {
    navigation.replace("DriverRouteMap", {
      item: route?.params?.item,
      region_id: route?.params?.region_id,
      region_name: route?.params?.region_name,
      region_color: route?.params?.region_color,
      date: route?.params?.date,
    });
  }, [navigation, route?.params]);

  return (
    <View style={styles.wrap}>
      <ActivityIndicator color={Colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background,
  },
});
