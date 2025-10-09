import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Images } from "../assets/images";
import { Colors } from "../utils/colors";
import { SimpleFlex } from "../utils/storeData";

export default function ParcelBox({index,data}:{index:number,data:any}) {

  return (
    <TouchableOpacity style={styles.container}>
      <View style={SimpleFlex}>
        <View style={styles.NumberBox}>
          <Text style={styles.Text}>{index + 1}</Text>
        </View>
        <Text style={styles.Text}>Parcel</Text>
      </View>
      {
        data?.check && 
        <Image 
        source={Images.Done}
        style={styles.NumberBox}
        />
      }
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    paddingHorizontal: 15,
    paddingVertical:10,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.Boxgray,
    elevation: 3,
    shadowColor: Colors.gray,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2.5,
    borderRadius: 7,
    flexDirection:'row',
    alignItems:'center',
    justifyContent:'space-between'
  },
  NumberBox: {
    width: 40,
    height: 40,
    backgroundColor: Colors.BtnBg,
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  Text: {
    fontSize: 15,
    fontFamily: "SemiBold",
    color: Colors.black,
  },
});
