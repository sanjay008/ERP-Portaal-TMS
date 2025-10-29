import { Colors } from "@/src/utils/colors";
import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  Background: {
    flex: 1,
    backgroundColor: Colors.background,
    padding:15,
    gap:15
  },
  LanguageContainer: {
    backgroundColor: Colors.white,
    padding: 15,
    borderRadius: 7,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: Colors.Boxgray,
  },
  Text:{
    fontSize:14,
    fontFamily:"Medium",
    color:Colors.black
  },
  AciverContainer:{
    width:16,
    height: 16,
    borderRadius:120,
    borderWidth:1,
    borderColor:Colors.languageborder,
    justifyContent:'center',
    alignItems:'center',
  },
  IsActive:{
    width:9,
    height:9,
    borderRadius:120,
    backgroundColor:Colors.primary,
  }
});
