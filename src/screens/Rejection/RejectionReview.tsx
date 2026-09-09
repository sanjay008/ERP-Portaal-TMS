import apiConstants from "@/src/api/apiConstants";
import { Images } from "@/src/assets/images";
import { goBackOrPopTo } from "@/src/components/goBackOrPopTo";
import { useErrorHandle } from "@/src/components/ErrorHandle";
import LoadingModal from "@/src/components/LoadingModal";
import SecondCustomModal from "@/src/components/SecondCustomModal";
import SignatureModal from "@/src/components/SignatureModal";
import { GlobalContextData } from "@/src/context/GlobalContext";
import ApiService from "@/src/utils/Apiservice";
import { Colors } from "@/src/utils/colors";
import {
  getDamagedDamageOptions,
  getUndamagedDamageOption,
} from "@/src/utils/deliveryMultiParcel";
import { isBlankSignatureData } from "@/src/utils/signatureValidation";
import { FONTS } from "@/src/utils/storeData";
import { useNavigation } from "@react-navigation/native";
import React, { useCallback, useContext, useMemo, useState } from "react";
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
  type RejectionParcel,
} from "./rejectionSession";

type ReviewStep = "customerHandover" | "overview" | "edit" | "signature" | "driverHandover" | "summary";

export default function RejectionReview() {
  const navigation = useNavigation<any>();
  const { t } = useTranslation();
  const { ErrorHandle } = useErrorHandle();
  const { top, bottom } = useSafeAreaInsets();
  const { UserData, setToast } = useContext(GlobalContextData);

  const initial = getRejectionSession();
  const [step, setStep] = useState<ReviewStep>("customerHandover");
  const [parcels, setParcels] = useState<RejectionParcel[]>(initial.parcels);
  const [editIndex, setEditIndex] = useState(0);
  const [signatureLoader, setSignatureLoader] = useState(false);
  const [showSig, setShowSig] = useState(false);

  const comment = initial.comment;
  const signature = getRejectionSession().signature;
  const signerName = getRejectionSession().signerName;

  const handoverModal = useMemo(() => {
    if (step === "customerHandover") {
      return {
        visible: true,
        title: "",
        message: "",
        hint: t("GIVE SCANNER TO CUSTOMER"),
        image: Images.DriverConfirmCustomerImage,
        color: "#000000",
        buttons: [
          {
            text: t("Continue"),
            type: "primary",
            onPress: () => setStep("overview"),
          },
        ],
      };
    }
    if (step === "driverHandover") {
      return {
        visible: true,
        title: "",
        message: "",
        hint: t("GIVE SCANNER TO DRIVER"),
        image: Images.CustomerAfterCondirmImage,
        color: "#000000",
        buttons: [
          {
            text: t("Continue"),
            type: "primary",
            onPress: () => setStep("summary"),
          },
        ],
      };
    }
    return { visible: false, title: "", message: "", buttons: [] };
  }, [step, t]);

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
      setSignatureLoader(true);
      try {
        const undamagedId = Number(
          getUndamagedDamageOption(session.damageReasons)?.id ?? 34,
        );
        const damagedId = Number(
          getDamagedDamageOptions(session.damageReasons)?.[0]?.id ?? undamagedId,
        );
        const isDamage = parcels
          .map((parcel) => ({
            item_id: parcel.itemId,
            damage_id: parcel.damaged ? damagedId : undamagedId,
          }))
          .filter((row) => Number.isFinite(row.item_id) && Number.isFinite(row.damage_id));

        const payload: any = {
          token: UserData?.user?.verify_token,
          role: UserData?.user?.role,
          relaties_id: UserData?.relaties?.id,
          user_id: UserData?.user?.id,
          name: name?.trim() || session.orderData?.display_name || "",
          signature: base64,
          order_id: session.orderId,
          is_delivery: 0,
          qr_data: JSON.stringify(session.qrData ?? {}),
        };
        if (isDamage.length > 0) {
          payload.is_damage = isDamage;
        }

        const res = await ApiService(apiConstants.store_customer_signature, {
          customData: payload,
        });

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
          parcels,
        });
        setShowSig(false);
        setToast({
          top: 45,
          text: t(res?.message) || t("Success"),
          type: "success",
          visible: true,
        });
        setStep("driverHandover");
      } catch (error) {
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
    [ErrorHandle, UserData, parcels, setToast, t],
  );

  const closeToHome = useCallback(() => {
    resetRejectionSession();
    goBackOrPopTo(navigation, "BottomTabs");
  }, [navigation]);

  const renderParcelCard = (parcel: RejectionParcel, index: number) => (
    <View
      key={`${parcel.itemId}-${index}`}
      style={[
        styles.parcelCard,
        parcel.rejected || parcel.damaged ? styles.parcelCardAlert : styles.parcelCardOk,
      ]}
    >
      <Text style={styles.parcelName}>{parcel.name}</Text>
      <View style={styles.tagRow}>
        <View
          style={[
            styles.tag,
            { backgroundColor: parcel.rejected ? Colors.diclinelite : Colors.litegreen },
          ]}
        >
          <Text
            style={[
              styles.tagText,
              { color: parcel.rejected ? Colors.red : Colors.green },
            ]}
          >
            {parcel.rejected ? t("Rejected") : t("Not rejected")}
          </Text>
        </View>
        <View
          style={[
            styles.tag,
            { backgroundColor: parcel.damaged ? Colors.diclinelite : Colors.litegreen },
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
  );

  const editing = parcels[editIndex];

  return (
    <View style={[styles.root, { paddingTop: top + 8, paddingBottom: bottom + 12 }]}>
      {step === "overview" ? (
        <View style={styles.page}>
          <Text style={styles.pageTitle}>{t("Rejection overview")}</Text>
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            {parcels.map(renderParcelCard)}
            <View style={styles.commentBox}>
              <Text style={styles.commentLabel}>{t("Comment")}</Text>
              <Text style={styles.commentText}>{comment}</Text>
            </View>
            <Text style={styles.question}>{t("Is this correct?")}</Text>
            <View style={styles.bigBtnRow}>
              <TouchableOpacity
                style={[styles.bigBtn, { backgroundColor: Colors.red }]}
                onPress={() => {
                  setEditIndex(0);
                  setStep("edit");
                }}
              >
                <Text style={styles.bigBtnText}>{t("NO")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.bigBtn, { backgroundColor: Colors.green }]}
                onPress={() => {
                  patchRejectionSession({ parcels });
                  setShowSig(true);
                  setStep("signature");
                }}
              >
                <Text style={styles.bigBtnText}>{t("YES")}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      ) : null}

      {step === "edit" && editing ? (
        <View style={styles.page}>
          <Text style={styles.pageTitle}>{t("Change parcel status")}</Text>
          <Text style={styles.parcelName}>{editing.name}</Text>
          <Text style={styles.editLabel}>{t("Rejected")}</Text>
          <View style={styles.bigBtnRow}>
            <TouchableOpacity
              style={[
                styles.bigBtn,
                { backgroundColor: editing.rejected ? Colors.red : "#E0E0E0" },
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
                { backgroundColor: !editing.rejected ? Colors.green : "#E0E0E0" },
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
                  { color: !editing.rejected ? Colors.white : Colors.black },
                ]}
              >
                {t("No")}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.editLabel}>{t("Damaged")}</Text>
          <View style={styles.bigBtnRow}>
            <TouchableOpacity
              style={[
                styles.bigBtn,
                { backgroundColor: editing.damaged ? Colors.red : "#E0E0E0" },
              ]}
              onPress={() =>
                setParcels((prev) =>
                  prev.map((row, i) =>
                    i === editIndex ? { ...row, damaged: true } : row,
                  ),
                )
              }
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
                { backgroundColor: !editing.damaged ? Colors.green : "#E0E0E0" },
              ]}
              onPress={() =>
                setParcels((prev) =>
                  prev.map((row, i) =>
                    i === editIndex ? { ...row, damaged: false } : row,
                  ),
                )
              }
            >
              <Text
                style={[
                  styles.bigBtnText,
                  { color: !editing.damaged ? Colors.white : Colors.black },
                ]}
              >
                {t("No")}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.continueBtn, { marginTop: 24 }]}
            onPress={() => {
              if (editIndex < parcels.length - 1) {
                setEditIndex((prev) => prev + 1);
              } else {
                setStep("overview");
              }
            }}
          >
            <Text style={styles.bigBtnText}>
              {editIndex < parcels.length - 1 ? t("Next parcel") : t("Back to overview")}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {step === "summary" ? (
        <View style={styles.page}>
          <Text style={styles.pageTitle}>{t("Rejection summary")}</Text>
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            {parcels.map(renderParcelCard)}
            <View style={styles.commentBox}>
              <Text style={styles.commentLabel}>{t("Comment")}</Text>
              <Text style={styles.commentText}>{comment}</Text>
            </View>
            {signerName ? (
              <Text style={styles.signer}>{signerName}</Text>
            ) : null}
            {signature ? (
              <Image
                source={{
                  uri: String(signature).startsWith("data:")
                    ? signature
                    : `data:image/png;base64,${signature}`,
                }}
                style={styles.signatureImage}
                resizeMode="contain"
              />
            ) : null}
            <TouchableOpacity
              style={[styles.bigBtn, styles.closeBtn]}
              onPress={() => {
                setToast({
                  top: 45,
                  text: t("Notification saved"),
                  type: "success",
                  visible: true,
                });
                closeToHome();
              }}
            >
              <Text style={styles.bigBtnText}>{t("Close")}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      ) : null}

      <SecondCustomModal SecondModal={handoverModal} />

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

      <LoadingModal visible={signatureLoader} message={t("Please wait…")} />
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
    gap: 10,
  },
  parcelCard: {
    borderRadius: 14,
    padding: 14,
  },
  parcelCardAlert: {
    backgroundColor: Colors.diclinelite,
  },
  parcelCardOk: {
    backgroundColor: Colors.litegreen,
  },
  parcelName: {
    fontSize: 16,
    fontFamily: FONTS.SemiBold,
    color: Colors.black,
    marginBottom: 8,
  },
  tagRow: {
    flexDirection: "row",
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
    marginTop: 6,
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
    marginTop: 18,
    marginBottom: 10,
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
    minHeight: 56,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  bigBtnText: {
    color: Colors.white,
    fontFamily: FONTS.SemiBold,
    fontSize: 16,
  },
  editLabel: {
    marginTop: 18,
    marginBottom: 8,
    fontSize: 14,
    fontFamily: FONTS.SemiBold,
    color: Colors.white,
  },
  continueBtn: {
    minHeight: 54,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtn: {
    backgroundColor: Colors.green,
    marginTop: 18,
  },
  signer: {
    color: Colors.white,
    fontFamily: FONTS.Medium,
    fontSize: 14,
    textAlign: "center",
    marginTop: 10,
  },
  signatureImage: {
    width: "100%",
    height: 120,
    backgroundColor: Colors.white,
    borderRadius: 12,
    marginTop: 8,
  },
});
