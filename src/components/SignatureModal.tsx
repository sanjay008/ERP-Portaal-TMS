import { FontAwesome, Ionicons } from "@expo/vector-icons";
import CheckBox from "@react-native-community/checkbox";
import React, { useCallback, useContext, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import SignatureCanvas, {
  SignatureViewRef,
} from "react-native-signature-canvas";
import { GlobalContextData } from "../context/GlobalContext";
import { Colors } from "../utils/colors";
import { FONTS, SimpleFlex, width } from "../utils/storeData";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const MODAL_W = Math.min(SCREEN_W * 0.92, 480);
const MODAL_H = Math.min(SCREEN_H * 0.58, 520);
const DURATION = 260;

export interface SignatureModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (base64: string, name?: string) => void;
  onClear?: () => void;
  onPress?: () => void;
  title?: string;
  penColor?: string;
  backgroundColor?: string;
  showNameField?: boolean;
  IsLoading?: boolean;
  defaultName?: string | null;
}

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
onPress

}) => {
  const { t } = useTranslation();
  const signatureRef = useRef<SignatureViewRef>(null);
  const [rendered, setRendered] = useState(visible);
  const [name, setName] = useState(defaultName ?? "");
  const [nameError, setNameError] = useState(false);
  const pendingNameRef = useRef<string>("");
  const [Reset, setReset] = useState(false);
  const [canvasKey, setCanvasKey] = useState(0);
  const opacity = useSharedValue(0);
  const { AllDamageListReason, setAllDamageListReason, selectDamageData, setselectDamageData,setDeliveyDataSave } = useContext(GlobalContextData)
  const scale = useSharedValue(0.88);
const [selectDamageDatumTemporary, setSelectDamageDatumTemporary] = useState<any>(null);
  const backdropStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const cardStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));
  const getTextColor = (bgColor: string) => {
    if (!bgColor) return "#000";

    const color = bgColor.replace("#", "");

    const r = parseInt(color.substring(0, 2), 16);
    const g = parseInt(color.substring(2, 4), 16);
    const b = parseInt(color.substring(4, 6), 16);

    // Brightness formula
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;

    return brightness > 128 ? "#000" : "#FFF";
  };

  const handleUnmount = useCallback(() => setRendered(false), []);

  useEffect(() => {
    if (visible) {
      setRendered(true);
      setReset(false);
      setCanvasKey((k) => k + 1);
      setName(defaultName ?? "");
      setNameError(false);
      pendingNameRef.current = "";
      opacity.value = withTiming(1, {
        duration: DURATION,
        easing: Easing.out(Easing.cubic),
      });
      scale.value = withSpring(1, {
        damping: 18,
        stiffness: 220,
        mass: 0.6,
      });
    } else {
      opacity.value = withTiming(0, {
        duration: DURATION,
        easing: Easing.in(Easing.cubic),
      });
      scale.value = withTiming(
        0.88,
        { duration: DURATION, easing: Easing.in(Easing.quad) },
        (done) => {
          if (done) runOnJS(handleUnmount)();
        }
      );
    }
  }, [visible]);

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
    onSave(base64, showNameField ? pendingNameRef.current : undefined);
  };

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
      {
        !Reset ?
          <>
            <TouchableOpacity style={styles.ResetButton} onPress={() => {
              setReset(true);
            }}>
              <Text style={{
                fontSize: 14,
                fontFamily: FONTS.Medium,
                color: Colors.red,
              }}>{t("Reset")}</Text>
              <View style={styles.Box}>
                <FontAwesome name="close" size={18} color="black" />
              </View>
            </TouchableOpacity>
            <Pressable
              style={{
                width: "90%",
                flexDirection: 'row',
                gap: 20,
                alignItems: 'center',
                paddingVertical: 10,
                paddingHorizontal: 15,
                borderWidth: 1,
                borderColor: Colors.border,
                borderRadius: 10,
                marginBottom: 10,
                backgroundColor: selectDamageData?.color || Colors.Boxgray
              }}
            >
              <CheckBox

                value={true}
                tintColors={{
                  true: Colors.green,
                  false: Colors.red,
                }}
              />
              <Text
                style={{
                  fontSize: 14,
                  fontFamily: FONTS.Medium,
                  color: getTextColor(selectDamageData?.color) || Colors.black
                }}
              >
                {selectDamageData?.title}
              </Text>


            </Pressable>
            <Animated.View style={[styles.card, cardStyle]}>
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

              <View style={styles.canvasWrapper}>
                <View style={styles.canvasBorder}>
                  <SignatureCanvas
                    key={canvasKey}
                    ref={signatureRef}
                    onOK={handleSignatureOK}
                    onEmpty={() => { }}
                    descriptionText=""
                    clearText=""
                    confirmText=""
                    webStyle={webStyle}
                    autoClear={false}
                    penColor={penColor}
                    style={styles.canvas}
                    scrollable={false}
                    androidHardwareAccelerationDisabled={false}
                  />
                </View>

                <View style={styles.hintRow}>
                  <Ionicons name="pencil-outline" size={12} color={Colors.inActive} />
                  <Text style={styles.hintText}>{t("Signature")}</Text>
                </View>
              </View>

            </Animated.View>
            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleSave}
              activeOpacity={0.8}
            >
              {IsLoading ? (
                <ActivityIndicator size={"small"} color={Colors.black} />
              ) : (
                <>
                  <Ionicons name="checkmark" size={16} color={Colors.white} />
                  <Text style={styles.saveBtnText}>{t("Save")}</Text>
                </>
              )}
            </TouchableOpacity>
          </>
          :
          <FlatList
            data={AllDamageListReason}
            ListFooterComponent={
              <View style={SimpleFlex.SpaceBetween}>
                <TouchableOpacity style={[styles.saveBtn, { width: selectDamageDatumTemporary?.id !== selectDamageData?.id && selectDamageDatumTemporary!== null ? "48%" : "100%", backgroundColor: Colors.darkText, }]} onPress={() => {
                  setReset(false);
                  setSelectDamageDatumTemporary(null);

                }}>
                  <Text style={styles.footerButtonText}>{t("Cancel")}</Text>
                </TouchableOpacity>
                {
                  selectDamageDatumTemporary?.id !== selectDamageData?.id && selectDamageDatumTemporary!== null &&
                <TouchableOpacity style={[styles.saveBtn, { width: "48%", }]} onPress={() => {
                  setReset(false);
                  setselectDamageData(selectDamageDatumTemporary);
                  setSelectDamageDatumTemporary(null);
                    onPress?.();
                }}>
                  <Text style={styles.footerButtonText}>{t("Camera")}</Text>
                </TouchableOpacity>
                }
              </View>
            }
            style={{ width: "90%", flexGrow: 0, alignSelf: "center" }}
            contentContainerStyle={styles.LabelList}
            scrollEnabled={false}
            renderItem={({ item }: any) => {
              const bgColor = item?.color || Colors.Boxgray;


              return (
                <Pressable
                  onPress={() => setSelectDamageDatumTemporary(item)}
                  style={{
                    flexDirection: 'row',
                    gap: 20,
                    alignItems: 'center',
                    paddingVertical: 10,
                    paddingHorizontal: 15,
                    borderWidth: 1,
                    borderColor: Colors.border,
                    borderRadius: 10,
                    marginBottom: 10,
                    backgroundColor: item?.color || Colors.Boxgray
                  }}
                >
                  <CheckBox
                    onValueChange={() => {
                      setSelectDamageDatumTemporary(item);
                    }}
                    value={selectDamageDatumTemporary ? selectDamageDatumTemporary?.id === item?.id : selectDamageData?.id === item?.id}
                    tintColors={{
                      true: Colors.green,
                      false: Colors.red,
                    }}
                  />
                  <Text
                    style={{
                      fontSize: 14,
                      fontFamily: FONTS.Medium,
                      color: Colors.white,
                    }}
                  >
                    {t(item?.title)}
                  </Text>


                </Pressable>
              );
            }}
          />
      }


    </View>
  );
};

