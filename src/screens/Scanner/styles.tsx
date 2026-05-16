import { Colors } from "@/src/utils/colors";
import { FONTS } from "@/src/utils/storeData";
import { Platform, StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "gba(0,0,0,0.6)",
  },
  TopIcon:{
    flexDirection:'row',
    alignItems:'center',
    gap:15,
    position:'absolute',
    top:'10%',
    right:20,
    zIndex: 500,
  },
  Positions:{
    width: '100%',
    height:'100%',
    position:'absolute',
    zIndex:999,
    // backgroundColor:'red'
  },
  Button:{
    width:34,
    height:34,
    borderRadius:4,
    backgroundColor:"rgba(255,255,255,0.15)",
    justifyContent:'center',
    alignItems:'center'
  },
  Icons:{
    width:20,
    height:20
  },
  overlayContainer: {
        ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    // backgroundColor:"rgba(0,0,0,0.6)"
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
  ButtonSubmit: {
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
});
