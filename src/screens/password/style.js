import { StyleSheet } from "react-native";
import { RFValue } from "react-native-responsive-fontsize";
import { Colors } from "../../utils/colors";
import { FONTS } from "@/src/utils/storeData";

export const styles = StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: Colors.white,
    },
    welcome: {
      fontSize: 19,
      fontFamily: FONTS.SemiBold,
      color: Colors.black,
      marginTop: 40,
      alignSelf: "center",
    },
    description: {
      fontSize: 16,
      fontFamily: FONTS.Regular,
      color: Colors.textgray,
      marginTop: 8,
      alignSelf: "center",

    },
    container: {
      paddingHorizontal: 24,
    },
    input: {
      borderWidth: 1,
      borderColor: Colors.litegray,
      borderRadius: 5,
      fontSize: 15,
      borderBottomWidth: 1,
      fontFamily: FONTS.Regular,
      height: 40,
      width: "100%",
    },
    errorText: {
      color: Colors.red,
      fontSize: RFValue(10),
      fontFamily: FONTS.Regular,
      marginTop: RFValue(1),
    },
    logo: {
      alignSelf: "center",
      marginTop: RFValue(40),
    },
  });
  