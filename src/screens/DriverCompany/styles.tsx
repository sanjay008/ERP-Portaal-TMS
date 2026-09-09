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
  emptyWrap: {
    flex: 1,
  },
  addBtn: {
    position: "absolute",
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28,
    shadowRadius: 4,
    zIndex: 10,
  },
  companyCard: {
    backgroundColor: Colors.white,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: Colors.Boxgray,
    padding: 15,
    gap: 8,
  },
  companyTitle: {
    fontSize: 15,
    fontFamily: FONTS.SemiBold,
    color: Colors.black,
  },
  companyMeta: {
    fontSize: 13,
    fontFamily: FONTS.Regular,
    color: Colors.darkText,
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
    marginBottom: 4,
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
  rateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  euroPrefix: {
    fontSize: 14,
    fontFamily: FONTS.Medium,
    color: Colors.black,
  },
  viewRow: {
    gap: 2,
    marginBottom: 8,
  },
  viewLabel: {
    fontSize: 12,
    fontFamily: FONTS.Regular,
    color: Colors.darkText,
  },
  viewValue: {
    fontSize: 14,
    fontFamily: FONTS.Medium,
    color: Colors.black,
  },
  logoPreview: {
    width: 72,
    height: 72,
    borderRadius: 7,
    backgroundColor: Colors.litegray1,
    marginBottom: 10,
  },
  modalHost: {
    margin: 0,
    justifyContent: "flex-end",
  },
  modalBox: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    padding: 15,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 15,
    fontFamily: FONTS.SemiBold,
    color: Colors.black,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 4,
    backgroundColor: Colors.white,
    justifyContent: "center",
    alignItems: "center",
  },
  radioRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.modalBorder,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.languageborder,
    justifyContent: "center",
    alignItems: "center",
  },
  radioOuterActive: {
    borderColor: Colors.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  radioText: {
    flex: 1,
    fontSize: 14,
    fontFamily: FONTS.Medium,
    color: Colors.black,
  },
  dropdown: {
    height: 50,
    borderColor: Colors.primary,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    backgroundColor: Colors.white,
  },
  dropdownList: {
    backgroundColor: Colors.white,
    borderRadius: 7,
  },
  placeholderStyle: {
    fontSize: 14,
    color: Colors.darkText,
    fontFamily: FONTS.Regular,
  },
  selectedTextStyle: {
    fontSize: 14,
    color: Colors.black,
    fontFamily: FONTS.Regular,
  },
  itemTextStyle: {
    fontSize: 14,
    color: Colors.black,
    fontFamily: FONTS.Regular,
  },
  linkBtn: {
    marginTop: 8,
    alignSelf: "flex-start",
  },
  linkText: {
    fontSize: 13,
    fontFamily: FONTS.Medium,
    color: Colors.primary,
  },
  saveRow: {
    alignItems: "flex-end",
    marginTop: 15,
  },
  phoneWrap: {
    marginTop: 5,
  },
});
