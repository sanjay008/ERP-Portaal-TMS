import ButtonComponent from "@/src/components/buttonComponent";
import MyCountryPiker from "@/src/components/CountryPicker";
import DetailsHeader from "@/src/components/DetailsHeader";
import { useErrorHandle } from "@/src/components/ErrorHandle";
import Input from "@/src/components/input";
import LoadingModal from "@/src/components/LoadingModal";
import { GlobalContextData } from "@/src/context/GlobalContext";
import { Colors } from "@/src/utils/colors";
import { useNavigation, useRoute } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import React, { useContext, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Image, Text, View } from "react-native";
import { Dropdown } from "react-native-element-dropdown";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  extractApiErrorMessage,
  extractApiFieldErrors,
  isApiSuccess,
  storeDriverCompany,
  updateDriverCompany,
  uploadDriverCompanyLogo,
} from "./driverCompanyApi";
import { styles } from "./styles";
import {
  companyToFormValues,
  listId,
  listLabel,
  normalizePhoneCode,
  type DriverCompanyFormLists,
  type DriverCompanyGetData,
  type DriverCompanyRecord,
} from "./types";

const EMAIL_REGEX = /^[\w+.-]+@[\w.-]+\.[a-zA-Z]{2,}$/;

type RouteParams = {
  mode?: "add" | "edit";
  company?: DriverCompanyRecord | null;
  defaults?: DriverCompanyGetData["defaults"];
  formLists?: DriverCompanyFormLists;
  onDone?: () => void;
};

function mapSelectOptions(list: any[] | undefined) {
  if (!Array.isArray(list)) return [];
  return list
    .map((item) => {
      const id = listId(item);
      if (id == null) return null;
      return { id, label: listLabel(item), raw: item };
    })
    .filter(Boolean) as Array<{ id: string | number; label: string; raw: any }>;
}

