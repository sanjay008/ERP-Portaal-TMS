import { Images } from "@/src/assets/images";
import ItemBox from "@/src/components/ItemBox";
import * as Updates from "expo-updates";
import React, { useEffect } from "react";
import { Alert, View } from "react-native";
import { styles } from "./style";

export default function LoadedScreens() {
  const checkForUpdates = async () => {
    try {
      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        Alert.alert("Update available", "Install new update?", [
          { text: "Cancel", style: "cancel" },
          {
            text: "Install",
            onPress: async () => {
              await Updates.fetchUpdateAsync();
              await Updates.reloadAsync();
            },
          },
        ]);
      } else {
        Alert.alert("Up to date", "App is already up to date!");
      }
    } catch (e) {
      console.log("Error checking updates:", e);
    }
  };

  useEffect(() => {
    checkForUpdates();
  }, []);
  return (
    <View style={styles.container}>
      <View style={styles.ItemGap}>
      <ItemBox icon={Images.Parcel} title="Load Parcel" color={"#7EBF35"} />
      <ItemBox icon={Images.DeliveryIcon} title="Delivery" color={"#ECB210"} />
      </View>
    </View>
  );
}
