import Ionicons from "@expo/vector-icons/Ionicons";
import * as Updates from "expo-updates";
import React, {
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  DevSettings,
  Dimensions,
  Image,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import apiConstants from "../api/apiConstants";
import { Images } from "../assets/images";
import { GlobalContextData } from "../context/GlobalContext";
import { DropboxContext } from "../context/UploadProider";
import { registerForPushNotificationsAsync } from "../notification/notificationService";
import ApiService from "../utils/Apiservice";
import { Colors } from "../utils/colors";
import {
  SavedAccount,
  accountFromSession,
  applyAccountSession,
  buildSessionFromLoginPayload,
  ensureCurrentAccountSaved,
  upsertSavedAccount,
} from "../utils/multiAccountSession";
import { FONTS, getData } from "../utils/storeData";
import ButtonComponent from "./buttonComponent";
import MyCountryPiker from "./CountryPicker";
import Input from "./input";

interface AccountSwitcherGateProps {
  children: ReactNode;
  /** When true, left secret taps are disabled (back-btn screens / scanners). */
  blocked?: boolean;
}

const TAP_ZONE = 56;
const TAP_TIMEOUT_MS = 2500;
const REQUIRED_TAPS = 6;
const RELOAD_TIMEOUT_MS = 4000;
const EMAIL_REGEX = /^[\w+.-]+@[\w.-]+\.[a-zA-Z]{2,}$/;
const PASSWORD_REGEX = /^(?=.*[a-zA-Z]).*$/;
const SCREEN_H = Dimensions.get("window").height;

type ModalView = "list" | "add";
type AddStep = "company" | "contact" | "secret";
type SecretMode = "password" | "otp" | null;

async function reloadAppSafely(): Promise<void> {
  if (__DEV__) {
    try {
      DevSettings.reload();
      await new Promise(() => {});
      return;
    } catch {
      // fall through
    }
  }

  try {
    await Promise.race([
      Updates.reloadAsync(),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("reload_timeout")), RELOAD_TIMEOUT_MS);
      }),
    ]);
  } catch {
    try {
      await Updates.reloadAsync();
    } catch {
      try {
        DevSettings.reload();
      } catch {
        // ignore
      }
    }
  }

  await new Promise(() => {});
}

