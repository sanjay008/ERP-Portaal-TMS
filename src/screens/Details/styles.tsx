import { Colors } from "@/src/utils/colors";
import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  ViewContainer: {
    paddingHorizontal: 15,
    flexGrow: 1,
  },
  FlatStyle: {
    marginTop: 10,
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
  RemoveButton:{
    width:20,
    height:20,
    position:'absolute',
    right:10,
    top:10,
    zIndex: 50,
  }
});
