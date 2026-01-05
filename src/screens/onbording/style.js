import { FONTS } from "@/src/utils/storeData";
import { StyleSheet } from "react-native";
import { RFValue } from "react-native-responsive-fontsize";
import { Colors } from "../../utils/colors";

export const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: Colors.white,
    },
    wellcome: {
        fontSize: RFValue(17),
        fontFamily: FONTS.SemiBold,
        color: Colors.black,
        marginTop: 25,
        alignSelf: "center",
    },
    dis: {
        fontSize: RFValue(14),
        fontFamily: FONTS.Regular,
        color: Colors.textgray,
        marginTop: 8,
        alignSelf: "center",
    },
    logo: {
        height: 300,
        width: 300,
        alignSelf: "center",
        marginTop: RFValue(30),
    },
    container: {
        paddingHorizontal: 24,
    },
    keep: {
        fontSize: RFValue(12),
        fontFamily: FONTS.Regular,
        color: Colors.black,
        marginLeft: 10,
    },
    checkView: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: RFValue(20),
    },
    fpassword: {
        fontSize: RFValue(15),
        fontFamily: FONTS.Medium,
        color: Colors.black,
        alignSelf: "center",
        marginTop: RFValue(12),
    },
    subContainer: {
        flex: 1,
    },
});