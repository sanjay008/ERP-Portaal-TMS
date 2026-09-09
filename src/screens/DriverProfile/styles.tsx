import { Colors } from "@/src/utils/colors";
import { FONTS } from "@/src/utils/storeData";
import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  background: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 15,
    paddingBottom: 40,
    gap: 15,
  },
  profileCard: {
    backgroundColor: Colors.white,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: Colors.Boxgray,
    padding: 15,
    alignItems: "center",
    gap: 12,
  },
  profileImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.litegray1,
  },
  updatePhotoBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 7,
    backgroundColor: Colors.primary,
  },
  updatePhotoText: {
    fontSize: 13,
    fontFamily: FONTS.SemiBold,
    color: Colors.white,
  },
  sectionCard: {
    backgroundColor: Colors.white,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: Colors.Boxgray,
    padding: 15,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: FONTS.SemiBold,
    color: Colors.black,
    marginBottom: 2,
  },
  label: {
    fontSize: 13,
    fontFamily: FONTS.Medium,
    color: Colors.black,
  },
  row: {
    flexDirection: "row",
    gap: 10,
  },
  rowItem: {
    flex: 1,
  },
  error: {
    fontSize: 12,
    color: Colors.red,
    fontFamily: FONTS.Regular,
    marginTop: 2,
  },
  dropdown: {
    height: 45,
    borderWidth: 1,
    borderColor: Colors.litegray,
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: Colors.invoicelite,
  },
  dropdownReadOnly: {
    backgroundColor: Colors.litegray1,
  },
  dropdownList: {
    borderRadius: 8,
    maxHeight: 260,
  },
  placeholderStyle: {
    fontSize: 13,
    color: Colors.textgray,
    fontFamily: FONTS.Regular,
  },
  selectedTextStyle: {
    fontSize: 13,
    color: Colors.black,
    fontFamily: FONTS.Regular,
  },
  itemTextStyle: {
    fontSize: 13,
    color: Colors.black,
    fontFamily: FONTS.Regular,
  },
  phoneWrap: {
    marginTop: 5,
  },
});

export const EDITABLE_INPUT_BG = Colors.invoicelite;
