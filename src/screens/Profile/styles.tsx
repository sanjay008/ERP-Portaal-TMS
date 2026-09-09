import { Colors } from "@/src/utils/colors";
import { FONTS } from "@/src/utils/storeData";
import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
    container:{
        flex:1,
        backgroundColor:Colors.background,
       
    },
    SimpleFlex:{
        flexDirection:'row',
        alignItems:'center',
        gap:15,
        // paddingHorizontal:15,
        // paddingTop:15
    },
    UserImage:{
        width:60,
        height:60,
        borderRadius:150
    },
    Text:{
        fontSize:14,
        fontFamily:FONTS.Medium,
        color:Colors.black
    },
    darkText:{
         fontSize:14,
        fontFamily:FONTS.Medium,
        color:Colors.darkText
    },
    FlatContainerStyle:{
        width:'100%',
        // marginTop:'5%'
        paddingTop:25
    },
    ContentContainerStyle:{
        gap:10,
        paddingHorizontal:15,
        paddingBottom:10
    }
});