import { Ionicons } from "@expo/vector-icons";
import CheckBox from "@react-native-community/checkbox";
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Dimensions,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import Animated, {
  Easing,
  FadeInDown,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import SignatureCanvas, {
  SignatureViewRef,
} from "react-native-signature-canvas";
import { GlobalContextData } from "../context/GlobalContext";
import { Colors } from "../utils/colors";
import { FONTS } from "../utils/storeData";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

const IS_SMALL = SCREEN_H < 680;

const MODAL_W = Math.min(SCREEN_W * 0.92, 480);
const MODAL_H = IS_SMALL
  ? Math.min(SCREEN_H * 0.46, 340)
  : Math.min(SCREEN_H * 0.52, 460);

const DURATION = 260;

export type DamageItemPayload = {
  item: number;
  is_damage: number;
};

export interface SignatureModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (base64: string, name?: string, damageItems?: DamageItemPayload[]) => void;
  onClear?: () => void;
  onPress?: () => void;
  title?: string;
  penColor?: string;
  backgroundColor?: string;
  showNameField?: boolean;
  IsLoading?: boolean;
  defaultName?: string | null;
  ProductDamageList?: any[];
}

type LocalParcelItem = {
  id: number;
  is_damaged_delivery: number | null;
  delivery_label?: string | null;
  scan_qty?: number;
  item_status_id?: number;
  tms_product_name?: string | null;
};

