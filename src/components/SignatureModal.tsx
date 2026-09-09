import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import CheckBox from "@react-native-community/checkbox";
import React, { useCallback, useContext, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
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
import {
  AcceptanceParcelState,
  buildAcceptanceDamagePayload,
  buildCustomerAcceptanceComment,
  buildParcelDamageAcceptPayload,
  getParcelDisplayName,
  initAcceptanceParcels,
  isAcceptanceCommentRequired,
  resolveDamageIdForFlags,
} from "../utils/parcelAcceptanceFlow";
import { isBlankSignatureData } from "../utils/signatureValidation";
import { Colors } from "../utils/colors";
import { FONTS } from "../utils/storeData";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

const IS_SMALL = SCREEN_H < 680;

const MODAL_W = Math.min(SCREEN_W * 0.92, 480);
const MODAL_H = IS_SMALL
  ? Math.min(SCREEN_H * 0.46, 340)
  : Math.min(SCREEN_H * 0.52, 460);

const CANVAS_MIN_H = IS_SMALL ? 168 : 210;

const DURATION = 260;

export type DamageItemPayload = {
  item: number;
  is_damage: number;
};

type FlowStep = "overview" | "comment" | "signature";

export type ParcelDamageAcceptPayload = {
  product_id: number;
  damage: 0 | 1;
  accept: 0 | 1;
};

export interface SignatureModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (
    base64: string,
    name?: string,
    damageItems?: DamageItemPayload[],
    acceptanceComment?: string,
    parcelDamageAccept?: ParcelDamageAcceptPayload[],
  ) => void;
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
  ProductDamageList = [],
}) => {
  const { t } = useTranslation();
  const signatureRef = useRef<SignatureViewRef>(null);
  const hasDrawnRef = useRef(false);
  const isReadingSignatureRef = useRef(false);
  const pendingNameRef = useRef<string>("");
  const pendingAcceptanceCommentRef = useRef<string>("");

  const [rendered, setRendered] = useState(visible);
  const [mountCanvas, setMountCanvas] = useState(false);
  const [name, setName] = useState(defaultName ?? "");
  const [nameError, setNameError] = useState(false);
  const [signatureError, setSignatureError] = useState(false);
  const [canvasReady, setCanvasReady] = useState(false);
  const [canvasKey, setCanvasKey] = useState(0);
  const opacity = useSharedValue(0);
  const { AllDamageListReason, selectDamageData, TimeZone } =
    useContext(GlobalContextData);

  const hasParcelDamageList = ProductDamageList.length > 0;
  const damageTypes = AllDamageListReason ?? [];

  const [step, setStep] = useState<FlowStep>("signature");
  const [acceptanceParcels, setAcceptanceParcels] = useState<
    AcceptanceParcelState[]
  >([]);
  const [editTarget, setEditTarget] = useState<AcceptanceParcelState | null>(
    null,
  );
  const [editDamaged, setEditDamaged] = useState(false);
  const [editAccepted, setEditAccepted] = useState(true);
  const [acceptanceComment, setAcceptanceComment] = useState("");
  const [commentError, setCommentError] = useState(false);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  const resetStrokeState = useCallback(() => {
    hasDrawnRef.current = false;
    isReadingSignatureRef.current = false;
  }, []);

  const handleCanvasLoadEnd = useCallback(() => {
    signatureRef.current?.clearSignature();
    resetStrokeState();
    setCanvasReady(true);
  }, [resetStrokeState]);

  const getTextColor = (bgColor: string) => {
    if (!bgColor) return "#000";
    const color = bgColor.replace("#", "");
    const r = parseInt(color.substring(0, 2), 16);
    const g = parseInt(color.substring(2, 4), 16);
    const b = parseInt(color.substring(4, 6), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 128 ? "#000" : "#FFF";
  };

  const handleUnmount = useCallback(() => setRendered(false), []);

  useEffect(() => {
    if (visible) {
      setRendered(true);
      setCanvasKey((k) => k + 1);
      setName(defaultName ?? "");
      setNameError(false);
      setSignatureError(false);
      setCanvasReady(false);
      setMountCanvas(false);
      resetStrokeState();
      pendingNameRef.current = "";
      pendingAcceptanceCommentRef.current = "";
      setAcceptanceComment("");
      setCommentError(false);
      setEditTarget(null);

      if (ProductDamageList?.length) {
        setAcceptanceParcels(
          initAcceptanceParcels(ProductDamageList, AllDamageListReason ?? []),
        );
        setStep("overview");
      } else {
        setAcceptanceParcels([]);
        setStep("signature");
      }

      opacity.value = withTiming(1, {
        duration: DURATION,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      setMountCanvas(false);
      setCanvasReady(false);
      resetStrokeState();
      opacity.value = withTiming(
        0,
        { duration: DURATION, easing: Easing.in(Easing.cubic) },
        (done) => {
          if (done) runOnJS(handleUnmount)();
        },
      );
    }
    // Re-init only when the modal opens or closes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  useEffect(() => {
    if (!visible || !rendered || step !== "signature") {
      setMountCanvas(false);
      return;
    }

    setMountCanvas(false);
    setCanvasReady(false);
    const timer = setTimeout(() => setMountCanvas(true), DURATION + 40);
    return () => clearTimeout(timer);
  }, [visible, rendered, canvasKey, step]);

  if (!rendered) return null;

  const handleClear = () => {
    signatureRef.current?.clearSignature();
    setName(defaultName ?? "");
    setNameError(false);
    setSignatureError(false);
    resetStrokeState();
    pendingNameRef.current = "";
    onClear?.();
  };

  const handleStrokeStart = () => {
    hasDrawnRef.current = true;
    setSignatureError(false);
  };

  const handleStrokeEnd = () => {
    hasDrawnRef.current = true;
  };

  const handleSave = () => {
    if (IsLoading || isReadingSignatureRef.current) return;

    if (showNameField && name.trim() === "") {
      setNameError(true);
      return;
    }

    if (!canvasReady || !mountCanvas) {
      setSignatureError(true);
      return;
    }

    if (!hasDrawnRef.current) {
      setSignatureError(true);
      return;
    }

    pendingNameRef.current = name.trim();
    isReadingSignatureRef.current = true;
    signatureRef.current?.readSignature();
  };

  const handleSignatureOK = (base64: string) => {
    isReadingSignatureRef.current = false;

    if (!hasDrawnRef.current || isBlankSignatureData(base64)) {
      resetStrokeState();
      setSignatureError(true);
      signatureRef.current?.clearSignature();
      return;
    }

    const damageItems =
      hasParcelDamageList && acceptanceParcels.length > 0
        ? buildAcceptanceDamagePayload(acceptanceParcels)
        : undefined;

    const parcelDamageAccept =
      hasParcelDamageList && acceptanceParcels.length > 0
        ? buildParcelDamageAcceptPayload(acceptanceParcels)
        : undefined;

    const acceptanceCommentText =
      pendingAcceptanceCommentRef.current.trim() || undefined;

    onSave(
      base64,
      showNameField ? pendingNameRef.current : undefined,
      damageItems,
      acceptanceCommentText,
      parcelDamageAccept,
    );
  };

  const handleSignatureEmpty = () => {
    isReadingSignatureRef.current = false;
    resetStrokeState();
    setSignatureError(true);
    signatureRef.current?.clearSignature();
  };

  const openEditPopup = (parcel: AcceptanceParcelState) => {
    setEditTarget(parcel);
    setEditDamaged(parcel.damaged);
    setEditAccepted(parcel.accepted);
  };

  const closeEditPopup = () => {
    setEditTarget(null);
  };

  const confirmEditPopup = () => {
    if (!editTarget) return;
    setAcceptanceParcels((prev) =>
      prev.map((parcel) => {
        if (parcel.id !== editTarget.id) return parcel;
        return {
          ...parcel,
          damaged: editDamaged,
          accepted: editAccepted,
          damage_id: resolveDamageIdForFlags(
            editDamaged,
            damageTypes,
            parcel.damage_id,
          ),
        };
      }),
    );
    closeEditPopup();
  };

  const goToSignatureStep = (commentText?: string) => {
    pendingAcceptanceCommentRef.current = (commentText || "").trim();
    setCanvasKey((k) => k + 1);
    setCanvasReady(false);
    setMountCanvas(false);
    resetStrokeState();
    setSignatureError(false);
    setStep("signature");
  };

  const handleOverviewContinue = () => {
    if (isAcceptanceCommentRequired(acceptanceParcels)) {
      const generated = buildCustomerAcceptanceComment({
        customerName: (defaultName ?? name ?? "").toString(),
        parcels: acceptanceParcels,
        timeZone: TimeZone,
      });
      setAcceptanceComment(generated);
      setCommentError(false);
      setStep("comment");
      return;
    }
    goToSignatureStep("");
  };

  const handleCommentContinue = () => {
    const text = acceptanceComment.trim();
    if (!text) {
      setCommentError(true);
      return;
    }
    goToSignatureStep(text);
  };

  const webStyle = `
    * { box-sizing: border-box; touch-action: none; -webkit-user-select: none; user-select: none; }
    body, html {
      background-color: ${backgroundColor};
      margin: 0; padding: 0;
      overflow: hidden;
      width: 100%; height: 100%;
      touch-action: none;
    }
    .m-signature-pad {
      box-shadow: none; border: none;
      margin: 0; width: 100%; height: 100%;
      background-color: ${backgroundColor};
      touch-action: none;
    }
    .m-signature-pad--body {
      border: none; margin: 0;
      background-color: ${backgroundColor};
      position: absolute;
      left: 0; top: 0;
      width: 100%; height: 100%;
      touch-action: none;
    }
    .m-signature-pad--body canvas {
      width: 100% !important;
      height: 100% !important;
      touch-action: none;
    }
    .m-signature-pad--footer { display: none !important; }
  `;

  const yesNoLabel = (value: boolean) => (value ? t("yes") : t("no"));

  const renderOverview = () => (
    <View style={styles.overviewWrap}>
      <Text style={styles.overviewTitle}>{t("Parcel Overview")}</Text>
      <Text style={styles.overviewSubtitle}>
        {t("Confirm damage and acceptance for each parcel")}
      </Text>

      <ScrollView
        style={styles.overviewScroll}
        contentContainerStyle={styles.overviewScrollContent}
        showsVerticalScrollIndicator={false}
      >
        {acceptanceParcels.map((parcel) => {
          const statusLabel = parcel.damaged ? t("Damaged") : t("No damage");
          const statusBg = parcel.damaged ? Colors.diclinelite : Colors.litegreen;
          const statusFg = parcel.damaged ? Colors.red : Colors.green;

          return (
            <View key={parcel.id} style={styles.parcelCard}>
              <Pressable
                onPress={() => openEditPopup(parcel)}
                style={[
                  styles.glassIconWrap,
                  {
                    backgroundColor: parcel.damaged
                      ? Colors.diclinelite
                      : Colors.litegreen,
                  },
                ]}
                hitSlop={8}
              >
                <FontAwesome5
                  name={parcel.damaged ? "wine-glass" : "wine-glass-alt"}
                  size={22}
                  color={parcel.damaged ? Colors.red : Colors.green}
                />
              </Pressable>
              <View style={styles.parcelCardBody}>
                <Text style={styles.parcelName} numberOfLines={2}>
                  {getParcelDisplayName(parcel)}
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
                  <Text style={[styles.statusBadgeText, { color: statusFg }]}>
                    {statusLabel}
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={() => openEditPopup(parcel)}
                style={({ pressed }) => [
                  styles.acceptParcelBtn,
                  parcel.accepted
                    ? styles.acceptParcelBtnYes
                    : styles.acceptParcelBtnNo,
                  pressed && styles.changeBtnPressed,
                ]}
              >
                <Ionicons
                  name={parcel.accepted ? "checkmark" : "close"}
                  size={16}
                  color={Colors.white}
                />
                <Text style={styles.acceptParcelBtnText}>
                  {t("Accept parcel")}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </ScrollView>

      <TouchableOpacity
        style={styles.overviewCta}
        onPress={handleOverviewContinue}
        activeOpacity={0.85}
      >
        <Text style={styles.overviewCtaText}>
          {t("Approved and receive all parcels")}
        </Text>
        <Text style={styles.overviewCtaSub}>{t("Signature")}</Text>
      </TouchableOpacity>

      <Text style={styles.overviewHint}>{t("GIVE SCANNER TO CUSTOMER")}</Text>
    </View>
  );

  const renderCommentStep = () => (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.commentWrap}
    >
      <View style={styles.commentCard}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => setStep("overview")}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color={Colors.darkText} />
          </TouchableOpacity>
          <Text style={styles.titleText} numberOfLines={1}>
            {t("Comment")}
          </Text>
          <View style={{ width: 34 }} />
        </View>
        <View style={styles.divider} />
        <Text style={styles.commentHint}>
          {t("Please add a comment for damaged parcels / rejected parcels")}
        </Text>
        <TextInput
          style={[styles.commentInput, commentError && styles.nameInputError]}
          value={acceptanceComment}
          onChangeText={(val) => {
            setAcceptanceComment(val);
            if (val.trim()) setCommentError(false);
          }}
          multiline
          textAlignVertical="top"
          placeholder={t("Type here...")}
          placeholderTextColor={Colors.inActive}
        />
        {commentError ? (
          <Text style={styles.nameErrorText}>{t("Comment is required")}</Text>
        ) : null}
      </View>
      <TouchableOpacity
        style={styles.saveBtn}
        onPress={handleCommentContinue}
        activeOpacity={0.8}
      >
        <Ionicons name="checkmark" size={16} color={Colors.white} />
        <Text style={styles.saveBtnText}>
          {t("save comment and go to signature")}
        </Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );

  const renderSignatureStep = () => {
    const acceptedCount = acceptanceParcels.filter((p) => p.accepted).length;
    const rejectedCount = acceptanceParcels.filter((p) => !p.accepted).length;
    const summaryTitle = hasParcelDamageList
      ? `${rejectedCount} ${t("rejected")}  ·  ${acceptedCount} ${t("accepted")}`
      : title !== ""
        ? title
        : t("Signature");

    return (
    <>
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
              {
                color: getTextColor(selectDamageData?.color) || Colors.black,
              },
            ]}
          >
            {selectDamageData?.title}
          </Text>
        </Pressable>
      )}

      {hasParcelDamageList ? (
        <TouchableOpacity
          style={styles.backToOverview}
          onPress={() =>
            setStep(
              isAcceptanceCommentRequired(acceptanceParcels)
                ? "comment"
                : "overview",
            )
          }
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={16} color={Colors.white} />
          <Text style={styles.backToOverviewText}>{t("Parcel overview")}</Text>
        </TouchableOpacity>
      ) : null}

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

          <Text style={styles.titleText} numberOfLines={1}>
            {summaryTitle}
          </Text>

          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.clearBtn}
              onPress={handleClear}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              activeOpacity={0.7}
            >
              <Ionicons
                name="trash-outline"
                size={19}
                color={Colors.darkText}
              />
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
            {nameError ? (
              <Text style={styles.nameErrorText}>{t("Name is required")}</Text>
            ) : null}
          </View>
        )}

        <View style={styles.canvasWrapper} collapsable={false}>
          <View style={styles.canvasBorder} collapsable={false}>
            {mountCanvas ? (
              <SignatureCanvas
                key={canvasKey}
                ref={signatureRef}
                onOK={handleSignatureOK}
                onEmpty={handleSignatureEmpty}
                onBegin={handleStrokeStart}
                onEnd={handleStrokeEnd}
                onLoadEnd={handleCanvasLoadEnd}
                descriptionText=""
                clearText=""
                confirmText=""
                webStyle={webStyle}
                autoClear={false}
                imageType="image/png"
                penColor={penColor}
                backgroundColor={backgroundColor}
                style={styles.canvas}
                scrollable={false}
              />
            ) : null}
            {(!canvasReady || !mountCanvas) && (
              <View style={styles.canvasLoading} pointerEvents="none">
                <ActivityIndicator size="small" color={Colors.primary} />
              </View>
            )}
          </View>
          {signatureError ? (
            <Text style={styles.nameErrorText}>
              {t("Signature is required")}
            </Text>
          ) : null}
        </View>
      </View>

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
    </>
    );
  };

  return (
    <View
      style={[StyleSheet.absoluteFill, styles.root]}
      pointerEvents="box-none"
    >
      <Animated.View
        style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}
        pointerEvents="none"
      />

      <View style={styles.centerContainer} pointerEvents="box-none">
        {step === "overview" && hasParcelDamageList && renderOverview()}
        {step === "comment" && hasParcelDamageList && renderCommentStep()}
        {step === "signature" && renderSignatureStep()}
      </View>

      {editTarget != null && (
        <View style={styles.changeOverlay}>
          <Pressable style={styles.changeBackdrop} onPress={closeEditPopup} />
          <Animated.View
            entering={FadeInDown.duration(200)}
            style={styles.changeSheet}
          >
            <Text style={styles.changeSheetTitle} numberOfLines={2}>
              {getParcelDisplayName(editTarget)}
            </Text>

            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>{t("Damage")}</Text>
              <View style={styles.toggleValueWrap}>
                <Text
                  style={[
                    styles.toggleValueText,
                    { color: editDamaged ? Colors.green : Colors.red },
                  ]}
                >
                  {yesNoLabel(editDamaged)}
                </Text>
                <Switch
                  value={editDamaged}
                  onValueChange={setEditDamaged}
                  trackColor={{ false: Colors.red, true: Colors.green }}
                  thumbColor={Colors.white}
                  ios_backgroundColor={Colors.red}
                />
              </View>
            </View>

            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>{t("Accept")}</Text>
              <View style={styles.toggleValueWrap}>
                <Text
                  style={[
                    styles.toggleValueText,
                    { color: editAccepted ? Colors.green : Colors.red },
                  ]}
                >
                  {yesNoLabel(editAccepted)}
                </Text>
                <Switch
                  value={editAccepted}
                  onValueChange={setEditAccepted}
                  trackColor={{ false: Colors.red, true: Colors.green }}
                  thumbColor={Colors.white}
                  ios_backgroundColor={Colors.red}
                />
              </View>
            </View>

            <View style={styles.changeSheetActions}>
              <Pressable
                onPress={closeEditPopup}
                style={({ pressed }) => [
                  styles.changeCancelBtn,
                  pressed && styles.changeBtnPressed,
                ]}
              >
                <Text style={styles.changeCancelText}>{t("Cancel")}</Text>
              </Pressable>
              <Pressable
                onPress={confirmEditPopup}
                style={({ pressed }) => [
                  styles.changeSaveBtn,
                  pressed && styles.changeBtnPressed,
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
  overviewWrap: {
    width: MODAL_W,
    maxHeight: SCREEN_H * 0.88,
    flexGrow: 0,
  },
  overviewTitle: {
    fontSize: 22,
    fontFamily: FONTS.SemiBold,
    color: Colors.white,
    textAlign: "center",
    marginBottom: 4,
  },
  overviewSubtitle: {
    fontSize: 13,
    fontFamily: FONTS.Regular,
    color: "rgba(255,255,255,0.86)",
    textAlign: "center",
    marginBottom: 14,
  },
  overviewHint: {
    marginTop: 12,
    fontSize: 12,
    fontFamily: FONTS.SemiBold,
    color: Colors.white,
    textAlign: "center",
    letterSpacing: 0.7,
  },
  overviewScroll: {
    maxHeight: SCREEN_H * 0.5,
    backgroundColor: Colors.white,
    borderRadius: 16,
  },
  overviewScrollContent: {
    padding: 12,
    gap: 10,
  },
  parcelCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.BtnBg,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 10,
  },
  glassIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  parcelCardBody: {
    flex: 1,
    gap: 4,
  },
  parcelName: {
    fontSize: 14,
    fontFamily: FONTS.SemiBold,
    color: Colors.black,
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontSize: 11,
    fontFamily: FONTS.Medium,
  },
  acceptParcelBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
    maxWidth: 118,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  acceptParcelBtnYes: {
    backgroundColor: Colors.green,
  },
  acceptParcelBtnNo: {
    backgroundColor: Colors.red,
  },
  acceptParcelBtnText: {
    fontSize: 11,
    fontFamily: FONTS.SemiBold,
    color: Colors.white,
    textAlign: "center",
  },
  overviewCta: {
    marginTop: 14,
    backgroundColor: Colors.borderColor,
    borderRadius: 14,
    paddingVertical: IS_SMALL ? 12 : 14,
    paddingHorizontal: 14,
    alignItems: "center",
  },
  overviewCtaText: {
    fontSize: 13,
    fontFamily: FONTS.SemiBold,
    color: Colors.white,
    textAlign: "center",
  },
  overviewCtaSub: {
    fontSize: 12,
    fontFamily: FONTS.Medium,
    color: Colors.white,
    marginTop: 2,
  },
  commentWrap: {
    width: MODAL_W,
    alignItems: "center",
  },
  commentCard: {
    width: "100%",
    backgroundColor: Colors.white,
    borderRadius: 8,
    paddingBottom: 12,
    overflow: "hidden",
  },
  commentHint: {
    fontSize: 12,
    fontFamily: FONTS.Regular,
    color: Colors.darkText,
    paddingHorizontal: 14,
    paddingTop: 10,
    marginBottom: 6,
  },
  commentInput: {
    minHeight: 160,
    marginHorizontal: 14,
    borderWidth: 1.5,
    borderColor: Colors.Boxgray,
    borderRadius: 6,
    paddingHorizontal: 11,
    paddingVertical: 10,
    fontSize: 13,
    fontFamily: FONTS.Regular,
    color: Colors.black,
    backgroundColor: Colors.BtnBg,
  },
  backToOverview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
    width: MODAL_W,
  },
  backToOverviewText: {
    fontSize: 13,
    fontFamily: FONTS.Medium,
    color: Colors.white,
  },
  changeBtnPressed: {
    opacity: 0.85,
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
    borderRadius: 18,
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
    marginBottom: 16,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.Boxgray,
  },
  toggleLabel: {
    fontSize: 15,
    fontFamily: FONTS.Medium,
    color: Colors.black,
  },
  toggleValueWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  toggleValueText: {
    fontSize: 14,
    fontFamily: FONTS.SemiBold,
    minWidth: 28,
    textAlign: "right",
  },
  changeSheetActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
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
  changeSaveText: {
    fontSize: 14,
    fontFamily: FONTS.SemiBold,
    color: Colors.white,
  },
  card: {
    width: MODAL_W,
    height: MODAL_H,
    backgroundColor: Colors.white,
    borderRadius: 16,
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
    minHeight: IS_SMALL ? 48 : 52,
    paddingVertical: 10,
    width: MODAL_W,
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: Colors.borderColor,
    gap: 5,
    marginTop: IS_SMALL ? 8 : 12,
  },
  saveBtnText: {
    fontSize: 13,
    fontFamily: FONTS.SemiBold,
    color: Colors.white,
    letterSpacing: 0.2,
    textAlign: "center",
    flexShrink: 1,
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
    paddingHorizontal: 14,
  },
  canvasWrapper: {
    flex: 1,
    padding: IS_SMALL ? 8 : 14,
    paddingBottom: IS_SMALL ? 6 : 12,
  },
  canvasBorder: {
    flex: 1,
    minHeight: CANVAS_MIN_H,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: Colors.white,
  },
  canvas: {
    flex: 1,
    width: "100%",
    minHeight: CANVAS_MIN_H,
  },
  canvasLoading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.white,
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
