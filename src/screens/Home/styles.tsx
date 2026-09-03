import { Colors } from "@/src/utils/colors";
import { FONTS, height } from "@/src/utils/storeData";
import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
    container:{
        flex:1,
        backgroundColor:Colors.background,
    },
    ContentContainerStyle:{
        paddingBottom:50,
        gap:15,
        padding:15
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
        color:Colors.white,
        fontFamily:FONTS.Medium,
      
    },
    TripOffFooter: {
        paddingHorizontal: 15,
        paddingTop: 10,
        paddingBottom: 16,
        backgroundColor: Colors.background,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
    },
    TripOffButton: {
        width: '100%',
        paddingVertical: 14,
        borderRadius: 6,
        backgroundColor: Colors.red,
        alignItems: 'center',
        justifyContent: 'center',
    },
    TripOffButtonText: {
        fontSize: 15,
        color: Colors.white,
        fontFamily: FONTS.Medium,
    },
});