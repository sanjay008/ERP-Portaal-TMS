import React from "react";
import { useTranslation } from "react-i18next";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Images } from "../assets/images";
import { Colors } from "../utils/colors";
import { FONTS, SimpleFlex } from "../utils/storeData";

export default function OrderDetailsBox() {
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      <Text style={styles.Heading}>Tushar</Text>
      <Text style={styles.AddressText}>Schoutenstraat 70, 3771 CK Barneveld, Netherlands</Text>
      <View style={styles.Flex}>
        <Text style={styles.Text}>{t("Contact")}</Text>
        <View style={SimpleFlex.Flex}>
          <TouchableOpacity>
            <Image source={Images.WhatsApp} style={styles.Icon} />
          </TouchableOpacity>

           <TouchableOpacity>
            <Image source={Images.redWhatsApp} style={styles.Icon} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    backgroundColor:Colors.white,
    padding:15,
    borderRadius:7,
    borderWidth:1,
    borderColor:Colors.Boxgray
  },
  Heading:{
    fontSize:15,
    fontFamily:FONTS.SemiBold,
    color:Colors.black
  },
  AddressText:{
    fontSize:13,
    fontFamily:FONTS.Medium,
    color:Colors.darkText,
    marginVertical:5
  },
  Text:{
    fontSize:14,
    fontFamily:FONTS.Medium,
    color:Colors.black
  },
  Icon: {
    width: 28,
    height: 28,
  },
  Flex:{
    flexDirection:'row',
    alignItems:'center',
    justifyContent:'space-between',
    marginTop:10
  }
});
