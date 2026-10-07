import { Colors } from "@/src/utils/colors";
import { FONTS } from "@/src/utils/storeData";
import { Platform, StyleSheet } from "react-native";
import { RFValue } from "react-native-responsive-fontsize";

const FIELD_BG = "#F5F7FB";
const FIELD_BORDER = "#E6EAF2";
const MUTED_TEXT = "#6B7A90";

const cardShadow = Platform.select({
  ios: {
    shadowColor: "#1B2A4A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
  },
  android: { elevation: 2 },
  default: {},
});

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  background: {
    flex: 1,
    backgroundColor: "#F4F6FA",
  },
  content: {
    padding: 16,
    paddingBottom: 24,
    gap: 16,
  },
  profileCard: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    alignItems: "center",
    paddingBottom: 18,
    overflow: "hidden",
    ...cardShadow,
  },
  profileBanner: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 64,
    backgroundColor: Colors.primaryopacity,
  },
  avatarWrap: {
    marginTop: 18,
    marginBottom: 12,
  },
  profileImage: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 4,
    borderColor: Colors.white,
    backgroundColor: Colors.litegray1,
  },
  cameraBadge: {
    position: "absolute",
    right: 2,
    bottom: 4,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    borderWidth: 3,
    borderColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  profileName: {
    fontSize: 18,
    fontFamily: FONTS.SemiBold,
    color: Colors.black,
    paddingHorizontal: 16,
    textAlign: "center",
  },
  profileEmail: {
    fontSize: 13,
    fontFamily: FONTS.Regular,
    color: MUTED_TEXT,
    marginTop: 2,
    paddingHorizontal: 16,
    textAlign: "center",
  },
  updatePhotoBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.primaryopacity,
  },
  updatePhotoText: {
    fontSize: 13,
    fontFamily: FONTS.Medium,
    color: Colors.primary,
  },
  sectionCard: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 16,
    gap: 6,
    ...cardShadow,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 4,
  },
  sectionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.primaryopacity,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: FONTS.SemiBold,
    color: Colors.black,
  },
  label: {
    fontSize: RFValue(13),
    fontFamily: FONTS.Medium,
    color: Colors.black,
    marginTop: 5,
  },
  field: {
    borderRadius: 12,
    borderColor: FIELD_BORDER,
  },
  row: {
    flexDirection: "row",
    gap: 10,
  },
  rowItem: {
    flex: 1,
  },
  rowItemWide: {
    flex: 1.6,
  },
  divider: {
    height: 1,
    backgroundColor: FIELD_BORDER,
    marginVertical: 8,
  },
  error: {
    fontSize: 12,
    color: Colors.red,
    fontFamily: FONTS.Regular,
    marginTop: 2,
  },
  dropdown: {
    height: RFValue(45),
    borderWidth: 1,
    borderColor: FIELD_BORDER,
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: FIELD_BG,
    marginTop: 5,
  },
  dropdownReadOnly: {
    backgroundColor: Colors.litegray1,
  },
  dropdownList: {
    borderRadius: 12,
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
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: FIELD_BORDER,
  },
  saveBtn: {
    height: 50,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  saveBtnDisabled: {
    backgroundColor: Colors.inActive,
  },
  saveBtnText: {
    fontSize: 16,
    fontFamily: FONTS.SemiBold,
    color: Colors.white,
  },
});

export const EDITABLE_INPUT_BG = FIELD_BG;
