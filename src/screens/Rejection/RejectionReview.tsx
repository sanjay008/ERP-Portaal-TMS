import apiConstants from "@/src/api/apiConstants";
import { Images } from "@/src/assets/images";
import { ApiFormatDate } from "@/src/components/ApiFormatDate";
import { useErrorHandle } from "@/src/components/ErrorHandle";
import { goBackOrPopTo } from "@/src/components/goBackOrPopTo";
import LoadingModal from "@/src/components/LoadingModal";
import SecondCustomModal from "@/src/components/SecondCustomModal";
import SignatureModal from "@/src/components/SignatureModal";
import { GlobalContextData } from "@/src/context/GlobalContext";
import ApiService from "@/src/utils/Apiservice";
import { Colors } from "@/src/utils/colors";
import {
  hasRemainingParcelsToDeliver,
} from "@/src/utils/pickupPlanned";
import { isBlankSignatureData } from "@/src/utils/signatureValidation";
import { FONTS } from "@/src/utils/storeData";
import { useNavigation } from "@react-navigation/native";
import React, { useCallback, useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  getRejectionSession,
  patchRejectionSession,
  resetRejectionSession,
  REJECTION_SLIDE_TYPE,
  type RejectionParcel,
} from "./rejectionSession";
import { logRejectionApi } from "./rejectionLog";

type ReviewStep =
  | "customerHandover"
  | "overview"
  | "edit"
  | "signature"
  | "driverHandover"
  | "summary";

