import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "gba(0,0,0,0.6)",
  },
  TopIcon:{
    flexDirection:'row',
    alignItems:'center',
    gap:15,
    position:'absolute',
    top:'10%',
    right:20,
    zIndex: 500,
  },
  Positions:{
    width: '100%',
    height:'100%',
    position:'absolute',
    zIndex:999,
    // backgroundColor:'red'
  },
  Button:{
    width:34,
    height:34,
    borderRadius:4,
    backgroundColor:"rgba(255,255,255,0.15)",
    justifyContent:'center',
    alignItems:'center'
  },
  Icons:{
    width:20,
    height:20
  },
  overlayContainer: {
        ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    // backgroundColor:"rgba(0,0,0,0.6)"
  },

});