export default function CompanyFormScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const params = (route?.params || {}) as RouteParams;
  const { UserData, setToast } = useContext(GlobalContextData);
  const { ErrorHandle } = useErrorHandle();

  const mode = params.mode === "edit" ? "edit" : "add";
  const formLists = params.formLists || {};
  const defaults = params.defaults || {};

  const [form, setForm] = useState<Record<string, any>>(
    companyToFormValues(params.company, defaults),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);
  const [logoUri, setLogoUri] = useState<string | null>(
    params.company?.logo_url || null,
  );
  const [pendingLogo, setPendingLogo] = useState<{
    uri: string;
    name: string;
    type: string;
  } | null>(null);
  const [companyId, setCompanyId] = useState<string | number | null>(
    params.company?.id ?? null,
  );

  useEffect(() => {
    setForm(companyToFormValues(params.company, defaults));
    setLogoUri(params.company?.logo_url || null);
    setCompanyId(params.company?.id ?? null);
  }, [params.company, defaults]);

  const countryOptions = useMemo(
    () => mapSelectOptions(formLists.countries),
    [formLists.countries],
  );
  const bankOptions = useMemo(
    () => mapSelectOptions(formLists.banks),
    [formLists.banks],
  );

  const setField = (key: string, value: any) => {
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
    if (!String(form.company_name || "").trim()) {
      next.company_name = t("This field is required");
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
    if (
      String(form.invoice_email || "").trim() &&
      !EMAIL_REGEX.test(String(form.invoice_email).trim())
    ) {
      next.invoice_email = t("Please enter a valid email");
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const buildPayload = () => {
    const mobileCode = normalizePhoneCode(form.mobile_country_code);
    const mobile = String(form.mobile || "").trim();
    return {
      company_name: String(form.company_name || "").trim(),
      street: String(form.street || "").trim(),
      house_number: String(form.house_number || "").trim(),
      postcode: String(form.postcode || "").trim(),
      city: String(form.city || "").trim(),
      country_id: form.country_id,
      mobile,
      mobile_country_code: mobileCode,
      contact_phone: mobile,
      contact_phone_country_code: mobileCode,
      website: String(form.website || "").trim(),
      email: String(form.email || "").trim(),
      invoice_email: String(form.invoice_email || "").trim(),
      kvk_nr: String(form.kvk_nr || "").trim(),
      btw_nr: String(form.btw_nr || "").trim(),
      iban: String(form.iban || "").trim(),
      bic: String(form.bic || "").trim(),
      bank_id: form.bank_id,
      connection_type_id:
        form.connection_type_id ?? defaults?.connection_type_id ?? "",
      department_id: form.department_id ?? defaults?.department_id ?? "",
    };
  };

  const showApiError = (res?: any, error?: any) => {
    const payload = res ?? error?.response?.data;
    const apiMsg = extractApiErrorMessage(payload);
    const fieldErrors = extractApiFieldErrors(payload);
    if (Object.keys(fieldErrors).length) {
      setErrors((prev) => ({ ...prev, ...fieldErrors }));
    }

    const msg =
      apiMsg ||
      (error ? ErrorHandle(error)?.message : null) ||
      t("Something went wrong. Please try again.");

    setToast({
      visible: true,
      text: msg,
      type: "error",
      top: 45,
    });
  };

  const onSave = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = buildPayload();
      let res: any;
      if (mode === "edit" && companyId != null) {
        res = await updateDriverCompany(
          UserData,
          companyId,
          payload,
          pendingLogo,
        );
      } else {
        res = await storeDriverCompany(UserData, payload, pendingLogo);
      }

      if (isApiSuccess(res)) {
        const company = res?.data?.company;
        if (company?.id != null) {
          setCompanyId(company.id);
        }
        if (company?.logo_url) {
          setLogoUri(company.logo_url);
        }
        if (company) {
          setForm(companyToFormValues(company, defaults));
        }
        setPendingLogo(null);
        setToast({
          visible: true,
          text: t(res?.message) || t("Submitted successfully"),
          type: "success",
          top: 45,
        });
        navigation.goBack();
        return;
      }

      if (
        String(res?.message || "")
          .toLowerCase()
          .includes("only 1 driver company")
      ) {
        setToast({
          visible: true,
          text: t(res?.message),
          type: "error",
          top: 45,
        });
        navigation.goBack();
        return;
      }

      showApiError(res);
    } catch (error: any) {
      showApiError(error?.response?.data, error);
      if (
        extractApiErrorMessage(error?.response?.data)
          .toLowerCase()
          .includes("only 1 driver company")
      ) {
        navigation.goBack();
      }
    } finally {
      setLoading(false);
    }
  };

  const onUploadLogo = async () => {
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
      quality: 0.8,
      allowsEditing: true,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;

    const asset = result.assets[0];
    const uri = asset.uri;
    const name = uri.split("/").pop() || "logo.jpg";
    const type = asset.mimeType || "image/jpeg";
    const file = { uri, name, type };

    // Create flow: keep logo local, send with store on Save
    if (companyId == null) {
      setPendingLogo(file);
      setLogoUri(uri);
      return;
    }

    // Update flow: upload immediately
    setLoading(true);
    try {
      const res = await uploadDriverCompanyLogo(UserData, companyId, file);
      if (isApiSuccess(res)) {
        const url = res?.data?.logo_url || uri;
        setLogoUri(url);
        setPendingLogo(null);
        setToast({
          visible: true,
          text: t(res?.message) || t("Submitted successfully"),
          type: "success",
          top: 45,
        });
        return;
      }
      showApiError(res);
    } catch (error) {
      showApiError(null, error);
    } finally {
      setLoading(false);
    }
  };

  const phoneCodeDigits = String(form.mobile_country_code || "+31").replace(
    /^\+/,
    "",
  );

  return (
    <SafeAreaView style={styles.container}>
      <DetailsHeader
        title={
          mode === "edit" ? t("Driver Company") : t("Driver Company")
        }
      />
      <View style={styles.background}>
        <KeyboardAwareScrollView
          enableOnAndroid
          keyboardShouldPersistTaps="handled"
          extraScrollHeight={120}
          scrollEnabled={!countryPickerOpen}
          contentContainerStyle={styles.content}
        >
          {logoUri ? (
            <Image source={{ uri: logoUri }} style={styles.logoPreview} />
          ) : null}

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{t("Bedrijf (Company)")}</Text>
            <Input
              title={t("Company Name")}
              required
              value={form.company_name}
              onChangeText={(v) => setField("company_name", v)}
              placeholder={t("Company Name")}
              error={errors.company_name}
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
                />
              </View>
              <View style={styles.rowItem}>
                <Input
                  title={t("House Nr")}
                  value={form.house_number}
                  onChangeText={(v) => setField("house_number", v)}
                  placeholder={t("House Nr")}
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
                />
              </View>
              <View style={styles.rowItem}>
                <Input
                  title={t("City")}
                  value={form.city}
                  onChangeText={(v) => setField("city", v)}
                  placeholder={t("City")}
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
                    normalizePhoneCode(c?.countrycode || "31"),
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
              title={t("Website")}
              value={form.website}
              onChangeText={(v) => setField("website", v)}
              placeholder={t("Website")}
            />
            <Input
              title={t("Email Address")}
              required
              value={form.email}
              onChangeText={(v) => setField("email", v)}
              placeholder={t("Email Address")}
              keyboardType="email-address"
              error={errors.email}
            />
            <Input
              title={t("Invoice E-mail")}
              value={form.invoice_email}
              onChangeText={(v) => setField("invoice_email", v)}
              placeholder={t("Invoice E-mail")}
              keyboardType="email-address"
              error={errors.invoice_email}
            />
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>
              {t("Officiële informatie")}
            </Text>
            <Input
              title={t("KVK Nr")}
              value={form.kvk_nr}
              onChangeText={(v) => setField("kvk_nr", v)}
              placeholder={t("KVK Nr")}
            />
            <Input
              title={t("BTW Nr")}
              value={form.btw_nr}
              onChangeText={(v) => setField("btw_nr", v)}
              placeholder={t("BTW Nr")}
            />
            <Input
              title={t("IBAN")}
              value={form.iban}
              onChangeText={(v) => setField("iban", v)}
              placeholder={t("IBAN")}
            />
            <Input
              title={t("BIC")}
              value={form.bic}
              onChangeText={(v) => setField("bic", v)}
              placeholder={t("BIC")}
            />

            <Text style={styles.label}>{t("Bank Name")}</Text>
            <Dropdown
              style={[styles.dropdown, { marginTop: 8 }]}
              containerStyle={styles.dropdownList}
              data={bankOptions}
              labelField="label"
              valueField="id"
              placeholder={t("Bank Name")}
              value={form.bank_id}
              dropdownPosition="top"
              onChange={(item) => {
                setField("bank_id", item.id);
                const bic =
                  item?.raw?.bic ||
                  item?.raw?.BIC ||
                  item?.raw?.swift ||
                  "";
                if (bic) {
                  setField("bic", String(bic));
                }
              }}
              search
              placeholderStyle={styles.placeholderStyle}
              selectedTextStyle={styles.selectedTextStyle}
              itemTextStyle={styles.itemTextStyle}
            />
          </View>

          <ButtonComponent
            title={t("Upload logo")}
            onPress={onUploadLogo}
            marginTop={5}
          />

          <ButtonComponent title={t("Save")} onPress={onSave} marginTop={5} />
        </KeyboardAwareScrollView>
      </View>
      <LoadingModal visible={loading} message={t("Please wait…")} />
    </SafeAreaView>
  );
}
