import { Colors } from "@/src/utils/colors";
import { width } from "@/src/utils/storeData";
import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  wrapper:{
    flex:1,
    backgroundColor:Colors.background,
    padding: 15,
  },
  Header:{
    margin:-15,
    marginBottom:20
  },
  Flex: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  Text: {
    fontSize: 14,
    color: Colors.black,
    fontFamily: "Medium",
  },
  ItemGap: {
    gap: 10,
  },
  ContainerStyle: {
    paddingBottom: 50,
  },
  FooterContainer: {
    width: "100%",
    height: width,
    justifyContent: "center",
    alignItems: "center",
  },
  RefreshButton:{
    width: 46,
    height:46,
    backgroundColor:Colors.primary,
    borderRadius:6,
    justifyContent:'center',
    alignItems:'center',
    position:'absolute',
    bottom:'10%',
    right: '5%',
    zIndex: 999,
  },
  RefreshIcon:{
    width:'50%',
    height:'50%',
    tintColor:Colors.white
  }
});
