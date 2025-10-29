import React, { useContext } from "react";
import { useTranslation } from "react-i18next";
import { Image, StyleSheet, Text, View } from "react-native";
import { Images } from "../assets/images";
import { GlobalContextData } from "../context/GlobalContext";
import { Colors } from "../utils/colors";
export default function CustomHeader() {
  const {
    GOOGLE_API_KEY,
    setGOOGLE_API_KEY,
    CompanyLogo,
    setCompanyLogo,
    Permission,
    setPermission,
    SelectLanguage,
    setSelectLanguage,
    UserData,setUserData
  } = useContext(GlobalContextData);
  const { t } = useTranslation();

  

  return (
    <View style={styles.container}>
      <Image source={Images.logo} style={styles.logo} resizeMode="contain" />
      <View style={styles.SimpleFlex}>
        {
          UserData?.user?.profile_image ?
          <Image 
          source={{uri:UserData?.user?.profile_image}}
          style={styles.DriverImage}
          />
          :
           <Image 
          source={Images.userblanck}
          style={styles.DriverImage}
          />
        }
        <Text style={styles.menuText}>{UserData?.user?.username}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: Colors.white,
    elevation: 0,
    shadowColor: Colors.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 1.5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderColor: Colors.Boxgray,
  },
  logo: {
    width: 175,
    height: 40,
  },
  menuText: {
    
    fontSize: 10,
    color: Colors.black,
    fontFamily: "Medium",
  },
  SimpleFlex: {
    maxHeight: '45%',
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  option: {
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  optionText: {
    fontSize: 15,
    color: Colors.black,
    fontFamily: "Medium",
  },
  DriverImage:{
    width:30,
    height:30,
    borderRadius:120,
  }
});
