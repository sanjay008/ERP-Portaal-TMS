import { Colors } from "@/src/utils/colors";
import { FONTS } from "@/src/utils/storeData";
import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  listContent: {
    paddingHorizontal: 15,
    paddingTop: 16,
    paddingBottom: 28,
    gap: 10,
    backgroundColor: Colors.background,
    flexGrow: 1,
  },
  row: {
    width: "100%",
    backgroundColor: Colors.white,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: Colors.Boxgray,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  textWrap: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  title: {
    fontSize: 14,
    fontFamily: FONTS.SemiBold,
    color: Colors.black,
  },
  status: {
    fontSize: 12,
    fontFamily: FONTS.Medium,
  },
  statusOn: {
    color: Colors.ReadyText,
  },
  statusOff: {
    color: Colors.darkText,
  },
});
