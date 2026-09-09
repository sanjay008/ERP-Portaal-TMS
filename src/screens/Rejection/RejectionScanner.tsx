import apiConstants from "@/src/api/apiConstants";
import { Images } from "@/src/assets/images";
import AddCommentModal from "@/src/components/AddCommentModal";
import { ApiFormatDate } from "@/src/components/ApiFormatDate";
import ConformationModal from "@/src/components/ConformationModal";
import { useErrorHandle } from "@/src/components/ErrorHandle";
import InvalidQRModal from "@/src/components/InvalidQRModal";
import LoadingModal from "@/src/components/LoadingModal";
import SecondCustomModal from "@/src/components/SecondCustomModal";
import { GlobalContextData } from "@/src/context/GlobalContext";
import { setLatestPickupCameraSetData } from "@/src/context/ParcelVerifySessionContext";
import { DropboxContext } from "@/src/context/UploadProider";
import { pingDriverLiveLocation } from "@/src/utils/driverLocationApi";
import ApiService from "@/src/utils/Apiservice";
import { Colors } from "@/src/utils/colors";
import { appendToLocalUploadQueue } from "@/src/utils/localUploadQueue";
import { setLastScannedOrderId } from "@/src/utils/lastScannedOrderId";
import { syncNativeDriverTracking } from "@/src/utils/nativeDriverLocation";
import { isPickupOrder } from "@/src/utils/orderStatus";
import {
  lockParcelCameraCallback,
  unlockParcelCameraCallback,
} from "@/src/utils/parcelVerifyCameraReturn";
import { playErrorSound } from "@/src/utils/playScanSound";
import { resolveScanLocation } from "@/src/utils/scanFreshLocation";
import { FONTS, height, width } from "@/src/utils/storeData";
import { Ionicons } from "@expo/vector-icons";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import { Audio } from "expo-av";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Image } from "expo-image";
import axios from "axios";
import React, { useCallback, useContext, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  Vibration,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  addRejectionParcel,
  getRejectionParcelName,
  getRejectionSession,
  patchRejectionSession,
  resetRejectionSession,
  REJECTION_SLIDE_TYPE,
  type RejectionParcel,
} from "./rejectionSession";

type PendingScan = {
  orderId: number;
  itemId: number;
  name: string;
  orderData: any;
  qrData: any;
  damageReasons: any[];
};

