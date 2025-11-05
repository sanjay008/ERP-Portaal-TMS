import { Colors } from "@/src/utils/colors";
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
    fontFamily: "SemiBold",
    color: Colors.black,
  },
  Icon: {
    width: 28,
    height: 28,
  },
});