export default function RejectionReview() {
  const navigation = useNavigation<any>();
  const { t } = useTranslation();
  const { ErrorHandle } = useErrorHandle();
  const { top, bottom } = useSafeAreaInsets();
  const { UserData, setToast, SelectCurrentDate } =
    useContext(GlobalContextData);

  const initial = getRejectionSession();
  const [step, setStep] = useState<ReviewStep>("customerHandover");
  const [parcels, setParcels] = useState<RejectionParcel[]>(
    initial.parcels || [],
  );
  const [editIndex, setEditIndex] = useState(0);
  const [signatureLoader, setSignatureLoader] = useState(false);
  const [closeLoader, setCloseLoader] = useState(false);
  const [showSig, setShowSig] = useState(false);
  const [savedSignature, setSavedSignature] = useState<string | null>(
    initial.signature,
  );
  const [savedSignerName, setSavedSignerName] = useState(initial.signerName);
  const [doneModal, setDoneModal] = useState<any>({
    visible: false,
    title: "",
    message: "",
    buttons: [],
    color: Colors.green,
  });

  const comment = getRejectionSession().comment || initial.comment || "";
  const editing = parcels[editIndex] ?? null;

  // Never stay on edit with a missing parcel (avoids blank black screen).
  useEffect(() => {
    if (step !== "edit") return;
    if (!parcels.length) {
      setEditIndex(0);
      setStep("overview");
      return;
    }
    if (editIndex < 0 || editIndex >= parcels.length) {
      setEditIndex(0);
    }
  }, [step, parcels, editIndex]);

  const closeToHome = useCallback(() => {
    resetRejectionSession();
    goBackOrPopTo(navigation, "BottomTabs");
  }, [navigation]);

  const resetSessionForNextScan = useCallback(() => {
    const session = getRejectionSession();
    // Keep same order for next rejected parcels; clear batch progress.
    patchRejectionSession({
      orderId: session.orderId,
      orderData: session.orderData,
      qrData: session.qrData,
      damageReasons: session.damageReasons,
      damageQuestion: session.damageQuestion,
      parcels: [],
      photos: [],
      comment: "",
      signature: null,
      signerName: "",
      photoSaved: false,
      commentSaved: false,
      signatureSaved: false,
      sessionTotalRemaining: null,
    });
  }, []);

  const openScannerForRemaining = useCallback(() => {
    setDoneModal((prev: any) => ({ ...prev, visible: false }));
    resetSessionForNextScan();
    goBackOrPopTo(navigation, "RejectionScanner");
  }, [navigation, resetSessionForNextScan]);

  const showDoneAndGoToList = useCallback(
    (apiMessage?: string) => {
      setDoneModal({
        visible: true,
        title: t("notification saved"),
        message: apiMessage ? t(apiMessage) : "",
        color: Colors.green,
        buttons: [
          {
            text: t("Go to List Page"),
            type: "primary",
            backgroundColor: Colors.green,
            onPress: () => {
              setDoneModal((prev: any) => ({ ...prev, visible: false }));
              closeToHome();
            },
          },
        ],
      });
    },
    [closeToHome, t],
  );

  const showRemainingOpenScanner = useCallback(
    (apiMessage?: string) => {
      setDoneModal({
        visible: true,
        title: t("There are Parcels Remaining"),
        message: apiMessage ? t(apiMessage) : "",
        color: Colors.yellow,
        buttons: [
          {
            text: t("Open Scanner"),
            type: "primary",
            backgroundColor: Colors.primary,
            onPress: openScannerForRemaining,
          },
        ],
      });
    },
    [openScannerForRemaining, t],
  );

  const goBackToScan = useCallback(() => {
    patchRejectionSession({ parcels });
    navigation.navigate("RejectionScanner", { type: REJECTION_SLIDE_TYPE });
  }, [navigation, parcels]);

  const openEditStep = useCallback(() => {
    if (!parcels.length) {
      setToast({
        top: 45,
        text: t("No parcels to edit. Scan a parcel first."),
        type: "error",
        visible: true,
      });
      return;
    }
    setEditIndex(0);
    setStep("edit");
  }, [parcels.length, setToast, t]);

  const updateParcelDamage = useCallback(
    async (parcel: RejectionParcel, damaged: boolean) => {
      const session = getRejectionSession();
      const orderId = session.orderId ?? parcel.orderId;
      if (!orderId) return false;

      setSignatureLoader(true);
      try {
        const payload = {
          token: UserData?.user?.verify_token,
          role: UserData?.user?.role,
          relaties_id: UserData?.relaties?.id,
          user_id: UserData?.user?.id,
          date: ApiFormatDate(SelectCurrentDate || new Date()),
          type: REJECTION_SLIDE_TYPE,
          order_id: orderId,
          item_id: parcel.itemId,
          is_damage: damaged ? 1 : 0,
          // CRITICAL: do NOT send is_close here
        };
        logRejectionApi("update-damage-edit", "REQ", payload);
        const res = await ApiService(apiConstants.status_update, {
          customData: payload,
        });
        logRejectionApi("update-damage-edit", "RES", res);
        if (!Boolean(res?.status)) {
          setToast({
            top: 45,
            text: t(res?.message) || t("Something went wrong"),
            type: "error",
            visible: true,
          });
          return false;
        }
        return true;
      } catch (error: any) {
        logRejectionApi(
          "update-damage-edit",
          "ERR",
          error?.response?.data || error?.message || error,
        );
        setToast({
          top: 45,
          text: ErrorHandle(error).message,
          type: "error",
          visible: true,
        });
        return false;
      } finally {
        setSignatureLoader(false);
      }
    },
    [ErrorHandle, SelectCurrentDate, UserData, setToast, t],
  );

  const saveSignature = useCallback(
    async (base64: string, name?: string) => {
      if (isBlankSignatureData(base64)) {
        setToast({
          top: 45,
          text: t("Signature is required"),
          type: "error",
          visible: true,
        });
        return;
      }

      const session = getRejectionSession();
      const rejectedParcels = parcels.filter((row) => row.rejected);
      if (!rejectedParcels.length) {
        setToast({
          top: 45,
          text: t("At least one rejected parcel is required"),
          type: "error",
          visible: true,
        });
        return;
      }

      setSignatureLoader(true);
      try {
        const acceptRows = rejectedParcels
          .map((parcel) => ({
            product_id: Number(parcel.itemId),
            item_id: Number(parcel.itemId),
            damage: parcel.damaged ? 1 : 0,
            accept: 1,
          }))
          .filter((row) => Number.isFinite(row.product_id) && row.product_id > 0);

        const payload: any = {
          token: UserData?.user?.verify_token,
          role: UserData?.user?.role,
          relaties_id: UserData?.relaties?.id,
          user_id: UserData?.user?.id,
          name: name?.trim() || session.orderData?.display_name || "",
          signature: base64,
          order_id: session.orderId,
          comment: session.comment || comment || "",
          // REQUIRED: backend maps 1 → sighn_type "reject"
          is_delivery: 1,
          type: REJECTION_SLIDE_TYPE,
          date: ApiFormatDate(SelectCurrentDate || new Date()),
          qr_data: JSON.stringify(session.qrData ?? {}),
        };
        if (acceptRows.length > 0) {
          payload.is_parcel_damage_accept = acceptRows;
        }

        logRejectionApi("signature", "REQ", payload);
        const res = await ApiService(apiConstants.store_customer_signature, {
          customData: payload,
        });
        logRejectionApi("signature", "RES", res);

        if (!Boolean(res?.status)) {
          setToast({
            top: 45,
            text: t(res?.message) || t("Failed to save signature"),
            type: "error",
            visible: true,
          });
          return;
        }

        patchRejectionSession({
          signature: base64,
          signerName: payload.name,
          parcels: rejectedParcels,
          signatureSaved: true,
        });
        setParcels(rejectedParcels);
        setSavedSignature(base64);
        setSavedSignerName(payload.name);
        setShowSig(false);
        setToast({
          top: 45,
          text: t(res?.message) || t("Success"),
          type: "success",
          visible: true,
        });
        setStep("driverHandover");
      } catch (error: any) {
        logRejectionApi(
          "signature",
          "ERR",
          error?.response?.data || error?.message || error,
        );
        setToast({
          top: 45,
          text: ErrorHandle(error).message,
          type: "error",
          visible: true,
        });
      } finally {
        setSignatureLoader(false);
      }
    },
    [
      ErrorHandle,
      SelectCurrentDate,
      UserData,
      comment,
      parcels,
      setToast,
      t,
    ],
  );

  const closeRejection = useCallback(async () => {
    const session = getRejectionSession();
    const orderId = session.orderId;
    const itemIds = parcels
      .filter((row) => row.rejected)
      .map((row) => Number(row.itemId))
      .filter((id) => Number.isFinite(id) && id > 0);

    if (!orderId) {
      setToast({
        top: 45,
        text: t("Invalid or missing order details. Please rescan."),
        type: "error",
        visible: true,
      });
      return;
    }
    if (!itemIds.length) {
      setToast({
        top: 45,
        text: t("At least one rejected parcel is required"),
        type: "error",
        visible: true,
      });
      return;
    }
    if (!session.photoSaved || !session.commentSaved || !session.signatureSaved) {
      setToast({
        top: 45,
        text: t("Photo, comment and signature are required before close"),
        type: "error",
        visible: true,
      });
      return;
    }

    setCloseLoader(true);
    try {
      const payload = {
        token: UserData?.user?.verify_token,
        role: UserData?.user?.role,
        relaties_id: UserData?.relaties?.id,
        user_id: UserData?.user?.id,
        date: ApiFormatDate(SelectCurrentDate || new Date()),
        type: REJECTION_SLIDE_TYPE,
        order_id: orderId,
        item_ids: itemIds,
        is_close: 1,
      };
      logRejectionApi("close", "REQ", payload);
      const res = await ApiService(apiConstants.status_update, {
        customData: payload,
      });
      logRejectionApi("close", "RES", res);

      const statusCode = Number(res?.status_code);
      if (statusCode === 422 || !Boolean(res?.status)) {
        setToast({
          top: 45,
          text: t(res?.message) || t("Something went wrong"),
          type: "error",
          visible: true,
        });
        return;
      }

      const sessionAfter = getRejectionSession();
      const rejectedIds = itemIds.map(Number);
      // Same remaining check as Delivery / ScannerScreens after status_update
      const stillRemaining =
        Number(res?.data?.original_status ?? res?.original_status ?? 0) === 50
          ? false
          : hasRemainingParcelsToDeliver(
              sessionAfter.orderData,
              res?.data ?? res,
              rejectedIds,
            );

      const remainingMessage =
        res?.remaining_item_message ||
        res?.data?.remaining_item_message ||
        res?.message ||
        "";

      if (stillRemaining) {
        showRemainingOpenScanner(remainingMessage);
      } else {
        showDoneAndGoToList(remainingMessage || res?.message);
      }
    } catch (error: any) {
      logRejectionApi(
        "close",
        "ERR",
        error?.response?.data || error?.message || error,
      );
      const statusCode = Number(error?.response?.status);
      const message =
        error?.response?.data?.message || ErrorHandle(error).message;
      setToast({
        top: 45,
        text: t(message) || t("Something went wrong"),
        type: "error",
        visible: true,
      });
      if (statusCode === 422) {
        return;
      }
    } finally {
      setCloseLoader(false);
    }
  }, [
    ErrorHandle,
    SelectCurrentDate,
    UserData,
    parcels,
    setToast,
    showDoneAndGoToList,
    showRemainingOpenScanner,
    t,
  ]);

  const renderParcelCard = (parcel: RejectionParcel, index: number) => (
    <View
      key={`${parcel.itemId}-${index}`}
      style={[
        styles.parcelCard,
        parcel.rejected || parcel.damaged
          ? styles.parcelCardAlert
          : styles.parcelCardOk,
      ]}
    >
      <Image
        source={parcel.damaged ? Images.Glass_Crash : Images.Glass_Empty}
        style={styles.glassIcon}
        resizeMode="contain"
      />
      <View style={styles.parcelCardBody}>
        <Text style={styles.parcelName} numberOfLines={2}>
          {parcel.name}
        </Text>
        <View style={styles.tagRow}>
          <View
            style={[
              styles.tag,
              {
                backgroundColor: parcel.rejected
                  ? Colors.diclinelite
                  : Colors.litegreen,
              },
            ]}
          >
            <Text
              style={[
                styles.tagText,
                { color: parcel.rejected ? Colors.red : Colors.green },
              ]}
            >
              {parcel.rejected ? t("Rejected") : t("Accepted")}
            </Text>
          </View>
          <View
            style={[
              styles.tag,
              {
                backgroundColor: parcel.damaged
                  ? Colors.diclinelite
                  : Colors.litegreen,
              },
            ]}
          >
            <Text
              style={[
                styles.tagText,
                { color: parcel.damaged ? Colors.red : Colors.green },
              ]}
            >
              {parcel.damaged ? t("Damaged") : t("Undamaged")}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderHandover = (
    image: any,
    hint: string,
    onContinue: () => void,
  ) => (
    <View
      style={[
        styles.handoverPage,
        { paddingTop: top + 24, paddingBottom: bottom + 24 },
      ]}
    >
      <View style={styles.heroFrame}>
        <Image source={image} style={styles.heroImage} resizeMode="contain" />
      </View>
      <Text style={styles.handoverHint}>{hint}</Text>
      <TouchableOpacity
        style={styles.continueBtn}
        onPress={onContinue}
        activeOpacity={0.88}
      >
        <Text style={styles.bigBtnText}>{t("Continue")}</Text>
      </TouchableOpacity>
    </View>
  );

  const applyEditAndContinue = useCallback(() => {
    const current = parcels[editIndex];
    if (!current) {
      setEditIndex(0);
      setStep("overview");
      return;
    }

    // Keep parcel in list even if Rejected=No (shows as Accepted on overview).
    // Closing / signature still only uses rejected=true parcels.
    patchRejectionSession({ parcels });

    if (editIndex < parcels.length - 1) {
      setEditIndex((prev) => prev + 1);
      return;
    }

    setEditIndex(0);
    setStep("overview");
  }, [editIndex, parcels]);

  return (
    <View style={styles.root}>
      {step === "customerHandover"
        ? renderHandover(
            Images.DriverConfirmCustomerImage,
            t("GIVE PHONE TO CUSTOMER"),
            () => setStep("overview"),
          )
        : null}

      {step === "driverHandover"
        ? renderHandover(
            Images.CustomerAfterCondirmImage,
            t("GIVE PHONE TO DRIVER"),
            () => setStep("summary"),
          )
        : null}

      {step === "overview" ? (
        <View
          style={[
            styles.page,
            { paddingTop: top + 8, paddingBottom: bottom + 12 },
          ]}
        >
          <Text style={styles.pageTitle}>{t("Rejection overview")}</Text>
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
          >
            {parcels.length > 0 ? (
              <View style={styles.listCard}>
                {parcels.map(renderParcelCard)}
              </View>
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>
                  {t("No parcels left to reject. Scan a parcel again.")}
                </Text>
                <TouchableOpacity
                  style={styles.continueBtn}
                  onPress={goBackToScan}
                  activeOpacity={0.88}
                >
                  <Text style={styles.bigBtnText}>{t("Back to scan")}</Text>
                </TouchableOpacity>
              </View>
            )}
            <View style={styles.commentBox}>
              <Text style={styles.commentLabel}>{t("Comment")}</Text>
              <Text style={styles.commentText}>{comment}</Text>
            </View>
            {parcels.length > 0 ? (
              <>
                <Text style={styles.question}>{t("Is this correct?")}</Text>
                <View style={styles.bigBtnRow}>
                  <TouchableOpacity
                    style={[styles.bigBtn, { backgroundColor: Colors.red }]}
                    onPress={openEditStep}
                    activeOpacity={0.88}
                  >
                    <Text style={styles.bigBtnText}>{t("NO")}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.bigBtn, { backgroundColor: Colors.green }]}
                    onPress={() => {
                      const rejectedOnly = parcels.filter((row) => row.rejected);
                      if (!rejectedOnly.length) {
                        setToast({
                          top: 45,
                          text: t("At least one rejected parcel is required"),
                          type: "error",
                          visible: true,
                        });
                        return;
                      }
                      setParcels(rejectedOnly);
                      patchRejectionSession({ parcels: rejectedOnly });
                      setShowSig(true);
                      setStep("signature");
                    }}
                    activeOpacity={0.88}
                  >
                    <Text style={styles.bigBtnText}>{t("YES")}</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : null}
          </ScrollView>
        </View>
      ) : null}

      {step === "edit" ? (
        editing ? (
          <View
            style={[
              styles.page,
              { paddingTop: top + 8, paddingBottom: bottom + 12 },
            ]}
          >
            <Text style={styles.pageTitle}>{t("Change parcel status")}</Text>
            <View style={styles.editCard}>
              <Text style={styles.editParcelName}>{editing.name}</Text>
              <Text style={styles.editLabel}>{t("Rejected")}</Text>
              <View style={styles.bigBtnRow}>
                <TouchableOpacity
                  style={[
                    styles.bigBtn,
                    {
                      backgroundColor: editing.rejected ? Colors.red : "#E8EEF2",
                    },
                  ]}
                  onPress={() =>
                    setParcels((prev) =>
                      prev.map((row, i) =>
                        i === editIndex ? { ...row, rejected: true } : row,
                      ),
                    )
                  }
                >
                  <Text
                    style={[
                      styles.bigBtnText,
                      { color: editing.rejected ? Colors.white : Colors.black },
                    ]}
                  >
                    {t("Yes")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.bigBtn,
                    {
                      backgroundColor: !editing.rejected
                        ? Colors.green
                        : "#E8EEF2",
                    },
                  ]}
                  onPress={() =>
                    setParcels((prev) =>
                      prev.map((row, i) =>
                        i === editIndex ? { ...row, rejected: false } : row,
                      ),
                    )
                  }
                >
                  <Text
                    style={[
                      styles.bigBtnText,
                      {
                        color: !editing.rejected ? Colors.white : Colors.black,
                      },
                    ]}
                  >
                    {t("No")}
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.editLabel, { marginTop: 18 }]}>
                {t("Damaged")}
              </Text>
              <View style={styles.bigBtnRow}>
                <TouchableOpacity
                  style={[
                    styles.bigBtn,
                    {
                      backgroundColor: editing.damaged ? Colors.red : "#E8EEF2",
                    },
                  ]}
                  onPress={async () => {
                    const ok = await updateParcelDamage(editing, true);
                    if (!ok) return;
                    setParcels((prev) =>
                      prev.map((row, i) =>
                        i === editIndex ? { ...row, damaged: true } : row,
                      ),
                    );
                  }}
                >
                  <Text
                    style={[
                      styles.bigBtnText,
                      { color: editing.damaged ? Colors.white : Colors.black },
                    ]}
                  >
                    {t("Yes")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.bigBtn,
                    {
                      backgroundColor: !editing.damaged
                        ? Colors.green
                        : "#E8EEF2",
                    },
                  ]}
                  onPress={async () => {
                    const ok = await updateParcelDamage(editing, false);
                    if (!ok) return;
                    setParcels((prev) =>
                      prev.map((row, i) =>
                        i === editIndex ? { ...row, damaged: false } : row,
                      ),
                    );
                  }}
                >
                  <Text
                    style={[
                      styles.bigBtnText,
                      {
                        color: !editing.damaged ? Colors.white : Colors.black,
                      },
                    ]}
                  >
                    {t("No")}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.continueBtn, { marginTop: 20 }]}
              onPress={applyEditAndContinue}
              activeOpacity={0.88}
            >
              <Text style={styles.bigBtnText}>
                {editIndex < parcels.length - 1
                  ? t("Next parcel")
                  : t("Back to overview")}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View
            style={[
              styles.page,
              styles.emptyFallback,
              { paddingTop: top + 8, paddingBottom: bottom + 12 },
            ]}
          >
            <Text style={[styles.emptyText, { color: Colors.white }]}>
              {t("No parcels to edit. Scan a parcel first.")}
            </Text>
            <TouchableOpacity
              style={styles.continueBtn}
              onPress={() => {
                setEditIndex(0);
                setStep("overview");
              }}
              activeOpacity={0.88}
            >
              <Text style={styles.bigBtnText}>{t("Back to overview")}</Text>
            </TouchableOpacity>
          </View>
        )
      ) : null}

      {step === "summary" ? (
        <View
          style={[
            styles.page,
            { paddingTop: top + 8, paddingBottom: bottom + 12 },
          ]}
        >
          <Text style={styles.pageTitle}>{t("Rejection summary")}</Text>
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.listCard}>
              {parcels.filter((row) => row.rejected).map(renderParcelCard)}
            </View>
            <View style={styles.commentBox}>
              <Text style={styles.commentLabel}>{t("Comment")}</Text>
              <Text style={styles.commentText}>{comment}</Text>
            </View>
            {savedSignerName ? (
              <Text style={styles.signer}>{savedSignerName}</Text>
            ) : null}
            {savedSignature ? (
              <Image
                source={{
                  uri: String(savedSignature).startsWith("data:")
                    ? savedSignature
                    : `data:image/png;base64,${savedSignature}`,
                }}
                style={styles.signatureImage}
                resizeMode="contain"
              />
            ) : null}
            <TouchableOpacity
              style={[styles.bigBtn, styles.closeBtn]}
              onPress={() => {
                void closeRejection();
              }}
              activeOpacity={0.88}
              disabled={closeLoader}
            >
              <Text style={styles.bigBtnText}>{t("Close")}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      ) : null}

      <SignatureModal
        IsLoading={signatureLoader}
        visible={showSig}
        defaultName={initial.orderData?.display_name}
        ProductDamageList={[]}
        onClose={() => {
          setShowSig(false);
          setStep("overview");
        }}
        onSave={saveSignature}
        onClear={() => {}}
      />

      <LoadingModal
        visible={signatureLoader || closeLoader}
        message={t("Please wait…")}
      />

      <SecondCustomModal SecondModal={doneModal} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  page: {
    flex: 1,
    paddingHorizontal: 16,
  },
  pageTitle: {
    fontSize: 22,
    fontFamily: FONTS.SemiBold,
    color: Colors.white,
    textAlign: "center",
    marginBottom: 14,
  },
  scroll: {
    paddingBottom: 24,
    gap: 12,
  },
  listCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 12,
    gap: 10,
  },
  emptyCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    gap: 14,
  },
  emptyFallback: {
    justifyContent: "center",
    gap: 16,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: FONTS.Medium,
    color: Colors.black,
    textAlign: "center",
    lineHeight: 22,
  },
  parcelCard: {
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  parcelCardAlert: {
    backgroundColor: Colors.diclinelite,
  },
  parcelCardOk: {
    backgroundColor: Colors.litegreen,
  },
  glassIcon: {
    width: 40,
    height: 40,
  },
  parcelCardBody: {
    flex: 1,
    gap: 6,
  },
  parcelName: {
    fontSize: 15,
    fontFamily: FONTS.SemiBold,
    color: Colors.black,
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tag: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tagText: {
    fontSize: 12,
    fontFamily: FONTS.Medium,
  },
  commentBox: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
  },
  commentLabel: {
    fontSize: 12,
    fontFamily: FONTS.SemiBold,
    color: Colors.darkText,
    marginBottom: 6,
  },
  commentText: {
    fontSize: 14,
    fontFamily: FONTS.Regular,
    color: Colors.black,
    lineHeight: 20,
  },
  question: {
    marginTop: 8,
    marginBottom: 4,
    fontSize: 18,
    fontFamily: FONTS.SemiBold,
    color: Colors.white,
    textAlign: "center",
  },
  bigBtnRow: {
    flexDirection: "row",
    gap: 10,
  },
  bigBtn: {
    flex: 1,
    minHeight: 54,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  bigBtnText: {
    color: Colors.white,
    fontFamily: FONTS.SemiBold,
    fontSize: 16,
  },
  editCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
  },
  editParcelName: {
    fontSize: 17,
    fontFamily: FONTS.SemiBold,
    color: Colors.black,
    marginBottom: 8,
  },
  editLabel: {
    marginBottom: 8,
    fontSize: 14,
    fontFamily: FONTS.SemiBold,
    color: Colors.darkText,
  },
  continueBtn: {
    minHeight: 54,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    alignSelf: "stretch",
  },
  closeBtn: {
    backgroundColor: Colors.green,
    marginTop: 8,
    flex: 0,
    width: "100%",
  },
  signer: {
    color: Colors.white,
    fontFamily: FONTS.Medium,
    fontSize: 14,
    textAlign: "center",
    marginTop: 4,
  },
  signatureImage: {
    width: "100%",
    height: 120,
    backgroundColor: Colors.white,
    borderRadius: 12,
  },
  handoverPage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    gap: 22,
  },
  heroFrame: {
    width: "82%",
    aspectRatio: 1,
    maxWidth: 320,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "transparent",
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  handoverHint: {
    fontSize: 16,
    fontFamily: FONTS.SemiBold,
    color: Colors.white,
    letterSpacing: 0.8,
    textAlign: "center",
    paddingHorizontal: 12,
  },
});
