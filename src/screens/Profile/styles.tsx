import { Colors } from "@/src/utils/colors";
import { FONTS } from "@/src/utils/storeData";
import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  ProfileHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingVertical: 16,
    paddingHorizontal: 14,
    marginBottom: 6,
    borderRadius: 7,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.06)",
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  ProfileMeta: {
    flex: 1,
    gap: 4,
    paddingRight: 4,
  },
  ProfileName: {
    fontSize: 18,
    lineHeight: 24,
    fontFamily: FONTS.SemiBold,
    color: "#0F172A",
    letterSpacing: 0.1,
  },
  ProfileCompany: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: FONTS.Medium,
    color: Colors.darkText,
  },
  SimpleFlex: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
  },
  UserImage: {
    width: 60,
    height: 60,
    borderRadius: 150,
  },
  Text: {
    fontSize: 14,
    fontFamily: FONTS.Medium,
    color: Colors.black,
  },
  darkText: {
    fontSize: 14,
    fontFamily: FONTS.Medium,
    color: Colors.darkText,
  },
  FlatContainerStyle: {
    width: "100%",
  },
  ContentContainerStyle: {
    gap: 10,
    paddingHorizontal: 15,
    paddingTop: 12,
    paddingBottom: 10,
  },
});
