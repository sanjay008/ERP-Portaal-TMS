import { Colors } from "@/src/utils/colors";
import { FONTS, width } from "@/src/utils/storeData";
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
    fontFamily: FONTS.Medium,
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
    paddingRight: 50,
    paddingLeft: 15
  },
  FooterContainer: {
    width: "100%",
    height: width,
    justifyContent: "center",
    alignItems: "center",
  },
  DownIcon: {
    width: 25,
    height: 25,
  },
  CollPadByButton: {
    width: 46,
    height: 46,
    borderRadius: 7,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center'
  }
});