export default SignatureModal;

const styles = StyleSheet.create({
  root: {
    zIndex: 9999,
    elevation: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  footerButtonText: {
    fontSize: 14,
    fontFamily: FONTS.Medium,
    color: Colors.white,
  },
  LabelList: {
    backgroundColor: Colors.white,
    padding: 20,
    borderRadius: 10,

  },
  backdrop: {
    backgroundColor: Colors.transparant,
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
    paddingVertical: 11,
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
    height: 50,
    width: "90%",
    justifyContent: "center",
    borderRadius: 4,
    backgroundColor: Colors.borderColor,
    gap: 5,
    marginTop: 12,
    marginBottom: 10,
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
    paddingTop: 11,
    paddingBottom: 4,
    gap: 5,
  },
  nameLabel: {
    fontSize: 12,
    fontFamily: FONTS.SemiBold,
    color: Colors.darkText,
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  nameInput: {
    height: 38,
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
    padding: 14,
    paddingBottom: 12,
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
    marginTop: 7,
  },
  hintText: {
    fontSize: 11,
    fontFamily: FONTS.Regular,
    color: Colors.inActive,
    letterSpacing: 0.25,
  },
  Box: {
    width: 30,
    height: 30,
    borderRadius: 4,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',

  },
  ResetButton: {
    alignSelf: 'center',
    marginBottom: 10,
    width: "90%",
    padding: 15,
    backgroundColor: Colors.lightGreen,
    borderRadius: 4,
    flexDirection: 'row',
    justifyContent: "space-between",
    alignItems: 'center',

  },
  LabelBtn: {
    width: width * 0.8,
    marginVertical: 5,
    height: 50,
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center"
  },
  Text: {
    fontSize: 14,
    fontFamily: FONTS.Medium,
    color: Colors.black,
  },
});