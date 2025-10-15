import { Colors } from "@/src/utils/colors";
import { width } from "@/src/utils/storeData";
import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 15,
  },
  ContentContainerStyle: {
    paddingBottom: 50,
  },
  Button: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 4,
    backgroundColor: Colors.BtnBg,
  },
  Text: {
    fontSize: 14,
    fontFamily: "Medium",
    color: Colors.black,
  },
  FlatConatiner: {
    marginTop: 30,
  },
  ContainerStyle: {
    gap: 15,
    paddingBottom: 50,
  },
  Flex: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  ContentContainerStyleCatogryStatus: {
    gap: 10,
    paddingRight:50,
    paddingLeft:15
  },
  FooterContainer: {
    width: "100%",
    height: width,
    justifyContent: "center",
    alignItems: "center",
  },
});
