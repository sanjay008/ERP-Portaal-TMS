import { Images } from "@/src/assets/images";
import ItemBox from "@/src/components/ItemBox";
import { GlobalContextData } from "@/src/context/GlobalContext";
import { getData } from "@/src/utils/storeData";
import Constants from "expo-constants";
import * as Updates from "expo-updates";
import React, { useContext, useEffect } from "react";
import { StatusBar, View } from "react-native";
import { styles } from "./style";
export default function LoadedScreens() {
  const {  UserData,setUserData} = useContext(GlobalContextData)
async function checkForUpdate () {
  if (!Constants.appOwnership || Constants.appOwnership === "expo") {
    console.log("Skipping OTA update check in development");
    return;
  }

  try {
    const update = await Updates.checkForUpdateAsync();
    if (update.isAvailable) {
      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
    }
  } catch (e) {
    console.log("Error checking updates:", e);
  }
}
const getUserData = async () =>{
  try {
      let data = await getData("USERDATA");
      setUserData(data?.data)
      
  } catch (error) {
        console.log("get User Data Error:-",error);
  }
  
}
  useEffect(() => {
    checkForUpdate();
    getUserData()
  }, []);
  return (
    <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={"#7EBF35"} />

      <View style={styles.ItemGap}>
      <ItemBox icon={Images.Parcel} title="Load Parcel" color={"#7EBF35"} />
      <ItemBox icon={Images.DeliveryIcon} title="Delivery" color={"#ECB210"} />
      </View>
    </View>
  );
}
