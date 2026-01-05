import { Colors } from "@/src/utils/colors";
import { FONTS } from "@/src/utils/storeData";
import { Platform, StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  ContentContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 15,
  },
  Image: {
    width: 100,
    height: 100,
    borderRadius: 7,
  },
  RemoveButton: {
    width: 20,
    height: 20,
    position: "absolute",
    right: 10,
    top: 10,
    zIndex: 50,
  },
  Flex: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  CommentContainer: {
    padding:15,
    borderRadius: 4,
    backgroundColor: Colors.white,

  },
  TextArea: {
    borderRadius: 10,
    padding: 10,
    fontSize: 14,
    backgroundColor: Colors.white,
    minHeight: 120,
    fontFamily: FONTS.Regular,
    color: Colors.black,
    marginTop: 10,
  },
  Button: {
    width: "100%",
    height: 50,
    backgroundColor: Colors.primary,
    borderRadius: 7,
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 15,
  },
  Error: {
    fontSize: 13,
    color: Colors.red,
    fontFamily: FONTS.Regular,
    marginTop: 10,
    marginLeft: 5,
  },
  Line: {
    marginVertical: 10,
  },
  Input: {
    width: "80%",
    fontSize: 14,
    fontFamily: FONTS.Medium,
    color: Colors.black,
  },
  InputBox: {
    width: "100%",
    backgroundColor: Colors.white,
    paddingHorizontal: 15,
    paddingVertical: Platform.OS == "android" ? 5 : 10,
    borderRadius: 7,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 10,
  },
  CommentBox: {
    width: "90%",
    padding: 15,
    marginHorizontal:'auto',
    // height:'80%',
    backgroundColor: Colors.background,
    borderTopRightRadius: 10,
    borderTopLeftRadius: 10,
    paddingBottom: 20,
  },
  Text: {
    fontSize: 14,
    fontFamily: FONTS.SemiBold,
    color: Colors.black,
  },
  ButtonContent:{
    gap:15,
    marginTop:15
  },
  ButtonData:{
    width:'80%',
    marginHorizontal:'auto',
    height:45,
    backgroundColor:Colors.primary,
    justifyContent:'center',
    alignItems:'center',
    borderRadius:4
  }
});
