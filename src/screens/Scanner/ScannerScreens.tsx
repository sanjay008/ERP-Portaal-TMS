import apiConstants from "@/src/api/apiConstants";
import { Images } from "@/src/assets/images";
import AnimatedModal from "@/src/components/AnimatedModal";
import CameraPermissionSheet from "@/src/components/CameraPermissionSheet";
import ConformationModal from "@/src/components/ConformationModal";
import { useErrorHandle } from "@/src/components/ErrorHandle";
import { goBackOrPopTo } from "@/src/components/goBackOrPopTo";
import InvalidQRModal from "@/src/components/InvalidQRModal";
import Loader from "@/src/components/loading";
import LoadingModal from "@/src/components/LoadingModal";
import NoParcelModal from "@/src/components/NoParcelModal";
import PickUpBox from "@/src/components/PickUpBox";
import PickupPlannedSheet from "@/src/components/PickupPlannedSheet";
import ScannerInfoModal from "@/src/components/ScannerInfoModal";
import SignatureModal from "@/src/components/SignatureModal";
import { GlobalContextData } from "@/src/context/GlobalContext";
import { DropboxContext } from "@/src/context/UploadProider";
import {
  openAppSettings,
  recheckCameraAccess,
  resolveCameraAccess,
  retryCameraPermission,
  type CameraAccessStatus,
} from "@/src/hooks/useCameraPermission";
import ApiService from "@/src/utils/Apiservice";
import { Colors } from "@/src/utils/colors.js";
import { appendToLocalUploadQueue } from "@/src/utils/localUploadQueue";
import {
  setLatestDeliveryCameraSetData,
  setLatestPickupCameraSetData,
} from "@/src/context/ParcelVerifySessionContext";
import {
  shouldShowDamageInCommentModal,
  shouldSkipCommentAfterCamera,
} from "@/src/utils/parcelCommentRules";
import {
  hasRemainingParcelsToDeliver,
} from "@/src/utils/pickupPlanned";
import {
  isParcelCameraCallbackLocked,
  lockParcelCameraCallback,
  unlockParcelCameraCallback,
} from "@/src/utils/parcelVerifyCameraReturn";
import { runParcelVerifyFlow } from "@/src/utils/runParcelVerifyFlow";
import { isBlankSignatureData } from "@/src/utils/signatureValidation";
import { FONTS, height, width } from "@/src/utils/storeData";
import Ionicons from "@expo/vector-icons/Ionicons";
import BottomSheet, {
  BottomSheetFlatList
} from "@gorhom/bottom-sheet";
import CheckBox from '@react-native-community/checkbox';
import { useIsFocused } from "@react-navigation/native";
import axios from "axios";
import { Audio } from "expo-av";
import {
  CameraType,
  CameraView,
} from "expo-camera";
import { goBack } from "expo-router/build/global-state/routing";
import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Animated,
  AppState,
  FlatList,
  Image,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  Vibration,
  View
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import Modal from "react-native-modal";
import ReAnimated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
export default function ScannerScreens({ navigation, route }: any) {
  const {
    fun = () => { },
    type,
    item,
    is_scan = true,
    restrictedOrderId = null,
  } = route?.params ?? {};
  const [ItemsData, setItemsData] = useState(item);
  const [isNoParcelFlow, setIsNoParcelFlow] = useState(false);
  const [showSig, setShowSig] = useState<boolean>(false);
  const [EvetyTimeShowDeliveryLabelList, setEvetyTimeShowDeliveryLabelList] = useState<boolean>(false);
  // const [NoParcelItemIds, setNoParcelItemIds] = useState<number[]>([]);
  const [IsLoading, setIsLoading] = useState<boolean>(false);
  const [ConformationModalOpen, setConformationModal] = useState<any>({
    visible: false,
    title: "",
    Icon: "",
    LButtonText: "",
    RButtonText: "",
    RButtonColor: "",
    RButtonStyle: Object,
    LButtonStyle: Object,
    RButtonIcon: Object,
    LColor: "",
    RColor: "",
    Desctiption: "",
    onPress: "",
    personData: [],
    type: 1,
    ProductItem: [],
    bgColor: "",
    OrderData: null,
    stopData: null
  });
  const [SecondModal, setSecondModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    buttons: {
      text: string;
      type?: "primary" | "secondary";
      onPress?: () => void;
    }[];
    color?: string;
  }>({
    visible: false,
    title: "",
    message: "",
    buttons: [],
    color: "",
  });
  const [refreshKey, setRefreshKey] = useState(0);
  const [cameraGranted, setCameraGranted] = useState(false);
  const [cameraPermissionSheet, setCameraPermissionSheet] = useState<{
    visible: boolean;
    reason: CameraAccessStatus | null;
  }>({ visible: false, reason: null });
  const [isCameraPermissionLoading, setIsCameraPermissionLoading] = useState(false);
  const [lastDetectedBarcode, setLastDetectedBarcode] = useState<string>("");
  const [flashEnabled, setFlashEnabled] = useState<boolean>(false);
  const [AllRecentScanData, setAllRecentScanData] = useState<number[]>([]);
  const [AllScanedData, setAllScanedData] = useState<object[]>([]);
  const [DataLoader, setDataLoader] = useState(false);
  const [Description, setDescrition] = useState<string>("");
  const [Commenterror, setCommentError] = useState<string>("");
  const [SelectPlace, setSelectPlace] = useState<object | any>(null);
  const [comment, setComment] = useState<boolean | any>(false);
  const [AllSelectImage, setAllSelectImage] = useState<any[]>([]);
  const [ProductDamageList, setProductDamageList] = useState<any[]>([]);
  const [AllSlideData, setAllSlideData] = useState([]);
  const [UpdateStatusHandle, setUpdateStatusHandle] = useState<null | boolean>(
    null
  );
  const [PickupPlannedSheetOpen, setPickupPlannedSheetOpen] = useState<{
    visible: boolean;
    orderData: any;
    scanPayload: any;
  }>({ visible: false, orderData: null, scanPayload: null });
  const pendingPickupScanRef = useRef<any>(null);
  const pickupPlannedModalPendingRef = useRef(false);
  const pendingDeliveryLabelRef = useRef<any>(null);
  const deliveryLabelModalPendingRef = useRef(false);
  const [showQRError, setShowQRError] = useState(false);
  const [qrErrorMessage, setQrErrorMessage] = useState<string | null>(null);
  const [manualEntryOpen, setManualEntryOpen] = useState(false);
  const [manualOrderId, setManualOrderId] = useState("");
  const [manualItemId, setManualItemId] = useState("");
  const [CommentLoader, setCommentLoader] = useState<boolean>(false);
  const [Refreshcondition, setRefreshCondition] = useState(false);
  const animatedHeight = useRef(new Animated.Value(height)).current;
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [NoParcelModalVisible, setNoParcelModalVisible] = useState(false);
  const [NoParcelOptions, setNoParcelOptions] = useState<any[]>([]);
  const cameraRef = useRef<any>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [ScannerModalOpen, setScannerModalOpen] = useState<{
    visible: boolean;
    InfoTitle?: string;
    type?: number;
    RText?: string;
    LText?: string;
    personData?: any;
    ProductItem?: any;
    OrderId?: number;
    delivery_btn?: any;
    onPress?: () => void;
    bgColor?: string;
    OrderData?: null | any;
  }>({
    visible: false,
    InfoTitle: "",
    type: 0,
    RText: "Take Photo",
    LText: "Cancel",
    personData: null,
    ProductItem: null,
    OrderId: 0,
    delivery_btn: null,
    onPress: undefined,
    bgColor: "",
    OrderData: null,
  });
  type AlertModalType = {
    visible: boolean;
    title: string;
    Description: string;
    LButtonText: string;
    RButtonText: string;
    Icon: any;
    RButtonStyle: object;
    RColor: string;
    LButtonStyle: object;
    LColor: string;
    onPress: () => void;
    RButtonIcon?: any;
    bgColor?: string | any;
  };
  const [GetConformationQuestion, setGetConformationQuestion] =
    useState<string>("");
  const [facing, setFacing] = useState<CameraType>("back");
  const {
    UserData,
    setToast,
    SelectCurrentDate,
    setSelectCurrentDate,
    PickUpDataSave,
    setPickUpDataSave,
    DeliveyDataSave,
    setDeliveyDataSave,
    GloblyTypeSlide,
    NoParcelItemIds,
    setNoParcelItemIds,
    SelectDeliveryReason,
    setSelectDeliveryReson,
    OrderDeliveryMapingLableOption,
    setOrderDeliveryMapingLableOption,
    NoParcelDetailsScreenEvent, setNoParcelDetailsScreenEvent,
    AllDeliveyLabel, setAllDeliveyLabel,
    SelectCurrentDeliveryLabel, setSelectCurrentDeliveryLabel,
    EffectiveDeliveryLabel,
    PinnedDeliveryLabel,
    clearPinnedDeliveryLabel,
    AllDamageListReason, setAllDamageListReason,
    selectDamageData, setselectDamageData,
    CommentId, setCommentId,
    selectRegionData
  } = useContext(GlobalContextData);

  const selectCurrentDeliveryLabelRef = useRef<any>(null);

  useEffect(() => {
    selectCurrentDeliveryLabelRef.current = SelectCurrentDeliveryLabel;
  }, [SelectCurrentDeliveryLabel]);

  const isCommentOptional =
    Number(ItemsData?.tmsstatus?.id ?? ItemsData?.status) === 4 &&
    (EffectiveDeliveryLabel ?? PinnedDeliveryLabel ?? SelectCurrentDeliveryLabel)?.id === 21 &&
    selectDamageData?.id === 34;

  const getSessionDeliveryLabel = useCallback(
    () =>
      pendingDeliveryLabelRef.current ?? selectCurrentDeliveryLabelRef.current,
    [],
  );

  const { t } = useTranslation();
  const { ErrorHandle } = useErrorHandle();
  const [cameraKey, setCameraKey] = useState(1);
  const { top, bottom } = useSafeAreaInsets();
  const [SignatureLoader, setSignatureLoader] = useState<boolean>(false);
  const [ShowDeliveryLabelList, setShowDeliveryLabelList] = useState(0);
  const [DropBoxUploadImageData, setDropBoxUploadImageData] = useState<any[]>([]);
  const [ImageStoreLoader, setImageStoreLoader] = useState<boolean>(false);

  const [CommentStep, setCommentStep] = useState<number>(1);
  const [ReposonseOrderData, setResponseOrderData] = useState<any>(null);
  const [AlertModalOpen, setAlerModalOpen] = useState<AlertModalType>({
    visible: false,
    title: "",
    Description: "",
    LButtonText: "",
    RButtonText: "",
    Icon: null,
    RButtonStyle: {},
    RColor: Colors.white,
    LButtonStyle: {},
    LColor: Colors.black,
    onPress: () => { },
  });
  const playBeep = useCallback(async () => {
    const { sound } = await Audio.Sound.createAsync(Images.ScannerSound);
    await sound.playAsync();
  }, []);

  const deliveryTypeRef = useRef(false);
  const signatureReopenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reopenSignatureAfterCamera = useCallback((data: any[]) => {
    if (!data?.length) return;
    setAllSelectImage(data);
    setComment(false);
    if (signatureReopenTimerRef.current) {
      clearTimeout(signatureReopenTimerRef.current);
    }
    setShowSig(false);
    signatureReopenTimerRef.current = setTimeout(() => {
      signatureReopenTimerRef.current = null;
      setShowSig(true);
    }, 350);
  }, []);

  const { setAccessToken,
    AccessToken,
    RefreshToken,
    ClientId,
    ClientSecret,
    LocalImagesUploadbeforeData, setLocalImagesUploadbeforeData,
    DropBoxUploadImageDataQues, setDropBoxUploadImageDataQues
  } = useContext(DropboxContext);

  const Focused = useIsFocused();

  const isAnyScannerModalOpen =
    ConformationModalOpen?.visible ||
    SecondModal?.visible ||
    ScannerModalOpen?.visible ||
    NoParcelModalVisible ||
    AlertModalOpen?.visible ||
    EvetyTimeShowDeliveryLabelList ||
    PickupPlannedSheetOpen?.visible;

  const [isVerifyingScan, setIsVerifyingScan] = useState(false);
  const isVerifyingScanRef = useRef(false);

  const isScannerBlockedByModal =
    isAnyScannerModalOpen ||
    showSig ||
    comment ||
    showQRError ||
    manualEntryOpen;

  const isScannerBlockedByModalRef = useRef(false);
  isScannerBlockedByModalRef.current =
    isScannerBlockedByModal ||
    deliveryLabelModalPendingRef.current ||
    pickupPlannedModalPendingRef.current;

  const shouldPauseCameraPreview = isAnyScannerModalOpen;

  const wasCameraPausedByOverlayRef = useRef(false);

  const restartScannerPreview = useCallback(() => {
    setLastDetectedBarcode("");
    setTimeout(async () => {
      try {
        if (cameraRef.current?.resumePreview) {
          await cameraRef.current.resumePreview();
          return;
        }
      } catch (error) {
      }
      setCameraKey((prev) => prev + 1);
    }, 400);
  }, []);

  const unlockScanner = useCallback(() => {
    isVerifyingScanRef.current = false;
    setIsVerifyingScan(false);
    setLastDetectedBarcode("");
  }, []);

  const closeConformationModalAndUnlockScan = useCallback(() => {
    setConformationModal((prev: any) => ({ ...prev, visible: false }));
    unlockScanner();
    restartScannerPreview();
  }, [restartScannerPreview, unlockScanner]);

  const closePickupPlannedSheetAndUnlockScan = useCallback(() => {
    pickupPlannedModalPendingRef.current = false;
    setPickupPlannedSheetOpen({ visible: false, orderData: null, scanPayload: null });
    pendingPickupScanRef.current = null;
    setIsVerifyingScan(false);
    isVerifyingScanRef.current = false;
    setLastDetectedBarcode("");
    restartScannerPreview();
  }, [restartScannerPreview]);

  const closePickupPlannedSheetAndGoBack = useCallback(() => {
    pickupPlannedModalPendingRef.current = false;
    setPickupPlannedSheetOpen({ visible: false, orderData: null, scanPayload: null });
    pendingPickupScanRef.current = null;
    setIsVerifyingScan(false);
    isVerifyingScanRef.current = false;
    goBack();
  }, []);

  const clearDeliveryLabelSelection = useCallback(() => {
    pendingDeliveryLabelRef.current = null;
    selectCurrentDeliveryLabelRef.current = null;
    clearPinnedDeliveryLabel?.();
  }, [clearPinnedDeliveryLabel]);

  const closeDeliveryLabelModalAndUnlockScan = useCallback(() => {
    deliveryLabelModalPendingRef.current = false;
    setEvetyTimeShowDeliveryLabelList(false);
    setIsVerifyingScan(false);
    isVerifyingScanRef.current = false;
    setLastDetectedBarcode("");
    restartScannerPreview();
  }, [restartScannerPreview]);

  const openCameraProofAfterLabelSelect = useCallback(() => {
    deliveryLabelModalPendingRef.current = false;
    setEvetyTimeShowDeliveryLabelList(false);
    const selectedLabel =
      pendingDeliveryLabelRef.current ??
      selectCurrentDeliveryLabelRef.current ??
      SelectCurrentDeliveryLabel;
    setAlerModalOpen({
      visible: true,
      title: t("Camera"),
      Description: t("You have to take a picture for proof?"),
      LButtonText: t("Cancel"),
      RButtonText: t("Camera"),
      Icon: Images.UploadPhoto,
      RButtonStyle: Colors.primary,
      RColor: Colors.white,
      LButtonStyle: Colors.gray,
      LColor: Colors.black,
      onPress: () => {
        deliveryTypeRef.current = false;
        lockParcelCameraCallback();
        const setData = async (data: any[]) => {
          try {
            if (data?.length > 0) {
              setAllSelectImage(data);
              if (shouldSkipCommentAfterCamera(selectedLabel, selectDamageData)) {
                setComment(false);
              } else {
                setComment(true);
              }
            }
          } finally {
            unlockParcelCameraCallback();
          }
        };
        setLatestDeliveryCameraSetData(setData);
        setDeliveyDataSave({
          Data: ItemsData,
          selectReason: selectedLabel,
          setData,
          type: false,
        });
        navigation.navigate("Camera");
        setAlerModalOpen((prev) => ({ ...prev, visible: false }));
      },
    });
  }, [
    ItemsData,
    navigation,
    SelectCurrentDeliveryLabel,
    selectDamageData,
    setDeliveyDataSave,
    t,
  ]);

  useEffect(() => {
    if (!Focused) {
      wasCameraPausedByOverlayRef.current = false;
      return;
    }

    const syncCameraWithOverlay = async () => {
      try {
        if (shouldPauseCameraPreview) {
          await cameraRef.current?.pausePreview?.();
          wasCameraPausedByOverlayRef.current = true;
          return;
        }

        if (!wasCameraPausedByOverlayRef.current) return;

        wasCameraPausedByOverlayRef.current = false;
        restartScannerPreview();
      } catch (error) {
      }
    };

    syncCameraWithOverlay();
  }, [shouldPauseCameraPreview, Focused, restartScannerPreview]);

  useEffect(() => {
    if (isAnyScannerModalOpen) {
      isVerifyingScanRef.current = false;
      setIsVerifyingScan(false);
    }
  }, [isAnyScannerModalOpen]);

  useEffect(() => {
    if (!isScannerBlockedByModal) {
      setLastDetectedBarcode("");
      isVerifyingScanRef.current = false;
      setIsVerifyingScan(false);
    }
  }, [isScannerBlockedByModal]);

  const handleCameraPermissionResult = useCallback((status: CameraAccessStatus) => {
    if (status === 'granted') {
      setCameraGranted(true);
      setCameraPermissionSheet({ visible: false, reason: null });
      return;
    }

    setCameraGranted(false);
    setCameraPermissionSheet({ visible: true, reason: status });
  }, []);

  const handleCameraPermissionPrimary = useCallback(async () => {
    setIsCameraPermissionLoading(true);
    try {
      if (cameraPermissionSheet.reason === 'blocked') {
        await openAppSettings();
        return;
      }

      const status = await retryCameraPermission();
      handleCameraPermissionResult(status);
    } finally {
      setIsCameraPermissionLoading(false);
    }
  }, [cameraPermissionSheet.reason, handleCameraPermissionResult]);

  const handleCameraPermissionSettings = useCallback(async () => {
    setIsCameraPermissionLoading(true);
    try {
      await openAppSettings();
    } finally {
      setIsCameraPermissionLoading(false);
    }
  }, []);

  const handleCameraPermissionCancel = useCallback(() => {
    setCameraPermissionSheet({ visible: false, reason: null });
    goBack();
  }, []);

  useEffect(() => {
    if (!Focused) return;

    let cancelled = false;
    (async () => {
      const status = await resolveCameraAccess();
      if (!cancelled) {
        handleCameraPermissionResult(status);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [Focused, handleCameraPermissionResult]);

  useEffect(() => {
    if (!cameraPermissionSheet.visible) return;

    const subscription = AppState.addEventListener('change', async (nextState) => {
      if (nextState !== 'active') return;

      const status = await recheckCameraAccess();
      handleCameraPermissionResult(status);
    });

    return () => subscription.remove();
  }, [cameraPermissionSheet.visible, handleCameraPermissionResult]);

  const handleSelectDeliveryLabel = (labelItem: any) => {
    pendingDeliveryLabelRef.current = labelItem;
    selectCurrentDeliveryLabelRef.current = labelItem;
    setSelectCurrentDeliveryLabel(labelItem);
  };
  useEffect(() => {
    const showListener = Keyboard.addListener("keyboardDidShow", (e) => {
      setKeyboardHeight(e.endCoordinates.height);
      Animated.timing(animatedHeight, {
        toValue: height - e.endCoordinates.height,
        duration: 200,
        useNativeDriver: false,
      }).start();
    });

    const hideListener = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardHeight(0);
      Animated.timing(animatedHeight, {
        toValue: height,
        duration: 200,
        useNativeDriver: false,
      }).start();
    });

    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, []);


  // Register Scanner camera callbacks while focused so CustomCamera does not
  // call a stale Filter/Details latest* handler (which opens shared comment only
  // after leaving Scanner).
  useEffect(() => {
    if (!Focused || isParcelCameraCallbackLocked()) {
      return;
    }

    const pickupSetData = async (data: any[]) => {
      if (data?.length > 0) {
        setAllSelectImage(data);
        setComment(true);
      }
    };
    setLatestPickupCameraSetData(pickupSetData);
    setPickUpDataSave({ setData: pickupSetData });

    const deliverySetData = async (data: any[]) => {
      if (!data?.length) return;
      setAllSelectImage(data);
      if (!deliveryTypeRef.current) {
        const label =
          selectCurrentDeliveryLabelRef.current ?? SelectCurrentDeliveryLabel;
        if (shouldSkipCommentAfterCamera(label, selectDamageData)) {
          setComment(false);
        } else {
          setComment(true);
        }
        setShowSig(false);
      } else {
        reopenSignatureAfterCamera(data);
      }
    };
    setLatestDeliveryCameraSetData(deliverySetData);
    setDeliveyDataSave({
      setData: deliverySetData,
      type: deliveryTypeRef.current,
    });

    return () => {
      setPickUpDataSave(null);
      if (signatureReopenTimerRef.current) {
        clearTimeout(signatureReopenTimerRef.current);
      }
    };
  }, [
    Focused,
    SelectCurrentDeliveryLabel,
    selectDamageData,
    reopenSignatureAfterCamera,
    setPickUpDataSave,
    setDeliveyDataSave,
  ]);

  const onBarcodeScanned = useCallback(
    async ({ data, type }: { data: string; type: string }) => {

      if (!data || isScannerBlockedByModalRef.current || isVerifyingScanRef.current) return;
      if (data === lastDetectedBarcode) return;

      setLastDetectedBarcode(data);
      isVerifyingScanRef.current = true;
      setIsVerifyingScan(true);

      try {
        let parsedData: any;
        try {
          parsedData = JSON.parse(data);
        } catch (err) {
          setQrErrorMessage(null);
          setShowQRError(true);
          setToast({
            top: 45,
            text: t("Invalid QR code format"),
            type: "error",
            visible: true,
          });
          return;
        }
        if (!parsedData?.item_id || !parsedData?.order_id) {
          setToast({
            top: 45,
            text: t("Invalid QR: Missing item or order ID"),
            type: "error",
            visible: true,
          });
          return;
        }

        if (
          restrictedOrderId != null &&
          String(parsedData.order_id) !== String(restrictedOrderId)
        ) {
          setQrErrorMessage(
            t("Please scan the QR code for the current order only."),
          );
          setShowQRError(true);
          setLastDetectedBarcode("");
          return;
        }

        Vibration.vibrate(500);
        // Beep must not block verify/popup — sound failures were intermittent "vibrate but no popup"
        try {
          await playBeep();
        } catch (_) {
          // ignore audio errors
        }

        await QuestiongetApi(parsedData);
      } catch (error: any) {
        if (axios.isAxiosError(error)) {
          setQrErrorMessage(null);
          setShowQRError(true);
          setToast({
            top: 45,
            text: t(error?.response?.data?.message) ?? t(error?.message) ?? t("Invalid QR code format"),
            type: "error",
            visible: true,
          });
        } else {
          setToast({
            top: 45,
            text: ErrorHandle(error).message || t("Something went wrong"),
            type: "error",
            visible: true,
          });
        }
      } finally {
        // Defer unlock so setState modals (confirm/alert) can commit before scanner re-arms
        requestAnimationFrame(() => {
          if (
            !isScannerBlockedByModalRef.current &&
            !deliveryLabelModalPendingRef.current &&
            !pickupPlannedModalPendingRef.current
          ) {
            unlockScanner();
          }
        });
      }
    },
    [lastDetectedBarcode, playBeep, restrictedOrderId, t, unlockScanner, ErrorHandle]
  );

  const refreshCamera = () => {
    setTimeout(() => {
      setCameraKey(prev => prev + 1);
    }, 500);
  };

  useEffect(() => {
    if (Refreshcondition && Focused) {
      refreshCamera();
      setRefreshKey(prev => prev + 1);
      setRefreshCondition(false);
    }
  }, [Refreshcondition, Focused]);

  const QuestiongetApi = async (data: any) => {
    await runParcelVerifyFlow(data, {
      userData: UserData,
      slideType: type ?? GloblyTypeSlide,
      routeSlideType: type,
      selectCurrentDate: SelectCurrentDate,
      isScanRoute: is_scan,
      source: 'scanner',
      t,
      errorHandle: ErrorHandle,
      navigation,
      globlyTypeSlide: GloblyTypeSlide,
      allDeliveyLabel: AllDeliveyLabel,
      allDamageListReason: AllDamageListReason,
      selectCurrentDeliveryLabel: SelectCurrentDeliveryLabel,
      selectDamageData: selectDamageData,
      setAllDeliveyLabel,
      setAllDamageListReason,
      setselectDamageData,
      setOrderDeliveryMapingLableOption,
      setItemsData,
      setShowDeliveryLabelList,
      setSelectPlace,
      setProductDamageList,
      setResponseOrderData,
      setConformationModal,
      setToast,
      setEvetyTimeShowDeliveryLabelList,
      setAlerModalOpen,
      setDeliveyDataSave,
      setAllSelectImage,
      setComment,
      setPickupPlannedSheetOpen,
      deliveryLabelModalPendingRef,
      pickupPlannedModalPendingRef,
      pendingPickupScanRef,
      deliveryTypeRef,
      statusUpdateFun: StatusUpdateFun,
      reversParcelFun: ReversParcelFun,
      getSessionDeliveryLabel,
      unlockScanner,
      selectRegionData,
    });
  };

  const ReversParcelFun = async (order_id = null, item_id = null) => {
    try {
      setIsLoading(true);
      const payload: any = {
        token: UserData?.user?.verify_token,
        role: UserData?.user?.role,
        relaties_id: UserData?.relaties?.id,
        user_id: UserData?.user?.id,
        item_id: item_id,
        order_id: order_id,
        type: type ?? GloblyTypeSlide,
      };
      const res = await ApiService(apiConstants.revert_order_item_status, {
        customData: payload,
      });
  

      if (res?.status) {
        setToast({
          top: 45,
          text: t(res?.message) || t("Success to update status"),
          type: "success",
          visible: true,
        });
        setConformationModal((prev: any) => ({ ...prev, visible: false }));

        await GetScanedOrderDataLatestFun([
          ...AllRecentScanData,
          order_id,
        ]);
      } else {
        setToast({
          top: 45,
          text: t(res?.message) || t("Failed to update status"),
          type: "error",
          visible: true,
        });
      }
    } catch (error) {
      setToast({
        top: 45,
        text: ErrorHandle(error).message,
        type: "error",
        visible: true,
      });
    }
    finally {
      setIsLoading(false);

    }
  }

  const StatusUpdateFun = async (
    data: any,
    scan = false,
    is_driver_unloading = false,
  ) => {
    if (!scan) return;
    setIsLoading(true);

    try {
      const payload: any = {
        token: UserData?.user?.verify_token,
        role: UserData?.user?.role,
        relaties_id: UserData?.relaties?.id,
        user_id: UserData?.user?.id,
        item_id: data?.item_id,
        order_id: data?.order_id,
        type: type ?? GloblyTypeSlide,
        ...(SelectCurrentDeliveryLabel != null && GloblyTypeSlide == "pickup_dropoff" && {
          delivered_lable_id: SelectCurrentDeliveryLabel?.id,
        }),
      };
      console.log("StatusUpdateFun", payload);

      if (is_driver_unloading) {
        payload.is_driver_unloading = 1;
      }

      if (GloblyTypeSlide === "pickup_dropoff" || GloblyTypeSlide === "additional_address" && selectDamageData) {
        console.log("selectDamageData", selectDamageData,GloblyTypeSlide);
        
        payload.is_damage = selectDamageData?.id
      }

      if (!payload.item_id || !payload.order_id) {
        setToast({
          top: 45,
          text: t("Missing order details. Please rescan."),
          type: "error",
          visible: true,
        });
        return;
      }

      const res = await ApiService(apiConstants.status_update, {
        customData: payload,
      });

      if (res?.status) {
        clearDeliveryLabelSelection();
        deliveryLabelModalPendingRef.current = false;
        setEvetyTimeShowDeliveryLabelList(false);
        fun?.();
        setAllRecentScanData((prev) =>
          prev.includes(data?.order_id) ? prev : [...prev, data?.order_id]
        );

        setConformationModal((prev: any) => ({ ...prev, visible: false }));
        setLastDetectedBarcode("");
        isVerifyingScanRef.current = false;
        setIsVerifyingScan(false);
        await GetScanedOrderDataLatestFun([
          ...AllRecentScanData,
          data?.order_id,
        ]);
      } else {
        setToast({
          top: 45,
          text: t(res?.message) || t("Failed to update status"),
          type: "error",
          visible: true,
        });
      }
    } catch (error) {
      setToast({
        top: 45,
        text: ErrorHandle(error).message,
        type: "error",
        visible: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePickupWithPhoto = useCallback(() => {
    pickupPlannedModalPendingRef.current = false;
    setPickupPlannedSheetOpen((prev) => ({ ...prev, visible: false }));
    pendingPickupScanRef.current = null;
    lockParcelCameraCallback();
    const setData = async (data: any[]) => {
      try {
        if (data?.length > 0) {
          setAllSelectImage(data);
          setComment(true);
        }
      } finally {
        unlockParcelCameraCallback();
      }
    };
    setLatestPickupCameraSetData(setData);
    setPickUpDataSave({ setData });
    navigation.navigate("Camera", { from: "Pickup" });
  }, [navigation, setPickUpDataSave]);

  const handlePickupNextScan = useCallback(async () => {
    const scanData =
      pendingPickupScanRef.current ?? PickupPlannedSheetOpen.scanPayload;
    if (!scanData) return;

    pickupPlannedModalPendingRef.current = false;
    setPickupPlannedSheetOpen({ visible: false, orderData: null, scanPayload: null });
    pendingPickupScanRef.current = null;
    await StatusUpdateFun(scanData, true);
  }, [PickupPlannedSheetOpen.scanPayload]);

  const GetScanedOrderDataLatestFun = async (data: any) => {
    setDataLoader(true);
    const formData = new FormData();

    formData.append("token", UserData?.user?.verify_token);
    formData.append("user_id", UserData?.user?.id);
    formData.append("role", UserData?.user?.role);
    formData.append("relaties_id", UserData?.relaties?.id);

    data.forEach((id: any) => {

      formData.append("order_ids[]", id);
    });

    try {
      const response = await axios.post(
        apiConstants.getMultipleOrderData,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      let res = response?.data;
      if (Boolean(res.status)) {
        setAllScanedData(res?.data || []);
        return 0;
      } else {
        setToast({
          top: 45,
          text: t(res?.message),
          type: "error",
          visible: true,
        });
      }
    } catch (error: any) {
      if (axios.isAxiosError(error)) {

      } else {
      }
      setToast({
        top: 45,
        text: ErrorHandle(error).message,
        type: "error",
        visible: true,
      });
    } finally {
      setDataLoader(false);
    }
  };

  const getSliderDataFun = async () => {
    setIsLoading(true);

    try {
      let res = await ApiService(apiConstants.get_AllSlideDataApi, {
        customData: {
          token: UserData?.user?.verify_token,
          role: UserData?.user?.role,
          relaties_id: UserData?.relaties?.id,
          user_id: UserData?.user?.id,
        },
      });

      if (Boolean(res.status)) {
        const data = res?.data || [];

        setAllSlideData(data);
        if (GloblyTypeSlide == "outbound_scan") {
          goBackOrPopTo(navigation, "BottomTabs");

        } else {
          goBackOrPopTo(navigation, "FilterScreen", { selectedItem: ItemsData, Type: GloblyTypeSlide });

        }
        // navigation.navigate("FilterScreen", { Type: type });
      } else {
        setToast({
          top: 45,
          text: t(res?.message),
          type: "error",
          visible: true,
        });
      }
    } catch (error: any) {
      console.error("Get All Slide Data Error:-", error?.response.data);
      setToast({
        top: 45,
        text: ErrorHandle(error)?.message,
        type: "error",
        visible: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const queueProofImagesOnly = () => {
    const orderId =
      SelectPlace?.order_id ?? ItemsData?.id ?? ItemsData?.order_data?.id;
    if (!AllSelectImage?.length || orderId == null) {
      return false;
    }

    return appendToLocalUploadQueue(setLocalImagesUploadbeforeData, {
      order_id: orderId,
      image_data: [...AllSelectImage],
      item_id: SelectPlace?.item_id || null,
      commentId: null,
    });
  };

  const AddImageOrCommentFun = async (
    comment: string = '',
    data: any[] = [],
  ) => {
    const id = ItemsData?.id || ItemsData?.order_data?.id;

    setCommentLoader(true);

    try {
      const formData: any = new FormData();

      formData.append('token', UserData?.user?.verify_token);
      formData.append('role', UserData?.user?.role);
      formData.append('relaties_id', UserData?.relaties?.id);
      formData.append('user_id', UserData?.user?.id);
      formData.append('order_comment', Description?.trim());
      formData.append('order_id', id ? id : SelectPlace?.id);
      let image_data = Array.isArray(data) && data?.length > 0
        ? data
        : Array.isArray(AllSelectImage)
          ? AllSelectImage
          : [];


      const res: any = await axios.post(
        apiConstants.store_tms_comment,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          transformRequest: formData => formData,
        },
      );

      if (Boolean(res?.data?.status)) {
        const orderLogId = res?.data?.data?.order_log_id;
        setCommentId(orderLogId);
        const orderId = SelectPlace?.order_id ?? ItemsData?.id ?? ItemsData?.order_data?.id;
        if (image_data.length > 0 && orderLogId != null && orderId != null) {
          appendToLocalUploadQueue(setLocalImagesUploadbeforeData, {
            order_id: orderId,
            image_data: [...image_data],
            item_id: SelectPlace?.item_id || null,
            commentId: orderLogId,
          });
        }
        setAllSelectImage([]);
        setPickUpDataSave([]);
        setDeliveyDataSave([]);
        setDescrition('');
        setToast({
          top: 45,
          text: t(res?.data?.message),
          type: 'success',
          visible: true,
        });
        refreshCamera();
        await GetIdByOrderFun();

        setComment(false);
      } else {
        setComment(true);

        setToast({
          top: 45,
          text: t(res?.data?.message),
          type: 'error',
          visible: true,
        });
      }
    } catch (error) {
      setComment(true);


      setToast({
        top: 45,
        text: ErrorHandle(error).message,
        type: 'error',
        visible: true,
      });
    } finally {
      setCommentLoader(false);
    }
  };


  const CustomerSignatureFun = async (signature: string | null = null, name: string | null = null, damageItems: any[] = []) => {
    if (isBlankSignatureData(signature)) {
      setToast({
        top: 45,
        text: t("Signature is required"),
        type: "error",
        visible: true,
      });
      return
    }
    setSignatureLoader(true)
    try {

      const payload = {
        token: UserData?.user?.verify_token,
        role: UserData?.user?.role,
        relaties_id: UserData?.relaties?.id,
        user_id: UserData?.user?.id,
        name,
        signature,
        order_id: ItemsData?.id,
        is_damage: selectDamageData?.id,
        damage_items: JSON.stringify(damageItems),
      };


      const res = await ApiService(apiConstants.store_customer_signature, {
        customData: payload,
      });

      if (res?.status) {
        setProductDamageList([]);
        if (AllSelectImage?.length > 0 && CommentId != null) {
          const orderId = SelectPlace?.order_id ?? ItemsData?.id ?? ItemsData?.order_data?.id;
          if (orderId != null) {
            appendToLocalUploadQueue(setLocalImagesUploadbeforeData, {
              order_id: orderId,
              image_data: [...AllSelectImage],
              item_id: SelectPlace?.item_id || null,
              commentId: CommentId,
            });
          }
        }
        setAllSelectImage([]);
        deliveryTypeRef.current = false;
        setShowSig(false);
        setSecondModal(p => ({ ...p, visible: false }));
        setToast({
          top: 45,
          text: res?.message,
          type: "success",
          visible: true,
        });
        const buttons: any[] = [];
        buttons.push({
          text: t("Go to List Page"),
          type: "primary",
          onPress: () => {
            setSecondModal(p => ({ ...p, visible: false }));
            setNoParcelItemIds([]);
            getSliderDataFun();
          },
        },)
        setSecondModal({
          visible: true,
          title: t("All Parcels Scanned Successfully!"),
          message: t(res?.remaining_item_message) || "",
          buttons: buttons,
          color: GloblyTypeSlide == "outbound_scan" ? Colors.primary : Colors.green

        });
      } else {
        setToast({
          top: 45,
          text: res?.message,
          type: "error",
          visible: true,
        });
      }
    } catch (error) {
      setToast({
        top: 45,
        text: ErrorHandle(error).message,
        type: "error",
        visible: true,
      });
    }
    finally {
      setSignatureLoader(false);
    }
  }


  const CommentFun = async () => {
    if (
      Number(ItemsData?.tmsstatus?.id ?? ItemsData?.status) === 4 &&
      SelectCurrentDeliveryLabel &&
      SelectCurrentDeliveryLabel?.damaged_required == 1 &&
      selectDamageData == null
    ) {
      setCommentError(t("Choose  Damaged"));

      return
    }
    setCommentLoader(true);
    try {
      if (!isCommentOptional && !Description.trim()) {
        setCommentError(t("Please enter a comment"));
        return;
      }

      if (!SelectPlace?.item_id || !SelectPlace?.order_id) {
        setToast({
          top: 45,
          text: t("Invalid or missing order details. Please rescan."),
          type: "error",
          visible: true,
        });
        return;
      }

      if (isNoParcelFlow) {
        await BackOrderFun(ConformationModalOpen?.ProductItem || []);
        setIsNoParcelFlow(false);
        setComment(false);
        return;
      }



      const payload: any = {
        token: UserData?.user?.verify_token,
        role: UserData?.user?.role,
        relaties_id: UserData?.relaties?.id,
        user_id: UserData?.user?.id,
        item_id: SelectPlace?.item_id,
        order_id: SelectPlace?.order_id,
        type: GloblyTypeSlide,
        ...(SelectCurrentDeliveryLabel !== null && GloblyTypeSlide == "pickup_dropoff" && {
          delivered_lable_id: SelectCurrentDeliveryLabel?.id,
        }),
      };

      if (GloblyTypeSlide === "pickup_dropoff" || GloblyTypeSlide === "additional_address" && selectDamageData) {
        payload.is_damage = selectDamageData?.id
      }

      const res = await ApiService(apiConstants.status_update, {
        customData: payload,
      });

      if (res?.status) {
        const savedDeliveryLabel = SelectCurrentDeliveryLabel;
        const savedDamageId = selectDamageData?.id;

        if (savedDamageId != null && SelectPlace?.item_id != null) {
          setProductDamageList((prev) => {
            if (!prev?.length) return prev;

            const itemId = Number(SelectPlace.item_id);
            const orderItems =
              ItemsData?.items ??
              ItemsData?.order_data?.items ??
              ConformationModalOpen?.ProductItem ??
              [];
            const matchedOrderItem = orderItems.find(
              (el: any) => Number(el?.id) === itemId,
            );
            const existing = prev.find((el: any) => Number(el?.id) === itemId);

            const updatedLastItem = {
              ...(existing ?? { id: itemId }),
              item_status_id:
                existing?.item_status_id ?? matchedOrderItem?.item_status_id,
              scan_qty: 1,
              delivery_label:
                existing?.delivery_label ?? matchedOrderItem?.delivery_label,
              is_damaged_delivery: savedDamageId,
              is_damaged_pickup: existing?.is_damaged_pickup ?? null,
              tms_product_name:
                existing?.tms_product_name ??
                matchedOrderItem?.tms_product_name ??
                "",
            };

            if (existing) {
              return prev.map((el: any) =>
                Number(el?.id) === itemId ? { ...el, ...updatedLastItem } : el,
              );
            }
            return [...prev, updatedLastItem];
          });
        }

        setComment(false);
        if (Description.trim()) {
          await AddImageOrCommentFun();
        } else if (AllSelectImage?.length > 0) {
          queueProofImagesOnly();
          setAllSelectImage([]);
          setPickUpDataSave([]);
          setDeliveyDataSave([]);
          setDescrition('');
          setCommentError('');
          refreshCamera();
        } else if (isCommentOptional) {
          setAllSelectImage([]);
          setPickUpDataSave([]);
          setDeliveyDataSave([]);
          setDescrition('');
          setCommentError('');
          refreshCamera();
        }

        fun?.();
        setComment(false);

        const parcelsStillRemaining = hasRemainingParcelsToDeliver(
          ItemsData,
          res,
          NoParcelItemIds,
          SelectPlace?.item_id,
        );
        const isSignatureAllowed =
          Number(res?.tms_current_status) === 5 &&
          savedDeliveryLabel?.signature_required == 1;

        clearDeliveryLabelSelection();
        deliveryLabelModalPendingRef.current = false;
        setEvetyTimeShowDeliveryLabelList(false);
        if (!(GloblyTypeSlide == "outbound_scan")) {
          if (!parcelsStillRemaining) {
            const buttons: any[] = [];

            if (isSignatureAllowed) {
              buttons.push({
                text: t("Signature"),
                type: "primary",
                onPress: () => {
                  setShowSig(true);
                },
              });
            } else {
              buttons.push({
                text: t("Go to List Page"),
                type: "primary",
                onPress: () => {
                  setSecondModal(p => ({ ...p, visible: false }));
                  setNoParcelItemIds([]);
                  getSliderDataFun();
                },
              },)
            }

            setSecondModal({
              visible: true,
              title: t("All Parcels Scanned Successfully!"),
              message: t(res?.remaining_item_message) || "",
              buttons: buttons,
              color: GloblyTypeSlide == "outbound_scan" ? Colors.primary : Colors.green

            });
          } else if (!(GloblyTypeSlide == "outbound_scan")) {
            // Still items to scan
            setSecondModal({
              visible: true,
              title: t("There are Parcels Remaining"),
              message: t(res?.remaining_item_message),
              buttons: [
                {
                  text: t("No Parcel"),
                  type: "secondary",
                  onPress: async () => {
                    setSecondModal((p: any) => ({ ...p, visible: false }));



                    goBackOrPopTo(navigation, "Details", {
                      type: "scanner_noparcel",
                      item: ItemsData,
                    })

                    setNoParcelDetailsScreenEvent(true)


                  },
                },
                {
                  text: t("Open Scanner"),
                  type: "primary",
                  onPress: () => {
                    setSecondModal((p: any) => ({ ...p, visible: false }));
                    setSelectPlace(null);
                    setDescrition("");
                    setCommentError("");
                  },
                },
              ],
              color: Colors.yellow
            });
          }
        } else if (isSignatureAllowed) {
          const buttons: any[] = [{
            text: t("Signature"),
            type: "primary",
            onPress: () => {
              setShowSig(true);
            },
          }]

          setSecondModal({
            visible: true,
            title: t("Confirm Delivery"),
            message: t("Delivery completed. Please provide your signature to confirm successful handover."),
            buttons: buttons,
            color: Colors.green,
          });
        }

        setAllRecentScanData((prev) =>
          prev.includes(SelectPlace?.order_id)
            ? prev
            : [...prev, SelectPlace?.order_id]
        );

        await GetScanedOrderDataLatestFun([
          ...AllRecentScanData,
          SelectPlace?.order_id,
        ]);
      }
    } catch (error) {
      setToast({
        top: 45,
        text: ErrorHandle(error).message,
        type: "error",
        visible: true,
      });
    } finally {
      setCommentLoader(false);
    }
  };

  const GetIdByOrderFun = async (order_id?: string) => {
    const id = order_id || ItemsData?.id || ItemsData?.order_data?.id;

    if (!id) {
      return [];
    }

    try {
      const res = await ApiService(apiConstants.get_order_data_by_id, {
        customData: {
          token: UserData?.user?.verify_token,
          role: UserData?.user?.role,
          relaties_id: UserData?.relaties?.id,
          user_id: UserData?.user?.id,
          order_id: id,
          type: type,
        },
      });

      if (res?.status) {
        setItemsData(res?.data);

        setLastDetectedBarcode("");
        setTimeout(() => setCameraKey((prev) => prev + 1), 400);
        // const labelsForModal = res.data.items
        //   .filter((item: any) => Number(item.scan_qty) === 0)
        //   .map((item: any) => ({
        //     id: item.id,
        //     label: item.tms_product_name || `Item ${item.id}`,
        //   }));

        // setNoParcelOptions(labelsForModal);
        const labelsForModal = res.data.items
          .filter(
            (item: any) =>
              Number(item.scan_qty) === 0 && item?.item_label == null
          )
          .map((item: any) => ({
            id: item.id,
            label: item.tms_product_name || `Item ${item.id}`,
          }));

        setNoParcelOptions(labelsForModal);

        return labelsForModal;
      } else {
        return [];
      }
    } catch (error) {
      return [];
    }
  };

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

  const BackOrderFun = async (selectedItems: any[] = []) => {
    if (!selectedItems || selectedItems.length === 0) {
      setToast({
        top: 45,
        text: t("Please select at least 1 item!"),
        type: "error",
        visible: true,
      });
      return;
    }

    // ✅ Use SelectPlace.order_id instead of ItemsData
    if (!SelectPlace?.order_id) {
      setToast({
        top: 45,
        text: t("Order ID missing. Please rescan."),
        type: "error",
        visible: true,
      });
      return;
    }

    try {
      let formData: any = new FormData();

      formData.append("token", UserData?.user?.verify_token);
      formData.append("role", UserData?.user?.role);
      formData.append("relaties_id", UserData?.relaties?.id);
      formData.append("user_id", UserData?.user?.id);

      // ✅ Use SelectPlace.order_id (from scanned QR)
      formData.append("order_id", SelectPlace.order_id);
      formData.append("item_lable", "Backorder");

      selectedItems?.forEach((item) => {
        formData.append("item_id[]", item.id);
      });

      let res: any = await axios.post(apiConstants.missed_backorder, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });


      if (res?.data?.status) {
        // ✅ Add selected items to NoParcelItemIds
        // if (AllSelectImage?.length > 0) {
        //   await AddImageOrCommentFun();
        // }
        setNoParcelItemIds((prev: any) => [
          ...prev,
          ...selectedItems.map((item) => item.id),
        ]);


        const backorderParcelsRemaining = hasRemainingParcelsToDeliver(
          ItemsData,
          res?.data,
          [
            ...NoParcelItemIds,
            ...selectedItems.map((item: any) => item.id),
          ],
        );

        if (!backorderParcelsRemaining) {
          const buttons: any[] = [];

          const isSignatureAllowed = Number(res?.data?.tms_current_status) === 5 && SelectCurrentDeliveryLabel?.signature_required == 1;

          if (isSignatureAllowed) {
            buttons.push({
              text: t("Signature"),
              type: "primary",
              onPress: () => {
                setShowSig(true);
              },
            });
          } else {
            buttons.push({
              text: t("Go to List Page"),
              type: "primary",
              onPress: () => {
                setSecondModal(p => ({ ...p, visible: false }));
                setNoParcelItemIds([]);
                getSliderDataFun();
              },
            },)
          }
          setSecondModal({
            visible: true,
            title: t("All Parcels Scanned Successfully!"),
            message: t(res?.data.remaining_item_message) || "",
            buttons: buttons,
            color: GloblyTypeSlide == "outbound_scan" ? Colors.primary : Colors.green

          });
        } else if (!(GloblyTypeSlide == "outbound_scan")) {
          const actualRemaining =
            Number(res?.data.remaining_item) - selectedItems.length;

          setSecondModal({
            visible: true,
            title: t("There are Parcels Remaining"),
            message: `${actualRemaining} ${t("parcel(s) remaining to scan.")}`,
            buttons: [
              {
                text: t("No Parcel"),
                type: "secondary",
                onPress: async () => {
                  setSecondModal((p: any) => ({ ...p, visible: false }));

                  setTimeout(async () => {
                    const missingItems = await GetIdByOrderFun(
                      SelectPlace?.order_id
                    );

                    // ✅ Filter out already marked items
                    const filteredItems = missingItems.filter(
                      (item: any) => !NoParcelItemIds.includes(item.id)
                    );

                    if (filteredItems.length > 0) {
                      setNoParcelOptions(filteredItems);
                      setNoParcelModalVisible(true);
                    } else {
                      setToast({
                        top: 45,
                        text: t("All items are scanned!"),
                        type: "info",
                        visible: true,
                      });
                    }
                  }, 1000);
                },
              },
              {
                text: t("Open Scanner"),
                type: "primary",
                onPress: () => {
                  setSecondModal((p: any) => ({ ...p, visible: false }));
                  setSelectPlace(null);
                  setDescrition("");
                  setCommentError("");
                },
              },
            ],
            color: Colors.yellow
          });
        }

        await GetIdByOrderFun(SelectPlace.order_id);

        setToast({
          top: 45,
          text: t(res?.data?.message),
          type: "success",
          visible: true,
        });
      } else {
        setToast({
          top: 45,
          text: t(res?.data?.message),
          type: "error",
          visible: true,
        });
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {

      }

      setToast({
        top: 45,
        text: ErrorHandle(error).message,
        type: "error",
        visible: true,
      });
    }
  };

  useEffect(() => {
    setLastDetectedBarcode("");
    return () => {
      setSelectCurrentDeliveryLabel(null);
    }
  }, [route.params?.refreshTime]);

  useEffect(() => {
    if (restrictedOrderId != null && restrictedOrderId !== "") {
      setManualOrderId(String(restrictedOrderId));
    }
  }, [restrictedOrderId]);

  const submitManualEntry = async () => {
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

    if (
      restrictedOrderId != null &&
      String(orderId) !== String(restrictedOrderId)
    ) {
      setManualEntryOpen(false);
      setQrErrorMessage(
        t("Please scan the QR code for the current order only."),
      );
      setShowQRError(true);
      return;
    }

    if (isVerifyingScanRef.current) {
      return;
    }

    Keyboard.dismiss();
    isVerifyingScanRef.current = true;
    setIsVerifyingScan(true);

    try {
      Vibration.vibrate(500);
      try {
        await playBeep();
      } catch (_) {
        // ignore audio errors
      }

      await QuestiongetApi({
        order_id: orderId,
        item_id: itemId,
      });
      setManualEntryOpen(false);
      setManualItemId("");
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        setQrErrorMessage(null);
        setShowQRError(true);
        setToast({
          top: 45,
          text:
            t(error?.response?.data?.message) ??
            t(error?.message) ??
            t("Invalid QR code format"),
          type: "error",
          visible: true,
        });
      } else {
        setToast({
          top: 45,
          text: ErrorHandle(error).message || t("Something went wrong"),
          type: "error",
          visible: true,
        });
      }
    } finally {
      requestAnimationFrame(() => {
        if (
          !isScannerBlockedByModalRef.current &&
          !deliveryLabelModalPendingRef.current &&
          !pickupPlannedModalPendingRef.current
        ) {
          unlockScanner();
        }
      });
    }
  };

  return (
    <GestureHandlerRootView key={refreshKey} style={styles.container}>
      {
        Focused && cameraGranted && !showSig && !comment && !showQRError && (
          <CameraView
            ref={cameraRef}
            key={cameraKey}
            enableTorch={flashEnabled}
            style={StyleSheet.absoluteFill}
            onBarcodeScanned={isScannerBlockedByModal ? undefined : onBarcodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: ["qr"],
            }}
          />
        )}
      <Image
        source={Images.ScannerCenter}
        style={{ width, height, position: "absolute" }}
      />

      <View style={[styles.TopIcon, { top: top ? top * 1.2 : 40 }]}>
        <TouchableOpacity
          style={styles.Button}
          onPress={() => setFlashEnabled(!flashEnabled)}
        >
          <Ionicons
            name={flashEnabled ? "flash-sharp" : "flash-outline"}
            size={24}
            color={Colors.white}
          />
        </TouchableOpacity>

        {!manualEntryOpen ? (
          <TouchableOpacity
            style={styles.ManualEntryChip}
            activeOpacity={0.85}
            onPress={() => setManualEntryOpen(true)}
          >
            <Ionicons name="keypad-outline" size={16} color={Colors.white} />
            <Text style={styles.ManualEntryChipText}>{t("Enter code")}</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 1 }} />
        )}

        <TouchableOpacity style={[styles.Button,]} onPress={goBack}>
          <Image source={Images.Close} style={styles.Icons} />
        </TouchableOpacity>
      </View>

      {manualEntryOpen ? (
        <ReAnimated.View
          entering={FadeIn.duration(180)}
          style={[
            styles.ManualEntryPanel,
            { top: (top ? top * 1.2 : 40) + 56 },
          ]}
        >
          <View style={styles.ManualEntryHeader}>
            <Text style={styles.ManualEntryTitle}>{t("Enter QR details")}</Text>
            <TouchableOpacity
              hitSlop={10}
              onPress={() => {
                Keyboard.dismiss();
                setManualEntryOpen(false);
              }}
            >
              <Ionicons name="chevron-up" size={20} color={Colors.white} />
            </TouchableOpacity>
          </View>

          <View style={styles.ManualEntryFields}>
            <View style={styles.ManualEntryField}>
              <Text style={styles.ManualEntryLabel}>{t("Order ID")}</Text>
              <TextInput
                style={styles.ManualEntryInput}
                value={manualOrderId}
                onChangeText={setManualOrderId}
                placeholder="24687"
                placeholderTextColor="rgba(255,255,255,0.35)"
                keyboardType="number-pad"
                returnKeyType="next"
                selectTextOnFocus
              />
            </View>
            <View style={styles.ManualEntryField}>
              <Text style={styles.ManualEntryLabel}>{t("Item ID")}</Text>
              <TextInput
                style={styles.ManualEntryInput}
                value={manualItemId}
                onChangeText={setManualItemId}
                placeholder="26489"
                placeholderTextColor="rgba(255,255,255,0.35)"
                keyboardType="number-pad"
                returnKeyType="done"
                onSubmitEditing={submitManualEntry}
                autoFocus={restrictedOrderId != null}
                selectTextOnFocus
              />
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.ManualEntrySubmit,
              (!manualOrderId.trim() || !manualItemId.trim() || isVerifyingScan) &&
                styles.ManualEntrySubmitDisabled,
            ]}
            activeOpacity={0.85}
            disabled={
              !manualOrderId.trim() || !manualItemId.trim() || isVerifyingScan
            }
            onPress={submitManualEntry}
          >
            {isVerifyingScan ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <>
                <Text style={styles.ManualEntrySubmitText}>{t("Continue")}</Text>
                <Ionicons name="arrow-forward" size={16} color={Colors.white} />
              </>
            )}
          </TouchableOpacity>
        </ReAnimated.View>
      ) : null}

      <CameraPermissionSheet
        visible={cameraPermissionSheet.visible}
        reason={cameraPermissionSheet.reason}
        loading={isCameraPermissionLoading}
        onClose={handleCameraPermissionCancel}
        onPrimaryAction={handleCameraPermissionPrimary}
        onSettingsPress={handleCameraPermissionSettings}
      />

      <PickupPlannedSheet
        visible={PickupPlannedSheetOpen.visible}
        orderData={PickupPlannedSheetOpen.orderData}
        scanItemId={PickupPlannedSheetOpen.scanPayload?.item_id}
        loading={IsLoading}
        onPickupWithPhoto={handlePickupWithPhoto}
        onCancelAndNewScan={closePickupPlannedSheetAndUnlockScan}
        onCancelPickup={closePickupPlannedSheetAndGoBack}
        onPickupNextScan={handlePickupNextScan}
      />

      <ScannerInfoModal
        InfoTitle={ConformationModalOpen.title}
        type={ConformationModalOpen?.type || 0}
        visible={ConformationModalOpen?.visible}
        personData={ConformationModalOpen?.personData}
        RText={ConformationModalOpen.RButtonText}
        LText={ConformationModalOpen.LButtonText}
        onPress={() => {
          if (ConformationModalOpen.RButtonText === t("Take Photo")) {
            setConformationModal((prev: any[]) => ({
              ...prev,
              visible: false,
            }));
            lockParcelCameraCallback();
            const setData = async (data: any[]) => {
              try {
                if (data?.length > 0) {
                  setAllSelectImage(data);
                  setComment(true);
                }
              } finally {
                unlockParcelCameraCallback();
              }
            };
            setLatestPickupCameraSetData(setData);
            setPickUpDataSave({ setData });
            navigation.navigate("Camera", {
              from: "Pickup",
            });
          } else {
            ConformationModalOpen.onPress?.();
          }
        }}
        ProductItem={ConformationModalOpen?.ProductItem}
        OrderId={ConformationModalOpen.order_id}
        bgColor={ConformationModalOpen?.bgColor || ""}
        onClose={closeConformationModalAndUnlockScan}
        OrderData={ConformationModalOpen?.OrderData}
        delivery_btn={ConformationModalOpen?.delivery_btn}
        stopData={ConformationModalOpen?.stopData}
        NewScanText={ConformationModalOpen?.NewScanText}
        onNewScanPress={
          ConformationModalOpen?.NewScanText
            ? closeConformationModalAndUnlockScan
            : undefined
        }
        UnloadingText={ConformationModalOpen?.UnloadingText}
        onUnloadingPress={ConformationModalOpen?.onUnloadingPress}
      />
      <ScannerInfoModal
        InfoTitle={ScannerModalOpen.InfoTitle}
        type={ScannerModalOpen.type}
        visible={ScannerModalOpen.visible}
        personData={ScannerModalOpen.personData}
        RText={ScannerModalOpen.RText}
        LText={ScannerModalOpen.LText}
        onPress={ScannerModalOpen.onPress}
        ProductItem={ScannerModalOpen.ProductItem}
        OrderId={ScannerModalOpen.OrderId}
        bgColor={ScannerModalOpen?.bgColor || ""}
        onClose={() =>
          setScannerModalOpen((prev) => ({ ...prev, visible: false }))
        }
        OrderData={ScannerModalOpen?.OrderData}
        delivery_btn={ScannerModalOpen.delivery_btn}
      />

      <SignatureModal
        IsLoading={SignatureLoader}
        visible={showSig}
        defaultName={ItemsData?.display_name}
        ProductDamageList={ProductDamageList}
        onClose={() => setShowSig(false)}
        onPress={() => {
          deliveryTypeRef.current = true;
          setShowSig(false);
          lockParcelCameraCallback();
          const setData = async (data: any[]) => {
            try {
              reopenSignatureAfterCamera(data);
            } finally {
              unlockParcelCameraCallback();
            }
          };
          setLatestDeliveryCameraSetData(setData);
          setDeliveyDataSave({
            Data: ReposonseOrderData,
            selectReason: item,
            setData,
            type: true,
          });
          navigation.navigate("Camera");
        }}
        onSave={(base64, name, damageItems) => {

          CustomerSignatureFun(base64, name, damageItems)
        }}
        onClear={() => { }}
      />

      <LoadingModal visible={IsLoading} message={t("Please wait…")} />
      <BottomSheet snapPoints={["15%", "90%"]} ref={bottomSheetRef}>
        <BottomSheetFlatList
          data={AllScanedData}
          keyExtractor={(item: any, index: number) => `${index}`}
          renderItem={({ item, index }: any) => (
            <PickUpBox
              index={index}
              additional_cost_label={item?.additional_cost_label}
              AllisCollapsed={true}
              downButton={true}
              LableStatus={item?.tmsstatus?.status_name}
              OrderId={item?.id}
              driver_note={item?.driver_note || ""}
              ProductItem={item?.items}
              LableBackground={item?.tmsstatus?.color}
              ItemData={item}
              external_order_id={item?.external_order_id}
              start={item?.pickup_location}
              end={item?.deliver_location}
              customerData={item?.customer}
              external_platform_data={item?.display_name}
              statusData={item?.tmsstatus}
              LacationProgress={false}
            />
          )}
          ListFooterComponent={
            DataLoader ? (
              <View style={styles.ListFooterContainer}>
                <Loader />
              </View>
            ) : null
          }
          ListEmptyComponent={
            !DataLoader ? (
              <View style={styles.ListFooterContainer}>
                <Text style={styles.Text}>{t("No Scan Order")}</Text>
              </View>
            ) : null
          }
          contentContainerStyle={{ padding: 15, paddingBottom: Math.max(bottom, 20), }}
          style={{ width: width }}
          showsVerticalScrollIndicator={false}
        />
      </BottomSheet>
      <NoParcelModal
        visible={NoParcelModalVisible}
        title={t("Select Missing Items")}
        options={NoParcelOptions}
        personData={ItemsData?.customer}
        OrderId={ItemsData?.id}
        type={1}
        onClose={() => setNoParcelModalVisible(false)}
        onSubmit={(selectedIds) => {

          if (!selectedIds || selectedIds.length === 0) {
            setToast({
              top: 45,
              text: t("Please select at least 1 item!"),
              type: "error",
              visible: true,
            });
            return;
          }
          setNoParcelItemIds(selectedIds);

          const selectedItems = selectedIds
            .map((id) => ItemsData?.items.find((i: any) => i.id === id))
            .filter(Boolean);

          setIsNoParcelFlow(true);
          setNoParcelModalVisible(false);

          setScannerModalOpen({
            visible: true,
            InfoTitle: t("Scanner Info"),
            type: 1,
            OrderData: ItemsData,
            RText: t("Take Photo"),
            LText: t("Cancel"),
            personData: ItemsData.display_name,
            ProductItem: selectedItems,
            OrderId: ItemsData?.id,
            onPress: () => {
              setScannerModalOpen((prev) => ({ ...prev, visible: false }));
              navigation.navigation("Camera", { from: "Pickup" });

              // goBackOrPopTo(navigation,"Camera", { from: "Pickup" })
            },
          });
        }}
      />
      <Modal
        isVisible={comment}
        style={{ margin: 0 }}
        animationIn="bounceInUp"
        animationOut="bounceOutDown"
        propagateSwipe={true}

        avoidKeyboard={false} // important for Modal + keyboard
      >
        <View style={{ flex: 1 }}>
          <SafeAreaView />
          <KeyboardAwareScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{
              flex: 1,
              justifyContent: "center",
              backgroundColor: Colors.green,
            }}
            enableOnAndroid={true}
            extraHeight={200}
            keyboardShouldPersistTaps="handled"
          >

            <View
              style={[
                styles.CommentBox,

              ]}
            >


              <View>
                <Text style={styles.Text}>{t("Name")}</Text>
                <View style={styles.InputBox}>
                  <TextInput
                    style={styles.Input}
                    editable={false}
                    placeholderTextColor={Colors.darkText}
                    placeholder={t("Enter your name")}
                    value={UserData?.user?.username?.length > 0 ? UserData?.user?.username : UserData?.relaties?.display_name ?? ""}
                    onChangeText={setComment}
                  />
                  <Image source={Images.user} style={{ width: 18, height: 18 }} />
                </View>
              </View>
              {
                shouldShowDamageInCommentModal(SelectCurrentDeliveryLabel, ItemsData) &&
                <FlatList
                  data={AllDamageListReason}
                  style={styles.CardWhite}
                  keyExtractor={(item) => item.id.toString()}
                  renderItem={({ item }) => (
                    <Pressable
                      onPress={() => {
                        setselectDamageData(item);
                        setCommentError('');
                      }}
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
                          setselectDamageData(item);
                          setCommentError('');
                        }}
                        value={selectDamageData?.id === item?.id}
                        tintColors={{ true: Colors.white, false: Colors.white }}
                        tintColor={Colors.white}
                        onTintColor={Colors.white}
                        onCheckColor={Colors.white}
                        onFillColor={item?.color || Colors.Boxgray}
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
                  )}
                />
              }

              <View style={{ marginTop: 5 }}>
                <Text style={styles.Text}>
                  {t("Description")}
                  {isCommentOptional ? ` (${t("optional")})` : ''}
                </Text>
                <TextInput
                  style={styles.TextArea}
                  value={Description}
                  onChangeText={setDescrition}
                  placeholder={t("Type here...")}
                  multiline
                  placeholderTextColor={Colors.black}
                  numberOfLines={5}
                  textAlignVertical="top"
                />
                {Commenterror ? <Text style={styles.Error}>{Commenterror}</Text> : null}
              </View>

              <TouchableOpacity style={styles.ButtonSubmit} disabled={CommentLoader} onPress={CommentFun}>
                {
                  CommentLoader ? (
                    <ActivityIndicator size="small" color={Colors.white} />
                  ) :
                    <Text style={[styles.Text, { color: Colors.white }]}>{t("Submit")}</Text>
                }
              </TouchableOpacity>



            </View>
          </KeyboardAwareScrollView>
        </View>
      </Modal>


      <ConformationModal
        IsVisible={AlertModalOpen.visible}
        onClose={() => setAlerModalOpen((prev) => ({ ...prev, visible: false }))}
        Title={AlertModalOpen.title}
        Icon={AlertModalOpen.Icon}
        LeftButtonText={AlertModalOpen.LButtonText}
        RightButtonText={AlertModalOpen.RButtonText}
        RightBgColor={AlertModalOpen.RButtonStyle}
        LeftBGColor={AlertModalOpen.LButtonStyle}
        RTextColor={AlertModalOpen.RColor}
        LTextColor={AlertModalOpen.LColor}
        onPress={AlertModalOpen.onPress}
        Description={AlertModalOpen.Description}
      />

      <AnimatedModal
        visible={EvetyTimeShowDeliveryLabelList}
        setVisible={setEvetyTimeShowDeliveryLabelList}
        onCancel={closeDeliveryLabelModalAndUnlockScan}
        AllDeliveyLabel={AllDeliveyLabel}
        fun={openCameraProofAfterLabelSelect}
        setSelectCurrentDeliveryLabel={handleSelectDeliveryLabel}
        AllDamageListReason={AllDamageListReason}
        setselectDamageData={setselectDamageData}
        selectDamageData={selectDamageData}
        GloblyTypeSlide={GloblyTypeSlide}
        ItemsData={ItemsData}
      />

      {SecondModal?.visible && (
        <ReAnimated.View
          entering={FadeIn}
          exiting={FadeInDown}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: SecondModal?.color || "rgba(0,0,0,0.6)",
            zIndex: 999,
          }}
        >
          <View
            style={{
              backgroundColor: Colors.white,
              borderRadius: 14,
              width: "95%",
              paddingVertical: 25,
              paddingHorizontal: 20,
              alignItems: "center",
            }}
          >
            {SecondModal?.title ? (
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "600",
                  textAlign: "center",
                  color: "#000",
                  marginBottom: 10,
                }}
              >
                {SecondModal?.title}
              </Text>
            ) : null}

            {SecondModal?.message ? (
              <Text
                style={{
                  fontSize: 14,
                  color: Colors.gray,
                  textAlign: "center",
                  marginBottom: 20,
                }}
              >
                {SecondModal?.message}
              </Text>
            ) : null}

            <View
              style={{
                flexDirection: "row",
                justifyContent: "center",
                width: "100%",
              }}
            >
              {SecondModal?.buttons?.map((btn: any, index: number) => (
                <TouchableOpacity
                  key={index}
                  style={{
                    backgroundColor:
                      btn.type === "primary" ? Colors.primary : "#E0E0E0",
                    paddingVertical: 15,
                    paddingHorizontal: 20,
                    borderRadius: 8,
                    marginHorizontal: 5,
                    flex: 1,
                    alignItems: "center",
                  }}
                  onPress={btn.onPress}
                >
                  <Text
                    style={{
                      color:
                        btn.type === "primary" ? Colors.white : Colors.black,
                      fontFamily: FONTS.Medium,
                    }}
                  >
                    {btn.text}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ReAnimated.View>
      )}

      <InvalidQRModal
        visible={showQRError}
        message={qrErrorMessage ?? undefined}
        onScanAgain={() => {
          setShowQRError(false);
          setQrErrorMessage(null);
          setLastDetectedBarcode("");
        }}
        onGoBack={() => {
          setShowQRError(false);
          setQrErrorMessage(null);
          navigation.goBack();
        }}
      />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
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
  CardWhite: {
    backgroundColor: Colors.white,
    marginTop: 10,
    borderRadius: 4,
    padding: 10
  },
  WhiteBox: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.darkText,
    height: height * 0.6,
  },
  LabelBtn: {
    width: width * 0.8,
    marginVertical: 5,
    height: 50,
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center"
  },
  TopIcon: {
    position: "absolute",
    top: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    paddingHorizontal: 20,
    zIndex: 20,
  },
  ManualEntryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.22)",
  },
  ManualEntryChipText: {
    fontSize: 13,
    fontFamily: FONTS.Medium,
    color: Colors.white,
  },
  ManualEntryPanel: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 25,
    borderRadius: 16,
    padding: 14,
    backgroundColor: "rgba(12,12,14,0.88)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.16)",
    gap: 12,
  },
  ManualEntryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  ManualEntryTitle: {
    fontSize: 13,
    fontFamily: FONTS.Medium,
    color: "rgba(255,255,255,0.72)",
    letterSpacing: 0.2,
  },
  ManualEntryFields: {
    flexDirection: "row",
    gap: 10,
  },
  ManualEntryField: {
    flex: 1,
    gap: 6,
  },
  ManualEntryLabel: {
    fontSize: 11,
    fontFamily: FONTS.Medium,
    color: "rgba(255,255,255,0.5)",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  ManualEntryInput: {
    height: 44,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 16,
    fontFamily: FONTS.Medium,
    color: Colors.white,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.14)",
  },
  ManualEntrySubmit: {
    height: 44,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  ManualEntrySubmitDisabled: {
    opacity: 0.45,
  },
  ManualEntrySubmitText: {
    fontSize: 14,
    fontFamily: FONTS.Medium,
    color: Colors.white,
  },
  Button: {
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 10,
    borderRadius: 25,
  },
  Icons: {
    width: 24,
    height: 24,
    tintColor: Colors.white,
  },
  contentContainer: {
    // flex: 1,
    width: "100%",
    padding: 15,
    alignItems: "center",
    gap: 10,
  },
  ListFooterContainer: {
    width: "100%",
    height: width / 2,
    justifyContent: "center",
    alignItems: "center",
  },
  Text: {
    fontSize: 14,
    fontFamily: FONTS.Medium,
    color: Colors.black,
  },
  CommentContainer: {
    padding: 15,
    borderRadius: 4,
    backgroundColor: Colors.white,
  },
  TextArea: {
    borderRadius: 10,
    padding: 10,
    fontSize: 14,
    backgroundColor: Colors.white,
    minHeight: 240,
    fontFamily: FONTS.Regular,
    color: Colors.black,
    marginTop: 10,
  },
  ButtonSubmit: {
    width: "100%",
    height: 50,
    backgroundColor: Colors.primary,
    borderRadius: 7,
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 15,
    marginTop: 25
  },
  Error: {
    fontSize: 13,
    color: Colors.red,
    fontFamily: FONTS.Regular,
    marginTop: 10,
    marginLeft: 5,
  },
  Line: {
    marginVertical: 10,
  },
  Input: {
    width: "80%",
    fontSize: 14,
    fontFamily: FONTS.Medium,
    color: Colors.black,
  },
  InputBox: {
    width: "100%",
    backgroundColor: Colors.white,
    paddingHorizontal: 15,
    paddingVertical: Platform.OS == "android" ? 5 : 10,
    borderRadius: 7,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 5,
  },
  CommentBox: {
    width: "90%",
    padding: 15,
    marginHorizontal: "auto",
    // height:'80%',
    backgroundColor: Colors.background,
    borderRadius: 10,
    paddingBottom: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    width: "80%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 8,
  },
  modalMsg: {
    fontSize: 14,
    textAlign: "center",
    color: "#555",
    marginBottom: 16,
  },
  btnRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  modalBtn: {
    flex: 1,
    marginHorizontal: 5,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  primaryBtn: {
    backgroundColor: "#007bff",
  },
  secondaryBtn: {
    backgroundColor: "#eee",
  },
  btnText: {
    fontSize: 15,
    fontWeight: "500",
  },
  primaryText: {
    color: "#fff",
  },
  secondaryText: {
    color: "#333",
  },
});