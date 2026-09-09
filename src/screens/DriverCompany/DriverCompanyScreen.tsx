import { Images } from "@/src/assets/images";
import DetailsHeader from "@/src/components/DetailsHeader";
import { useErrorHandle } from "@/src/components/ErrorHandle";
import LoadingModal from "@/src/components/LoadingModal";
import { GlobalContextData } from "@/src/context/GlobalContext";
import { Colors } from "@/src/utils/colors";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import React, { useCallback, useContext, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Image, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import {
  extractApiErrorMessage,
  fetchDriverCompany,
  isApiSuccess,
  parseGetPayload,
} from "./driverCompanyApi";
import { styles } from "./styles";
import type { DriverCompanyGetData, DriverCompanyRecord } from "./types";

export default function DriverCompanyScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { UserData, setToast } = useContext(GlobalContextData);
  const { ErrorHandle } = useErrorHandle();

  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState<DriverCompanyGetData | null>(null);
  const [errorText, setErrorText] = useState("");

  const userDataRef = useRef(UserData);
  const setToastRef = useRef(setToast);
  const errorHandleRef = useRef(ErrorHandle);
  const tRef = useRef(t);
  const inFlightRef = useRef(false);

  userDataRef.current = UserData;
  setToastRef.current = setToast;
  errorHandleRef.current = ErrorHandle;
  tRef.current = t;

  const load = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setLoading(true);
    setErrorText("");
    try {
      const res = await fetchDriverCompany(userDataRef.current);
      if (isApiSuccess(res)) {
        setPayload(parseGetPayload(res));
        return;
      }
      const msg =
        extractApiErrorMessage(res) ||
        tRef.current("Something went wrong. Please try again.");
      setErrorText(msg);
      setToastRef.current({
        visible: true,
        text: msg,
        type: "error",
        top: 45,
      });
    } catch (error) {
      const apiMsg = extractApiErrorMessage((error as any)?.response?.data);
      const handled = errorHandleRef.current(error);
      const message =
        apiMsg ||
        handled?.message ||
        tRef.current("Something went wrong. Please try again.");
      setErrorText(message);
      setToastRef.current({
        visible: true,
        text: message,
        type: "error",
        top: 45,
      });
    } finally {
      inFlightRef.current = false;
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        if (!active) return;
        await load();
      })();
      return () => {
        active = false;
      };
    }, [load]),
  );

  const screen = payload?.screen;
  const company = payload?.company || null;
  const showAddButton =
    !loading &&
    payload != null &&
    screen === "add" &&
    payload.can_add !== false;

  const openAddForm = () => {
    navigation.navigate("DriverCompanyForm", {
      mode: "add",
      company: null,
      defaults: payload?.defaults || {},
      formLists: payload?.form || {},
    });
  };

  const openEditForm = (item: DriverCompanyRecord) => {
    navigation.navigate("DriverCompanyForm", {
      mode: "edit",
      company: item,
      defaults: payload?.defaults || {},
      formLists: payload?.form || {},
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <DetailsHeader title={t("Driver Company")} />
      <View style={styles.background}>
        {errorText && !company ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.companyMeta}>{errorText}</Text>
            <TouchableOpacity onPress={load} style={{ marginTop: 12 }}>
              <Text style={styles.linkText}>{t("Retry")}</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {screen === "view_edit" && company ? (
          <View style={styles.content}>
            <TouchableOpacity
              style={styles.companyCard}
              activeOpacity={0.85}
              onPress={() => openEditForm(company)}
            >
              {company.logo_url ? (
                <Image
                  source={{ uri: company.logo_url }}
                  style={styles.logoPreview}
                />
              ) : null}
              <Text style={styles.companyTitle}>
                {company.company_name || t("Driver Company")}
              </Text>
              {company.email ? (
                <Text style={styles.companyMeta}>{company.email}</Text>
              ) : null}
              {company.city ? (
                <Text style={styles.companyMeta}>{company.city}</Text>
              ) : null}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  marginTop: 4,
                }}
              >
                <Image
                  source={Images.RightIcon}
                  style={{ width: 16, height: 16 }}
                />
              </View>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.emptyWrap} />
        )}

        {showAddButton ? (
          <TouchableOpacity
            style={[
              styles.addBtn,
              {
                bottom: Math.max(insets.bottom, 16) + 8,
                right: 20,
                backgroundColor: Colors.green,
              },
            ]}
            onPress={openAddForm}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={30} color={Colors.white} />
          </TouchableOpacity>
        ) : null}
      </View>

      <LoadingModal visible={loading} message={t("Please wait…")} />
    </SafeAreaView>
  );
}
