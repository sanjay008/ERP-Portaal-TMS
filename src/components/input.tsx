import React, { useState } from "react";
import {
  Image,
  ImageSourcePropType,
  KeyboardTypeOptions,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ViewStyle
} from "react-native";
import { RFValue } from "react-native-responsive-fontsize";
import { Colors } from "../utils/colors";

type Props = {
  placeholder?: string;
  onChangeText?: (text: string) => void;
  value?: string;
  iconSource?: ImageSourcePropType;
  rightIcon?: ImageSourcePropType;
  onPress?: () => void;
  title?: string;
  style?: ViewStyle;
  error?: string;
  maxLength?: number;
  keyboardType?: KeyboardTypeOptions;
  required?: boolean;
  backgroundColor?: string;
  height?: number;
  multiline?: boolean;
}

const Input: React.FC<Props> = ({
  placeholder,
  onChangeText,
  value,
  iconSource,
  title,
  style,
  rightIcon,
  onPress,
  error,
  maxLength,
  keyboardType,
  required,
  backgroundColor = Colors.white,
  height,
  multiline = false,
  ...rest
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = () => setIsFocused(true);
  const handleBlur = () => setIsFocused(false);

  return (
    <View>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        {title && <Text style={styles.title}>{title}</Text>}
        {required && (
          <Text style={[styles.title, { marginTop: 0 }]}>
            <Text style={{ color: Colors.red }}>*</Text>
          </Text>
        )}
      </View>

      <View
        style={[
          styles.container,
          style,
          isFocused && styles.focused,
          {
            backgroundColor,
            height: multiline ? RFValue(100) : RFValue(45),
          },
        ]}
      >
        {iconSource && (
          <Image
            source={iconSource}
            style={[
              styles.img,
              { tintColor: isFocused ? Colors.primary : Colors.textgray },
            ]}
          />
        )}

        <TextInput
          value={value}
          onChangeText={onChangeText}
          maxLength={maxLength}
          placeholderTextColor={Colors.textgray}
          keyboardType={keyboardType}
          placeholder={placeholder}
          style={[styles.input, { height: multiline ? RFValue(100) : RFValue(45) }]}
          onFocus={handleFocus}
          onBlur={handleBlur}
          textAlignVertical={multiline ? "top" : "center"}
          multiline={multiline}
          {...rest}
        />

        {rightIcon && (
          <TouchableOpacity onPress={onPress}>
            <Image
              source={rightIcon}
              style={[
                styles.img,
                { tintColor: isFocused ? Colors.primary : Colors.textgray },
              ]}
            />
          </TouchableOpacity>
        )}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
};

export default Input;

const styles = StyleSheet.create({
  container: {
    height: RFValue(45),
    borderWidth: 1,
    borderColor: Colors.litegray,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    marginTop: RFValue(5),
  },
  focused: {
    backgroundColor: Colors.primaryopacity,
    borderColor: Colors.primary,
  },
  input: {
    flex: 1,
    color: Colors.black,
    fontFamily: "regular",
    fontSize: RFValue(12),
  },
  title: {
    fontSize: RFValue(13),
    fontFamily: "Medium",
    color: Colors.black,
    marginTop: RFValue(5),
  },
  img: {
    height: RFValue(20),
    width: RFValue(20),
    marginRight: 10,
  },
  error: {
    color: Colors.red,
    fontSize: RFValue(10),
    fontFamily: "regular",
    marginTop: RFValue(1),
  },
});
