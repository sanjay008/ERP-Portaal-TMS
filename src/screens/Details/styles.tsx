import { Colors } from "@/src/utils/colors";
import { width } from "@/src/utils/storeData";
import { StyleSheet } from "react-native";
import { RFValue } from "react-native-responsive-fontsize";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  ViewContainer: {
    paddingHorizontal: 15,
    flexGrow: 1,
  },
  LoaderContainer:{
    flex:1,
    justifyContent:'center',
    alignItems:'center'
  },
  FlatStyle: {
    marginTop: 10,
  },
  BackButton: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 4,
    backgroundColor: Colors.red,
    alignSelf:'flex-start'
  },
  ContainerStyle: {
    gap: 15,
  },
  Flex: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
  Text: {
    fontSize: 14,
    fontFamily: "SemiBold",
    color: Colors.black,
  },
  Button: {
    width: "100%",
    height: RFValue(40),
    backgroundColor: Colors.primary,
    borderRadius: 7,
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 15,
  },
  FooterContainer: {
    width: width - 20,
    height: width / 2,
    justifyContent: "center",
    alignItems: "center",
  },
});
