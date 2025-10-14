import React from "react";
import { useTranslation } from "react-i18next";
import { Image, Platform, StyleSheet, TextInput, View } from "react-native";
import { Colors } from "../utils/colors";

type Props = {
  Icon: string | any;
  value?: string;
  setValue?: (value:string) => void;
  placeholder?: string;
  style?: object;
  IconStyle?: object;
  InputStyle?: object;
  edit?:boolean
};

export default function TwoTypeInput({
  Icon,
  value,
  setValue,
  placeholder,
  style,
  IconStyle,
  InputStyle,
  edit=true,
}: Props) {
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      <Image source={Icon} style={[styles.Icon, IconStyle]} />
      <TextInput
        placeholder={placeholder ? `${placeholder}` : t("Write Comment")}
        placeholderTextColor={Colors.darkText}
        value={value}
        editable={edit}
        onChangeText={setValue}
        style={[styles.Input, InputStyle]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    backgroundColor: Colors.white,
    flexDirection:'row',
    alignItems:'center',
    gap:10,
    paddingVertical:Platform.OS == 'android' ? 5 : 10,
    paddingHorizontal:15,
    borderRadius:7,
    borderWidth:1,
    borderColor:Colors.Boxgray
  },
  Icon: {
    width: 20,
    height: 20,
  },
  Input: {
    width: "80%",
    fontSize: 14,
    fontFamily: "regular",
    color: Colors.black,
  },
});
