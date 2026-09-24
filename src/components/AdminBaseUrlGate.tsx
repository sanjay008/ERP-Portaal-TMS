import Ionicons from "@expo/vector-icons/Ionicons";
import * as Updates from "expo-updates";
import React, {
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  DevSettings,
  Dimensions,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { GlobalContextData } from "../context/GlobalContext";
import { resetChauffeurLocationSession } from "../hooks/useChauffeurLocation";
import {
  ADMIN_PASSCODE,
  API_BASE_LIST,
  getApiBaseUrl,
  saveApiBaseUrl,
} from "../utils/apiBaseUrl";
import { Colors } from "../utils/colors";
import { FONTS } from "../utils/storeData";

interface AdminBaseUrlGateProps {
  children: ReactNode;
  blocked?: boolean;
}

const TAP_ZONE = 56;
const TAP_TIMEOUT_MS = 2500;
const REQUIRED_TAPS = 6;
const RELOAD_TIMEOUT_MS = 4000;
const SCREEN_H = Dimensions.get("window").height;

const BASE_LABELS: Record<string, string> = {
  erpportaal: "ERP Portaal",
  gesutms: "Gesutms",
};

function logAdminTap(details: Record<string, unknown>) {
  console.log("[AdminBaseUrlGate]", details);
}

async function reloadAppSafely(): Promise<void> {
  if (__DEV__) {
    try {
      DevSettings.reload();
      await new Promise(() => {});
      return;
    } catch (error) {
      logAdminTap({ event: "reload_dev_fail", reason: String(error) });
    }
  }

  try {
    await Promise.race([
      Updates.reloadAsync(),
      new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error("reload_timeout")),
          RELOAD_TIMEOUT_MS,
        );
      }),
    ]);
  } catch (error) {
    logAdminTap({ event: "reload_retry", reason: String(error) });
    try {
      await Updates.reloadAsync();
    } catch (retryError) {
      logAdminTap({ event: "reload_fail", reason: String(retryError) });
      try {
        DevSettings.reload();
      } catch {}
      throw retryError;
    }
  }

  await new Promise(() => {});
}

