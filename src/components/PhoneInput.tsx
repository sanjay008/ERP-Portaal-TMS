import React, { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { Colors } from "../utils/colors";
import { FONTS } from "../utils/storeData";

type Props = {
  value: string;
  setValue: (value: string) => void;
  placeholder?: string;
  error?: string;
  title?: string;
};

const PHONE_LENGTH = 10;
const PHONE_REGEX = /^[6-9]\d{9}$/;

const sanitizePhone = (text: string) => {
  let digits = text.replace(/\D/g, "");
  if (digits.startsWith("91") && digits.length > PHONE_LENGTH) {
    digits = digits.slice(2);
  }
  return digits.slice(0, PHONE_LENGTH);
};

export default function PhoneInput({
  value,
  setValue,
  placeholder = "0000000000",
  error,
  title = "What's your number?",
}: Props) {
  const [touched, setTouched] = useState(false);

  const digits = sanitizePhone(value ?? "");
  const isValid = PHONE_REGEX.test(digits);

  const validationError =
    touched && !isValid
      ? digits.length === 0
        ? "Phone number is required"
        : "Enter a valid 10 digit mobile number"
      : "";

  const displayError = error || validationError;

  return (
    <View style={styles.wrapper}>
      {!!title && <Text style={styles.title}>{title}</Text>}
      <View style={styles.container}>
        <Text style={styles.code}>+91</Text>
        <TextInput
          style={styles.input}
          value={digits}
          onChangeText={(text) => setValue(sanitizePhone(text))}
          placeholder={placeholder}
          placeholderTextColor={Colors.textgray}
          keyboardType="phone-pad"
          maxLength={PHONE_LENGTH}
          onBlur={() => setTouched(true)}
        />
      </View>
      {displayError ? <Text style={styles.error}>{displayError}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
  },
  title: {
    fontSize: 16,
    fontFamily: FONTS.SemiBold,
    color: Colors.black,
    marginBottom: 10,
  },
  container: {
    width: "100%",
    height: 48,
    borderWidth: 1,
    borderColor: Colors.black,
    borderRadius: 24,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    backgroundColor: Colors.white,
  },
  code: {
    fontSize: 16,
    fontFamily: FONTS.Regular,
    color: Colors.black,
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 16,
    fontFamily: FONTS.Regular,
    color: Colors.black,
    padding: 0,
  },
  error: {
    color: Colors.error,
    fontSize: 12,
    fontFamily: FONTS.Regular,
    marginTop: 6,
  },
});
