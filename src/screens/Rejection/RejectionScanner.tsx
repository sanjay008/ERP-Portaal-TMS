import apiConstants from "@/src/api/apiConstants";
import { Images } from "@/src/assets/images";
import AddCommentModal from "@/src/components/AddCommentModal";
import { ApiFormatDate } from "@/src/components/ApiFormatDate";
import { useErrorHandle } from "@/src/components/ErrorHandle";
import InvalidQRModal from "@/src/components/InvalidQRModal";
import LoadingModal from "@/src/components/LoadingModal";
import ScannerInfoModal from "@/src/components/ScannerInfoModal";
import { GlobalContextData } from "@/src/context/GlobalContext";
import { setLatestPickupCameraSetData } from "@/src/context/ParcelVerifySessionContext";
import { DropboxContext } from "@/src/context/UploadProider";
import { pingDriverLiveLocation } from "@/src/utils/driverLocationApi";
import ApiService from "@/src/utils/Apiservice";
import { Colors } from "@/src/utils/colors";
import { moreParcelsTitle } from "@/src/utils/deliveryMultiParcel";
import { appendToLocalUploadQueue } from "@/src/utils/localUploadQueue";
import { setLastScannedOrderId } from "@/src/utils/lastScannedOrderId";
import { syncNativeDriverTracking } from "@/src/utils/nativeDriverLocation";
import {
  isPickupOrder,
  isRejectionAllowedOrder,
} from "@/src/utils/orderStatus";
import {
  getRemainingParcelsFromApi,
} from "@/src/utils/pickupPlanned";
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
  AppState,
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
import { logRejectionApi } from "./rejectionLog";

type ChoiceModalState = {
  visible: boolean;
  title: string;
  message: string;
  left: { text: string; color: string; onPress: () => void } | null;
  right: { text: string; color: string; onPress: () => void } | null;
};

