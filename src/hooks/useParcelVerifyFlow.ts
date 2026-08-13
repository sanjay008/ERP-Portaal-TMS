import apiConstants from '@/src/api/apiConstants';
import { Images } from '@/src/assets/images';
import { useErrorHandle } from '@/src/components/ErrorHandle';
import { GlobalContextData } from '@/src/context/GlobalContext';
import {
  useParcelVerifySession,
  getRememberedDeliveryLabel,
  clearRememberedDeliveryLabel,
  setLatestDeliveryCameraSetData,
  setLatestPickupCameraSetData,
} from '@/src/context/ParcelVerifySessionContext';
import {
  getActiveVerifyDeliveryLabel,
  setActiveVerifyDeliveryLabel,
  clearActiveVerifyDeliveryLabel,
  setFallbackDeliveryLabelId,
  getFallbackDeliveryLabelId,
  resolveVerifyDeliveryLabel,
} from '@/src/utils/parcelVerifyDeliveryLabelStore';
import { DropboxContext } from '@/src/context/UploadProider';
import ApiService from '@/src/utils/Apiservice';
import { Colors } from '@/src/utils/colors';
import { appendToLocalUploadQueue } from '@/src/utils/localUploadQueue';
import { isDeliveryOrder } from '@/src/utils/orderStatus';
import {
  doesLabelRequireSignature,
  getSignatureIsDelivery,
  isSignatureAllowedAfterStatusUpdate,
  isDescriptionOptional,
  shouldSendDamageForDeliveryLabel,
  shouldSkipCommentAfterCamera,
} from '@/src/utils/parcelCommentRules';
import {
  buildIsDamagePayload,
  initParcelDamageSelections,
  moreParcelsTitle,
  type ParcelDamageSelectionMap,
} from '@/src/utils/deliveryMultiParcel';
import {
  DELIVERY_STATUS_ID,
  getMoreParcelsCountAfterScan,
  getOrderTmsStatusId,
  hasRemainingParcelsToDeliver,
} from '@/src/utils/pickupPlanned';
import { attachScanFreshCoordsToPayload } from '@/src/utils/scanFreshLocation';
import {
  type DeliveryScanContinueContext,
  type ParcelVerifyScanPayload,
  runParcelVerifyFlow,
} from '@/src/utils/runParcelVerifyFlow';
import { isBlankSignatureData } from '@/src/utils/signatureValidation';
import {
  isParcelCameraCallbackLocked,
  lockParcelCameraCallback,
  unlockParcelCameraCallback,
} from '@/src/utils/parcelVerifyCameraReturn';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import axios from 'axios';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScanPlatFormId } from '../utils/storeData';

type UseParcelVerifyFlowOptions = {
  slideType: string;
  selectCurrentDate: string;
  source: 'filter' | 'scanner';
  isScanRoute?: boolean;
  isManualDirectVerify?: boolean;
  onSuccess?: () => void | Promise<void>;
  onGoToListPage?: () => void;
  unlockScanner?: () => void;
};

const EMPTY_MODAL = {
  visible: false,
  title: '',
  Icon: '',
  LButtonText: '',
  RButtonText: '',
  RButtonStyle: {},
  LButtonStyle: {},
  RColor: '',
  LColor: '',
  onPress: undefined as undefined | (() => void),
  personData: [] as any[],
  type: 1,
  ProductItem: [] as any[],
  bgColor: '',
  OrderData: null as any,
  order_id: 0,
  delivery_btn: 0,
  stopData: null as number | string | null,
};