export default function AdminBaseUrlGate({
  children,
  blocked = false,
}: AdminBaseUrlGateProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const {
    UserData,
    activeShift,
    setActiveShift,
    setIsGpsTracking,
  } = useContext(GlobalContextData);

  const [BaseUrlPopup, setBaseUrlPopup] = useState(false);
  const [PasscodePopup, setPasscodePopup] = useState(false);
  const [passcodeInput, setPasscodeInput] = useState("");
  const [passcodeError, setPasscodeError] = useState("");
  const [selectedBase, setSelectedBase] = useState(() => getApiBaseUrl());
  const [savingBase, setSavingBase] = useState(false);

  const keyboardOffset = useSharedValue(0);
  const bottomInset = insets.bottom;
  const topInset = insets.top;

  const animatePasscodeLift = useCallback(
    (height: number) => {
      keyboardOffset.value = withTiming(Math.max(0, height), {
        duration: Platform.OS === "ios" ? 280 : 240,
        easing: Easing.out(Easing.cubic),
      });
    },
    [keyboardOffset],
  );

  useEffect(() => {
    if (!PasscodePopup) {
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
      const fromScreenY =
        typeof frame?.screenY === "number"
          ? Math.max(0, SCREEN_H - frame.screenY)
          : 0;
      const fromHeight = frame?.height ?? 0;
      animatePasscodeLift(Math.max(fromScreenY, fromHeight));
    };
    const onHide = () => {
      animatePasscodeLift(0);
    };

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [PasscodePopup, animatePasscodeLift, keyboardOffset]);

  // Card sits just above keyboard (bottom-aligned + Y lift). Clamp so it never
  // goes above the safe-area top.
  const passcodeCardStyle = useAnimatedStyle(() => {
    const kb = keyboardOffset.value;
    const maxLift = Math.max(0, SCREEN_H - topInset - 24 - 280);
    const lift = Math.min(kb, maxLift);
    return {
      transform: [{ translateY: -lift }],
      marginBottom: kb > 0 ? 10 : Math.max(bottomInset, 16),
    };
  });

  const tapCountRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTapTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const armTapTimer = useCallback(() => {
    clearTapTimer();
    timerRef.current = setTimeout(() => {
      const prev = tapCountRef.current;
      tapCountRef.current = 0;
      timerRef.current = null;
      if (prev > 0) {
        logAdminTap({
          event: "reset",
          reason: "timeout",
          previousCount: prev,
          required: REQUIRED_TAPS,
        });
      }
    }, TAP_TIMEOUT_MS);
  }, [clearTapTimer]);

  const openPasscodePopup = useCallback(() => {
    tapCountRef.current = 0;
    clearTapTimer();
    setPasscodeInput("");
    setPasscodeError("");
    setPasscodePopup(true);
    logAdminTap({
      event: "passcode_open",
      count: REQUIRED_TAPS,
      required: REQUIRED_TAPS,
    });
  }, [clearTapTimer]);

  const openBaseUrlPopup = useCallback(() => {
    Keyboard.dismiss();
    const current = getApiBaseUrl();
    tapCountRef.current = 0;
    clearTapTimer();
    setSelectedBase(current);
    setPasscodePopup(false);
    setPasscodeInput("");
    setPasscodeError("");
    setBaseUrlPopup(true);
    logAdminTap({
      event: "popup_open",
      count: REQUIRED_TAPS,
      required: REQUIRED_TAPS,
      currentBase: current,
    });
  }, [clearTapTimer]);

  const onSecretTap = useCallback(() => {
    if (BaseUrlPopup || PasscodePopup || blocked) {
      return;
    }

    const next = tapCountRef.current + 1;
    tapCountRef.current = next;

    logAdminTap({
      event: "tap",
      count: next,
      required: REQUIRED_TAPS,
      remaining: Math.max(0, REQUIRED_TAPS - next),
      opened: next >= REQUIRED_TAPS,
    });

    if (next >= REQUIRED_TAPS) {
      openPasscodePopup();
      return;
    }

    armTapTimer();
  }, [BaseUrlPopup, PasscodePopup, blocked, armTapTimer, openPasscodePopup]);

  useEffect(() => {
    if (blocked) {
      tapCountRef.current = 0;
      clearTapTimer();
    }
  }, [blocked, clearTapTimer]);

  useEffect(() => {
    return () => {
      clearTapTimer();
    };
  }, [clearTapTimer]);

  const closePasscodePopup = useCallback(() => {
    Keyboard.dismiss();
    keyboardOffset.value = withTiming(0, {
      duration: 180,
      easing: Easing.out(Easing.quad),
    });
    setPasscodePopup(false);
    setPasscodeInput("");
    setPasscodeError("");
    logAdminTap({
      event: "passcode_close",
    });
  }, [keyboardOffset]);

  const confirmPasscode = useCallback(() => {
    const expected = ADMIN_PASSCODE;
    const entered = String(passcodeInput ?? "").trim();
    if (!expected || entered !== expected) {
      setPasscodeError(t("Invalid passcode"));
      logAdminTap({
        event: "passcode_fail",
      });
      return;
    }
    logAdminTap({
      event: "passcode_ok",
    });
    openBaseUrlPopup();
  }, [passcodeInput, t, openBaseUrlPopup]);

  const closePopup = useCallback(() => {
    if (savingBase) {
      return;
    }
    setBaseUrlPopup(false);
    logAdminTap({
      event: "popup_close",
      currentBase: getApiBaseUrl(),
    });
  }, [savingBase]);

  const savePopup = useCallback(async () => {
    if (savingBase) {
      return;
    }
    const current = getApiBaseUrl();
    if (selectedBase === current) {
      setBaseUrlPopup(false);
      logAdminTap({
        event: "popup_save_skip",
        reason: "unchanged",
        currentBase: current,
      });
      return;
    }

    setSavingBase(true);
    try {
      try {
        const { closeActiveShiftSilent } = await import(
          "@/src/utils/shiftLocationGuard"
        );
        const { wipeShiftLocalData } = await import("@/src/utils/shiftSession");
        await closeActiveShiftSilent(UserData, activeShift);
        await wipeShiftLocalData(
          activeShift?.region_id,
          "admin_base_url_switch",
        );
        resetChauffeurLocationSession();
        setActiveShift?.(null);
        setIsGpsTracking?.(false);
        logAdminTap({
          event: "trip_ended",
          hadShift: !!activeShift,
          from: current,
        });
      } catch (error) {
        logAdminTap({
          event: "trip_end_error",
          reason: String(error),
        });
      }

      const ok = await saveApiBaseUrl(selectedBase);
      logAdminTap({
        event: "popup_save",
        ok,
        from: current,
        to: selectedBase,
      });
      if (!ok) {
        setSavingBase(false);
        return;
      }

      await reloadAppSafely();
      setSavingBase(false);
    } catch (error) {
      logAdminTap({
        event: "save_error",
        reason: String(error),
      });
      setSavingBase(false);
    }
  }, [
    savingBase,
    selectedBase,
    UserData,
    activeShift,
    setActiveShift,
    setIsGpsTracking,
  ]);

  const activeBase = getApiBaseUrl();
  const hasChanges = selectedBase !== activeBase;

  return (
    <View style={styles.container}>
      {children}

      {!BaseUrlPopup && !PasscodePopup && !blocked ? (
        <Pressable
          style={[
            styles.secretTapZone,
            {
              top: insets.top,
              right: 0,
              width: TAP_ZONE,
              height: TAP_ZONE,
            },
          ]}
          onPress={onSecretTap}
          hitSlop={8}
        />
      ) : null}

      <Modal
        visible={PasscodePopup}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => {}}
      >
        <View style={styles.passcodeBackdrop}>
          <Animated.View style={[styles.modalCard, passcodeCardStyle]}>
            <View style={styles.modalHeader}>
              <View style={styles.headerTextWrap}>
                <Text style={styles.modalEyebrow}>{t("Admin")}</Text>
                <Text style={styles.modalTitle}>{t("Passcode")}</Text>
                <Text style={styles.modalSubtitle}>
                  {t("Enter passcode to change API Base URL")}
                </Text>
              </View>
              <Pressable
                onPress={closePasscodePopup}
                hitSlop={12}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={20} color={Colors.darkText} />
              </Pressable>
            </View>

            <TextInput
              value={passcodeInput}
              onChangeText={(value) => {
                setPasscodeInput(value);
                if (passcodeError) {
                  setPasscodeError("");
                }
              }}
              placeholder={t("Enter passcode")}
              placeholderTextColor={Colors.darkText}
              secureTextEntry
              autoFocus
              keyboardType="number-pad"
              returnKeyType="done"
              onSubmitEditing={confirmPasscode}
              style={styles.passcodeInput}
            />
            {passcodeError ? (
              <Text style={styles.passcodeError}>{passcodeError}</Text>
            ) : null}

            <Pressable onPress={confirmPasscode} style={styles.saveBtn}>
              <Text style={styles.saveBtnText}>{t("Confirm")}</Text>
            </Pressable>
          </Animated.View>
        </View>
      </Modal>

      <Modal
        visible={BaseUrlPopup}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={closePopup}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.headerTextWrap}>
                <Text style={styles.modalEyebrow}>{t("Admin")}</Text>
                <Text style={styles.modalTitle}>{t("API Base URL")}</Text>
                <Text style={styles.modalSubtitle}>
                  {t("Choose one server. Saved URL stays after logout.")}
                </Text>
              </View>
              <Pressable
                onPress={closePopup}
                hitSlop={12}
                disabled={savingBase}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={20} color={Colors.darkText} />
              </Pressable>
            </View>

            <View style={styles.listWrap}>
              {API_BASE_LIST.map((item) => {
                const checked = selectedBase === item.url;
                const isLive = activeBase === item.url;
                return (
                  <Pressable
                    key={item.id}
                    style={[styles.optionCard, checked && styles.optionCardActive]}
                    onPress={() => setSelectedBase(item.url)}
                    disabled={savingBase}
                  >
                    <View
                      style={[
                        styles.radioOuter,
                        checked && styles.radioOuterActive,
                      ]}
                    >
                      {checked ? <View style={styles.radioInner} /> : null}
                    </View>
                    <View style={styles.optionTextWrap}>
                      <View style={styles.optionTitleRow}>
                        <Text style={styles.optionTitle}>
                          {t(BASE_LABELS[item.id] ?? item.id)}
                        </Text>
                        {isLive ? (
                          <View style={styles.liveBadge}>
                            <Text style={styles.liveBadgeText}>{t("Active")}</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={styles.optionUrl} numberOfLines={2}>
                        {item.url}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              onPress={savePopup}
              disabled={savingBase || !hasChanges}
              style={[
                styles.saveBtn,
                (!hasChanges || savingBase) && styles.saveBtnDisabled,
              ]}
            >
              {savingBase ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.saveBtnText}>{t("Save")}</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={savingBase}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        <View style={styles.switchingOverlay}>
          <ActivityIndicator size="large" color={Colors.white} />
          <Text style={styles.switchingText}>{t("Save")}...</Text>
        </View>
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
  passcodeBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    justifyContent: "flex-end",
    paddingHorizontal: 20,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  modalCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 18,
    borderWidth: 1,
    borderColor: Colors.modalBorder,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 18,
  },
  headerTextWrap: {
    flex: 1,
    paddingRight: 10,
  },
  modalEyebrow: {
    fontFamily: FONTS.SemiBold,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: Colors.primary,
    marginBottom: 4,
  },
  modalTitle: {
    fontFamily: FONTS.Bold,
    fontSize: 20,
    color: Colors.black,
    marginBottom: 6,
  },
  modalSubtitle: {
    fontFamily: FONTS.Regular,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.darkText,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.litegray1,
  },
  listWrap: {
    gap: 10,
    marginBottom: 18,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1.5,
    borderColor: Colors.Boxgray,
    backgroundColor: Colors.litegray1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  optionCardActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primarylite,
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
  optionTextWrap: {
    flex: 1,
  },
  optionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 3,
  },
  optionTitle: {
    fontFamily: FONTS.SemiBold,
    fontSize: 15,
    color: Colors.black,
  },
  liveBadge: {
    backgroundColor: Colors.litegreen,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  liveBadgeText: {
    fontFamily: FONTS.SemiBold,
    fontSize: 10,
    color: Colors.ReadyText,
  },
  optionUrl: {
    fontFamily: FONTS.Regular,
    fontSize: 12,
    color: Colors.darkText,
  },
  saveBtn: {
    height: 50,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnDisabled: {
    opacity: 0.55,
  },
  saveBtnText: {
    fontFamily: FONTS.SemiBold,
    fontSize: 16,
    color: Colors.white,
  },
  switchingOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.72)",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },
  switchingText: {
    fontFamily: FONTS.Medium,
    fontSize: 14,
    color: Colors.white,
  },
  passcodeInput: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.Boxgray,
    backgroundColor: Colors.litegray1,
    paddingHorizontal: 14,
    marginBottom: 12,
    fontFamily: FONTS.Medium,
    fontSize: 16,
    color: Colors.black,
  },
  passcodeError: {
    fontFamily: FONTS.Regular,
    fontSize: 13,
    color: Colors.red,
    marginBottom: 12,
  },
});