const SignatureModal: React.FC<SignatureModalProps> = ({
  visible,
  onClose,
  onSave,
  onClear,
  title = "",
  penColor = Colors.black,
  backgroundColor = Colors.white,
  showNameField = true,
  IsLoading = false,
  defaultName = "",
  onPress,
  ProductDamageList = [],
}) => {
  const { t } = useTranslation();
  const signatureRef = useRef<SignatureViewRef>(null);
  const [rendered, setRendered] = useState(visible);
  const [name, setName] = useState(defaultName ?? "");
  const [nameError, setNameError] = useState(false);
  const pendingNameRef = useRef<string>("");
  const [canvasKey, setCanvasKey] = useState(0);
  const opacity = useSharedValue(0);
  const { AllDamageListReason, selectDamageData } = useContext(GlobalContextData);

  const [localItems, setLocalItems] = useState<LocalParcelItem[]>([]);
  const [expandedTypeId, setExpandedTypeId] = useState<number | null>(null);
  const [changeTargetItem, setChangeTargetItem] = useState<LocalParcelItem | null>(null);
  const [changeSelection, setChangeSelection] = useState<any>(null);

  const hasParcelDamageList = ProductDamageList.length > 0;
  const damageTypes = AllDamageListReason ?? [];

  const backdropStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const cardStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const getTextColor = (bgColor: string) => {
    if (!bgColor) return "#000";
    const color = bgColor.replace("#", "");
    const r = parseInt(color.substring(0, 2), 16);
    const g = parseInt(color.substring(2, 4), 16);
    const b = parseInt(color.substring(4, 6), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 128 ? "#000" : "#FFF";
  };

  const getDamageField = (item: any) =>
    item?.is_damaged_delivery ?? item?.is_damaged_pickup ?? null;

  const initLocalItems = useCallback(() => {
    if (!ProductDamageList?.length) {
      setLocalItems([]);
      return;
    }
    setLocalItems(
      ProductDamageList.map((item: any) => ({
        id: item.id,
        is_damaged_delivery: getDamageField(item),
        delivery_label: item.delivery_label,
        scan_qty: item.scan_qty,
        item_status_id: item.item_status_id,
        tms_product_name: item.tms_product_name,
      })),
    );
    setExpandedTypeId(null);
    setChangeTargetItem(null);
    setChangeSelection(null);
  }, [ProductDamageList]);

  const handleUnmount = useCallback(() => setRendered(false), []);

  useEffect(() => {
    if (visible) {
      setRendered(true);
      setCanvasKey((k) => k + 1);
      setName(defaultName ?? "");
      setNameError(false);
      pendingNameRef.current = "";
      opacity.value = withTiming(1, { duration: DURATION, easing: Easing.out(Easing.cubic) });
    } else {
      opacity.value = withTiming(0, { duration: DURATION, easing: Easing.in(Easing.cubic) }, (done) => {
        if (done) runOnJS(handleUnmount)();
      });
    }
  }, [visible]);

  useEffect(() => {
    if (visible) {
      initLocalItems();
    }
  }, [visible, initLocalItems]);

  const countByType = useMemo(() => {
    const counts: Record<number, number> = {};
    damageTypes.forEach((type: any) => {
      counts[type.id] = 0;
    });
    localItems.forEach((item) => {
      const typeId = Number(item.is_damaged_delivery);
      if (!Number.isNaN(typeId)) {
        counts[typeId] = (counts[typeId] ?? 0) + 1;
      }
    });
    return counts;
  }, [localItems, damageTypes]);

  const expandedItems = useMemo(() => {
    if (expandedTypeId == null) return [];
    return localItems.filter(
      (item) => Number(item.is_damaged_delivery) === Number(expandedTypeId),
    );
  }, [localItems, expandedTypeId]);

  const changeOptions = useMemo(() => {
    if (!changeTargetItem) return [];
    const currentId = Number(changeTargetItem.is_damaged_delivery);
    return damageTypes.filter((type: any) => Number(type.id) !== currentId);
  }, [changeTargetItem, damageTypes]);

  const buildDamagePayload = useCallback((): DamageItemPayload[] => {
    return localItems.map((item) => ({
      item: item.id,
      is_damage: Number(item.is_damaged_delivery),
    }));
  }, [localItems]);

  if (!rendered) return null;

  const handleClear = () => {
    signatureRef.current?.clearSignature();
    setName(defaultName ?? "");
    setNameError(false);
    pendingNameRef.current = "";
    onClear?.();
  };

  const handleSave = () => {
    if (showNameField && name.trim() === "") {
      setNameError(true);
      return;
    }
    pendingNameRef.current = name.trim();
    signatureRef.current?.readSignature();
  };

  const handleSignatureOK = (base64: string) => {
    const damageItems =
      hasParcelDamageList && localItems.length > 0
        ? buildDamagePayload()
        : undefined;
    onSave(
      base64,
      showNameField ? pendingNameRef.current : undefined,
      damageItems,
    );
  };

  const toggleExpand = (typeId: number) => {
    setExpandedTypeId((prev) => (prev === typeId ? null : typeId));
  };

  const openChangePopup = (item: LocalParcelItem) => {
    setChangeTargetItem(item);
    setChangeSelection(null);
  };

  const closeChangePopup = () => {
    setChangeTargetItem(null);
    setChangeSelection(null);
  };
const confirmChange = () => {
  if (!changeTargetItem || !changeSelection) return;
  setLocalItems((prev) =>
    prev.map((item) =>
      item.id === changeTargetItem.id
        ? { ...item, is_damaged_delivery: changeSelection.id }
        : item,
    ),
  );
  setExpandedTypeId(null);
  closeChangePopup();
};

  const getParcelLabel = (item: LocalParcelItem) => {
    if (item.tms_product_name?.trim()) {
      return item.tms_product_name.trim();
    }
    if (item.delivery_label) {
      return `${t("Parcel")} ${item.delivery_label}`;
    }
    return `${t("Parcel")} #${item.id}`;
  };

  const getTypeById = (typeId: number | null) =>
    damageTypes.find((type: any) => Number(type.id) === Number(typeId));

  const webStyle = `
    * { box-sizing: border-box; }
    body, html {
      background-color: ${backgroundColor};
      margin: 0; padding: 0;
      overflow: hidden;
    }
    .m-signature-pad {
      box-shadow: none; border: none;
      margin: 0; width: 100%; height: 100%;
      background-color: ${backgroundColor};
    }
    .m-signature-pad--body {
      border: none; margin: 0;
      background-color: ${backgroundColor};
    }
    .m-signature-pad--footer { display: none !important; }
  `;

  return (
    <View style={[StyleSheet.absoluteFill, styles.root]} pointerEvents="box-none">
      <Animated.View
        style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}
        pointerEvents={visible ? "auto" : "none"}
      />

      <View style={styles.centerContainer} pointerEvents="box-none">
        {hasParcelDamageList && damageTypes.length > 0 && (
          <View style={styles.damageSection}>
            <View style={styles.hintRow}>
              <Text style={styles.hintText}>{t("Signature")}</Text>
            </View>

            <View style={styles.typeBoxRow}>
              {damageTypes.map((type: any) => {
                const isExpanded = expandedTypeId === type.id;
                const count = countByType[type.id] ?? 0;
                const textColor = getTextColor(type.color);

                return (
                  <Pressable
                    key={type.id}
                    onPress={() => toggleExpand(type.id)}
                    style={({ pressed }) => [
                      styles.typeBox,
                      {
                        backgroundColor: type.color || Colors.Boxgray,
                        opacity: pressed ? 0.9 : 1,
                        borderWidth: isExpanded ? 2.5 : 0,
                        borderColor: Colors.white,
                      },
                    ]}
                  >
                    <Text
                      style={[styles.typeBoxTitle, { color: textColor }]}
                      numberOfLines={2}
                    >
                      {t(type.title)}
                    </Text>
                    <View style={styles.typeBoxCountRow}>
                      <Text style={[styles.typeBoxCount, { color: textColor }]}>
                        {count}
                      </Text>
                      <Ionicons
                        name={isExpanded ? "chevron-up" : "chevron-down"}
                        size={16}
                        color={textColor}
                      />
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {expandedTypeId != null && (
              <Animated.View
                entering={FadeInDown.duration(220)}
                style={styles.expandedList}
              >
                {expandedItems.length > 0 ? (
                  expandedItems.map((item) => {
                    const typeInfo = getTypeById(item.is_damaged_delivery);
                    return (
                      <View key={item.id} style={styles.parcelRow}>
                        <View style={styles.parcelRowLeft}>
                          <View
                            style={[
                              styles.parcelDot,
                              { backgroundColor: typeInfo?.color || Colors.Boxgray },
                            ]}
                          />
                          <Text style={styles.parcelLabel} numberOfLines={1}>
                            {getParcelLabel(item)}
                          </Text>
                        </View>
                        <Pressable
                          onPress={() => openChangePopup(item)}
                          style={({ pressed }) => [
                            styles.changeBtn,
                            pressed && styles.changeBtnPressed,
                          ]}
                        >
                          <Text style={styles.changeBtnText}>{t("Change")}</Text>
                        </Pressable>
                      </View>
                    );
                  })
                ) : (
                  <View style={styles.emptyExpanded}>
                    <Text style={styles.emptyExpandedText}>
                      {t("No parcels in this category")}
                    </Text>
                  </View>
                )}
              </Animated.View>
            )}
          </View>
        )}

        {!hasParcelDamageList && selectDamageData && (
          <Pressable
            style={[
              styles.selectedDamageRow,
              { backgroundColor: selectDamageData?.color || Colors.Boxgray },
            ]}
          >
            <CheckBox
              value={true}
              tintColors={{ true: Colors.white, false: Colors.white }}
              tintColor={Colors.white}
              onTintColor={Colors.white}
              onCheckColor={Colors.white}
              onFillColor={selectDamageData?.color || Colors.Boxgray}
            />
            <Text
              style={[
                styles.selectedDamageText,
                { color: getTextColor(selectDamageData?.color) || Colors.black },
              ]}
            >
              {selectDamageData?.title}
            </Text>
          </Pressable>
        )}

        <Animated.View style={cardStyle}>
          <View style={styles.card}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={20} color={Colors.darkText} />
            </TouchableOpacity>

            {title !== "" && (
              <Text style={styles.titleText} numberOfLines={1}>
                {title}
              </Text>
            )}

            <View style={styles.headerRight}>
              <TouchableOpacity
                style={styles.clearBtn}
                onPress={handleClear}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                activeOpacity={0.7}
              >
                <Ionicons name="trash-outline" size={19} color={Colors.darkText} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.divider} />

          {showNameField && (
            <View style={styles.nameFieldWrapper}>
              <Text style={styles.nameLabel}>{t("Name")}</Text>
              <TextInput
                style={[styles.nameInput, nameError && styles.nameInputError]}
                value={name}
                onChangeText={(val) => {
                  setName(val);
                  if (val.trim() !== "") setNameError(false);
                }}
                placeholder={t("Enter name")}
                placeholderTextColor={Colors.inActive}
                returnKeyType="done"
                autoCorrect={false}
                autoCapitalize="words"
                maxLength={80}
              />
              {nameError && (
                <Text style={styles.nameErrorText}>{t("Name is required")}</Text>
              )}
            </View>
          )}

          <View style={styles.canvasWrapper} collapsable={false}>
            <View style={styles.canvasBorder} collapsable={false}>
              <SignatureCanvas
                key={canvasKey}
                ref={signatureRef}
                onOK={handleSignatureOK}
                onEmpty={() => {}}
                descriptionText=""
                clearText=""
                confirmText=""
                webStyle={webStyle}
                autoClear={false}
                penColor={penColor}
                style={styles.canvas}
                scrollable={false}
                androidHardwareAccelerationDisabled={Platform.OS === "android"}
              />
            </View>
          </View>
          </View>
        </Animated.View>

        <TouchableOpacity
          style={styles.saveBtn}
          onPress={handleSave}
          activeOpacity={0.8}
          disabled={IsLoading}
        >
          {IsLoading ? (
            <ActivityIndicator size={"small"} color={Colors.white} />
          ) : (
            <>
              <Ionicons name="checkmark" size={16} color={Colors.white} />
              <Text style={styles.saveBtnText}>{t("Save")}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {changeTargetItem != null && (
        <View style={styles.changeOverlay}>
          <Pressable style={styles.changeBackdrop} onPress={closeChangePopup} />
          <Animated.View
            entering={FadeInDown.duration(200)}
            style={styles.changeSheet}
          >
            <Text style={styles.changeSheetTitle}>{t("Change parcel condition")}</Text>
            <Text style={styles.changeSheetSubtitle} numberOfLines={1}>
              {getParcelLabel(changeTargetItem)}
            </Text>

            <View style={styles.changeOptionsList}>
              {changeOptions.map((option: any) => (
                <Pressable
                  key={option.id}
                  onPress={() => setChangeSelection(option)}
                  style={[
                    styles.changeOption,
                    {
                      backgroundColor: option.color || Colors.Boxgray,
                      borderWidth: changeSelection?.id === option.id ? 2.5 : 0,
                      borderColor: Colors.white,
                    },
                  ]}
                >
                  <CheckBox
                    value={changeSelection?.id === option.id}
                    onValueChange={() => setChangeSelection(option)}
                    tintColors={{ true: Colors.white, false: Colors.white }}
                    tintColor={Colors.white}
                    onTintColor={Colors.white}
                    onCheckColor={Colors.white}
                    onFillColor={option.color || Colors.Boxgray}
                  />
                  <Text
                    style={[
                      styles.changeOptionText,
                      { color: getTextColor(option.color) },
                    ]}
                  >
                    {t(option.title)}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.changeSheetActions}>
              <Pressable
                onPress={closeChangePopup}
                style={({ pressed }) => [
                  styles.changeCancelBtn,
                  pressed && styles.changeBtnPressed,
                ]}
              >
                <Text style={styles.changeCancelText}>{t("Cancel")}</Text>
              </Pressable>
              <Pressable
                onPress={confirmChange}
                disabled={!changeSelection}
                style={({ pressed }) => [
                  styles.changeSaveBtn,
                  !changeSelection && styles.changeSaveBtnDisabled,
                  pressed && changeSelection && styles.changeBtnPressed,
                ]}
              >
                <Text style={styles.changeSaveText}>{t("Save")}</Text>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      )}
    </View>
  );
};

export default SignatureModal;

const styles = StyleSheet.create({
  root: {
    zIndex: 9999,
    elevation: 999,
    backgroundColor: Colors.green,
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: IS_SMALL ? 12 : 20,
    paddingHorizontal: 0,
  },
  backdrop: {
    backgroundColor: Colors.transparant,
  },
  damageSection: {
    width: MODAL_W,
    marginBottom: IS_SMALL ? 8 : 12,
  },
  typeBoxRow: {
    flexDirection: "row",
    gap: 8,
  },
  typeBox: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: IS_SMALL ? 10 : 12,
    paddingHorizontal: 10,
    minHeight: IS_SMALL ? 64 : 72,
    justifyContent: "space-between",
  },
  typeBoxTitle: {
    fontSize: 12,
    fontFamily: FONTS.SemiBold,
    lineHeight: 16,
  },
  typeBoxCountRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
  },
  typeBoxCount: {
    fontSize: 22,
    fontFamily: FONTS.SemiBold,
  },
  expandedList: {
    marginTop: 8,
    backgroundColor: Colors.white,
    borderRadius: 8,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: Colors.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
      },
      android: { elevation: 12 },
    }),
  },
  parcelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.Boxgray,
  },
  parcelRowLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginRight: 10,
  },
  parcelDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  parcelLabel: {
    flex: 1,
    fontSize: 13,
    fontFamily: FONTS.Medium,
    color: Colors.black,
  },
  changeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: Colors.primary,
  },
  changeBtnPressed: {
    opacity: 0.85,
  },
  changeBtnText: {
    fontSize: 12,
    fontFamily: FONTS.SemiBold,
    color: Colors.white,
  },
  emptyExpanded: {
    padding: 12,
    alignItems: "center",
  },
  emptyExpandedText: {
    fontSize: 12,
    fontFamily: FONTS.Medium,
    color: Colors.orderdark,
  },
  changeOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100002,
    justifyContent: "center",
    alignItems: "center",
  },
  changeBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  changeSheet: {
    width: Math.min(SCREEN_W * 0.88, 400),
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 18,
    zIndex: 999,
    ...Platform.select({
      ios: {
        shadowColor: Colors.black,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
      },
      android: { elevation: 16 },
    }),
  },
  changeSheetTitle: {
    fontSize: 16,
    fontFamily: FONTS.SemiBold,
    color: Colors.black,
    marginBottom: 4,
  },
  changeSheetSubtitle: {
    fontSize: 13,
    fontFamily: FONTS.Medium,
    color: Colors.orderdark,
    marginBottom: 14,
  },
  changeOptionsList: {
    gap: 8,
    marginBottom: 16,
  },
  changeOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  changeOptionText: {
    fontSize: 14,
    fontFamily: FONTS.Medium,
    flex: 1,
  },
  changeSheetActions: {
    flexDirection: "row",
    gap: 10,
  },
  changeCancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.Boxgray,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.BtnBg,
  },
  changeCancelText: {
    fontSize: 14,
    fontFamily: FONTS.Medium,
    color: Colors.darkText,
  },
  changeSaveBtn: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
  },
  changeSaveBtnDisabled: {
    opacity: 0.45,
  },
  changeSaveText: {
    fontSize: 14,
    fontFamily: FONTS.SemiBold,
    color: Colors.white,
  },
  card: {
    width: MODAL_W,
    height: MODAL_H,
    backgroundColor: Colors.white,
    borderRadius: 7,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: Colors.black,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.18,
        shadowRadius: 20,
      },
      android: {
        elevation: 20,
      },
    }),
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: IS_SMALL ? 7 : 11,
    gap: 8,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.litegray1,
    alignItems: "center",
    justifyContent: "center",
  },
  titleText: {
    flex: 1,
    fontSize: 15,
    fontFamily: FONTS.SemiBold,
    color: Colors.black,
    letterSpacing: 0.15,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginLeft: "auto",
  },
  clearBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    borderColor: Colors.Boxgray,
    backgroundColor: Colors.BtnBg,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    height: IS_SMALL ? 44 : 50,
    width: MODAL_W,
    justifyContent: "center",
    borderRadius: 4,
    backgroundColor: Colors.borderColor,
    gap: 5,
    marginTop: IS_SMALL ? 8 : 12,
  },
  saveBtnText: {
    fontSize: 13,
    fontFamily: FONTS.SemiBold,
    color: Colors.white,
    letterSpacing: 0.2,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.modalBorder,
  },
  nameFieldWrapper: {
    paddingHorizontal: 14,
    paddingTop: IS_SMALL ? 7 : 11,
    paddingBottom: IS_SMALL ? 2 : 4,
    gap: IS_SMALL ? 3 : 5,
  },
  nameLabel: {
    fontSize: 12,
    fontFamily: FONTS.SemiBold,
    color: Colors.darkText,
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  nameInput: {
    height: IS_SMALL ? 34 : 38,
    borderWidth: 1.5,
    borderColor: Colors.Boxgray,
    borderRadius: 6,
    paddingHorizontal: 11,
    fontSize: 13,
    fontFamily: FONTS.Regular,
    color: Colors.black,
    backgroundColor: Colors.BtnBg,
  },
  nameInputError: {
    borderColor: Colors.red ?? "#E53935",
  },
  nameErrorText: {
    fontSize: 11,
    fontFamily: FONTS.Regular,
    color: Colors.red ?? "#E53935",
    marginTop: 3,
    letterSpacing: 0.15,
  },
  canvasWrapper: {
    flex: 1,
    padding: IS_SMALL ? 8 : 14,
    paddingBottom: IS_SMALL ? 6 : 12,
  },
  canvasBorder: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: Colors.white,
  },
  canvas: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  hintRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginBottom: IS_SMALL ? 6 : 10,
  },
  hintText: {
    fontSize: 20,
    fontFamily: FONTS.Regular,
    color: Colors.white,
    letterSpacing: 0.25,
  },
  Box: {
    width: 30,
    height: 30,
    borderRadius: 4,
    backgroundColor: Colors.white,
    justifyContent: "center",
    alignItems: "center",
  },
  ResetButton: {
    marginBottom: IS_SMALL ? 6 : 10,
    width: "90%",
    padding: IS_SMALL ? 7 : 10,
    backgroundColor: Colors.lightGreen,
    borderRadius: 4,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  resetLabel: {
    fontSize: 14,
    fontFamily: FONTS.Medium,
    color: Colors.red,
  },
  selectedDamageRow: {
    width: MODAL_W,
    flexDirection: "row",
    gap: 20,
    alignItems: "center",
    paddingVertical: IS_SMALL ? 7 : 10,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    marginBottom: IS_SMALL ? 6 : 10,
  },
  selectedDamageText: {
    fontSize: 14,
    fontFamily: FONTS.Medium,
  },
});