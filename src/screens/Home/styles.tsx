import { Colors } from "@/src/utils/colors";
import { height } from "@/src/utils/storeData";
import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
    container:{
        flex:1,
        backgroundColor:Colors.background,
        padding:15
    },
    ContentContainerStyle:{
        paddingBottom:50,
        gap:15
    },
    EmptyComponents:{
        width:'100%',
        height:height * 0.4,
        justifyContent:'center',
        alignItems:'center'
    },
    SlideContainer:{
        width:'100%',
        paddingVertical:20,
        paddingHorizontal:15,
        flexDirection:'row',
        alignItems:'center',
        gap:10,
        borderRadius:4,
        borderWidth:1,
        borderColor:Colors.border
    },
    Icon:{
        width:25,
        height:25,
        resizeMode:'contain'
    },
    Text:{
        fontSize:14,
        color:Colors.black,
        fontFamily:"Medium",

    }
});