export default function AccountSwitcherGate({
  children,
  blocked = false,
}: AccountSwitcherGateProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { UserData, CompanysData, CompanyLogo } = useContext(GlobalContextData);
  const {
    setAccessToken,
    setRefreshToken,
    setClientId,
    setClientSecret,
  } = useContext(DropboxContext);

  const isLoggedIn = Boolean(UserData?.user?.id);
  const sheetMaxHeight = useMemo(
    () => Math.min(SCREEN_H * 0.78, SCREEN_H - insets.top - 24),
    [insets.top],
  );

  const keyboardOffset = useSharedValue(0);
  const topInset = insets.top;

  const animateKeyboardLift = useCallback(
    (height: number) => {
      keyboardOffset.value = withTiming(Math.max(0, height), {
        duration: Platform.OS === "ios" ? 280 : 240,
        easing: Easing.out(Easing.cubic),
      });
    },
    [keyboardOffset],
  );

  const sheetLiftStyle = useAnimatedStyle(() => {
    const lift = keyboardOffset.value;
    const maxH = Math.min(
      sheetMaxHeight,
      Math.max(260, SCREEN_H - lift - topInset - 10),
    );
    return {
      maxHeight: maxH,
      transform: [{ translateY: -lift }],
    };
  });

  const [visible, setVisible] = useState(false);
  const [view, setView] = useState<ModalView>("list");
  const [accounts, setAccounts] = useState<SavedAccount[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [switching, setSwitching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");

  const [addStep, setAddStep] = useState<AddStep>("company");
  const [company, setCompany] = useState("");
  const [companyError, setCompanyError] = useState("");
  const [companyData, setCompanyData] = useState<any>(null);
  const [companyLogo, setCompanyLogoLocal] = useState<string | null>(null);
  const [googleKey, setGoogleKey] = useState<string | null>(null);

  const [showEmail, setShowEmail] = useState(false);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [number, setNumber] = useState("");
  const [numberError, setNumberError] = useState("");
  const [countryCode, setCountryCode] = useState("31");
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);

  const [secretMode, setSecretMode] = useState<SecretMode>(null);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [showPassword, setShowPassword] = useState(true);
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [otpUserId, setOtpUserId] = useState<any>(null);
  const [otpVerifyToken, setOtpVerifyToken] = useState("");
  const [loginCompany, setLoginCompany] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [timer, setTimer] = useState(60);
  const [timerActive, setTimerActive] = useState(false);

  const tapCountRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!visible) {
      keyboardOffset.value = withTiming(0, {
        duration: 180,
        easing: Easing.out(Easing.quad),
      });
      return;
    }

    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const onShow = (e: any) => {
      const frame = e?.endCoordinates;
      // Prefer screenY so lift matches visible keyboard top (edge-to-edge safe).
      const fromScreenY =
        typeof frame?.screenY === "number"
          ? Math.max(0, SCREEN_H - frame.screenY)
          : 0;
      const fromHeight = frame?.height ?? 0;
      const kbHeight = Math.max(fromScreenY, fromHeight);
      animateKeyboardLift(kbHeight);
    };
    const onHide = () => {
      animateKeyboardLift(0);
    };

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [visible, animateKeyboardLift, keyboardOffset]);

  const clearTapTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const armTapTimer = useCallback(() => {
    clearTapTimer();
    timerRef.current = setTimeout(() => {
      tapCountRef.current = 0;
      timerRef.current = null;
    }, TAP_TIMEOUT_MS);
  }, [clearTapTimer]);

  const restoreActiveDropbox = useCallback(async () => {
    try {
      const fullcompany = await getData("COMPANYDATA");
      const dc = fullcompany?.default_company;
      setAccessToken(dc?.company_api_dropbox_access_token || "");
      setRefreshToken(dc?.company_api_dropbox_refresh_token || "");
      setClientId(dc?.company_api_dropbox_client_id || "");
      setClientSecret(dc?.company_api_dropbox_secret_id || "");
    } catch {
      // ignore
    }
  }, [setAccessToken, setRefreshToken, setClientId, setClientSecret]);

  const resetAddForm = useCallback(() => {
    setAddStep("company");
    setCompany(String(CompanysData || "").trim());
    setCompanyError("");
    setCompanyData(null);
    setCompanyLogoLocal(null);
    setGoogleKey(null);
    setShowEmail(false);
    setEmail("");
    setEmailError("");
    setNumber("");
    setNumberError("");
    setCountryCode("31");
    setCountryPickerOpen(false);
    setSecretMode(null);
    setPassword("");
    setPasswordError("");
    setShowPassword(true);
    setOtp("");
    setOtpError("");
    setOtpUserId(null);
    setOtpVerifyToken("");
    setLoginCompany("");
    setLoginEmail("");
    setTimer(60);
    setTimerActive(false);
    setFormError("");
    setLoading(false);
  }, [CompanysData]);

  const openPopup = useCallback(async () => {
    tapCountRef.current = 0;
    clearTapTimer();
    Keyboard.dismiss();
    setView("list");
    resetAddForm();
    setVisible(true);
    try {
      const { accounts: list, activeId: id } = await ensureCurrentAccountSaved();
      setAccounts(list);
      setActiveId(id);
    } catch {
      setAccounts([]);
      setActiveId(null);
    }
  }, [clearTapTimer, resetAddForm]);

  const closePopup = useCallback(() => {
    if (switching || loading) return;
    Keyboard.dismiss();
    keyboardOffset.value = withTiming(0, {
      duration: 180,
      easing: Easing.out(Easing.quad),
    });
    if (view === "add") {
      restoreActiveDropbox();
    }
    setVisible(false);
    setView("list");
    resetAddForm();
    tapCountRef.current = 0;
    clearTapTimer();
  }, [
    switching,
    loading,
    view,
    restoreActiveDropbox,
    resetAddForm,
    clearTapTimer,
    keyboardOffset,
  ]);

  const onSecretTap = useCallback(() => {
    if (!isLoggedIn || visible || blocked || switching) return;

    const next = tapCountRef.current + 1;
    tapCountRef.current = next;

    if (next >= REQUIRED_TAPS) {
      openPopup();
      return;
    }
    armTapTimer();
  }, [isLoggedIn, visible, blocked, switching, openPopup, armTapTimer]);

  useEffect(() => {
    if (blocked || !isLoggedIn) {
      tapCountRef.current = 0;
      clearTapTimer();
    }
  }, [blocked, isLoggedIn, clearTapTimer]);

  useEffect(() => {
    return () => clearTapTimer();
  }, [clearTapTimer]);

  useEffect(() => {
    if (!timerActive || secretMode !== "otp") return;
    const id = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          setTimerActive(false);
          clearInterval(id);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [timerActive, secretMode]);

  const finishWithAccount = useCallback(async (account: SavedAccount): Promise<boolean> => {
    setSwitching(true);
    try {
      await ensureCurrentAccountSaved();
      await upsertSavedAccount(account);
      await applyAccountSession(account);
      await reloadAppSafely();
      return true;
    } catch {
      setSwitching(false);
      setFormError(t("Something went wrong. Please try again."));
      return false;
    }
  }, [t]);

  const onSelectAccount = useCallback(
    async (account: SavedAccount) => {
      if (switching) return;
      if (account.id === activeId) {
        closePopup();
        return;
      }
      setSwitching(true);
      try {
        await ensureCurrentAccountSaved();
        await applyAccountSession(account);
        await reloadAppSafely();
      } catch {
        setSwitching(false);
        setFormError(t("Something went wrong. Please try again."));
      }
    },
    [activeId, closePopup, switching, t],
  );

  const goToAdd = useCallback(() => {
    resetAddForm();
    setView("add");
  }, [resetAddForm]);

  const backFromAdd = useCallback(() => {
    if (loading) return;
    if (addStep === "secret") {
      setAddStep("contact");
      setSecretMode(null);
      setPassword("");
      setOtp("");
      setFormError("");
      return;
    }
    if (addStep === "contact") {
      setAddStep("company");
      setFormError("");
      return;
    }
    restoreActiveDropbox();
    setView("list");
    resetAddForm();
  }, [addStep, loading, resetAddForm, restoreActiveDropbox]);

  const onCompanyContinue = useCallback(async () => {
    const value = company.trim();
    if (!value) {
      setCompanyError(t("Voer bedrijfsnaam in"));
      return;
    }
    setLoading(true);
    setFormError("");
    setCompanyError("");
    try {
      const data = await ApiService(apiConstants.companyLogin, {
        customData: { company_login: value },
      });
      if (!data?.status) {
        setCompanyError(t("Voer een geldige bedrijfsnaam in"));
        return;
      }

      setAccessToken(
        data?.data?.default_company?.company_api_dropbox_access_token || "",
      );
      setRefreshToken(
        data?.data?.default_company?.company_api_dropbox_refresh_token || "",
      );
      setClientId(
        data?.data?.default_company?.company_api_dropbox_client_id || "",
      );
      setClientSecret(
        data?.data?.default_company?.company_api_dropbox_secret_id || "",
      );

      const logoUrl = data?.data?.default_company?.company_logo || null;
      const mapsKey =
        data?.data?.default_company?.project_google_maps_api_key || null;

      setCompanyData(data?.data);
      setCompanyLogoLocal(logoUrl);
      setGoogleKey(mapsKey);
      setCountryCode(
        String(data?.data?.default_company?.country_codes || "31"),
      );
      setAddStep("contact");
    } catch (err: any) {
      setFormError(
        err?.response?.data?.message ||
          err?.message ||
          t("Something went wrong. Please try again."),
      );
    } finally {
      setLoading(false);
    }
  }, [
    company,
    t,
    setAccessToken,
    setRefreshToken,
    setClientId,
    setClientSecret,
  ]);

  const onContactContinue = useCallback(async () => {
    if (showEmail) {
      if (!email.trim()) {
        setEmailError(t("Voer e-mailadres in"));
        return;
      }
      if (!EMAIL_REGEX.test(email.trim())) {
        setEmailError(t("Voer een geldig e-mailadres in"));
        return;
      }
    } else if (!number.trim()) {
      setNumberError(t("Voer nummer in"));
      return;
    }

    setLoading(true);
    setFormError("");
    try {
      const companyLogin = company.trim();
      const payload = {
        company_login: companyLogin,
        country_code: countryCode,
        ...(showEmail
          ? { email: email.trim(), whatsapp_number: "" }
          : { whatsapp_number: number.trim(), email: "" }),
      };

      const data = await ApiService(apiConstants.emailmobilelogin, {
        customData: payload,
      });

      if (!data?.status) {
        setFormError(
          t(data?.message) ||
            data?.message ||
            t("Something went wrong. Please try again."),
        );
        return;
      }

      if (data?.data?.user?.enable_2fa == 1) {
        setSecretMode("otp");
        setOtpUserId(data?.data?.user?.id);
        setOtpVerifyToken(data?.data?.user?.verify_token || "");
        setTimer(60);
        setTimerActive(true);
        setAddStep("secret");
      } else if (data?.data?.user?.enable_2fa == 0) {
        setSecretMode("password");
        setLoginCompany(
          data?.data?.user?.login_company || companyLogin,
        );
        setLoginEmail(data?.data?.user?.email || email.trim());
        setAddStep("secret");
      } else {
        const session = await buildSessionFromLoginPayload({
          userData: data,
          companyLogin,
          companyData,
          companyLogo,
          googleKey,
        });
        const account = accountFromSession(session);
        if (!account) {
          setFormError(t("Something went wrong. Please try again."));
          return;
        }
        await finishWithAccount(account);
      }
    } catch (err: any) {
      setFormError(
        err?.response?.data?.message ||
          err?.message ||
          t("Something went wrong. Please try again."),
      );
    } finally {
      setLoading(false);
    }
  }, [
    showEmail,
    email,
    number,
    company,
    countryCode,
    companyData,
    companyLogo,
    googleKey,
    finishWithAccount,
    t,
  ]);

  const onPasswordVerify = useCallback(async () => {
    if (!password) {
      setPasswordError(t("Please enter your password"));
      return;
    }
    if (!PASSWORD_REGEX.test(password)) {
      setPasswordError(t("Password must include at least letter "));
      return;
    }

    setLoading(true);
    setFormError("");
    try {
      const token = await registerForPushNotificationsAsync();
      const data = await ApiService(apiConstants.Login, {
        customData: {
          password,
          company_login: loginCompany || company.trim(),
          email: loginEmail || email.trim(),
          expo_token: token,
        },
      });

      if (!data?.status) {
        setFormError(
          t(data?.message) || data?.message || t("Oops!"),
        );
        return;
      }

      const session = await buildSessionFromLoginPayload({
        userData: data,
        companyLogin: company.trim(),
        companyData,
        companyLogo,
        googleKey,
      });
      const account = accountFromSession(session);
      if (!account) {
        setFormError(t("Something went wrong. Please try again."));
        return;
      }
      await finishWithAccount(account);
    } catch (err: any) {
      setFormError(
        err?.response?.data?.message ||
          err?.message ||
          t("Something went wrong. Please try again."),
      );
    } finally {
      setLoading(false);
    }
  }, [
    password,
    loginCompany,
    company,
    loginEmail,
    email,
    companyData,
    companyLogo,
    googleKey,
    finishWithAccount,
    t,
  ]);

  const onOtpVerify = useCallback(async () => {
    if (!otp || otp.length < 6) {
      setOtpError(t("Voer OTP in"));
      return;
    }
    setLoading(true);
    setFormError("");
    try {
      const token = await registerForPushNotificationsAsync();
      const data = await ApiService(apiConstants.Verifyotp, {
        customData: {
          company_login: company.trim(),
          user_id: otpUserId,
          otp,
          expo_token: token,
          token: otpVerifyToken,
          otp_type: "mobile_login",
        },
      });

      if (!data?.status) {
        setOtpError(data?.message || t("Oops!"));
        return;
      }

      const session = await buildSessionFromLoginPayload({
        userData: data,
        companyLogin: company.trim(),
        companyData,
        companyLogo,
        googleKey,
      });
      const account = accountFromSession(session);
      if (!account) {
        setFormError(t("Something went wrong. Please try again."));
        return;
      }
      await finishWithAccount(account);
    } catch (err: any) {
      setOtpError(
        err?.response?.data?.message ||
          err?.message ||
          t("Something went wrong. Please try again."),
      );
    } finally {
      setLoading(false);
    }
  }, [
    otp,
    company,
    otpUserId,
    otpVerifyToken,
    companyData,
    companyLogo,
    googleKey,
    finishWithAccount,
    t,
  ]);

  const onResendOtp = useCallback(async () => {
    try {
      await ApiService(apiConstants.resend_otp, {
        customData: {
          company_login: company.trim(),
          user_id: otpUserId,
          otp_type: "mobile_login",
        },
      });
      setTimer(60);
      setTimerActive(true);
      setOtpError("");
    } catch (err: any) {
      setOtpError(
        err?.response?.data?.message ||
          err?.message ||
          t("Something went wrong. Please try again."),
      );
    }
  }, [company, otpUserId, t]);

  const showTapZone = isLoggedIn && !visible && !blocked && !switching;

  const headerTitle =
    view === "list"
      ? t("Accounts")
      : addStep === "company"
        ? t("company")
        : addStep === "contact"
          ? t("Login")
          : secretMode === "otp"
            ? t("verifiëren")
            : t("Password Verification");

  const headerEyebrow =
    view === "list" ? t("Switch") : t("Add Account");

  const primaryActionTitle =
    loading
      ? "..."
      : addStep === "secret"
        ? t("Verify")
        : t("Continue");

  const onPrimaryAction = () => {
    if (addStep === "company") onCompanyContinue();
    else if (addStep === "contact") onContactContinue();
    else if (secretMode === "password") onPasswordVerify();
    else if (secretMode === "otp") onOtpVerify();
  };

  return (
    <View style={styles.container}>
      {children}

      {showTapZone ? (
        <Pressable
          style={[
            styles.secretTapZone,
            {
              top: insets.top,
              left: 0,
              width: TAP_ZONE,
              height: TAP_ZONE,
            },
          ]}
          onPress={onSecretTap}
          hitSlop={8}
        />
      ) : null}

      <Modal
        visible={visible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => {}}
      >
        <View style={styles.modalBackdrop}>
          <Animated.View
            style={[
              styles.sheet,
              {
                paddingBottom: Math.max(insets.bottom, 12),
              },
              sheetLiftStyle,
            ]}
          >
              <View style={styles.handleWrap}>
                <View style={styles.handle} />
              </View>

              <View style={styles.modalHeader}>
                <View style={styles.headerLeft}>
                  {view === "add" ? (
                    <Pressable
                      onPress={backFromAdd}
                      hitSlop={10}
                      style={styles.iconBtn}
                      disabled={loading || switching}
                    >
                      <Ionicons
                        name="chevron-back"
                        size={22}
                        color={Colors.darkText}
                      />
                    </Pressable>
                  ) : null}
                  <View style={styles.headerTextWrap}>
                    <Text style={styles.modalEyebrow}>{headerEyebrow}</Text>
                    <Text style={styles.modalTitle} numberOfLines={1}>
                      {headerTitle}
                    </Text>
                  </View>
                </View>
                <Pressable
                  onPress={closePopup}
                  hitSlop={12}
                  style={styles.closeBtn}
                  disabled={loading || switching}
                >
                  <Ionicons name="close" size={20} color={Colors.darkText} />
                </Pressable>
              </View>

              {view === "list" ? (
                <>
                  <KeyboardAwareScrollView
                    bounces={false}
                    enableOnAndroid
                    enableAutomaticScroll={false}
                    enableResetScrollToCoords={false}
                    keyboardShouldPersistTaps="handled"
                    keyboardOpeningTime={0}
                    extraScrollHeight={0}
                    extraHeight={0}
                    showsVerticalScrollIndicator={false}
                    style={styles.scrollBody}
                    contentContainerStyle={styles.listContent}
                  >
                    {accounts.length === 0 ? (
                      <View style={styles.emptyWrap}>
                        <View style={styles.emptyIcon}>
                          <Ionicons
                            name="people-outline"
                            size={22}
                            color={Colors.darkText}
                          />
                        </View>
                        <Text style={styles.emptyText}>{t("No accounts")}</Text>
                      </View>
                    ) : (
                      accounts.map((account) => {
                        const isActive = account.id === activeId;
                        return (
                          <Pressable
                            key={account.id}
                            onPress={() => onSelectAccount(account)}
                            style={[
                              styles.accountCard,
                              isActive && styles.accountCardActive,
                            ]}
                          >
                            {account.profileImage ? (
                              <Image
                                source={{ uri: account.profileImage }}
                                style={styles.avatar}
                              />
                            ) : (
                              <View style={styles.avatarFallback}>
                                <Ionicons
                                  name="person"
                                  size={18}
                                  color={Colors.darkText}
                                />
                              </View>
                            )}
                            <View style={styles.accountTextWrap}>
                              <View style={styles.accountTitleRow}>
                                <Text
                                  style={styles.accountName}
                                  numberOfLines={1}
                                >
                                  {account.displayName}
                                </Text>
                                {isActive ? (
                                  <View style={styles.activeBadge}>
                                    <Text style={styles.activeBadgeText}>
                                      {t("Active")}
                                    </Text>
                                  </View>
                                ) : null}
                              </View>
                              <Text style={styles.accountMeta} numberOfLines={1}>
                                {account.companyLogin}
                              </Text>
                              {account.identifier ? (
                                <Text
                                  style={styles.accountMeta}
                                  numberOfLines={1}
                                >
                                  {account.identifier}
                                </Text>
                              ) : null}
                            </View>
                            <View
                              style={[
                                styles.radioOuter,
                                isActive && styles.radioOuterActive,
                              ]}
                            >
                              {isActive ? (
                                <View style={styles.radioInner} />
                              ) : null}
                            </View>
                          </Pressable>
                        );
                      })
                    )}
                  </KeyboardAwareScrollView>

                  <View style={styles.footer}>
                    <Pressable
                      onPress={goToAdd}
                      style={styles.addBtn}
                      disabled={switching}
                    >
                      <Ionicons name="add" size={20} color={Colors.white} />
                      <Text style={styles.addBtnText}>{t("Add Account")}</Text>
                    </Pressable>
                  </View>
                </>
              ) : (
                <>
                  <KeyboardAwareScrollView
                    bounces={false}
                    enableOnAndroid
                    enableAutomaticScroll={false}
                    enableResetScrollToCoords={false}
                    nestedScrollEnabled
                    scrollEnabled={!countryPickerOpen}
                    keyboardShouldPersistTaps="handled"
                    keyboardOpeningTime={0}
                    extraScrollHeight={0}
                    extraHeight={0}
                    showsVerticalScrollIndicator={false}
                    style={styles.scrollBody}
                    contentContainerStyle={styles.formContent}
                  >
                    {(companyLogo || CompanyLogo) && addStep !== "company" ? (
                      <Image
                        source={{ uri: companyLogo || CompanyLogo }}
                        style={styles.formLogo}
                        resizeMode="contain"
                      />
                    ) : null}

                    {addStep === "company" ? (
                      <Input
                        value={company}
                        onChangeText={(txt) => {
                          setCompany(txt);
                          setCompanyError("");
                        }}
                        title={t("company")}
                        error={companyError}
                        iconSource={Images.website}
                        keyboardType="default"
                        required
                        {...({ autoCapitalize: "none" } as object)}
                      />
                    ) : null}

                    {addStep === "contact" ? (
                      <>
                        {!showEmail ? (
                          <>
                            <Text style={styles.fieldLabel}>
                              {t("WhatsApp nummer")}
                            </Text>
                            <View style={styles.countryWrap}>
                              <MyCountryPiker
                                value={number}
                                setValue={(txt: string) => {
                                  setNumber(txt);
                                  setNumberError("");
                                }}
                                countryCode={countryCode}
                                onSelect={(c: any) =>
                                  setCountryCode(c?.countrycode || "31")
                                }
                                onOpenChange={setCountryPickerOpen}
                                placeholder={t("Enter phone number")}
                                ContainerStyle={{ flex: 1, width: "100%" }}
                              />
                            </View>
                            {numberError ? (
                              <Text style={styles.inlineError}>
                                {numberError}
                              </Text>
                            ) : null}
                            <Pressable
                              onPress={() => {
                                setShowEmail(true);
                                setNumber("");
                                setNumberError("");
                              }}
                              style={styles.switchLinkWrap}
                            >
                              <Text style={styles.switchLink}>
                                {t("Login Met E-mail Adres")}
                              </Text>
                            </Pressable>
                          </>
                        ) : (
                          <>
                            <Input
                              value={email}
                              onChangeText={(txt) => {
                                setEmail(txt);
                                setEmailError("");
                              }}
                              title="E-mail"
                              iconSource={Images.website}
                              error={emailError}
                              keyboardType="email-address"
                              {...({ autoCapitalize: "none" } as object)}
                            />
                            <Pressable
                              onPress={() => {
                                setShowEmail(false);
                                setEmail("");
                                setEmailError("");
                              }}
                              style={styles.switchLinkWrap}
                            >
                              <Text style={styles.switchLink}>
                                {t("Login Met WhatsApp Nummer")}
                              </Text>
                            </Pressable>
                          </>
                        )}
                      </>
                    ) : null}

                    {addStep === "secret" && secretMode === "password" ? (
                      <Input
                        value={password}
                        onChangeText={(txt) => {
                          setPassword(txt);
                          setPasswordError("");
                        }}
                        iconSource={Images.lock}
                        rightIcon={showPassword ? Images.eyeoff : Images.eye}
                        onPress={() => setShowPassword(!showPassword)}
                        error={passwordError}
                        placeholder={t("Enter your password")}
                        {...({ secureTextEntry: showPassword } as object)}
                      />
                    ) : null}

                    {addStep === "secret" && secretMode === "otp" ? (
                      <>
                        <Input
                          value={otp}
                          onChangeText={(txt) => {
                            setOtp(txt);
                            setOtpError("");
                          }}
                          keyboardType="numeric"
                          maxLength={6}
                          error={otpError}
                          placeholder="*"
                        />
                        <View style={styles.otpRow}>
                          {timerActive ? (
                            <Text style={styles.otpTimer}>{timer}s</Text>
                          ) : (
                            <Pressable onPress={onResendOtp}>
                              <Text style={styles.switchLink}>
                                {t("Resend OTP")}
                              </Text>
                            </Pressable>
                          )}
                        </View>
                      </>
                    ) : null}

                    {formError ? (
                      <Text style={styles.formError}>{formError}</Text>
                    ) : null}
                  </KeyboardAwareScrollView>

                  <View style={styles.footer}>
                    <ButtonComponent
                      marginTop={0}
                      disabled={loading || switching}
                      title={primaryActionTitle}
                      onPress={onPrimaryAction}
                    />
                  </View>
                </>
              )}
            </Animated.View>
        </View>

        {(loading || switching) && (
          <View style={styles.loadingOverlay} pointerEvents="auto">
            <ActivityIndicator size="large" color={Colors.white} />
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  secretTapZone: {
    position: "absolute",
    zIndex: 99999,
    elevation: 99999,
    backgroundColor: "transparent",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.52)",
    justifyContent: "flex-end",
  },
  sheet: {
    width: "100%",
    maxHeight: SCREEN_H * 0.78,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: Colors.modalBorder,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 18,
    overflow: "hidden",
  },
  handleWrap: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 6,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.Boxgray,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.Boxgray,
  },
  headerLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingRight: 8,
  },
  headerTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  modalEyebrow: {
    fontFamily: FONTS.SemiBold,
    fontSize: 11,
    letterSpacing: 1.1,
    textTransform: "uppercase",
    color: Colors.primary,
    marginBottom: 2,
  },
  modalTitle: {
    flexShrink: 1,
    fontFamily: FONTS.Bold,
    fontSize: 18,
    color: Colors.black,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.litegray1,
  },
  scrollBody: {
    flexGrow: 0,
    flexShrink: 1,
  },
  listContent: {
    paddingBottom: 8,
    gap: 10,
  },
  emptyWrap: {
    alignItems: "center",
    paddingVertical: 28,
    gap: 10,
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.litegray1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontFamily: FONTS.Regular,
    fontSize: 13,
    color: Colors.darkText,
    textAlign: "center",
  },
  accountCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1.5,
    borderColor: Colors.Boxgray,
    backgroundColor: Colors.litegray1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  accountCardActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primarylite,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.litegray,
  },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.litegray,
    alignItems: "center",
    justifyContent: "center",
  },
  accountTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  accountTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  accountName: {
    flexShrink: 1,
    fontFamily: FONTS.SemiBold,
    fontSize: 15,
    color: Colors.black,
  },
  activeBadge: {
    backgroundColor: Colors.litegreen,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  activeBadgeText: {
    fontFamily: FONTS.SemiBold,
    fontSize: 10,
    color: Colors.ReadyText,
  },
  accountMeta: {
    fontFamily: FONTS.Regular,
    fontSize: 12,
    color: Colors.darkText,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.Boxgray,
    alignItems: "center",
    justifyContent: "center",
  },
  radioOuterActive: {
    borderColor: Colors.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  footer: {
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.Boxgray,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
  },
  addBtnText: {
    fontFamily: FONTS.SemiBold,
    fontSize: 15,
    color: Colors.white,
  },
  formContent: {
    paddingBottom: 8,
  },
  formLogo: {
    width: "62%",
    height: 40,
    alignSelf: "center",
    marginBottom: 10,
  },
  fieldLabel: {
    fontFamily: FONTS.Medium,
    fontSize: 13,
    color: Colors.black,
    marginBottom: 6,
    marginTop: 4,
  },
  countryWrap: {
    width: "100%",
  },
  inlineError: {
    color: Colors.red,
    fontFamily: FONTS.Regular,
    fontSize: 11,
    marginTop: 4,
  },
  switchLinkWrap: {
    marginTop: 14,
    alignItems: "center",
  },
  switchLink: {
    fontFamily: FONTS.Medium,
    fontSize: 13,
    color: Colors.primary,
  },
  otpRow: {
    marginTop: 10,
    alignItems: "center",
  },
  otpTimer: {
    fontFamily: FONTS.Medium,
    fontSize: 13,
    color: Colors.darkText,
  },
  formError: {
    marginTop: 10,
    fontFamily: FONTS.Regular,
    fontSize: 12,
    color: Colors.red,
    textAlign: "center",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
});
