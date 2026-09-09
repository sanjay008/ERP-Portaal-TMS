import { Images } from "@/src/assets/images";
import ButtonComponent from "@/src/components/buttonComponent";
import MyCountryPiker from "@/src/components/CountryPicker";
import DetailsHeader from "@/src/components/DetailsHeader";
import { useErrorHandle } from "@/src/components/ErrorHandle";
import Input from "@/src/components/input";
import LoadingModal from "@/src/components/LoadingModal";
import { GlobalContextData } from "@/src/context/GlobalContext";
import { extractApiErrorMessage } from "@/src/screens/DriverCompany/driverCompanyApi";
import { Colors } from "@/src/utils/colors";
import { getData, storeData } from "@/src/utils/storeData";
import * as ImagePicker from "expo-image-picker";
import { useNavigation } from "@react-navigation/native";
import React, { useContext, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Image, Text, TouchableOpacity, View } from "react-native";
import { Dropdown } from "react-native-element-dropdown";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  isApiSuccess,
  updateDriverProfile,
} from "./driverProfileApi";
import ProfilePhotoPickerModal from "./ProfilePhotoPickerModal";
import {
  EDITABLE_INPUT_BG,
  styles,
} from "./styles";
import {
  formsAreEqual,
  mergeUserDataAfterUpdate,
  SALUTATION_OPTIONS,
  userDataToForm,
  type DriverProfileForm,
} from "./types";

const EMAIL_REGEX = /^[\w+.-]+@[\w.-]+\.[a-zA-Z]{2,}$/;

