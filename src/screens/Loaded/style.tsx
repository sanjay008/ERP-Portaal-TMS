import { Colors } from "@/src/utils/colors";
import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
    container:{
        flex:1,
        backgroundColor:Colors.white,
        paddingHorizontal:15,
        paddingTop:'5%'
    },
    Text:{
        fontFamily:'regular'
    },
    ItemGap:{
        gap:15
    }
})