export default function RejectionScanner({ route }: any) {
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();
  const { t } = useTranslation();
  const { ErrorHandle } = useErrorHandle();
  const { top } = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();

  const {
    UserData,
    setToast,
    GloblyTypeSlide,
    setGloblyTypeSlide,
    SelectCurrentDate,
    selectRegionData,
    setPickUpDataSave,
  } = useContext(GlobalContextData);
  const { setLocalImagesUploadbeforeData } = useContext(DropboxContext);

  const [flashEnabled, setFlashEnabled] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [manualEntryOpen, setManualEntryOpen] = useState(false);
  const [manualOrderId, setManualOrderId] = useState("");
  const [manualItemId, setManualItemId] = useState("");
  const [showQRError, setShowQRError] = useState(false);
  const [qrErrorMessage, setQrErrorMessage] = useState<string | null>(null);
  const [commentVisible, setCommentVisible] = useState(false);
  const [commentLoader, setCommentLoader] = useState(false);
  const [invalidVisible, setInvalidVisible] = useState(false);
  const [invalidTitle, setInvalidTitle] = useState("");
  const [secondModal, setSecondModal] = useState<any>({
    visible: false,
    title: "",
    message: "",
    buttons: [],
    color: Colors.transparant,
  });

  const lastScannedRef = useRef("");
  const isScanningRef = useRef(false);
  const pendingScanRef = useRef<PendingScan | null>(null);
  const photosRef = useRef<any[]>([]);

  const slideType =
    route?.params?.type || GloblyTypeSlide || REJECTION_SLIDE_TYPE;

  useEffect(() => {
    setGloblyTypeSlide(REJECTION_SLIDE_TYPE);
    resetRejectionSession();
  }, [setGloblyTypeSlide]);

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission?.granted, requestPermission]);

  const playBeep = useCallback(async () => {
    const { sound } = await Audio.Sound.createAsync(Images.ScannerSound);
    await sound.playAsync();
  }, []);

  const unlockScanner = useCallback(() => {
    lastScannedRef.current = "";
    isScanningRef.current = false;
  }, []);

  useEffect(() => {
    if (isFocused) {
      unlockScanner();
      setCameraReady(false);
    }
  }, [isFocused, unlockScanner]);

  const closeAllModals = useCallback(() => {
    setSecondModal((prev: any) => ({ ...prev, visible: false }));
    setInvalidVisible(false);
    setShowQRError(false);
    setCommentVisible(false);
  }, []);

  const showMoreParcelsQuestion = () => {
    setSecondModal({
      visible: true,
      title: t("Are there more parcels for this order?"),
      message: "",
      color: Colors.transparant,
      buttons: [
        {
          text: t("No"),
          type: "secondary",
          backgroundColor: Colors.red,
          onPress: () => {
            setSecondModal((prev: any) => ({ ...prev, visible: false }));
            openProofCamera();
          },
        },
        {
          text: t("Yes"),
          type: "primary",
          backgroundColor: Colors.green,
          onPress: () => {
            setSecondModal((prev: any) => ({ ...prev, visible: false }));
            unlockScanner();
          },
        },
      ],
    });
  };

  const finishPendingParcel = (damaged: boolean) => {
    const pending = pendingScanRef.current;
    if (!pending) return;
    const parcel: RejectionParcel = {
      itemId: pending.itemId,
      orderId: pending.orderId,
      name: pending.name,
      damaged,
      rejected: true,
    };
    addRejectionParcel(parcel);
    patchRejectionSession({
      orderId: pending.orderId,
      orderData: pending.orderData,
      qrData: pending.qrData,
      damageReasons: pending.damageReasons,
    });
    pendingScanRef.current = null;
    setSecondModal((prev: any) => ({ ...prev, visible: false }));
    showMoreParcelsQuestion();
  };

  const showDamageQuestion = () => {
    setSecondModal({
      visible: true,
      title: t("Is the parcel damaged?"),
      message: t("Yes = damaged · No = undamaged"),
      color: Colors.transparant,
      buttons: [
        {
          text: t("Yes"),
          type: "primary",
          backgroundColor: Colors.red,
          onPress: () => finishPendingParcel(true),
        },
        {
          text: t("No"),
          type: "primary",
          backgroundColor: Colors.green,
          onPress: () => finishPendingParcel(false),
        },
      ],
    });
  };

  const openProofCamera = useCallback(() => {
    const session = getRejectionSession();
    if (!session.parcels.length) {
      setToast({
        top: 45,
        text: t("Scan at least one parcel"),
        type: "error",
        visible: true,
      });
      unlockScanner();
      return;
    }

    lockParcelCameraCallback();
    const setData = async (media: any[]) => {
      try {
        if (media?.length > 0) {
          photosRef.current = media;
          patchRejectionSession({ photos: media });
          setCommentVisible(true);
        } else {
          setToast({
            top: 45,
            text: t("Photo is mandatory"),
            type: "error",
            visible: true,
          });
          unlockScanner();
        }
      } finally {
        unlockParcelCameraCallback();
      }
    };
    setLatestPickupCameraSetData(setData);
    setPickUpDataSave({ setData });
    navigation.navigate("Camera", {
      from: "Pickup",
      minPhotos: 1,
      photoOnly: true,
    });
  }, [navigation, setPickUpDataSave, setToast, t, unlockScanner]);

  const verifyScan = useCallback(
    async (parsed: any) => {
      const orderId = Number(parsed?.order_id);
      const itemId = Number(parsed?.item_id);
      if (!orderId || !itemId) {
        setToast({
          top: 45,
          text: t("Invalid QR: Missing item or order ID"),
          type: "error",
          visible: true,
        });
        unlockScanner();
        return;
      }

      const session = getRejectionSession();
      if (session.orderId != null && String(session.orderId) !== String(orderId)) {
        void playErrorSound();
        setToast({
          top: 45,
          text: t("All scanned parcels must belong to the same order"),
          type: "error",
          visible: true,
        });
        unlockScanner();
        return;
      }

      if (session.parcels.some((row) => String(row.itemId) === String(itemId))) {
        setToast({
          top: 45,
          text: t("This parcel is already scanned"),
          type: "error",
          visible: true,
        });
        unlockScanner();
        return;
      }

      setIsLoading(true);
      try {
        const payload = {
          token: UserData?.user?.verify_token,
          role: UserData?.user?.role,
          relaties_id: UserData?.relaties?.id,
          user_id: UserData?.user?.id,
          item_id: itemId,
          order_id: orderId,
          region_id: selectRegionData?.id,
          qr_data: JSON.stringify(parsed ?? null),
          date: ApiFormatDate(SelectCurrentDate || new Date()),
          type: slideType,
        };

        const res = await ApiService(apiConstants.Verify_status, {
          customData: payload,
        });

        if (!Boolean(res?.status)) {
          void playErrorSound();
          setInvalidTitle(
            t(res?.message) || t("Invalid QR code. Please try again."),
          );
          setInvalidVisible(true);
          setToast({
            top: 45,
            text: t(res?.message) || t("Something went wrong"),
            type: "error",
            visible: true,
          });
          return;
        }

        await resolveScanLocation(orderId);
        await setLastScannedOrderId(orderId);
        void pingDriverLiveLocation(UserData);
        void syncNativeDriverTracking(UserData);

        const orderData = res?.data?.order_data || res?.data || null;
        if (isPickupOrder(orderData)) {
          void playErrorSound();
          setToast({
            top: 45,
            text: t("Rejection is not allowed for pickup orders"),
            type: "error",
            visible: true,
          });
          return;
        }

        const items = Array.isArray(orderData?.items) ? orderData.items : [];
        const matched =
          items.find((row: any) => Number(row?.id) === itemId) || items[0];
        const damageReasons = Array.isArray(res?.data?.damaged_parcel)
          ? res.data.damaged_parcel
          : [];

        pendingScanRef.current = {
          orderId,
          itemId,
          name: getRejectionParcelName(matched, itemId),
          orderData,
          qrData: parsed,
          damageReasons,
        };
        showDamageQuestion();
      } catch (error: any) {
        void playErrorSound();
        if (axios.isAxiosError(error)) {
          setQrErrorMessage(null);
          setShowQRError(true);
        }
        setToast({
          top: 45,
          text:
            t(error?.response?.data?.message) ||
            ErrorHandle(error).message ||
            t("Something went wrong"),
          type: "error",
          visible: true,
        });
      } finally {
        setIsLoading(false);
        if (!pendingScanRef.current) {
          unlockScanner();
        }
      }
    },
    [
      ErrorHandle,
      SelectCurrentDate,
      UserData,
      selectRegionData?.id,
      setToast,
      showDamageQuestion,
      slideType,
      t,
      unlockScanner,
    ],
  );

  const onBarcodeScanned = useCallback(
    async ({ data }: { data: string }) => {
      if (
        !data ||
        !cameraReady ||
        isScanningRef.current ||
        secondModal.visible ||
        commentVisible ||
        showQRError ||
        invalidVisible ||
        manualEntryOpen ||
        !isFocused
      ) {
        return;
      }
      if (data === lastScannedRef.current) return;

      isScanningRef.current = true;
      lastScannedRef.current = data;

      let parsed: any;
      try {
        parsed = JSON.parse(data);
      } catch {
        setQrErrorMessage(null);
        setShowQRError(true);
        setToast({
          top: 45,
          text: t("Invalid QR code format"),
          type: "error",
          visible: true,
        });
        unlockScanner();
        return;
      }

      if (!parsed?.item_id || !parsed?.order_id) {
        setToast({
          top: 45,
          text: t("Invalid QR: Missing item or order ID"),
          type: "error",
          visible: true,
        });
        unlockScanner();
        return;
      }

      Vibration.vibrate(500);
      try {
        await playBeep();
      } catch {
        // ignore
      }
      await verifyScan(parsed);
    },
    [
      cameraReady,
      commentVisible,
      invalidVisible,
      isFocused,
      manualEntryOpen,
      playBeep,
      secondModal.visible,
      setToast,
      showQRError,
      t,
      unlockScanner,
      verifyScan,
    ],
  );

  const submitManualEntry = useCallback(async () => {
    const orderId = manualOrderId.trim();
    const itemId = manualItemId.trim();
    if (!orderId || !itemId) {
      setToast({
        top: 45,
        text: t("Please enter Order ID and Item ID"),
        type: "error",
        visible: true,
      });
      return;
    }
    if (isScanningRef.current) return;
    Keyboard.dismiss();
    isScanningRef.current = true;
    Vibration.vibrate(500);
    try {
      await playBeep();
    } catch {
      // ignore
    }
    const parsed = { order_id: orderId, item_id: itemId };
    setManualEntryOpen(false);
    await verifyScan(parsed);
  }, [manualItemId, manualOrderId, playBeep, setToast, t, verifyScan]);

  const saveComment = useCallback(
    async (comment: string) => {
      const session = getRejectionSession();
      const orderId = session.orderId;
      if (!orderId) return;
      const trimmed = comment.trim();
      if (!trimmed) {
        setToast({
          top: 45,
          text: t("Enter a comment"),
          type: "error",
          visible: true,
        });
        setCommentVisible(true);
        return;
      }

      setCommentLoader(true);
      try {
        const formData: any = new FormData();
        formData.append("token", UserData?.user?.verify_token);
        formData.append("role", UserData?.user?.role);
        formData.append("relaties_id", UserData?.relaties?.id);
        formData.append("user_id", UserData?.user?.id);
        formData.append("qr_data", JSON.stringify(session.qrData));
        formData.append("order_comment", trimmed);
        formData.append("order_id", String(orderId));

        const res: any = await axios.post(apiConstants.store_tms_comment, formData, {
          headers: { "Content-Type": "multipart/form-data" },
          transformRequest: (data) => data,
        });

        if (!Boolean(res?.data?.status)) {
          setToast({
            top: 45,
            text: t(res?.data?.message) || t("Failed to save comment"),
            type: "error",
            visible: true,
          });
          setCommentVisible(true);
          return;
        }

        const orderLogId = res?.data?.data?.order_log_id;
        const photos = photosRef.current?.length
          ? photosRef.current
          : session.photos;
        if (photos?.length > 0 && orderLogId != null) {
          appendToLocalUploadQueue(setLocalImagesUploadbeforeData, {
            order_id: orderId,
            image_data: [...photos],
            item_id: session.parcels[0]?.itemId || null,
            commentId: orderLogId,
            qr_data: JSON.stringify(session.qrData),
          });
        }

        patchRejectionSession({ comment: trimmed, photos });
        setCommentVisible(false);
        setToast({
          top: 45,
          text: t(res?.data?.message) || t("Success"),
          type: "success",
          visible: true,
        });
        navigation.navigate("RejectionReview");
      } catch (error: any) {
        setToast({
          top: 45,
          text: ErrorHandle(error).message,
          type: "error",
          visible: true,
        });
        setCommentVisible(true);
      } finally {
        setCommentLoader(false);
      }
    },
    [
      ErrorHandle,
      UserData,
      navigation,
      setLocalImagesUploadbeforeData,
      setToast,
      t,
    ],
  );

  const scannerBlocked =
    secondModal.visible ||
    commentVisible ||
    showQRError ||
    invalidVisible ||
    manualEntryOpen;

  if (!permission?.granted) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.permissionText}>
          {t("Camera permission is required to scan QR codes.")}
        </Text>
        <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
          <Text style={styles.permissionBtnText}>{t("Allow Camera")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {isFocused && !scannerBlocked ? (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          enableTorch={flashEnabled}
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          onBarcodeScanned={onBarcodeScanned}
          onCameraReady={() => setCameraReady(true)}
        />
      ) : null}

      <Image
        source={Images.ScannerCenter}
        style={{ width, height, position: "absolute" }}
      />

      <View style={[styles.topIcon, { top: top ? top * 1.2 : 40 }]}>
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.iconButton}
          onPress={() => setFlashEnabled((prev) => !prev)}
        >
          <Ionicons
            name={flashEnabled ? "flash-sharp" : "flash-outline"}
            size={24}
            color={Colors.white}
          />
        </TouchableOpacity>

        {!manualEntryOpen ? (
          <TouchableOpacity
            style={styles.manualEntryChip}
            activeOpacity={0.85}
            onPress={() => setManualEntryOpen(true)}
          >
            <Ionicons name="keypad-outline" size={16} color={Colors.white} />
            <Text style={styles.manualEntryChipText}>{t("Enter code")}</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 1 }} />
        )}

        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.iconButton}
          onPress={() => {
            resetRejectionSession();
            closeAllModals();
            navigation.goBack();
          }}
        >
          <Image source={Images.Close} style={styles.closeIcon} />
        </TouchableOpacity>
      </View>

      {manualEntryOpen &&
      !secondModal.visible &&
      !commentVisible &&
      !showQRError &&
      !invalidVisible ? (
        <View
          style={[
            styles.manualEntryPanel,
            { top: (top ? top * 1.2 : 40) + 56 },
          ]}
        >
          <View style={styles.manualEntryHeader}>
            <Text style={styles.manualEntryTitle}>{t("Enter QR details")}</Text>
            <TouchableOpacity
              hitSlop={10}
              onPress={() => {
                Keyboard.dismiss();
                setManualEntryOpen(false);
                unlockScanner();
              }}
            >
              <Ionicons name="close" size={20} color={Colors.white} />
            </TouchableOpacity>
          </View>
          <TextInput
            value={manualOrderId}
            onChangeText={setManualOrderId}
            placeholder={t("Order ID")}
            placeholderTextColor="rgba(255,255,255,0.5)"
            style={styles.manualInput}
            keyboardType="number-pad"
          />
          <TextInput
            value={manualItemId}
            onChangeText={setManualItemId}
            placeholder={t("Item ID")}
            placeholderTextColor="rgba(255,255,255,0.5)"
            style={styles.manualInput}
            keyboardType="number-pad"
          />
          <TouchableOpacity style={styles.manualSubmit} onPress={submitManualEntry}>
            {isLoading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.manualSubmitText}>{t("Continue")}</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : null}

      <SecondCustomModal SecondModal={secondModal} />

      <AddCommentModal
        IsVisible={commentVisible}
        setIsVisible={(visible) => {
          if (!visible && !getRejectionSession().comment) {
            setToast({
              top: 45,
              text: t("Comment is mandatory"),
              type: "error",
              visible: true,
            });
            return;
          }
          setCommentVisible(visible);
        }}
        fun={saveComment}
        imageLoad={commentLoader}
      />

      <ConformationModal
        IsVisible={invalidVisible}
        Icon={Images.InValidScanner}
        Title={invalidTitle}
        LeftButtonText={t("Cancel")}
        onClose={() => {
          setInvalidVisible(false);
          unlockScanner();
        }}
      />

      <InvalidQRModal
        visible={showQRError}
        message={qrErrorMessage ?? undefined}
        onScanAgain={() => {
          setShowQRError(false);
          setQrErrorMessage(null);
          unlockScanner();
        }}
        onGoBack={() => {
          setShowQRError(false);
          resetRejectionSession();
          navigation.goBack();
        }}
      />

      <LoadingModal visible={isLoading || commentLoader} message={t("Please wait…")} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  center: {
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  permissionText: {
    color: Colors.white,
    fontFamily: FONTS.Medium,
    fontSize: 15,
    textAlign: "center",
    marginBottom: 16,
  },
  permissionBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permissionBtnText: {
    color: Colors.white,
    fontFamily: FONTS.SemiBold,
    fontSize: 15,
  },
  topIcon: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 20,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeIcon: {
    width: 18,
    height: 18,
    tintColor: Colors.white,
  },
  manualEntryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.45)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 20,
  },
  manualEntryChipText: {
    color: Colors.white,
    fontFamily: FONTS.Medium,
    fontSize: 13,
  },
  manualEntryPanel: {
    position: "absolute",
    left: 16,
    right: 16,
    backgroundColor: "rgba(0,0,0,0.82)",
    borderRadius: 14,
    padding: 14,
    zIndex: 30,
    gap: 10,
  },
  manualEntryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  manualEntryTitle: {
    color: Colors.white,
    fontFamily: FONTS.SemiBold,
    fontSize: 15,
  },
  manualInput: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    borderRadius: 10,
    color: Colors.white,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: FONTS.Regular,
  },
  manualSubmit: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
  },
  manualSubmitText: {
    color: Colors.white,
    fontFamily: FONTS.SemiBold,
    fontSize: 15,
  },
});
