import { StyleSheet } from "react-native";
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
      height: RFValue(45),
      width:'100%',
      alignItems: "center",
      flexDirection: "row",
      marginTop: 24,
      backgroundColor: Colors.white,
      borderRadius: 10,
      borderColor: Colors.litegray,
      borderWidth: 1.3,
      overflow:'hidden'
      // alignSelf:'center'
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
      // width:'50%',
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
  country: {
    height: RFValue(48),
    width: "100%",
    alignItems: "center",
    flexDirection: "row",
    marginTop: 24,
    backgroundColor: Colors.white,
    borderRadius: 10,
    borderColor: Colors.litegray,
    borderWidth: 1.3,
    paddingHorizontal: 10,
  },

  pickerStyle: {
    // flexShrink: 0, // prevent shrinking
    justifyContent: "center",
    borderWidth:0,
    height:heightPercentageToDP(6),
    width:'80%',
  },

  pickerTitleStyle: {
    textAlign: "center",
    fontWeight: "bold",
    color: Colors.black,
    fontFamily: "regular",
  },

  selectedCountryTextStyle: {
    fontFamily: "regular",
    fontSize: 14,
    color: Colors.black,
  },

  countryNameTextStyle: {
    fontSize: 14,
    color: Colors.black,
  },

  input: {
    width:'90%',// flex: 1,
    color: Colors.black,
    fontFamily: "regular",
    backgroundColor: "transparent",
    fontSize: 14,
    paddingLeft: 8,
    height: "100%", 
  },
  searchBarStyle: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.litegray,
  },

  error: {
    color: Colors.red,
    fontSize: 13,
    fontFamily: "regular",
    marginTop: 8,
    marginLeft: 4,
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
  