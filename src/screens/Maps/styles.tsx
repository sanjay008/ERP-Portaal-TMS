import { Colors } from "@/src/utils/colors";
import { FONTS } from "@/src/utils/storeData";
import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  HeaderContainer: {
    zIndex: 500,
  },
  BottomBox: {
    width: "100%",
    padding: 15,
    borderTopRightRadius: 20,
    borderTopLeftRadius: 20,
    backgroundColor: Colors.white,
    position: "absolute",
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  Text: {
    fontSize: 15,
    fontFamily: FONTS.SemiBold,
    color: Colors.black,
  },
  Icon: {
    width: 28,
    height: 28,
  },
  GetLocationButton:{
    width:50,
    height:50,
    backgroundColor:Colors.white,
    borderRadius:120,
    justifyContent:'center',
    alignItems:'center',
    position:'absolute',
    bottom:'20%',
    right:'5%'
  },
  LogoUserCurrentLocate:{
    width:45,
    height:45,
  },
  MapsButton:{
    width:'80%',
    height:50,
    borderRadius:7,
    backgroundColor:Colors.primary,
    position:'absolute',
    bottom:'10%',
    alignSelf:'center',
    justifyContent:'center',
    alignItems:'center'
  },
  MapsButtonText:{
    fontSize:14,
    fontFamily:FONTS.Medium,
    color:Colors.white
  }
});
