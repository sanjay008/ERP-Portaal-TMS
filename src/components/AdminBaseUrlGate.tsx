import Ionicons from "@expo/vector-icons/Ionicons";
import * as Updates from "expo-updates";
import React, {
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import {
  API_BASE_LIST,
  getApiBaseUrl,
  PRODUCTION_BASE,
  saveApiBaseUrl,
} from "../utils/apiBaseUrl";
import { Colors } from "../utils/colors";
import { FONTS } from "../utils/storeData";

interface AdminBaseUrlGateProps {
  children: ReactNode;
}

const TAP_ZONE = 56;
const TAP_TIMEOUT_MS = 2500;
const REQUIRED_TAPS = 6;

const BASE_LABELS: Record<string, string> = {
  erpportaal: "ERP Portaal",
  gesutms: "Gesutms",
};

function logAdminTap(details: Record<string, unknown>) {
  console.log("[AdminBaseUrlGate]", details);
}

export default function AdminBaseUrlGate({ children }: AdminBaseUrlGateProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const [BaseUrlPopup, setBaseUrlPopup] = useState(false);
  const [selectedBase, setSelectedBase] = useState(PRODUCTION_BASE);
  const [savingBase, setSavingBase] = useState(false);

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

  const openBaseUrlPopup = useCallback(() => {
    const current = getApiBaseUrl(PRODUCTION_BASE);
    tapCountRef.current = 0;
    clearTapTimer();
    setSelectedBase(current);
    setBaseUrlPopup(true);
    logAdminTap({
      event: "popup_open",
      count: REQUIRED_TAPS,
      required: REQUIRED_TAPS,
      currentBase: current,
    });
  }, [clearTapTimer]);

  const onSecretTap = useCallback(() => {
    if (BaseUrlPopup) {
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
      openBaseUrlPopup();
      return;
    }

    armTapTimer();
  }, [BaseUrlPopup, armTapTimer, openBaseUrlPopup]);

  useEffect(() => {
    return () => {
      clearTapTimer();
    };
  }, [clearTapTimer]);

  const closePopup = useCallback(() => {
    if (savingBase) {
      return;
    }
    setBaseUrlPopup(false);
    logAdminTap({
      event: "popup_close",
      currentBase: getApiBaseUrl(PRODUCTION_BASE),
    });
  }, [savingBase]);

  const savePopup = useCallback(async () => {
    if (savingBase) {
      return;
    }
    const current = getApiBaseUrl(PRODUCTION_BASE);
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
      const ok = await saveApiBaseUrl(selectedBase);
      logAdminTap({
        event: "popup_save",
        ok,
        from: current,
        to: selectedBase,
      });
      if (!ok) {
        return;
      }
      setBaseUrlPopup(false);
      try {
        await Updates.reloadAsync();
      } catch {}
    } finally {
      setSavingBase(false);
    }
  }, [savingBase, selectedBase]);

  const activeBase = getApiBaseUrl(PRODUCTION_BASE);
  const hasChanges = selectedBase !== activeBase;

  return (
    <View style={styles.container}>
      {children}

      {!BaseUrlPopup ? (
        <Pressable
          style={[
            styles.secretTapZone,
            {
              top: insets.top,
              width: TAP_ZONE,
              height: TAP_ZONE,
            },
          ]}
          onPress={onSecretTap}
          hitSlop={8}
        />
      ) : null}

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
              disabled={savingBase}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  secretTapZone: {
    position: "absolute",
    left: 0,
    zIndex: 99999,
    elevation: 99999,
    backgroundColor: "transparent",
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
});
