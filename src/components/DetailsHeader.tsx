import { useNavigation } from "@react-navigation/native";
import React from "react";
import { useTranslation } from "react-i18next";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Images } from "../assets/images";
import { Colors } from "../utils/colors";
import { SimpleFlex } from "../utils/storeData";
import TwoTypeButton from "./TwoTypeButton";

export default function DetailsHeader({
  title,
  button = false,
  buttonText = "",
  onPress,
  Scan=false,
}: {
  title: string;
  button?: boolean;
  buttonText?:string;
  onPress?:()=>void;
  Scan?:boolean;
}) {
  const { goBack, navigate} = useNavigation<any>();
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      <View style={SimpleFlex.Flex}>
        <TouchableOpacity onPress={goBack}>
          <Image source={Images.back} style={styles.BackIcon} />
        </TouchableOpacity>
        <Text style={styles.Title}>{title}</Text>
      </View>
      {
        Scan && 
           <TwoTypeButton
                    onlyIcon={true}
                    Icon={Images.Scan}
                    style={{ width: 46, height: 46 }}
                    onPress={() =>
                      navigate("Scanner",)
                    }
                  />
      }
   
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    backgroundColor: Colors.white,
    paddingVertical: 10,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    elevation: 0,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 1.5,
    borderBottomWidth: 0.3,
    borderColor: Colors.Boxgray,
    justifyContent:'space-between'
  },
  BackIcon: {
    width: 34,
    height: 34,
  },
  Title: {
    fontSize: 15,
    fontFamily: "SemiBold",
    color: Colors.black,
  },
  Button:{
    paddingVertical:10,
    paddingHorizontal:15,
    borderRadius:4,
    backgroundColor:Colors.red
  },
  Text:{
    fontSize:14,
    fontFamily:"Medium",
    color:Colors.white
  }
});
