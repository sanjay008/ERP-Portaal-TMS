import React from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";
import { RFValue } from "react-native-responsive-fontsize";
import { Colors } from "../utils/colors";

const ButtonComponent = ({
  width,
  title,
  marginTop,
  onPress,
  backgroundColor,
  marginBottom,
  color,
  borderWidth,
  borderColor,
  top,
  disabled,fontSize
}) => {
  return (
    <TouchableOpacity
    disabled={disabled}
      onPress={onPress}
      style={{
        height: RFValue(41),
        width: width,
        backgroundColor: backgroundColor ? backgroundColor : Colors.primary,
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 10,
        marginTop: marginTop,
        marginBottom: marginBottom,
        borderWidth: borderWidth,
        borderColor: borderColor,
        top: top,
      }}
    >
      <Text style={[styles.title, { color: color ? color : Colors.white,  fontSize: fontSize?fontSize:RFValue(15) }]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
};

export default ButtonComponent;

const styles = StyleSheet.create({
  title: {
    fontSize: RFValue(15),
    fontFamily: "Medium",
    textTransform:'capitalize'
  },
});
