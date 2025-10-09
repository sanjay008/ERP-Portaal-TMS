import { Colors } from "@/src/utils/colors";
import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
    container:{
        flex:1,
        backgroundColor:Colors.background,
        padding:15
    },
    Button:{
        paddingVertical:10,
        paddingHorizontal:15,
        borderRadius:4,
        backgroundColor:Colors.BtnBg
    },
    Text:{
        fontSize:14,
        fontFamily:'Medium',
        color:Colors.black
    },
    FlatConatiner:{
        marginTop:15
    },
    ContainerStyle:{
        gap:15,
        paddingBottom:50

    }
});