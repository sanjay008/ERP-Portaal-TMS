import { FONTS } from "@/src/utils/storeData";
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
    width: '100%',
    marginTop: 24,
    backgroundColor: 'transparent',
    borderWidth: 0,
    overflow: 'visible',
    zIndex: 10,
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




  title: {
    fontSize: RFValue(14),
    fontFamily: 'regular',
    color: Colors.black,
    marginTop: RFValue(5),
    alignSelf: "center",
  },

  pickerTitleStyle: {
    textAlign: "center",
    fontWeight: "bold",
    color: Colors.black,
    fontFamily: FONTS.Regular,
  },

  selectedCountryTextStyle: {
    fontFamily: FONTS.Regular,
    fontSize: 14,
    color: Colors.black,
  },

  countryNameTextStyle: {
    fontSize: 14,
    color: Colors.black,
    paddingLeft: 10,
    textAlign: "right",
    fontFamily: 'regular',

  },

  input: {
    width: '90%',// flex: 1,
    color: Colors.black,
    fontFamily: FONTS.Regular,
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
    fontFamily: FONTS.Regular,
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