export function useParcelVerifyFlow({
  slideType,
  selectCurrentDate,
  source,
  isScanRoute = false,
  isManualDirectVerify = false,
  onSuccess,
  onGoToListPage,
  unlockScanner,
}: UseParcelVerifyFlowOptions) {
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();
  const { t } = useTranslation();
  const { ErrorHandle } = useErrorHandle();
  const { setLocalImagesUploadbeforeData } = useContext(DropboxContext);
  const {
    session: parcelVerifySession,
    commentVisible: comment,
    setCommentVisible: setComment,
    setSessionDeliveryLabel,
    setSessionDamageData,
    setSessionPlace,
    clearParcelVerifySession,
  } = useParcelVerifySession();
  const {
    UserData,
    GloblyTypeSlide,
    setToast,
    AllDeliveyLabel,
    setAllDeliveyLabel,
    AllDamageListReason,
    setAllDamageListReason,
    selectDamageData,
    setselectDamageData,
    SelectCurrentDeliveryLabel,
    setSelectCurrentDeliveryLabel,
    PinnedDeliveryLabel,
    EffectiveDeliveryLabel,
    clearPinnedDeliveryLabel,
    setOrderDeliveryMapingLableOption,
    DeliveyDataSave,
    setDeliveyDataSave,
    setPickUpDataSave,
    CommentId,
    setCommentId,
    selectRegionData,
  } = useContext(GlobalContextData);

  const [isLoading, setIsLoading] = useState(false);
  const [itemsData, setItemsData] = useState<any>(null);
  const [selectPlace, setSelectPlace] = useState<any>(null);
  const [productDamageList, setProductDamageList] = useState<any[]>([]);
  const [responseOrderData, setResponseOrderData] = useState<any>(null);
  const [showDeliveryLabelList, setShowDeliveryLabelList] = useState(0);
  const [conformationModal, setConformationModal] = useState<any>(EMPTY_MODAL);
  const [evetyTimeShowDeliveryLabelList, setEvetyTimeShowDeliveryLabelList] =
    useState(false);
  const [pickupPlannedSheetOpen, setPickupPlannedSheetOpen] = useState({
    visible: false,
    orderData: null as any,
    scanPayload: null as ParcelVerifyScanPayload | null,
  });
  const [alertModalOpen, setAlerModalOpen] = useState<any>({
    visible: false,
    title: '',
    Description: '',
    LButtonText: '',
    RButtonText: '',
    Icon: null,
    RButtonStyle: {},
    RColor: Colors.white,
    LButtonStyle: {},
    LColor: Colors.black,
    onPress: () => { },
  });
  const [allSelectImage, setAllSelectImage] = useState<any[]>([]);
  const [description, setDescription] = useState('');
  const [commentError, setCommentError] = useState('');
  const [commentLoader, setCommentLoader] = useState(false);
  const [showSig, setShowSig] = useState(false);
  const [signatureLoader, setSignatureLoader] = useState(false);
  const [secondModal, setSecondModal] = useState<any>({
    visible: false,
    title: '',
    message: '',
    buttons: [] as any[],
    color: Colors.green,
  });
  const [parcelDamageSelections, setParcelDamageSelections] =
    useState<ParcelDamageSelectionMap>({});
  const pendingDeliveryContinueRef = useRef<DeliveryScanContinueContext | null>(
    null,
  );
  const deliveryMoreParcelsYesRef = useRef<(() => void) | null>(null);
  const deliveryMoreParcelsNoRef = useRef<(() => void) | null>(null);
  /** Yes/No "No" path — after comment → signature → goBack (skip No Parcel / Open Scanner). */
  const deliveryMoreParcelsNoPathRef = useRef(false);
  /** Full verify API payload — used for direct-flow Yes/No moreCount only. */
  const lastVerifyApiDataRef = useRef<any>(null);

  useEffect(() => {
    if (!comment) return;
    if (!isDeliveryOrder(itemsData) || !productDamageList?.length) return;
    setParcelDamageSelections((prev) =>
      initParcelDamageSelections(productDamageList, AllDamageListReason, prev),
    );
  }, [comment, productDamageList, AllDamageListReason, itemsData]);

  const deliveryLabelModalPendingRef = useRef(false);
  const pickupPlannedModalPendingRef = useRef(false);
  const pendingPickupScanRef = useRef<ParcelVerifyScanPayload | null>(null);
  const pendingDeliveryLabelRef = useRef<any>(null);
  const selectCurrentDeliveryLabelRef = useRef<any>(null);
  /** Survives FilterScreen focus clear of SelectCurrentDeliveryLabel — used for status_update + signature + optional. */
  const deliveryLabelSnapshotRef = useRef<any>(null);
  const [lockedDeliveryLabel, setLockedDeliveryLabel] = useState<any>(null);
  const selectDamageDataRef = useRef<any>(null);
  const deliveryTypeRef = useRef(false);
  const signatureReopenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Locked at label select — survives stub overwrites so signature button still shows. */
  const signatureRequiredRef = useRef(false);
  const signatureLabelRef = useRef<any>(null);

  const openSignatureFlow = useCallback((label: any) => {
    let fullLabel = label;
    if (label?.id != null && AllDeliveyLabel?.length) {
      const fromList = AllDeliveyLabel.find(
        (item: any) => Number(item?.id) === Number(label.id),
      );
      if (fromList) {
        fullLabel = {
          ...fromList,
          ...label,
          signature_required: label?.signature_required ?? fromList?.signature_required,
          signature_rejected: label?.signature_rejected ?? fromList?.signature_rejected,
        };
      }
    }
    if (!doesLabelRequireSignature(fullLabel)) return;
    signatureLabelRef.current = fullLabel ?? null;
    setShowSig(true);
  }, [AllDeliveyLabel]);

  useEffect(() => {
    selectCurrentDeliveryLabelRef.current = SelectCurrentDeliveryLabel;
  }, [SelectCurrentDeliveryLabel]);

  useEffect(() => {
    selectDamageDataRef.current = selectDamageData;
  }, [selectDamageData]);

  const resolveLabelFromId = useCallback(
    (labelId: any) => {
      if (labelId == null || labelId === '') return null;
      const fromList = AllDeliveyLabel?.find(
        (item: any) => Number(item?.id) === Number(labelId),
      );
      if (fromList) return fromList;
      // Minimal stub so optional rule (id === 21) still works if list not loaded.
      return { id: Number(labelId) };
    },
    [AllDeliveyLabel],
  );

  const resolveDeliveryLabel = useCallback(() => {
    const fromItemId = (() => {
      const items = itemsData?.items ?? itemsData?.order_data?.items ?? [];
      const match =
        items.find(
          (el: any) =>
            selectPlace?.item_id != null &&
            Number(el?.id) === Number(selectPlace.item_id),
        ) ?? items[0];
      return (
        match?.delivery_label ??
        getFallbackDeliveryLabelId() ??
        null
      );
    })();

    // Global pin first — survives Filter soft-null + dual hook instances.
    const resolved = resolveVerifyDeliveryLabel({
      snapshot: deliveryLabelSnapshotRef.current,
      locked: lockedDeliveryLabel,
      pending: pendingDeliveryLabelRef.current,
      remembered: getRememberedDeliveryLabel(),
      session: parcelVerifySession.deliveryLabel,
      global: EffectiveDeliveryLabel ?? SelectCurrentDeliveryLabel ?? PinnedDeliveryLabel,
      saveReason: DeliveyDataSave?.selectReason,
      itemDeliveryLabelId: fromItemId,
      resolveFromId: resolveLabelFromId,
    });

    // Prefer global pin over anything else when present.
    const withGlobalPin =
      EffectiveDeliveryLabel ??
      PinnedDeliveryLabel ??
      getActiveVerifyDeliveryLabel() ??
      resolved;

    if (comment && isFocused) {
      console.log('[DirectFlow] resolveDeliveryLabel', {
        pinnedId: PinnedDeliveryLabel?.id ?? null,
        effectiveId: EffectiveDeliveryLabel?.id ?? null,
        storeId: getActiveVerifyDeliveryLabel()?.id ?? null,
        snapshotId: deliveryLabelSnapshotRef.current?.id ?? null,
        lockedId: lockedDeliveryLabel?.id ?? null,
        pendingId: pendingDeliveryLabelRef.current?.id ?? null,
        rememberedId: getRememberedDeliveryLabel()?.id ?? null,
        sessionId: parcelVerifySession.deliveryLabel?.id ?? null,
        globalId: SelectCurrentDeliveryLabel?.id ?? null,
        saveReasonId: DeliveyDataSave?.selectReason?.id ?? null,
        itemDeliveryLabel: fromItemId,
        fallbackId: getFallbackDeliveryLabelId(),
        resolvedId: withGlobalPin?.id ?? null,
      });
    }
    return withGlobalPin;
  }, [
    comment,
    isFocused,
    lockedDeliveryLabel,
    parcelVerifySession.deliveryLabel,
    SelectCurrentDeliveryLabel,
    PinnedDeliveryLabel,
    EffectiveDeliveryLabel,
    DeliveyDataSave?.selectReason,
    itemsData,
    selectPlace?.item_id,
    resolveLabelFromId,
  ]);

  const isCommentOptional = useMemo(() => {
    // Always read module store first — shared across Filter + Details instances.
    const label = resolveDeliveryLabel();
    const damage = selectDamageData ?? parcelVerifySession.damageData;
    const optional = isDescriptionOptional(label, damage, itemsData);
    if (comment && isFocused) {
      console.log('[DirectFlow] isCommentOptional', {
        optional,
        labelId: label?.id ?? null,
        damageId: damage?.id ?? null,
        statusId: itemsData?.tmsstatus?.id ?? itemsData?.status ?? null,
      });
    }
    return optional;
  }, [
    resolveDeliveryLabel,
    selectDamageData,
    itemsData,
    parcelVerifySession.damageData,
    comment,
    isFocused,
  ]);

  const effectiveDeliveryLabel = resolveDeliveryLabel();

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

  const getSessionDeliveryLabel = useCallback(
    () => parcelVerifySession.deliveryLabel,
    [parcelVerifySession.deliveryLabel],
  );

  /** Soft clear — UI only. Does not wipe global pin (Direct Flow mid-camera). */
  const softClearDeliveryLabelUi = useCallback(() => {
    setSelectCurrentDeliveryLabel(null);
  }, [setSelectCurrentDeliveryLabel]);

  /** After status_update success / go-to-list — full wipe including global pin. */
  const clearDeliveryLabelSelection = useCallback(() => {
    console.log('[DirectFlow] clearDeliveryLabelSelection → full wipe');
    pendingDeliveryLabelRef.current = null;
    selectCurrentDeliveryLabelRef.current = null;
    deliveryLabelSnapshotRef.current = null;
    signatureRequiredRef.current = false;
    setLockedDeliveryLabel(null);
    clearPinnedDeliveryLabel();
    setSessionDeliveryLabel(null);
    clearRememberedDeliveryLabel();
    clearActiveVerifyDeliveryLabel();
  }, [clearPinnedDeliveryLabel, setSessionDeliveryLabel]);

  const clearDeliveryLabelForNextParcel = softClearDeliveryLabelUi;

  const handleGoToListPage = useCallback(() => {
    setSecondModal((prev: any) => ({ ...prev, visible: false }));
    clearParcelVerifySession();
    if (onGoToListPage) {
      onGoToListPage();
    } else {
      onSuccess?.();
    }
  }, [onGoToListPage, onSuccess, clearParcelVerifySession]);

  const closeConformationModal = useCallback(() => {
    setConformationModal((prev: any) => ({ ...prev, visible: false }));
    unlockScanner?.();
  }, [unlockScanner]);

  const statusUpdateFun = useCallback(
    async (
      data: ParcelVerifyScanPayload,
      scan = false,
      is_driver_unloading = false,
      options?: { keepDeliveryLabel?: boolean; skipDamage?: boolean },
    ) => {
      if (!scan) return;
      setIsLoading(true);
      try {
        // Prefer live global selection / pin for delivered_lable_id.
        const labelForStatus =
          EffectiveDeliveryLabel ??
          PinnedDeliveryLabel ??
          SelectCurrentDeliveryLabel;
        const payload: any = {
          token: UserData?.user?.verify_token,
          role: UserData?.user?.role,
          relaties_id: UserData?.relaties?.id,
          user_id: UserData?.user?.id,
          item_id: data?.item_id,
          order_id: data?.order_id,
          platform: ScanPlatFormId,
          type: slideType ?? GloblyTypeSlide,
          ...(labelForStatus != null &&
            GloblyTypeSlide === 'pickup_dropoff' && {
            delivered_lable_id: labelForStatus?.id,
          }),
        };

        if (is_driver_unloading) {
          payload.is_driver_unloading = 1;
        }

        if (
          !options?.skipDamage &&
          (GloblyTypeSlide === 'pickup_dropoff' ||
            GloblyTypeSlide === 'additional_address') &&
          selectDamageData &&
          shouldSendDamageForDeliveryLabel(
            labelForStatus,
            itemsData,
          )
        ) {
          payload.is_damage = selectDamageData?.id;
        }

        await attachScanFreshCoordsToPayload(payload);

        const res = await ApiService(apiConstants.status_update, {
          customData: payload,
        });

        if (!res?.status) {
          setToast({
            top: 45,
            text: t(res?.message) || t('Failed to update status'),
            type: 'error',
            visible: true,
          });
          return;
        }

        if (!options?.keepDeliveryLabel) {
          clearDeliveryLabelSelection();
          deliveryLabelModalPendingRef.current = false;
          setEvetyTimeShowDeliveryLabelList(false);
        }
        setConformationModal((prev: any) => ({ ...prev, visible: false }));
        await onSuccess?.();

        // Mid-scan "Yes / more parcels" — stay on scanner, no remaining modal.
        if (options?.keepDeliveryLabel) {
          return;
        }

        const parcelsStillRemaining = hasRemainingParcelsToDeliver(
          itemsData,
          res,
          [],
          data?.item_id,
        );

        if (!parcelsStillRemaining) {
          setSecondModal({
            visible: true,
            title: t('All Parcels Scanned Successfully!'),
            message: t(res?.remaining_item_message) || '',
            buttons: [
              {
                text: t('OK'),
                type: 'primary',
                onPress: () => {
                  setSecondModal((prev: any) => ({ ...prev, visible: false }));
                },
              },
            ],
            color: Colors.green,
          });
        } else {
          setSecondModal({
            visible: true,
            title: t('There are Parcels Remaining'),
            message: t(res?.remaining_item_message),
            buttons: [
              {
                text: t('OK'),
                type: 'primary',
                onPress: () => {
                  setSecondModal((prev: any) => ({ ...prev, visible: false }));
                  setSelectPlace(null);
                },
              },
            ],
            color: Colors.yellow,
          });
        }
      } catch (error) {
        setToast({
          top: 45,
          text: ErrorHandle(error).message,
          type: 'error',
          visible: true,
        });
      } finally {
        setIsLoading(false);
        unlockScanner?.();
      }
    },
    [
      UserData,
      slideType,
      GloblyTypeSlide,
      SelectCurrentDeliveryLabel,
      EffectiveDeliveryLabel,
      PinnedDeliveryLabel,
      selectDamageData,
      clearDeliveryLabelSelection,
      onSuccess,
      itemsData,
      t,
      setToast,
      ErrorHandle,
      unlockScanner,
    ],
  );

  const reversParcelFun = useCallback(
    async (order_id: number | string | null, item_id: number | string | null) => {
      setIsLoading(true);
      try {
        const res = await ApiService(apiConstants.revert_order_item_status, {
          customData: {
            token: UserData?.user?.verify_token,
            role: UserData?.user?.role,
            relaties_id: UserData?.relaties?.id,
            user_id: UserData?.user?.id,
            item_id,
            order_id,
            type: slideType ?? GloblyTypeSlide,
          },
        });

        if (res?.status) {
          setToast({
            top: 45,
            text: t(res?.message) || t('Success to update status'),
            type: 'success',
            visible: true,
          });
          setConformationModal((prev: any) => ({ ...prev, visible: false }));
          await onSuccess?.();
        } else {
          setToast({
            top: 45,
            text: t(res?.message) || t('Failed to update status'),
            type: 'error',
            visible: true,
          });
        }
      } catch (error) {
        setToast({
          top: 45,
          text: ErrorHandle(error).message,
          type: 'error',
          visible: true,
        });
      } finally {
        setIsLoading(false);
      }
    },
    [UserData, slideType, GloblyTypeSlide, onSuccess, t, setToast, ErrorHandle],
  );

  const openDeliveryCameraProof = useCallback(
    (sessionLabel?: any, orderData?: any) => {
      const selectedLabel =
        sessionLabel ??
        getActiveVerifyDeliveryLabel() ??
        deliveryLabelSnapshotRef.current ??
        pendingDeliveryLabelRef.current ??
        getRememberedDeliveryLabel();

      if (selectedLabel == null) {
        setToast({
          top: 45,
          text: t('Please select a delivery label'),
          type: 'error',
          visible: true,
        });
        return;
      }

      setAlerModalOpen({
        visible: true,
        title: t('Camera'),
        Description: t('You have to take a picture for proof?'),
        LButtonText: t('Cancel'),
        RButtonText: t('Camera'),
        Icon: Images.UploadPhoto,
        RButtonStyle: Colors.primary,
        RColor: Colors.white,
        LButtonStyle: Colors.gray,
        LColor: Colors.black,
        onPress: () => {
          deliveryTypeRef.current = false;
          setActiveVerifyDeliveryLabel(selectedLabel);
          lockParcelCameraCallback();
          const setData = async (data: any[]) => {
            try {
              if (!data?.length) return;
              setAllSelectImage(data);
              setParcelDamageSelections((prev) =>
                initParcelDamageSelections(
                  productDamageList,
                  AllDamageListReason,
                  prev,
                ),
              );
              const damage = selectDamageDataRef.current ?? selectDamageData;
              if (shouldSkipCommentAfterCamera(selectedLabel, damage)) {
                setComment(false);
              } else {
                setComment(true);
              }
              setShowSig(false);
            } finally {
              unlockParcelCameraCallback();
            }
          };
          setLatestDeliveryCameraSetData(setData);
          setDeliveyDataSave({
            Data: orderData ?? itemsData,
            selectReason: selectedLabel,
            setData,
            type: false,
          });
          navigation.navigate('Camera');
          setAlerModalOpen((prev: any) => ({ ...prev, visible: false }));
        },
      });
    },
    [
      AllDamageListReason,
      itemsData,
      navigation,
      productDamageList,
      selectDamageData,
      setComment,
      setDeliveyDataSave,
      setToast,
      t,
    ],
  );

  const onDeliveryLabeledParcelReady = useCallback(
    (ctx: DeliveryScanContinueContext) => {
      pendingDeliveryContinueRef.current = ctx;

      if (ctx.moreCount <= 0) {
        openDeliveryCameraProof(ctx.sessionLabel, ctx.orderData);
        return;
      }

      setSecondModal({
        visible: true,
        title: moreParcelsTitle(ctx.moreCount, t),
        message: '',
        color: Colors.transparant,
        buttons: [
          {
            text: t('No'),
            type: 'secondary',
            backgroundColor: Colors.red,
            onPress: () => deliveryMoreParcelsNoRef.current?.(),
          },
          {
            text: t('Yes'),
            type: 'primary',
            backgroundColor: Colors.green,
            onPress: () => deliveryMoreParcelsYesRef.current?.(),
          },
        ],
      });
    },
    [openDeliveryCameraProof, t],
  );

  deliveryMoreParcelsYesRef.current = async () => {
    const ctx = pendingDeliveryContinueRef.current;
    deliveryMoreParcelsNoPathRef.current = false;
    setSecondModal((prev: any) => ({ ...prev, visible: false }));
    pendingDeliveryContinueRef.current = null;
    if (!ctx?.data) return;
    await statusUpdateFun(ctx.data, true, false, {
      keepDeliveryLabel: true,
      skipDamage: true,
    });
  };

  deliveryMoreParcelsNoRef.current = () => {
    const ctx = pendingDeliveryContinueRef.current;
    deliveryMoreParcelsNoPathRef.current = true;
    setSecondModal((prev: any) => ({ ...prev, visible: false }));
    pendingDeliveryContinueRef.current = null;
    openDeliveryCameraProof(ctx?.sessionLabel, ctx?.orderData ?? itemsData);
  };

  const flowDeps = useMemo(
    () => ({
      userData: UserData,
      selectRegionData,
      slideType,
      selectCurrentDate,
      isScanRoute,
      isManualDirectVerify,
      source,
      t,
      errorHandle: ErrorHandle,
      navigation,
      globlyTypeSlide: GloblyTypeSlide,
      allDeliveyLabel: AllDeliveyLabel,
      allDamageListReason: AllDamageListReason,
      selectCurrentDeliveryLabel: SelectCurrentDeliveryLabel,
      selectDamageData,
      setAllDeliveyLabel,
      setAllDamageListReason,
      setselectDamageData,
      setOrderDeliveryMapingLableOption,
      setItemsData,
      setShowDeliveryLabelList,
      setSelectPlace,
      setProductDamageList,
      setResponseOrderData,
      onVerifyApiData: (verifyData: any) => {
        lastVerifyApiDataRef.current = verifyData;
      },
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
      statusUpdateFun,
      reversParcelFun,
      getSessionDeliveryLabel,
      clearDeliveryLabelSelection: clearDeliveryLabelForNextParcel,
      unlockScanner,
      onDeliveryLabeledParcelReady,
    }),
    [
      UserData,
      selectRegionData,
      slideType,
      selectCurrentDate,
      isScanRoute,
      isManualDirectVerify,
      source,
      t,
      ErrorHandle,
      navigation,
      GloblyTypeSlide,
      AllDeliveyLabel,
      AllDamageListReason,
      SelectCurrentDeliveryLabel,
      selectDamageData,
      setAllDeliveyLabel,
      setAllDamageListReason,
      setselectDamageData,
      setOrderDeliveryMapingLableOption,
      setDeliveyDataSave,
      setToast,
      statusUpdateFun,
      reversParcelFun,
      getSessionDeliveryLabel,
      clearDeliveryLabelForNextParcel,
      unlockScanner,
      onDeliveryLabeledParcelReady,
    ],
  );

  const startVerify = useCallback(
    async (data: ParcelVerifyScanPayload & { item?: any }) => {
      setIsLoading(true);
      try {
        // Seed fallback from tapped parcel so optional (label 21) survives
        // even if React state is wiped before comment opens.
        const tappedLabelId = data?.item?.delivery_label;
        if (tappedLabelId != null && tappedLabelId !== '') {
          setFallbackDeliveryLabelId(tappedLabelId);
        }
        await runParcelVerifyFlow(data, flowDeps);
      } finally {
        setIsLoading(false);
      }
    },
    [flowDeps],
  );

  const handlePickupWithPhoto = useCallback(() => {
    pickupPlannedModalPendingRef.current = false;
    setPickupPlannedSheetOpen((prev) => ({ ...prev, visible: false }));
    pendingPickupScanRef.current = null;
    lockParcelCameraCallback();
    const setData = async (data: any[]) => {
      try {
        if (data?.length > 0) {
          setAllSelectImage(data);
          console.log('[DirectFlow] open comment (pickup camera return)');
          setComment(true);
        }
      } finally {
        unlockParcelCameraCallback();
      }
    };
    setLatestPickupCameraSetData(setData);
    setPickUpDataSave({ setData });
    navigation.navigate('Camera', { from: 'Pickup' });
  }, [navigation, setPickUpDataSave, setComment]);

  const handlePickupNextScan = useCallback(async () => {
    const scanData =
      pendingPickupScanRef.current ?? pickupPlannedSheetOpen.scanPayload;
    if (!scanData) return;
    pickupPlannedModalPendingRef.current = false;
    setPickupPlannedSheetOpen({
      visible: false,
      orderData: null,
      scanPayload: null,
    });
    pendingPickupScanRef.current = null;
    await statusUpdateFun(scanData, true);
  }, [pickupPlannedSheetOpen.scanPayload, statusUpdateFun]);

  const closePickupPlannedSheet = useCallback(() => {
    pickupPlannedModalPendingRef.current = false;
    setPickupPlannedSheetOpen({ visible: false, orderData: null, scanPayload: null });
    pendingPickupScanRef.current = null;
    unlockScanner?.();
  }, [unlockScanner]);

  const closeDeliveryLabelModal = useCallback(() => {
    deliveryLabelModalPendingRef.current = false;
    setEvetyTimeShowDeliveryLabelList(false);
    unlockScanner?.();
  }, [unlockScanner]);

  const persistDeliveryLabel = useCallback(
    (labelItem: any) => {
      if (labelItem == null) return;
      // Enrich from global list so signature_required is never missing on pin.
      let fullLabel = labelItem;
      if (labelItem?.id != null && AllDeliveyLabel?.length) {
        const fromList = AllDeliveyLabel.find(
          (el: any) => Number(el?.id) === Number(labelItem.id),
        );
        if (fromList) {
          fullLabel = { ...fromList, ...labelItem };
        }
      }
      signatureRequiredRef.current = doesLabelRequireSignature(fullLabel);
      console.log('[DirectFlow] persistDeliveryLabel', {
        id: fullLabel?.id,
        signature_required: fullLabel?.signature_required,
        signature_rejected: fullLabel?.signature_rejected,
        signatureRequiredRef: signatureRequiredRef.current,
      });
      // Global pin first (survives soft null). Then module store + local refs.
      setSelectCurrentDeliveryLabel(fullLabel);
      setActiveVerifyDeliveryLabel(fullLabel);
      setSessionDeliveryLabel(fullLabel);
      deliveryLabelSnapshotRef.current = fullLabel;
      setLockedDeliveryLabel(fullLabel);
      pendingDeliveryLabelRef.current = fullLabel;
      selectCurrentDeliveryLabelRef.current = fullLabel;
    },
    [AllDeliveyLabel, setSelectCurrentDeliveryLabel, setSessionDeliveryLabel],
  );

  const handleSelectDeliveryLabel = useCallback(
    (labelItem: any) => {
      console.log('[DirectFlow] handleSelectDeliveryLabel', {
        id: labelItem?.id,
        signature_required: labelItem?.signature_required,
        signature_rejected: labelItem?.signature_rejected,
      });
      persistDeliveryLabel(labelItem);
    },
    [persistDeliveryLabel],
  );

  const openCameraProofAfterLabelSelect = useCallback(
    (labelItem?: any) => {
      deliveryLabelModalPendingRef.current = false;
      setEvetyTimeShowDeliveryLabelList(false);
      // Latest tap wins — arg, else module store / pinned / session.
      const selectedLabel =
        labelItem ??
        getActiveVerifyDeliveryLabel() ??
        deliveryLabelSnapshotRef.current ??
        lockedDeliveryLabel ??
        pendingDeliveryLabelRef.current ??
        getRememberedDeliveryLabel() ??
        parcelVerifySession.deliveryLabel;

      console.log('[DirectFlow] openCameraProofAfterLabelSelect', {
        fromArg: labelItem?.id ?? null,
        storeId: getActiveVerifyDeliveryLabel()?.id ?? null,
        selectedId: selectedLabel?.id ?? null,
      });

      if (selectedLabel == null) {
        console.warn('[DirectFlow] openCameraProofAfterLabelSelect: no label');
        setToast({
          top: 45,
          text: t('Please select a delivery label'),
          type: 'error',
          visible: true,
        });
        setEvetyTimeShowDeliveryLabelList(true);
        return;
      }

      persistDeliveryLabel(selectedLabel);

      // Direct flow: use verify API remaining (scanner path already has this in runParcelVerifyFlow).
      const moreCount =
        selectPlace?.item_id != null
          ? getMoreParcelsCountAfterScan(
              itemsData,
              lastVerifyApiDataRef.current,
              selectPlace.item_id,
            )
          : 0;

      const isDelivery =
        isDeliveryOrder(itemsData) ||
        getOrderTmsStatusId(itemsData) === DELIVERY_STATUS_ID;

      if (isDelivery && selectPlace?.item_id != null && moreCount > 0) {
        onDeliveryLabeledParcelReady({
          data: selectPlace,
          orderData: itemsData,
          verifyData: lastVerifyApiDataRef.current,
          sessionLabel: selectedLabel,
          moreCount,
        });
        return;
      }

      openDeliveryCameraProof(selectedLabel, itemsData);
    },
    [
      itemsData,
      lockedDeliveryLabel,
      onDeliveryLabeledParcelReady,
      openDeliveryCameraProof,
      parcelVerifySession.deliveryLabel,
      persistDeliveryLabel,
      selectPlace,
      setToast,
      t,
    ],
  );

  const queueProofImagesOnly = useCallback(() => {
    const orderId =
      selectPlace?.order_id ?? itemsData?.id ?? itemsData?.order_data?.id;
    if (!allSelectImage?.length || orderId == null) {
      return false;
    }

    return appendToLocalUploadQueue(setLocalImagesUploadbeforeData, {
      order_id: orderId,
      image_data: [...allSelectImage],
      item_id: selectPlace?.item_id || null,
      commentId: null,
    });
  }, [allSelectImage, itemsData, selectPlace, setLocalImagesUploadbeforeData]);

  const addImageOrCommentFun = useCallback(
    async (
      data: any[] = [],
      options?: { skipClose?: boolean; manageLoader?: boolean },
    ): Promise<boolean> => {
      const id = itemsData?.id || itemsData?.order_data?.id;
      const manageLoader = options?.manageLoader !== false;

      if (manageLoader) {
        setCommentLoader(true);
      }
      try {
        const formData: any = new FormData();

        formData.append('token', UserData?.user?.verify_token);
        formData.append('role', UserData?.user?.role);
        formData.append('relaties_id', UserData?.relaties?.id);
        formData.append('user_id', UserData?.user?.id);
        formData.append('order_comment', description?.trim());
        formData.append('order_id', id ? id : selectPlace?.id);

        const image_data =
          Array.isArray(data) && data?.length > 0
            ? data
            : Array.isArray(allSelectImage)
              ? allSelectImage
              : [];

        const res: any = await axios.post(apiConstants.store_tms_comment, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          transformRequest: (fd) => fd,
        });

        if (Boolean(res?.data?.status)) {
          const orderLogId = res?.data?.data?.order_log_id;
          setCommentId(orderLogId);
          const orderId =
            selectPlace?.order_id ?? itemsData?.id ?? itemsData?.order_data?.id;
          if (image_data.length > 0 && orderLogId != null && orderId != null) {
            appendToLocalUploadQueue(setLocalImagesUploadbeforeData, {
              order_id: orderId,
              image_data: [...image_data],
              item_id: selectPlace?.item_id || null,
              commentId: orderLogId,
            });
          }
          setAllSelectImage([]);
          setPickUpDataSave([]);
          setDeliveyDataSave([]);
          setDescription('');
          if (!options?.skipClose) {
            setComment(false);
          }
          return true;
        }

        setComment(true);
        setToast({
          top: 45,
          text: t(res?.data?.message),
          type: 'error',
          visible: true,
        });
        return false;
      } catch (error) {
        setComment(true);
        setToast({
          top: 45,
          text: ErrorHandle(error).message,
          type: 'error',
          visible: true,
        });
        return false;
      } finally {
        if (manageLoader) {
          setCommentLoader(false);
        }
      }
    },
    [
      UserData,
      allSelectImage,
      description,
      itemsData,
      selectPlace,
      setCommentId,
      setDeliveyDataSave,
      setLocalImagesUploadbeforeData,
      setPickUpDataSave,
      setToast,
      t,
      ErrorHandle,
    ],
  );

  const customerSignatureFun = useCallback(
    async (
      signature: string | null = null,
      name: string | null = null,
      damageItems: any[] = [],
    ) => {
      if (isBlankSignatureData(signature)) {
        setToast({
          top: 45,
          text: t('Signature is required'),
          type: 'error',
          visible: true,
        });
        return;
      }

      setSignatureLoader(true);
      try {
        const labelForSig =
          signatureLabelRef.current ??
          EffectiveDeliveryLabel ??
          PinnedDeliveryLabel ??
          SelectCurrentDeliveryLabel;

        const payload: any = {
          token: UserData?.user?.verify_token,
          role: UserData?.user?.role,
          relaties_id: UserData?.relaties?.id,
          user_id: UserData?.user?.id,
          name,
          signature,
          order_id: itemsData?.id,
          is_delivery: getSignatureIsDelivery(labelForSig),
        };

        // Signature top damage/undamage Change → send modified per-parcel list
        // (same shape as status_update; do not send stale selectDamageData).
        const canSendDeliveryDamage = shouldSendDamageForDeliveryLabel(
          labelForSig ??
            EffectiveDeliveryLabel ??
            PinnedDeliveryLabel ??
            SelectCurrentDeliveryLabel,
          itemsData,
        );
        if (canSendDeliveryDamage && Array.isArray(damageItems) && damageItems.length > 0) {
          const mapped = damageItems
            .map((row: any) => ({
              item_id: Number(row?.item ?? row?.item_id),
              damage_id: Number(row?.is_damage ?? row?.damage_id),
            }))
            .filter(
              (row) =>
                Number.isFinite(row.item_id) && Number.isFinite(row.damage_id),
            );
          if (mapped.length > 0) {
            payload.is_damage = mapped;
            payload.damage_items = JSON.stringify(mapped);
          }
        } else if (canSendDeliveryDamage && selectDamageData?.id != null) {
          payload.is_damage = selectDamageData.id;
        }

        const res = await ApiService(apiConstants.store_customer_signature, {
          customData: payload,
        });

        if (res?.status) {
          signatureLabelRef.current = null;
          setProductDamageList([]);
          if (allSelectImage?.length > 0 && CommentId != null) {
            const orderId =
              selectPlace?.order_id ?? itemsData?.id ?? itemsData?.order_data?.id;
            if (orderId != null) {
              appendToLocalUploadQueue(setLocalImagesUploadbeforeData, {
                order_id: orderId,
                image_data: [...allSelectImage],
                item_id: selectPlace?.item_id || null,
                commentId: CommentId,
              });
            }
          }
          setAllSelectImage([]);
          deliveryTypeRef.current = false;
          setShowSig(false);
          clearParcelVerifySession();
          setSecondModal((prev: any) => ({ ...prev, visible: false }));
          setToast({
            top: 45,
            text: res?.message,
            type: 'success',
            visible: true,
          });

          if (deliveryMoreParcelsNoPathRef.current) {
            deliveryMoreParcelsNoPathRef.current = false;
            await onSuccess?.();
            if (navigation?.canGoBack?.()) {
              navigation.goBack();
            } else {
              handleGoToListPage();
            }
            return;
          }

          setSecondModal({
            visible: true,
            title: t('All Parcels Scanned Successfully!'),
            message: t(res?.remaining_item_message) || '',
            buttons: [
              {
                text: t('Go to List Page'),
                type: 'primary',
                onPress: handleGoToListPage,
              },
            ],
            color:
              GloblyTypeSlide === 'outbound_scan' ? Colors.primary : Colors.green,
          });
          await onSuccess?.();
        } else {
          setToast({
            top: 45,
            text: res?.message,
            type: 'error',
            visible: true,
          });
        }
      } catch (error) {
        setToast({
          top: 45,
          text: ErrorHandle(error).message,
          type: 'error',
          visible: true,
        });
      } finally {
        setSignatureLoader(false);
      }
    },
    [
      UserData,
      itemsData,
      selectDamageData?.id,
      allSelectImage,
      CommentId,
      selectPlace,
      setLocalImagesUploadbeforeData,
      handleGoToListPage,
      onSuccess,
      clearParcelVerifySession,
      GloblyTypeSlide,
      navigation,
      t,
      setToast,
      ErrorHandle,
      EffectiveDeliveryLabel,
      PinnedDeliveryLabel,
      SelectCurrentDeliveryLabel,
      setProductDamageList,
    ],
  );

  const commentFun = useCallback(async () => {
    const effectiveType = slideType ?? GloblyTypeSlide;
    // Snapshot first — module store / fallback survive Filter focus clears.
    const activeDeliveryLabel = resolveDeliveryLabel();
    const isDeliveryMultiDamage =
      isDeliveryOrder(itemsData) &&
      productDamageList?.length > 0 &&
      Object.keys(parcelDamageSelections).length > 0;
    const commentOptionalNow = isDescriptionOptional(
      activeDeliveryLabel,
      selectDamageData ?? parcelVerifySession.damageData,
      itemsData,
    );

    if (
      isDeliveryOrder(itemsData) &&
      activeDeliveryLabel &&
      activeDeliveryLabel?.damaged_required == 1 &&
      !isDeliveryMultiDamage &&
      selectDamageData == null
    ) {
      setCommentError(t('Choose  Damaged'));
      return;
    }

    if (
      isDeliveryMultiDamage &&
      activeDeliveryLabel?.damaged_required == 1
    ) {
      const missing = productDamageList.some(
        (parcel: any) => parcelDamageSelections[String(parcel?.id)] == null,
      );
      if (missing) {
        setCommentError(t('Choose  Damaged'));
        return;
      }
    }

    setCommentLoader(true);
    try {
      if (!commentOptionalNow && !description.trim()) {
        setCommentError(t('Please enter a comment'));
        return;
      }

      if (!selectPlace?.item_id || !selectPlace?.order_id) {
        setToast({
          top: 45,
          text: t('Invalid or missing order details. Please rescan.'),
          type: 'error',
          visible: true,
        });
        return;
      }

      // Comment text → store_tms_comment first (images with comment log), then status_update.
      const hadCommentText = Boolean(description.trim());
      if (hadCommentText) {
        const commentOk = await addImageOrCommentFun([], {
          skipClose: true,
          manageLoader: false,
        });
        if (!commentOk) {
          return;
        }
      }

      const payload: any = {
        token: UserData?.user?.verify_token,
        role: UserData?.user?.role,
        relaties_id: UserData?.relaties?.id,
        user_id: UserData?.user?.id,
        item_id: selectPlace?.item_id,
        order_id: selectPlace?.order_id,
        type: effectiveType,
        platform: ScanPlatFormId,
        ...(activeDeliveryLabel != null &&
          effectiveType === 'pickup_dropoff' && {
          delivered_lable_id: activeDeliveryLabel?.id,
        }),
      };

      const canSendDeliveryDamage = shouldSendDamageForDeliveryLabel(
        activeDeliveryLabel,
        itemsData,
      );
      if (isDeliveryMultiDamage && canSendDeliveryDamage) {
        payload.is_damage = buildIsDamagePayload(parcelDamageSelections);
      } else if (
        canSendDeliveryDamage &&
        effectiveType === 'pickup_dropoff' &&
        selectDamageData
      ) {
        payload.is_damage = selectDamageData?.id;
      }

      console.log('[DirectFlow] status_update payload delivery label', {
        delivered_lable_id: payload.delivered_lable_id ?? null,
        signature_required: activeDeliveryLabel?.signature_required,
        signature_rejected: activeDeliveryLabel?.signature_rejected,
        sessionId: activeDeliveryLabel?.id ?? null,
        is_damage: payload.is_damage,
      });

      await attachScanFreshCoordsToPayload(payload);

      const res = await ApiService(apiConstants.status_update, {
        customData: payload,
      });

      if (!res?.status) {
        setToast({
          top: 45,
          text: t(res?.message) || t('Failed to update status'),
          type: 'error',
          visible: true,
        });
        return;
      }

      // Capture before any clear — global pin + list enrichment (Scanner-aligned).
      let savedDeliveryLabel =
        EffectiveDeliveryLabel ??
        PinnedDeliveryLabel ??
        activeDeliveryLabel;
      if (savedDeliveryLabel?.id != null && AllDeliveyLabel?.length) {
        const fromList = AllDeliveyLabel.find(
          (item: any) => Number(item?.id) === Number(savedDeliveryLabel.id),
        );
        if (fromList) {
          savedDeliveryLabel = {
            ...fromList,
            ...savedDeliveryLabel,
            signature_required:
              savedDeliveryLabel?.signature_required ??
              fromList?.signature_required,
            signature_rejected:
              savedDeliveryLabel?.signature_rejected ??
              fromList?.signature_rejected,
          };
        }
      }

      const statusForSignature = Number(
        res?.tms_current_status ??
        res?.data?.tms_current_status ??
        res?.data?.data?.tms_current_status,
      );
      const labelNeedsSignature =
        savedDeliveryLabel != null
          ? doesLabelRequireSignature(savedDeliveryLabel)
          : signatureRequiredRef.current === true;
      const isSignatureAllowed = isSignatureAllowedAfterStatusUpdate(
        res,
        savedDeliveryLabel ??
          (signatureRequiredRef.current
            ? { signature_required: 1, signature_rejected: 0 }
            : null),
      );

      console.log('[DirectFlow] commentFun signature check', {
        savedDeliveryLabel: {
          id: savedDeliveryLabel?.id ?? null,
          signature_required: savedDeliveryLabel?.signature_required,
          signature_rejected: savedDeliveryLabel?.signature_rejected,
        },
        signatureRequiredRef: signatureRequiredRef.current,
        tms_current_status: statusForSignature,
      });

      const savedDamageId = canSendDeliveryDamage
        ? selectDamageData?.id
        : undefined;
      const damagePayload =
        canSendDeliveryDamage &&
        isDeliveryOrder(itemsData) &&
        productDamageList?.length > 0 &&
        Object.keys(parcelDamageSelections).length > 0
          ? buildIsDamagePayload(parcelDamageSelections)
          : null;

      if (damagePayload?.length) {
        setProductDamageList((prev) => {
          if (!prev?.length) return prev;
          return prev.map((el: any) => {
            const match = damagePayload.find(
              (row) => Number(row.item_id) === Number(el?.id),
            );
            if (!match) return el;
            return {
              ...el,
              is_damaged_delivery: match.damage_id,
              scan_qty: 1,
            };
          });
        });
        setParcelDamageSelections({});
      } else if (savedDamageId != null && selectPlace?.item_id != null) {
        setProductDamageList((prev) => {
          if (!prev?.length) return prev;

          const itemId = Number(selectPlace.item_id);
          const orderItems =
            itemsData?.items ??
            itemsData?.order_data?.items ??
            conformationModal?.ProductItem ??
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
              '',
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

      if (!hadCommentText && allSelectImage?.length > 0) {
        queueProofImagesOnly();
        setAllSelectImage([]);
        setPickUpDataSave([]);
        setDeliveyDataSave([]);
        setDescription('');
        setCommentError('');
      } else if (!hadCommentText && commentOptionalNow) {
        setAllSelectImage([]);
        setPickUpDataSave([]);
        setDeliveyDataSave([]);
        setDescription('');
        setCommentError('');
      }

      setComment(false);

      const parcelsStillRemaining = hasRemainingParcelsToDeliver(
        itemsData,
        res,
        [],
        selectPlace?.item_id,
      );

      console.log('[DirectFlow] commentFun button decision', {
        parcelsStillRemaining,
        isSignatureAllowed,
        willShow: isSignatureAllowed ? 'Signature' : 'Go to List Page',
        check: {
          statusForSignature,
          signature_required_eq_1: savedDeliveryLabel?.signature_required == 1,
          signature_rejected_eq_1: savedDeliveryLabel?.signature_rejected == 1,
          signatureRequiredRef: signatureRequiredRef.current,
        },
      });

      deliveryLabelModalPendingRef.current = false;
      setEvetyTimeShowDeliveryLabelList(false);
      setConformationModal((prev: any) => ({ ...prev, visible: false }));

      // Yes/No → No: skip remaining-parcel UI. Signature only if this label requires it.
      if (deliveryMoreParcelsNoPathRef.current) {
        deliveryMoreParcelsNoPathRef.current = false;
        if (labelNeedsSignature) {
          softClearDeliveryLabelUi();
          await onSuccess?.();
          setSecondModal((prev: any) => ({ ...prev, visible: false }));
          openSignatureFlow(savedDeliveryLabel);
          return;
        }
      }

      // Keep pin while signature is still needed; full wipe otherwise.
      if (isSignatureAllowed) {
        softClearDeliveryLabelUi();
      } else {
        clearDeliveryLabelSelection();
      }

      await onSuccess?.();

      if (effectiveType !== 'outbound_scan') {
        if (!parcelsStillRemaining) {
          const buttons: any[] = [];

          if (isSignatureAllowed) {
            buttons.push({
              text: t('Signature'),
              type: 'primary',
              onPress: () => {
                setSecondModal((prev: any) => ({ ...prev, visible: false }));
                openSignatureFlow(savedDeliveryLabel);
              },
            });
          } else {
            buttons.push({
              text: t('Go to List Page'),
              type: 'primary',
              onPress: handleGoToListPage,
            });
          }

          setSecondModal({
            visible: true,
            title: t('All Parcels Scanned Successfully!'),
            message: t(res?.remaining_item_message) || '',
            buttons,
            color:
              effectiveType === 'outbound_scan' ? Colors.primary : Colors.green,
          });
        } else {
          clearDeliveryLabelSelection();
          setSecondModal({
            visible: true,
            title: t('There are Parcels Remaining'),
            message: t(res?.remaining_item_message),
            buttons: [
              {
                text: t('No Parcel'),
                type: 'secondary',
                onPress: () => {
                  setSecondModal((prev: any) => ({ ...prev, visible: false }));
                  navigation.navigate('Details', {
                    type: 'scanner_noparcel',
                    item: itemsData,
                  });
                },
              },
              {
                text:
                  source === 'filter' || isManualDirectVerify
                    ? t('Next')
                    : t('Open Scanner'),
                type: 'primary',
                onPress: () => {
                  setSecondModal((prev: any) => ({ ...prev, visible: false }));
                  setSelectPlace(null);
                  setDescription('');
                  setCommentError('');
                },
              },
            ],
            color: Colors.yellow,
          });
        }
      } else if (isSignatureAllowed) {
        setSecondModal({
          visible: true,
          title: t('Confirm Delivery'),
          message: t(
            'Delivery completed. Please provide your signature to confirm successful handover.',
          ),
          buttons: [
            {
              text: t('Signature'),
              type: 'primary',
              onPress: () => {
                setSecondModal((prev: any) => ({ ...prev, visible: false }));
                openSignatureFlow(savedDeliveryLabel);
              },
            },
          ],
          color: Colors.green,
        });
      } else {
        clearDeliveryLabelSelection();
      }
    } catch (error) {
      setToast({
        top: 45,
        text: ErrorHandle(error).message,
        type: 'error',
        visible: true,
      });
    } finally {
      setCommentLoader(false);
    }
  }, [
    SelectCurrentDeliveryLabel,
    EffectiveDeliveryLabel,
    PinnedDeliveryLabel,
    selectDamageData,
    description,
    selectPlace,
    UserData,
    slideType,
    GloblyTypeSlide,
    AllDeliveyLabel,
    resolveDeliveryLabel,
    parcelVerifySession.deliveryLabel,
    parcelVerifySession.damageData,
    setSessionDeliveryLabel,
    itemsData,
    productDamageList,
    parcelDamageSelections,
    conformationModal?.ProductItem,
    allSelectImage,
    clearDeliveryLabelSelection,
    softClearDeliveryLabelUi,
    onSuccess,
    addImageOrCommentFun,
    queueProofImagesOnly,
    handleGoToListPage,
    navigation,
    source,
    isManualDirectVerify,
    t,
    setToast,
    ErrorHandle,
    setDeliveyDataSave,
    setPickUpDataSave,
    openSignatureFlow,
  ]);

  const handleSignatureCameraPress = useCallback(() => {
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
      Data: responseOrderData ?? itemsData,
      selectReason: resolveDeliveryLabel(),
      setData,
      type: true,
    });
    navigation.navigate('Camera');
  }, [
    resolveDeliveryLabel,
    navigation,
    reopenSignatureAfterCamera,
    responseOrderData,
    itemsData,
    setDeliveyDataSave,
  ]);

  const handleSelectDamage = useCallback(
    (item: any) => {
      setselectDamageData(item);
      setSessionDamageData(item);
      setCommentError('');
    },
    [setselectDamageData, setSessionDamageData],
  );

  // After Camera → Filter focus wipe, restore label from global pin.
  useEffect(() => {
    if (!isFocused) return;
    if (!comment && !showSig) return;
    const snap =
      EffectiveDeliveryLabel ??
      PinnedDeliveryLabel ??
      getActiveVerifyDeliveryLabel() ??
      deliveryLabelSnapshotRef.current ??
      lockedDeliveryLabel ??
      pendingDeliveryLabelRef.current ??
      getRememberedDeliveryLabel();
    // Do NOT fall back to id-only stub here — that wipes signature_required.
    if (snap == null) return;
    if (
      snap?.signature_required == null &&
      signatureRequiredRef.current &&
      snap?.id != null
    ) {
      snap.signature_required = 1;
    }
    setSelectCurrentDeliveryLabel(snap);
    setSessionDeliveryLabel(snap);
    setLockedDeliveryLabel(snap);
    deliveryLabelSnapshotRef.current = snap;
    setActiveVerifyDeliveryLabel(snap);
  }, [
    isFocused,
    comment,
    showSig,
    lockedDeliveryLabel,
    EffectiveDeliveryLabel,
    PinnedDeliveryLabel,
    setSelectCurrentDeliveryLabel,
    setSessionDeliveryLabel,
  ]);

  // Only the focused screen may register camera callbacks (Scanner pattern).
  // While Camera is open, lock prevents Filter/Details from stealing DeliveyDataSave.
  useEffect(() => {
    if (!isFocused || isParcelCameraCallbackLocked()) {
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
          getActiveVerifyDeliveryLabel() ??
          deliveryLabelSnapshotRef.current ??
          lockedDeliveryLabel ??
          pendingDeliveryLabelRef.current ??
          getRememberedDeliveryLabel() ??
          parcelVerifySession.deliveryLabel;
        if (label != null) {
          persistDeliveryLabel(label);
        }
        const damage = selectDamageDataRef.current ?? selectDamageData;
        if (shouldSkipCommentAfterCamera(label, damage)) {
          setComment(false);
        } else {
          setComment(true);
        }
        setShowSig(false);
      } else {
        reopenSignatureAfterCamera(data);
      }
    };
    // Do not overwrite latest camera callback while Camera is open (lock).
    if (!isParcelCameraCallbackLocked()) {
      setLatestDeliveryCameraSetData(deliverySetData);
      setDeliveyDataSave({
        setData: deliverySetData,
        type: deliveryTypeRef.current,
      });
    }

    return () => {
      if (signatureReopenTimerRef.current) {
        clearTimeout(signatureReopenTimerRef.current);
      }
    };
  }, [
    isFocused,
    selectDamageData?.id,
    parcelVerifySession.deliveryLabel?.id,
    lockedDeliveryLabel?.id,
    reopenSignatureAfterCamera,
    setDeliveyDataSave,
    setPickUpDataSave,
  ]);

  return {
    isLoading,
    itemsData,
    responseOrderData,
    productDamageList,
    showDeliveryLabelList,
    conformationModal,
    evetyTimeShowDeliveryLabelList,
    pickupPlannedSheetOpen,
    alertModalOpen,
    comment,
    description,
    commentError,
    commentLoader,
    showSig,
    signatureLoader,
    secondModal,
    allDeliveyLabel: AllDeliveyLabel,
    allDamageListReason: AllDamageListReason,
    effectiveDeliveryLabel,
    selectDamageData,
    isCommentOptional,
    userData: UserData,
    parcelDamageSelections,
    setParcelDamageSelections,
    startVerify,
    closeConformationModal,
    handlePickupWithPhoto,
    handlePickupNextScan,
    closePickupPlannedSheet,
    closeDeliveryLabelModal,
    handleSelectDeliveryLabel,
    openCameraProofAfterLabelSelect,
    setDescription,
    setComment,
    setAlerModalOpen,
    commentFun,
    customerSignatureFun,
    handleSignatureCameraPress,
    handleSelectDamage,
    setselectDamageData,
    setSecondModal,
    setShowSig,
    setEvetyTimeShowDeliveryLabelList,
  };
}
