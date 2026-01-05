
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
        fontSize: 17,
        fontFamily: FONTS.SemiBold,
        color: Colors.black,
        marginTop: 40,
    },
    dis: {
        fontSize: 14,
        fontFamily: FONTS.Regular,
        color: Colors.textgray,
        marginTop: 8,
    },
    logo: {
        alignSelf: "center",
        marginTop: RFValue(40),
    },
    container: {
        paddingHorizontal: 24,
    },
    resend: {
        fontSize: 15,
        fontFamily: FONTS.Medium,
        color: Colors.textgray,
        alignSelf: "center",
        marginTop: RFValue(20),
    },
    input: {
        borderWidth: 1,
        borderColor: Colors.litegray,
        borderRadius: 5,
        fontSize: 15,
        borderBottomWidth: 1,
        fontFamily: FONTS.Regular,
        height: 40,
        width: 40,
    },
    iview: { marginTop: RFValue(34), width: "100%" },
    otperrortext: {
        color: Colors.red,
        fontSize: RFValue(10),
        fontFamily: FONTS.Regular,
        marginTop: RFValue(1),
    },
});
