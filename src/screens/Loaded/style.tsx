import { Colors } from "@/src/utils/colors";
import { width } from "@/src/utils/storeData";
import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
        paddingHorizontal: 15,
        paddingTop: '5%'
    },
    Text: {
        fontSize: 14,
        color: Colors.black,
        fontFamily: 'Medium'
    },
    ItemGap: {
        gap: 10
    },
    ContainerStyle: {
        paddingBottom: 50,
    },
    Flex: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between'
    },
    FooterContainer: {
        width: '100%',
        height: width,
        justifyContent: 'center',
        alignItems: 'center'
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

})