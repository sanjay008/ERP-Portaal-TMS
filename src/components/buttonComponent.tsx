import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
} from "react-native";
import { RFValue } from "react-native-responsive-fontsize";
import { Colors } from "../utils/colors";
import { FONTS } from "../utils/storeData";

type typeProps = {
  width?: string | number | any;
  title: string | any;
  marginTop?: number | any;
  marginBottom?: number | any;
  backgroundColor?: string | any;
  color?: string | any;
  borderWidth?: number | any;
  borderColor?: string | any;
  top?: number | any;
  disabled?: boolean | any;
  fontSize?: number | any;
  loading?: boolean;
  onPress?: () => void;
};

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
  disabled,
  fontSize,
  loading = false,
}: typeProps) => {
  const isDisabled = !!disabled || !!loading;
  const textColor = color ? color : Colors.white;

  return (
    <TouchableOpacity
      disabled={isDisabled}
      onPress={onPress}
      activeOpacity={0.85}
      style={{
        height: RFValue(41),
        width: width,
        backgroundColor: backgroundColor ? backgroundColor : Colors.primary,
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 7,
        marginTop: marginTop,
        marginBottom: marginBottom,
        borderWidth: borderWidth,
        borderColor: borderColor,
        top: top,
        opacity: isDisabled ? 0.85 : 1,
      }}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <Text
          style={[
            styles.title,
            {
              color: textColor,
              fontSize: fontSize ? fontSize : RFValue(15),
            },
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

export default ButtonComponent;

const styles = StyleSheet.create({
  title: {
    fontSize: RFValue(15),
    fontFamily: FONTS.Medium,
    textTransform: "capitalize",
  },
});