export default function DriverProfileScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const { UserData, setUserData, setToast, AllCountries, fetchCountries } =
    useContext(GlobalContextData);
  const { ErrorHandle } = useErrorHandle();

  const [form, setForm] = useState<DriverProfileForm>(() =>
    userDataToForm(UserData),
  );
  const [initialForm, setInitialForm] = useState<DriverProfileForm>(() =>
    userDataToForm(UserData),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<string>(
    userDataToForm(UserData).profileImageUri,
  );
  const [pendingImage, setPendingImage] = useState<{
    uri: string;
    name: string;
    type: string;
  } | null>(null);
  const [photoPickerVisible, setPhotoPickerVisible] = useState(false);

  useEffect(() => {
    if (!UserData) return;
    const next = userDataToForm(UserData);
    setForm(next);
    setInitialForm(next);
    setPreviewImage(next.profileImageUri);
    setPendingImage(null);
  }, [UserData]);

  useEffect(() => {
    if (!AllCountries.length) {
      fetchCountries();
    }
  }, [AllCountries.length, fetchCountries]);

  const hasChanges = useMemo(() => {
    if (pendingImage?.uri) return true;
    return !formsAreEqual(form, initialForm);
  }, [form, initialForm, pendingImage]);

  const salutationOptions = useMemo(
    () =>
      SALUTATION_OPTIONS.map((item) => ({
        id: item.id,
        label: t(item.label),
      })),
    [t],
  );

  const countryOptions = useMemo(
    () =>
      AllCountries.map((item) => ({
        id: item.apiId ?? item.sortcode,
        label: item.name || item.countryname,
      })).filter((item) => item.id != null),
    [AllCountries],
  );

  const phoneCodeDigits = String(form.mobile_country_code || "+31").replace(
    /^\+/,
    "",
  );

  const setField = (key: keyof DriverProfileForm, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!String(form.achternaam || "").trim()) {
      next.achternaam = t("This field is required");
    }
    if (form.country_id == null || form.country_id === "") {
      next.country_id = t("This field is required");
    }
    if (!String(form.mobile || "").trim()) {
      next.mobile = t("This field is required");
    }
    if (!String(form.email || "").trim()) {
      next.email = t("This field is required");
    } else if (!EMAIL_REGEX.test(String(form.email).trim())) {
      next.email = t("Please enter a valid email");
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onPickProfileImage = async (source: "camera" | "gallery") => {
    try {
      if (source === "camera") {
        const { granted } = await ImagePicker.requestCameraPermissionsAsync();
        if (!granted) {
          setToast({
            visible: true,
            text: t("Please allow camera access"),
            type: "error",
            top: 45,
          });
          return;
        }
        const result = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          quality: 0.85,
        });
        if (result.canceled || !result.assets?.[0]) return;
        const asset = result.assets[0];
        const file = {
          uri: asset.uri,
          name: asset.fileName || "profile.jpg",
          type: asset.mimeType || "image/jpeg",
        };
        setPendingImage(file);
        setPreviewImage(file.uri);
        return;
      }

      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        setToast({
          visible: true,
          text: t("Permission denied"),
          type: "error",
          top: 45,
        });
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.85,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      const file = {
        uri: asset.uri,
        name: asset.fileName || "profile.jpg",
        type: asset.mimeType || "image/jpeg",
      };
      setPendingImage(file);
      setPreviewImage(file.uri);
    } catch (error) {
      const handled = ErrorHandle(error);
      setToast({
        visible: true,
        text: handled?.message || t("Something went wrong. Please try again."),
        type: "error",
        top: 45,
      });
    }
  };

  const onUpdatePhotoPress = () => {
    setPhotoPickerVisible(true);
  };

  const onSave = async () => {
    if (!hasChanges) return;
    if (!validate()) return;
    setLoading(true);
    try {
      const companyLogin = (await getData("COMPANYLOGIN")) || "";
      const res = await updateDriverProfile(
        form,
        UserData,
        companyLogin,
        pendingImage,
      );

      if (isApiSuccess(res)) {
        const merged = mergeUserDataAfterUpdate(
          UserData,
          form,
          res?.data,
          pendingImage?.uri || previewImage,
        );
        await storeData("USERDATA", { status: true, data: merged });
        setUserData(merged);
        setPendingImage(null);
        setInitialForm({ ...form, profileImageUri: pendingImage?.uri || previewImage || form.profileImageUri });
        setToast({
          visible: true,
          text: t(res?.message) || t("Submitted successfully"),
          type: "success",
          top: 45,
        });
        navigation.goBack();
        return;
      }

      const failMsg =
        extractApiErrorMessage(res) ||
        (typeof res?.message === "string" ? res.message : "") ||
        t("Something went wrong. Please try again.");
      setToast({
        visible: true,
        text: failMsg,
        type: "error",
        top: 45,
      });
    } catch (error: any) {
      const apiMsg = extractApiErrorMessage(error?.response?.data);
      const handled = ErrorHandle(error);
      setToast({
        visible: true,
        text:
          apiMsg ||
          (typeof error?.response?.data?.message === "string"
            ? error.response.data.message
            : "") ||
          handled?.message ||
          t("Something went wrong. Please try again."),
        type: "error",
        top: 45,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <DetailsHeader title={t("Driver Profile")} />
      <View style={styles.background}>
        <KeyboardAwareScrollView
          enableOnAndroid
          keyboardShouldPersistTaps="handled"
          extraScrollHeight={120}
          scrollEnabled={!countryPickerOpen}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.profileCard}>
            <Image
              source={
                previewImage ? { uri: previewImage } : Images.userblanck
              }
              style={styles.profileImage}
            />
            <TouchableOpacity
              style={styles.updatePhotoBtn}
              activeOpacity={0.85}
              onPress={onUpdatePhotoPress}
            >
              <Text style={styles.updatePhotoText}>{t("Update profile photo")}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{t("Personal Details")}</Text>

            <Text style={styles.label}>{t("Salutation")}</Text>
            <Dropdown
              style={styles.dropdown}
              containerStyle={styles.dropdownList}
              data={salutationOptions}
              labelField="label"
              valueField="id"
              placeholder={t("---Select---")}
              value={form.aanhef || null}
              onChange={(item) => setField("aanhef", item.id)}
              search
              placeholderStyle={styles.placeholderStyle}
              selectedTextStyle={styles.selectedTextStyle}
              itemTextStyle={styles.itemTextStyle}
            />

            <Input
              title={t("First Name")}
              value={form.voornaam}
              onChangeText={(v) => setField("voornaam", v)}
              placeholder={t("First Name")}
              backgroundColor={EDITABLE_INPUT_BG}
            />

            <Input
              title={t("Last Name")}
              required
              value={form.achternaam}
              onChangeText={(v) => setField("achternaam", v)}
              placeholder={t("Last Name")}
              error={errors.achternaam}
              backgroundColor={EDITABLE_INPUT_BG}
            />
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{t("Contact")}</Text>

            <View style={styles.row}>
              <View style={styles.rowItem}>
                <Input
                  title={t("Street")}
                  value={form.street}
                  onChangeText={(v) => setField("street", v)}
                  placeholder={t("Street")}
                  backgroundColor={EDITABLE_INPUT_BG}
                />
              </View>
              <View style={styles.rowItem}>
                <Input
                  title={t("House Nr")}
                  value={form.house_number}
                  onChangeText={(v) => setField("house_number", v)}
                  placeholder={t("House Nr")}
                  backgroundColor={EDITABLE_INPUT_BG}
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.rowItem}>
                <Input
                  title={t("Postcode")}
                  value={form.postcode}
                  onChangeText={(v) => setField("postcode", v)}
                  placeholder={t("Postcode")}
                  backgroundColor={EDITABLE_INPUT_BG}
                />
              </View>
              <View style={styles.rowItem}>
                <Input
                  title={t("City")}
                  value={form.city}
                  onChangeText={(v) => setField("city", v)}
                  placeholder={t("City")}
                  backgroundColor={EDITABLE_INPUT_BG}
                />
              </View>
            </View>

            <Text style={styles.label}>
              {t("Country")}
              <Text style={{ color: Colors.red }}> *</Text>
            </Text>
            <Dropdown
              style={[styles.dropdown, { marginTop: 8 }]}
              containerStyle={styles.dropdownList}
              data={countryOptions}
              labelField="label"
              valueField="id"
              placeholder={t("---Select a Country---")}
              value={form.country_id}
              onChange={(item) => setField("country_id", item.id)}
              search
              placeholderStyle={styles.placeholderStyle}
              selectedTextStyle={styles.selectedTextStyle}
              itemTextStyle={styles.itemTextStyle}
            />
            {errors.country_id ? (
              <Text style={styles.error}>{errors.country_id}</Text>
            ) : null}

            <Text style={[styles.label, { marginTop: 10 }]}>
              {t("Mobile / WhatsApp Number")}
              <Text style={{ color: Colors.red }}> *</Text>
            </Text>
            <View style={styles.phoneWrap}>
              <MyCountryPiker
                value={form.mobile}
                setValue={(v) => setField("mobile", v)}
                countryCode={phoneCodeDigits}
                onSelect={(c) =>
                  setField(
                    "mobile_country_code",
                    c?.countrycode?.startsWith("+")
                      ? c.countrycode
                      : `+${String(c?.countrycode || "31").replace(/^\+/, "")}`,
                  )
                }
                onOpenChange={setCountryPickerOpen}
                placeholder={t("Mobile / WhatsApp Number")}
              />
            </View>
            {errors.mobile ? (
              <Text style={styles.error}>{errors.mobile}</Text>
            ) : null}

            <Input
              title={t("Email Address")}
              required
              value={form.email}
              onChangeText={(v) => setField("email", v)}
              placeholder={t("Email Address")}
              keyboardType="email-address"
              error={errors.email}
              backgroundColor={EDITABLE_INPUT_BG}
            />
          </View>

          <ButtonComponent
            title={t("Save")}
            onPress={onSave}
            marginTop={4}
            disabled={!hasChanges || loading}
            backgroundColor={
              !hasChanges || loading ? Colors.inActive : Colors.primary
            }
          />
        </KeyboardAwareScrollView>
      </View>
      <LoadingModal visible={loading} message={t("Please wait…")} />
      <ProfilePhotoPickerModal
        visible={photoPickerVisible}
        onClose={() => setPhotoPickerVisible(false)}
        onCamera={() => onPickProfileImage("camera")}
        onGallery={() => onPickProfileImage("gallery")}
      />
    </SafeAreaView>
  );
}
