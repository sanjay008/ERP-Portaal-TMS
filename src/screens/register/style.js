import { Platform, StyleSheet } from "react-native";
import { RFValue } from "react-native-responsive-fontsize";
import { heightPercentageToDP } from "react-native-responsive-screen";
import { Colors } from "../../utils/colors";


export const styles = StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: Colors.white,
    },
    wellcome: {
      fontSize: RFValue(17),
      fontFamily: 'SemiBold',
      color: Colors.black,
      marginTop: 40,
      alignSelf: "center",
    },
    dis: {
      fontSize: RFValue(14),
      fontFamily: 'regular',
      color: Colors.textgray,
      marginTop: 8,
      marginBottom: 15,
      alignSelf: "center",

    },
    logo: {
      alignSelf: "center",
      marginTop: RFValue(40),
    },
    container: {
      paddingHorizontal: 24,
    },
    subContainer: {
      flex: 1,
    },
    country: {
      height: Platform.OS == 'android'?heightPercentageToDP(9) : heightPercentageToDP(7),
      width:'100%',
      alignItems: "center",
      flexDirection: "row",
      marginTop: 24,
      backgroundColor: Colors.white,
      borderRadius: 10,
      borderColor: Colors.litegray,
      borderWidth: 1.3,
      alignSelf:'center'
    },
    pickerTitleStyle: {
      justifyContent: "center",
      flexDirection: "row",
      alignSelf: "center",
      fontWeight: "bold",
      color: Colors.black,
      fontFamily: 'regular',
    },
    pickerStyle: {
      // marginLeft: 20,
      height: heightPercentageToDP(6),
      borderColor: Colors.white,
      alignItems: "center",
      backgroundColor: Colors.white,
      borderRadius: 10,
      fontSize: 16,
      color: Colors.black,
      fontFamily: 'regular',
    },
    selectedCountryTextStyle: {
      paddingLeft: 5,
      textAlign: "right",
      color: Colors.black,
      fontFamily: 'regular',
      fontSize: RFValue(12),
    },
  
    countryNameTextStyle: {
      paddingLeft: 10,
      textAlign: "right",
      color: Colors.black,
      fontFamily: 'regular',
    },
  
    searchBarStyle: {
      fontFamily: 'regular',
      color: Colors.black,
    },
    title: {
      fontSize: RFValue(14),
      fontFamily: 'regular',
      color: Colors.black,
      marginTop: RFValue(5),
      alignSelf: "center",
    },
    error: {
      color: Colors.red,
      fontSize: 14,
      fontFamily: 'regular',
      marginTop: 15,
      marginLeft:RFValue(100)
    },
    input: {
      color: Colors.black,
      fontFamily: 'regular',
      width: "69%",
      height: heightPercentageToDP(7),
      fontSize:14
    },
    loginwithemail: {
      color: Colors.primary,
      fontFamily: 'SemiBold',
      marginTop: RFValue(10),
      alignSelf: "center",
      fontSize: RFValue(11),
    },
    loginwithphone: {
      color: Colors.primary,
      fontFamily: 'SemiBold',
      marginTop: RFValue(10),
      alignSelf: "center",
      fontSize: RFValue(11),
    },
  });
  