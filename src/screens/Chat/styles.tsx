import { FONTS, width } from "@/src/utils/storeData.js";
import { StyleSheet } from "react-native";
import { Colors } from "../../utils/colors.js";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent:'center',
    alignItems:'center'
  },
  CommingImage:{
    width:width / 3,
    height:width / 3,

  },
  Text:{
    fontSize:14,
    fontFamily:FONTS.Bold,
    color:Colors.black
  },
  darkText:{
    fontSize:14,
    fontFamily:FONTS.Medium,
    color:Colors.darkText
  }
});
