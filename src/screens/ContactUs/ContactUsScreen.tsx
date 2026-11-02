import apiConstants from "@/src/api/apiConstants";
import ButtonComponent from "@/src/components/buttonComponent";
import DetailsHeader from "@/src/components/DetailsHeader";
import { useErrorHandle } from "@/src/components/ErrorHandle";
import { GlobalContextData } from "@/src/context/GlobalContext";
import ApiService from "@/src/utils/Apiservice";
import { Colors } from "@/src/utils/colors";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import React, { useContext, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { RFValue } from "react-native-responsive-fontsize";
import { SafeAreaView } from "react-native-safe-area-context";
import { styles } from "./styles";

export default function ContactUsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const { UserData, setToast } = useContext(GlobalContextData);
  const { ErrorHandle } = useErrorHandle();

  const contact = useMemo(
    () => String(UserData?.user?.email || "").trim(),
    [UserData?.user?.email],
  );
  const [description, setDescription] = useState("");
  const [descriptionFocused, setDescriptionFocused] = useState(false);
  const [descriptionError, setDescriptionError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (loading) return;

    const nextContact = contact.trim();
    const nextDescription = description.trim();

    if (!nextDescription) {
      setDescriptionError(t("Please enter a description"));
      return;
    }
    setDescriptionError("");

    setLoading(true);
    try {
      const res = await ApiService(apiConstants.contactUs, {
        customData: {
          token: UserData?.user?.verify_token,
          role: UserData?.user?.role,
          relaties_id: UserData?.relaties?.id,
          user_id: UserData?.user?.id,
          email: nextContact,
          description: nextDescription,
        },
      });

      if (res?.status) {
        setToast({
          top: 45,
          text: t(res?.message) || t("Submitted successfully"),
          type: "success",
          visible: true,
        });
        setDescription("");
        navigation.goBack();
        return;
      }

      setToast({
        top: 45,
        text: t(res?.message) || t("Something went wrong. Please try again."),
        type: "error",
        visible: true,
      });
    } catch (error: any) {
      setToast({
        top: 45,
        text: ErrorHandle(error)?.message || t("Something went wrong. Please try again."),
        type: "error",
        visible: true,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <DetailsHeader title={t("Contact Us")} />
      <KeyboardAvoidingView
        style={styles.background}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          bounces={false}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.body}
        >
          <Text style={styles.label}>{t("Your Phone Number & Email")}</Text>
          <View style={[styles.field, styles.fieldReadonly]}>
            <Ionicons
              name="mail-outline"
              size={20}
              color={Colors.primary}
              style={styles.fieldIcon}
            />
            <TextInput
              value={contact}
              editable={false}
              selectTextOnFocus={false}
              placeholder={t("Phone number or email")}
              placeholderTextColor={Colors.textgray}
              style={[styles.input, styles.inputReadonly]}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <Text style={styles.label}>{t("Description")}</Text>
          <View
            style={[
              styles.field,
              styles.descriptionField,
              descriptionFocused && styles.fieldFocused,
              !!descriptionError && styles.fieldError,
            ]}
          >
            <TextInput
              value={description}
              onChangeText={(text) => {
                setDescription(text);
                if (descriptionError) setDescriptionError("");
              }}
              placeholder={t("Type here...")}
              placeholderTextColor={Colors.textgray}
              style={[styles.input, styles.descriptionInput]}
              multiline
              onFocus={() => setDescriptionFocused(true)}
              onBlur={() => setDescriptionFocused(false)}
            />
          </View>
          {!!descriptionError && (
            <Text style={styles.error}>{descriptionError}</Text>
          )}

          <View style={styles.submitWrap}>
            <ButtonComponent
              title={t("Submit")}
              width="100%"
              marginTop={RFValue(8)}
              onPress={onSubmit}
              loading={loading}
              disabled={loading}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
