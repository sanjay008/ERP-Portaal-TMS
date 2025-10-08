
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
        fontFamily: "SemiBold",
        color: Colors.black,
        marginTop: 40,
    },
    dis: {
        fontSize: 14,
        fontFamily: "regular",
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
        fontFamily: "Medium",
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
        fontFamily: "regular",
        height: 40,
        width: 40,
    },
    iview: { marginTop: RFValue(34), width: "100%" },
    otperrortext: {
        color: Colors.red,
        fontSize: RFValue(10),
        fontFamily: "regular",
        marginTop: RFValue(1),
    },
});