type PendingScan = {
  orderId: number;
  itemId: number;
  name: string;
  orderData: any;
  qrData: any;
  damageReasons: any[];
  /** verify `res.data` — same shape Delivery uses for moreCount */
  verifyData: any;
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
    setGloblyTypeSlide,
    SelectCurrentDate,
    selectRegionData,
    setPickUpDataSave,
  } = useContext(GlobalContextData);
  const { setLocalImagesUploadbeforeData } = useContext(DropboxContext);

  const [flashEnabled, setFlashEnabled] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraKey, setCameraKey] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [manualEntryOpen, setManualEntryOpen] = useState(false);
  const [manualOrderId, setManualOrderId] = useState("");
  const [manualItemId, setManualItemId] = useState("");
  const [showQRError, setShowQRError] = useState(false);
  const [qrErrorMessage, setQrErrorMessage] = useState<string | null>(null);
  const [commentVisible, setCommentVisible] = useState(false);
  const [commentLoader, setCommentLoader] = useState(false);
  const [conformationModal, setConformationModal] = useState<any>({
    visible: false,
    title: "",
    LButtonText: "",
    RButtonText: "",
    personData: [],
    ProductItem: [],
    order_id: 0,
    bgColor: "",
    OrderData: null,
    type: 1,
  });
  const [choiceModal, setChoiceModal] = useState<ChoiceModalState>({
    visible: false,
    title: "",
    message: "",
    left: null,
    right: null,
  });

  const lastScannedRef = useRef("");
  const isScanningRef = useRef(false);
  const pendingScanRef = useRef<PendingScan | null>(null);
  const photosRef = useRef<any[]>([]);
  const openProofCameraRef = useRef<() => void>(() => {});
  const cameraRef = useRef<any>(null);
  const wasCameraPausedByOverlayRef = useRef(false);
  const MIN_REJECTION_PHOTOS = 3;

  useEffect(() => {
    setGloblyTypeSlide(REJECTION_SLIDE_TYPE);
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

  /** Remount / resume preview — same pattern as delivery ScannerScreens */
  const restartScannerPreview = useCallback(() => {
    lastScannedRef.current = "";
    setTimeout(async () => {
      try {
        if (cameraRef.current?.resumePreview) {
          await cameraRef.current.resumePreview();
          setCameraReady(true);
          return;
        }
      } catch {
        // fall through to remount
      }
      setCameraReady(false);
      setCameraKey((prev) => prev + 1);
    }, 400);
  }, []);

  useEffect(() => {
    if (isFocused) {
      unlockScanner();
      restartScannerPreview();
    } else {
      wasCameraPausedByOverlayRef.current = false;
      setCameraReady(false);
    }
  }, [isFocused, unlockScanner, restartScannerPreview]);

  useEffect(() => {
    if (!isFocused) return;
    const sub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        restartScannerPreview();
      }
    });
    return () => sub.remove();
  }, [isFocused, restartScannerPreview]);

  const closeAllModals = useCallback(() => {
    setChoiceModal((prev) => ({ ...prev, visible: false }));
    setConformationModal((prev: any) => ({ ...prev, visible: false }));
    setShowQRError(false);
    setCommentVisible(false);
  }, []);

  const closeConformationModalAndUnlockScan = useCallback(() => {
    setConformationModal((prev: any) => ({ ...prev, visible: false }));
    unlockScanner();
    restartScannerPreview();
  }, [unlockScanner, restartScannerPreview]);

  const openVerifyInfoPopup = useCallback(
    ({
      title,
      orderData,
      orderId,
      verifyData,
    }: {
      title: string;
      orderData: any;
      orderId: number | string;
      verifyData?: any;
    }) => {
      const productItems =
        (Array.isArray(orderData?.items) && orderData.items.length > 0
          ? orderData.items
          : null) ||
        (Array.isArray(verifyData?.items) && verifyData.items.length > 0
          ? verifyData.items
          : null) ||
        [];

      setConformationModal({
        visible: true,
        title:
          title || t("Invalid QR code. Please try again."),
        LButtonText: t("Cancel"),
        RButtonText: "",
        personData: orderData || [],
        ProductItem: productItems,
        order_id: orderData?.id || orderId,
        bgColor: Colors.red,
        OrderData: verifyData || null,
        type: orderData?.tmsstatus?.id == 2 ? 2 : 1,
      });
    },
    [t],
  );

  const showMoreParcelsQuestion = useCallback(
    (moreCount?: number) => {
      const title =
        moreCount != null && moreCount > 0
          ? moreParcelsTitle(moreCount, t)
          : t("Are there more parcels for this order?");
      setChoiceModal({
        visible: true,
        title,
        message: "",
        left: {
          text: t("No"),
          color: Colors.red,
          onPress: () => {
            setChoiceModal((prev) => ({ ...prev, visible: false }));
            // Only here (or last parcel) we open photo camera
            openProofCameraRef.current();
          },
        },
        right: {
          text: t("Yes"),
          color: Colors.green,
          onPress: () => {
            setChoiceModal((prev) => ({ ...prev, visible: false }));
            unlockScanner();
            restartScannerPreview();
          },
        },
      });
    },
    [t, unlockScanner, restartScannerPreview],
  );

  /**
   * Rejection-specific remaining (API count does NOT drop after damage update,
   * unlike Delivery status_update). Freeze total on first scan, then:
   *   moreCount = sessionTotalRemaining - parcels.length
   * (same idea as ScannerScreens: remaining_item - selectedItems.length)
   */
  const continueAfterParcelScan = useCallback(
    (orderData: any, verifyData: any) => {
      const session = getRejectionSession();
      const scannedCount = session.parcels.length;

      let total = session.sessionTotalRemaining;
      if (total == null || total <= 0) {
        const fromApi = getRemainingParcelsFromApi(verifyData);
        const fromItems = Array.isArray(orderData?.items)
          ? orderData.items.filter((row: any) => row?.id != null).length
          : 0;
        total = Math.max(fromApi != null ? fromApi : 0, fromItems, scannedCount, 1);
        patchRejectionSession({ sessionTotalRemaining: total });
      }

      // remaining_item - selectedItems.length
      const moreCount = Math.max(0, Number(total) - scannedCount);

      logRejectionApi("more-parcels-check", "RES", {
        sessionTotalRemaining: total,
        scannedCount,
        moreCount,
        parcelIds: session.parcels.map((p) => p.itemId),
      });

      if (moreCount <= 0) {
        openProofCameraRef.current();
        return;
      }

      showMoreParcelsQuestion(moreCount);
    },
    [showMoreParcelsQuestion],
  );

  const finishPendingParcel = async (damaged: boolean) => {
    const pending = pendingScanRef.current;
    if (!pending) return;

    const session = getRejectionSession();
    const sessionOrderId = session.orderId ?? pending.orderId;

    setIsLoading(true);
    setChoiceModal((prev) => ({ ...prev, visible: false }));
    try {
      const payload = {
        token: UserData?.user?.verify_token,
        role: UserData?.user?.role,
        relaties_id: UserData?.relaties?.id,
        user_id: UserData?.user?.id,
        date: ApiFormatDate(SelectCurrentDate || new Date()),
        type: REJECTION_SLIDE_TYPE,
        order_id: sessionOrderId,
        item_id: pending.itemId,
        is_damage: damaged ? 1 : 0,
        // CRITICAL: do NOT send is_close on damage answer
      };
      logRejectionApi("update-damage", "REQ", payload);
      const res = await ApiService(apiConstants.status_update, {
        customData: payload,
      });
      logRejectionApi("update-damage", "RES", res);

      if (!Boolean(res?.status)) {
        setToast({
          top: 45,
          text: t(res?.message) || t("Something went wrong"),
          type: "error",
          visible: true,
        });
        unlockScanner();
        pendingScanRef.current = null;
        return;
      }

      const parcel: RejectionParcel = {
        itemId: pending.itemId,
        orderId: sessionOrderId,
        name: pending.name,
        damaged,
        rejected: true,
      };
      addRejectionParcel(parcel);
      const sessionNow = getRejectionSession();
      // Freeze total on first parcel from verify remaining / order items
      if (sessionNow.sessionTotalRemaining == null) {
        const fromApi = getRemainingParcelsFromApi(pending.verifyData);
        const fromItems = Array.isArray(pending.orderData?.items)
          ? pending.orderData.items.filter((row: any) => row?.id != null).length
          : 0;
        const total = Math.max(
          fromApi != null ? fromApi : 0,
          fromItems,
          1,
        );
        patchRejectionSession({
          orderId: sessionOrderId,
          orderData: pending.orderData,
          qrData: pending.qrData,
          damageReasons: pending.damageReasons,
          sessionTotalRemaining: total,
        });
      } else {
        patchRejectionSession({
          orderId: sessionOrderId,
          orderData: pending.orderData,
          qrData: pending.qrData,
          damageReasons: pending.damageReasons,
        });
      }
      pendingScanRef.current = null;
      continueAfterParcelScan(pending.orderData, pending.verifyData);
    } catch (error: any) {
      logRejectionApi(
        "update-damage",
        "ERR",
        error?.response?.data || error?.message || error,
      );
      setToast({
        top: 45,
        text:
          t(error?.response?.data?.message) ||
          ErrorHandle(error).message ||
          t("Something went wrong"),
        type: "error",
        visible: true,
      });
      unlockScanner();
      pendingScanRef.current = null;
    } finally {
      setIsLoading(false);
    }
  };

  const showDamageQuestion = (questionText?: string) => {
    setChoiceModal({
      visible: true,
      title:
        questionText ||
        getRejectionSession().damageQuestion ||
        t("Is the parcel damaged?"),
      message: "",
      left: {
        text: t("Yes"),
        color: Colors.red,
        onPress: () => {
          void finishPendingParcel(true);
        },
      },
      right: {
        text: t("No"),
        color: Colors.green,
        onPress: () => {
          void finishPendingParcel(false);
        },
      },
    });
  };

  const uploadRejectionPhotos = useCallback(
    async (media: any[]) => {
      const session = getRejectionSession();
      const orderId = session.orderId;
      if (!orderId) {
        setToast({
          top: 45,
          text: t("Invalid or missing order details. Please rescan."),
          type: "error",
          visible: true,
        });
        return false;
      }

      const uris = (media || [])
        .map((item) => (typeof item === "string" ? item : item?.uri))
        .filter(Boolean) as string[];
      if (uris.length < MIN_REJECTION_PHOTOS) {
        setToast({
          top: 45,
          text: t("Please take at least 3 photos"),
          type: "error",
          visible: true,
        });
        return false;
      }

      setIsLoading(true);
      try {
        logRejectionApi("store-photo", "REQ", {
          order_id: orderId,
          type: REJECTION_SLIDE_TYPE,
          images_count: uris.length,
          via: "upload-queue",
        });
        // Existing Dropbox → store_tms_comment_img_new pipeline (commentId may be null).
        appendToLocalUploadQueue(setLocalImagesUploadbeforeData, {
          order_id: orderId,
          image_data: [...uris],
          item_id: session.parcels[0]?.itemId || null,
          commentId: null,
          qr_data: JSON.stringify(session.qrData ?? null),
        });
        logRejectionApi("store-photo", "RES", {
          queued: true,
          images_count: uris.length,
        });

        // If camera already returned Dropbox metadata, also push immediately.
        const readyImages = (media || []).filter(
          (row) => row && typeof row === "object" && row.file_path,
        );
        if (readyImages.length > 0) {
          const formData: any = new FormData();
          formData.append("token", UserData?.user?.verify_token);
          formData.append("role", UserData?.user?.role);
          formData.append("relaties_id", UserData?.relaties?.id);
          formData.append("user_id", UserData?.user?.id);
          formData.append("order_id", String(orderId));
          formData.append("type", REJECTION_SLIDE_TYPE);
          readyImages.forEach((image: any, index: number) => {
            formData.append(
              `images[${index}][file_path]`,
              image?.file_path || "",
            );
            formData.append(`images[${index}][file]`, image?.file || "");
            formData.append(
              `images[${index}][file_extension]`,
              image?.file_extension || "",
            );
            formData.append(
              `images[${index}][dropbox_id]`,
              image?.dropbox_id || "",
            );
            formData.append(
              `images[${index}][shared_link]`,
              image?.shared_link ?? "",
            );
          });
          logRejectionApi("store-photo-direct", "REQ", {
            order_id: orderId,
            type: REJECTION_SLIDE_TYPE,
            images_count: readyImages.length,
          });
          const res: any = await axios.post(
            apiConstants.store_tms_comment_img_new,
            formData,
            {
              headers: { "Content-Type": "multipart/form-data" },
              transformRequest: (data) => data,
            },
          );
          logRejectionApi("store-photo-direct", "RES", res?.data);
          if (
            !(
              Boolean(res?.data?.status) ||
              Number(res?.data?.status_code) === 200
            )
          ) {
            setToast({
              top: 45,
              text: t(res?.data?.message) || t("Failed to save photo"),
              type: "error",
              visible: true,
            });
            return false;
          }
        }

        photosRef.current = media;
        patchRejectionSession({ photos: media, photoSaved: true });
        return true;
      } catch (error: any) {
        logRejectionApi(
          "store-photo",
          "ERR",
          error?.response?.data || error?.message || error,
        );
        setToast({
          top: 45,
          text:
            t(error?.response?.data?.message) ||
            ErrorHandle(error).message ||
            t("Failed to save photo"),
          type: "error",
          visible: true,
        });
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [
      ErrorHandle,
      UserData,
      setLocalImagesUploadbeforeData,
      setToast,
      t,
    ],
  );

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
          const ok = await uploadRejectionPhotos(media);
          if (ok) {
            setCommentVisible(true);
          } else {
            setTimeout(() => {
              openProofCameraRef.current();
            }, 350);
          }
        } else {
          setToast({
            top: 45,
            text: t("Photo is mandatory"),
            type: "error",
            visible: true,
          });
          setTimeout(() => {
            openProofCameraRef.current();
          }, 350);
        }
      } finally {
        unlockParcelCameraCallback();
      }
    };
    setLatestPickupCameraSetData(setData);
    setPickUpDataSave({ setData });
    navigation.navigate("Camera", {
      from: "Pickup",
      minPhotos: MIN_REJECTION_PHOTOS,
      photoOnly: true,
    });
  }, [
    navigation,
    setPickUpDataSave,
    setToast,
    t,
    unlockScanner,
    uploadRejectionPhotos,
  ]);

  useEffect(() => {
    openProofCameraRef.current = openProofCamera;
  }, [openProofCamera]);

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
          text: t("Only parcels from the same order can be scanned."),
          type: "error",
          visible: true,
        });
        unlockScanner();
        return;
      }

      if (session.parcels.some((row) => String(row.itemId) === String(itemId))) {
        void playErrorSound();
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
          type: REJECTION_SLIDE_TYPE,
          session_order_id: session.orderId ?? 0,
        };

        logRejectionApi("verify", "REQ", payload);
        const res = await ApiService(apiConstants.Verify_status, {
          customData: payload,
        });
        logRejectionApi("verify", "RES", res);

        const statusCode = Number(res?.status_code ?? res?.data?.status_code);
        const errorKey = Boolean(res?.error_key ?? res?.data?.error_key);
        const apiMessage =
          res?.message || res?.data?.message || t("Something went wrong");

        if (statusCode === 403 || !Boolean(res?.status) || errorKey) {
          void playErrorSound();
          const orderData = res?.data?.order_data || null;
          openVerifyInfoPopup({
            title: t(apiMessage) || t("Invalid QR code. Please try again."),
            orderData,
            orderId,
            verifyData: res?.data,
          });
          setToast({
            top: 45,
            text: t(apiMessage),
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
        if (orderData && !isRejectionAllowedOrder(orderData)) {
          void playErrorSound();
          const blockMsg = isPickupOrder(orderData)
            ? t(apiMessage) || t("Rejection is not allowed for pickup orders")
            : t(apiMessage) ||
              t(
                "Rejection only allowed for warehouse, in transit to delivery, or delivered orders",
              );
          openVerifyInfoPopup({
            title: blockMsg,
            orderData,
            orderId,
            verifyData: res?.data,
          });
          setToast({
            top: 45,
            text: blockMsg,
            type: "error",
            visible: true,
          });
          return;
        }

        if (session.orderId == null) {
          patchRejectionSession({ orderId });
        }

        const items = Array.isArray(orderData?.items) ? orderData.items : [];
        const matched =
          items.find((row: any) => Number(row?.id) === itemId) || items[0];
        const damageReasons = Array.isArray(res?.data?.damaged_parcel)
          ? res.data.damaged_parcel
          : [];
        const questionText =
          res?.data?.quetion ||
          res?.data?.question ||
          t("Is the parcel damaged?");

        pendingScanRef.current = {
          orderId,
          itemId,
          name: getRejectionParcelName(matched, itemId),
          orderData,
          qrData: parsed,
          damageReasons,
          verifyData: res?.data ?? res,
        };
        patchRejectionSession({
          orderData,
          qrData: parsed,
          damageReasons,
          damageQuestion: String(questionText),
        });
        showDamageQuestion(String(questionText));
      } catch (error: any) {
        void playErrorSound();
        logRejectionApi(
          "verify",
          "ERR",
          error?.response?.data || error?.message || error,
        );
        const statusCode = Number(error?.response?.status);
        const apiMessage =
          error?.response?.data?.message ||
          ErrorHandle(error).message ||
          t("Something went wrong");
        if (statusCode !== 403 && axios.isAxiosError(error)) {
          setQrErrorMessage(null);
          setShowQRError(true);
        }
        setToast({
          top: 45,
          text: t(apiMessage),
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
      openVerifyInfoPopup,
      selectRegionData?.id,
      setToast,
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
        choiceModal.visible ||
        commentVisible ||
        showQRError ||
        conformationModal?.visible ||
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
      conformationModal?.visible,
      isFocused,
      manualEntryOpen,
      playBeep,
      choiceModal.visible,
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
      if (!session.photoSaved) {
        setToast({
          top: 45,
          text: t("Photo is mandatory"),
          type: "error",
          visible: true,
        });
        setCommentVisible(false);
        openProofCameraRef.current();
        return;
      }
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
        const commentPayload = {
          order_id: orderId,
          order_comment: trimmed,
          type: REJECTION_SLIDE_TYPE,
          date: ApiFormatDate(SelectCurrentDate || new Date()),
          role: UserData?.user?.role,
          relaties_id: UserData?.relaties?.id,
          user_id: UserData?.user?.id,
          qr_data: JSON.stringify(session.qrData),
          token: UserData?.user?.verify_token,
        };
        logRejectionApi("store-comment", "REQ", commentPayload);

        const formData: any = new FormData();
        formData.append("token", UserData?.user?.verify_token);
        formData.append("role", UserData?.user?.role);
        formData.append("relaties_id", UserData?.relaties?.id);
        formData.append("user_id", UserData?.user?.id);
        formData.append("qr_data", JSON.stringify(session.qrData));
        formData.append("order_comment", trimmed);
        formData.append("order_id", String(orderId));
        formData.append("type", REJECTION_SLIDE_TYPE);
        formData.append(
          "date",
          ApiFormatDate(SelectCurrentDate || new Date()),
        );

        const res: any = await axios.post(apiConstants.store_tms_comment, formData, {
          headers: { "Content-Type": "multipart/form-data" },
          transformRequest: (data) => data,
        });
        logRejectionApi("store-comment", "RES", res?.data);

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

        patchRejectionSession({
          comment: trimmed,
          commentSaved: true,
        });
        setCommentVisible(false);
        setToast({
          top: 45,
          text: t(res?.data?.message) || t("Success"),
          type: "success",
          visible: true,
        });
        navigation.navigate("RejectionReview");
      } catch (error: any) {
        logRejectionApi(
          "store-comment",
          "ERR",
          error?.response?.data || error?.message || error,
        );
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
      SelectCurrentDate,
      UserData,
      navigation,
      setToast,
      t,
    ],
  );

  const scannerBlocked =
    choiceModal.visible ||
    commentVisible ||
    showQRError ||
    conformationModal?.visible ||
    manualEntryOpen;

  // Keep CameraView mounted under overlays; only pause/resume (avoids black screen)
  useEffect(() => {
    if (!isFocused) {
      wasCameraPausedByOverlayRef.current = false;
      return;
    }

    const syncCameraWithOverlay = async () => {
      try {
        if (scannerBlocked) {
          await cameraRef.current?.pausePreview?.();
          wasCameraPausedByOverlayRef.current = true;
          return;
        }

        if (!wasCameraPausedByOverlayRef.current) return;
        wasCameraPausedByOverlayRef.current = false;
        restartScannerPreview();
      } catch {
        // ignore
      }
    };

    syncCameraWithOverlay();
  }, [scannerBlocked, isFocused, restartScannerPreview]);

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
      {isFocused ? (
        <CameraView
          ref={cameraRef}
          key={cameraKey}
          style={StyleSheet.absoluteFill}
          facing="back"
          enableTorch={flashEnabled}
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          onBarcodeScanned={scannerBlocked ? undefined : onBarcodeScanned}
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
      !choiceModal.visible &&
      !commentVisible &&
      !showQRError &&
      !conformationModal?.visible ? (
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
                restartScannerPreview();
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

      {choiceModal.visible ? (
        <View style={styles.choiceOverlay}>
          <View style={styles.choiceCard}>
            <Text style={styles.choiceTitle}>{choiceModal.title}</Text>
            {choiceModal.message ? (
              <Text style={styles.choiceMessage}>{choiceModal.message}</Text>
            ) : null}
            <View style={styles.choiceBtnRow}>
              {choiceModal.left ? (
                <TouchableOpacity
                  style={[
                    styles.choiceBtn,
                    { backgroundColor: choiceModal.left.color },
                  ]}
                  activeOpacity={0.88}
                  onPress={choiceModal.left.onPress}
                >
                  <Text style={styles.choiceBtnText}>{choiceModal.left.text}</Text>
                </TouchableOpacity>
              ) : null}
              {choiceModal.right ? (
                <TouchableOpacity
                  style={[
                    styles.choiceBtn,
                    { backgroundColor: choiceModal.right.color },
                  ]}
                  activeOpacity={0.88}
                  onPress={choiceModal.right.onPress}
                >
                  <Text style={styles.choiceBtnText}>
                    {choiceModal.right.text}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </View>
      ) : null}

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

      <ScannerInfoModal
        InfoTitle={conformationModal.title}
        type={conformationModal?.type || 0}
        visible={conformationModal?.visible}
        personData={conformationModal?.personData}
        RText={conformationModal.RButtonText}
        LText={conformationModal.LButtonText}
        ProductItem={conformationModal?.ProductItem}
        OrderId={conformationModal.order_id}
        bgColor={conformationModal?.bgColor || ""}
        onClose={closeConformationModalAndUnlockScan}
        OrderData={conformationModal?.OrderData}
      />

      <InvalidQRModal
        visible={showQRError}
        message={qrErrorMessage ?? undefined}
        onScanAgain={() => {
          setShowQRError(false);
          setQrErrorMessage(null);
          unlockScanner();
          restartScannerPreview();
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
  choiceOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
    backgroundColor: "rgba(0,0,0,0.72)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  choiceCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: Colors.white,
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 22,
    gap: 16,
  },
  choiceTitle: {
    fontSize: 20,
    fontFamily: FONTS.SemiBold,
    color: Colors.black,
    textAlign: "center",
  },
  choiceMessage: {
    fontSize: 14,
    fontFamily: FONTS.Regular,
    color: Colors.darkText,
    textAlign: "center",
  },
  choiceBtnRow: {
    flexDirection: "row",
    gap: 12,
  },
  choiceBtn: {
    flex: 1,
    minHeight: 54,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  choiceBtnText: {
    color: Colors.white,
    fontFamily: FONTS.SemiBold,
    fontSize: 16,
  },
});
