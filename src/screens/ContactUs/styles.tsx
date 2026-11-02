import { Colors } from "@/src/utils/colors";
import { FONTS } from "@/src/utils/storeData";
import { StyleSheet } from "react-native";
import { RFValue } from "react-native-responsive-fontsize";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  background: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  body: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 24,
  },
  label: {
    fontSize: RFValue(13),
    fontFamily: FONTS.Medium,
    color: Colors.black,
    marginBottom: 8,
  },
  field: {
    minHeight: RFValue(45),
    borderWidth: 1,
    borderColor: Colors.litegray,
    borderRadius: 7,
    backgroundColor: Colors.white,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    marginBottom: 18,
  },
  fieldFocused: {
    backgroundColor: Colors.primaryopacity,
    borderColor: Colors.primary,
  },
  fieldReadonly: {
    backgroundColor: Colors.primaryopacity,
    borderColor: Colors.primary,
  },
  fieldError: {
    borderColor: Colors.red,
  },
  fieldIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: Colors.black,
    fontFamily: FONTS.Regular,
    fontSize: RFValue(13),
    paddingVertical: 10,
  },
  inputReadonly: {
    color: Colors.darkText,
  },
  descriptionField: {
    minHeight: RFValue(120),
    alignItems: "flex-start",
    paddingTop: 10,
    paddingBottom: 10,
  },
  descriptionInput: {
    width: "100%",
    minHeight: RFValue(100),
    textAlignVertical: "top",
  },
  error: {
    color: Colors.red,
    fontSize: RFValue(10),
    fontFamily: FONTS.Regular,
    marginTop: -12,
    marginBottom: 12,
  },
  submitWrap: {
    marginTop: 6,
  },
});
