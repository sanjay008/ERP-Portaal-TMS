import apiConstants from '@/src/api/apiConstants';
import { Images } from '@/src/assets/images';
import { useErrorHandle } from '@/src/components/ErrorHandle';
import { GlobalContextData } from '@/src/context/GlobalContext';
import { DropboxContext } from '@/src/context/UploadProider';
import ApiService from '@/src/utils/Apiservice';
import { Colors } from '@/src/utils/colors';
import { appendToLocalUploadQueue } from '@/src/utils/localUploadQueue';
import { isDeliveryOrder } from '@/src/utils/orderStatus';
import {
  isDescriptionOptional,
  isSignatureRequiredAfterStatusUpdate,
  shouldSkipCommentAfterCamera,
} from '@/src/utils/parcelCommentRules';
import { hasRemainingParcelsToDeliver } from '@/src/utils/pickupPlanned';
import {
  type ParcelVerifyScanPayload,
  runParcelVerifyFlow,
} from '@/src/utils/runParcelVerifyFlow';
import { isBlankSignatureData } from '@/src/utils/signatureValidation';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
  const { ErrorHandle } = useErrorHandle();
  const { setLocalImagesUploadbeforeData } = useContext(DropboxContext);
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
    setOrderDeliveryMapingLableOption,
    setDeliveyDataSave,
    setPickUpDataSave,
    CommentId,
    setCommentId,
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
    onPress: () => {},
  });
  const [allSelectImage, setAllSelectImage] = useState<any[]>([]);
  const [comment, setComment] = useState(false);
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

  const deliveryLabelModalPendingRef = useRef(false);
  const pickupPlannedModalPendingRef = useRef(false);
  const pendingPickupScanRef = useRef<ParcelVerifyScanPayload | null>(null);
  const pendingDeliveryLabelRef = useRef<any>(null);
  const selectCurrentDeliveryLabelRef = useRef<any>(null);
  const selectDamageDataRef = useRef<any>(null);
  const deliveryTypeRef = useRef(false);
  const signatureReopenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    selectCurrentDeliveryLabelRef.current = SelectCurrentDeliveryLabel;
  }, [SelectCurrentDeliveryLabel]);

  useEffect(() => {
    selectDamageDataRef.current = selectDamageData;
  }, [selectDamageData]);

  const isCommentOptional = useMemo(
    () =>
      isDescriptionOptional(
        SelectCurrentDeliveryLabel ??
          selectCurrentDeliveryLabelRef.current ??
          pendingDeliveryLabelRef.current,
        selectDamageData ?? selectDamageDataRef.current,
        itemsData,
      ),
    [SelectCurrentDeliveryLabel, selectDamageData, itemsData],
  );

  const effectiveDeliveryLabel = useMemo(
    () =>
      SelectCurrentDeliveryLabel ??
      selectCurrentDeliveryLabelRef.current ??
      pendingDeliveryLabelRef.current,
    [SelectCurrentDeliveryLabel],
  );

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

  const handleGoToListPage = useCallback(() => {
    setSecondModal((prev: any) => ({ ...prev, visible: false }));
    if (onGoToListPage) {
      onGoToListPage();
    } else {
      onSuccess?.();
    }
  }, [onGoToListPage, onSuccess]);

  const getSessionDeliveryLabel = useCallback(
    () =>
      pendingDeliveryLabelRef.current ?? selectCurrentDeliveryLabelRef.current,
    [],
  );

  const clearDeliveryLabelSelection = useCallback(() => {
    pendingDeliveryLabelRef.current = null;
    selectCurrentDeliveryLabelRef.current = null;
    setSelectCurrentDeliveryLabel(null);
  }, [setSelectCurrentDeliveryLabel]);

  const closeConformationModal = useCallback(() => {
    setConformationModal((prev: any) => ({ ...prev, visible: false }));
    unlockScanner?.();
  }, [unlockScanner]);

  const statusUpdateFun = useCallback(
    async (
      data: ParcelVerifyScanPayload,
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
          type: slideType ?? GloblyTypeSlide,
          ...(SelectCurrentDeliveryLabel != null &&
            GloblyTypeSlide === 'pickup_dropoff' && {
              delivered_lable_id: SelectCurrentDeliveryLabel?.id,
            }),
        };

        if (is_driver_unloading) {
          payload.is_driver_unloading = 1;
        }

        if (GloblyTypeSlide === 'pickup_dropoff' || GloblyTypeSlide === 'additional_address') {
          payload.is_damage = selectDamageData?.id;
        }

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

        clearDeliveryLabelSelection();
        deliveryLabelModalPendingRef.current = false;
        setEvetyTimeShowDeliveryLabelList(false);
        setConformationModal((prev: any) => ({ ...prev, visible: false }));
        await onSuccess?.();

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

  const flowDeps = useMemo(
    () => ({
      userData: UserData,
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
      unlockScanner,
    }),
    [
      UserData,
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
      unlockScanner,
    ],
  );

  const startVerify = useCallback(
    async (data: ParcelVerifyScanPayload) => {
      setIsLoading(true);
      try {
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
    navigation.navigate('Camera', { from: 'Pickup' });
  }, [navigation]);

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

  const handleSelectDeliveryLabel = useCallback(
    (labelItem: any) => {
      pendingDeliveryLabelRef.current = labelItem;
      selectCurrentDeliveryLabelRef.current = labelItem;
      setSelectCurrentDeliveryLabel(labelItem);
    },
    [setSelectCurrentDeliveryLabel],
  );

  const openCameraProofAfterLabelSelect = useCallback(() => {
    deliveryLabelModalPendingRef.current = false;
    setEvetyTimeShowDeliveryLabelList(false);
    const selectedLabel =
      pendingDeliveryLabelRef.current ??
      selectCurrentDeliveryLabelRef.current ??
      SelectCurrentDeliveryLabel;

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
        setDeliveyDataSave({
          Data: itemsData,
          selectReason: selectedLabel,
          setData: async (images: any[]) => {
            if (images?.length > 0) {
              setAllSelectImage(images);
              const label =
                selectCurrentDeliveryLabelRef.current ?? SelectCurrentDeliveryLabel;
              const damage = selectDamageDataRef.current ?? selectDamageData;
              if (shouldSkipCommentAfterCamera(label, damage)) {
                setComment(false);
              } else {
                setComment(true);
              }
              setShowSig(false);
            }
          },
          type: false,
        });
        navigation.navigate('Camera');
        setAlerModalOpen((prev: any) => ({ ...prev, visible: false }));
      },
    });
  }, [
    SelectCurrentDeliveryLabel,
    itemsData,
    navigation,
    selectDamageData?.id,
    setDeliveyDataSave,
    t,
  ]);

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
    async (data: any[] = []) => {
      const id = itemsData?.id || itemsData?.order_data?.id;

      setCommentLoader(true);
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
        const payload = {
          token: UserData?.user?.verify_token,
          role: UserData?.user?.role,
          relaties_id: UserData?.relaties?.id,
          user_id: UserData?.user?.id,
          name,
          signature,
          order_id: itemsData?.id,
          is_damage: selectDamageData?.id,
          damage_items: JSON.stringify(damageItems),
        };

        const res = await ApiService(apiConstants.store_customer_signature, {
          customData: payload,
        });

        if (res?.status) {
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
          setSecondModal((prev: any) => ({ ...prev, visible: false }));
          setToast({
            top: 45,
            text: res?.message,
            type: 'success',
            visible: true,
          });
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
      GloblyTypeSlide,
      t,
      setToast,
      ErrorHandle,
    ],
  );

  const commentFun = useCallback(async () => {
    const activeDeliveryLabel =
      SelectCurrentDeliveryLabel ??
      selectCurrentDeliveryLabelRef.current ??
      pendingDeliveryLabelRef.current;

    if (
      isDeliveryOrder(itemsData) &&
      activeDeliveryLabel &&
      activeDeliveryLabel?.damaged_required == 1 &&
      selectDamageData == null
    ) {
      setCommentError(t('Choose  Damaged'));
      return;
    }

    setCommentLoader(true);
    try {
      if (!isCommentOptional && !description.trim()) {
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

      const payload: any = {
        token: UserData?.user?.verify_token,
        role: UserData?.user?.role,
        relaties_id: UserData?.relaties?.id,
        user_id: UserData?.user?.id,
        item_id: selectPlace?.item_id,
        order_id: selectPlace?.order_id,
        type: GloblyTypeSlide,
        ...(SelectCurrentDeliveryLabel != null &&
          GloblyTypeSlide === 'pickup_dropoff' && {
            delivered_lable_id: SelectCurrentDeliveryLabel?.id,
          }),
      };

      if (GloblyTypeSlide === 'pickup_dropoff' && selectDamageData) {
        payload.is_damage = selectDamageData?.id;
      }

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

      const savedDeliveryLabel =
        SelectCurrentDeliveryLabel ??
        selectCurrentDeliveryLabelRef.current ??
        pendingDeliveryLabelRef.current;
      const savedDamageId = selectDamageData?.id;

      if (savedDamageId != null && selectPlace?.item_id != null) {
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
      if (description.trim()) {
        await addImageOrCommentFun();
      } else if (allSelectImage?.length > 0) {
        queueProofImagesOnly();
        setAllSelectImage([]);
        setPickUpDataSave([]);
        setDeliveyDataSave([]);
        setDescription('');
        setCommentError('');
      } else if (isCommentOptional) {
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
      const isSignatureAllowed = isSignatureRequiredAfterStatusUpdate(
        res,
        savedDeliveryLabel,
      );

      clearDeliveryLabelSelection();
      deliveryLabelModalPendingRef.current = false;
      setEvetyTimeShowDeliveryLabelList(false);
      setConformationModal((prev: any) => ({ ...prev, visible: false }));
      await onSuccess?.();

      if (GloblyTypeSlide !== 'outbound_scan') {
        if (!parcelsStillRemaining) {
          const buttons: any[] = [];

          if (isSignatureAllowed) {
            buttons.push({
              text: t('Signature'),
              type: 'primary',
              onPress: () => setShowSig(true),
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
              GloblyTypeSlide === 'outbound_scan' ? Colors.primary : Colors.green,
          });
        } else {
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
                text: t('Open Scanner'),
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
              onPress: () => setShowSig(true),
            },
          ],
          color: Colors.green,
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
      setCommentLoader(false);
    }
  }, [
    SelectCurrentDeliveryLabel,
    selectDamageData,
    isCommentOptional,
    description,
    selectPlace,
    UserData,
    GloblyTypeSlide,
    itemsData,
    conformationModal?.ProductItem,
    allSelectImage,
    clearDeliveryLabelSelection,
    onSuccess,
    addImageOrCommentFun,
    queueProofImagesOnly,
    handleGoToListPage,
    navigation,
    t,
    setToast,
    ErrorHandle,
    setDeliveyDataSave,
    setPickUpDataSave,
  ]);

  const handleSignatureCameraPress = useCallback(() => {
    deliveryTypeRef.current = true;
    setShowSig(false);
    setDeliveyDataSave({
      Data: responseOrderData,
      selectReason: SelectCurrentDeliveryLabel,
      setData: async (data: any[]) => {
        reopenSignatureAfterCamera(data);
      },
      type: true,
    });
    navigation.navigate('Camera');
  }, [
    SelectCurrentDeliveryLabel,
    navigation,
    reopenSignatureAfterCamera,
    responseOrderData,
    setDeliveyDataSave,
  ]);

  const handleSelectDamage = useCallback(
    (item: any) => {
      setselectDamageData(item);
      setCommentError('');
    },
    [setselectDamageData],
  );

  useEffect(() => {
    setPickUpDataSave({
      setData: async (images: any[]) => {
        if (images?.length > 0) {
          setAllSelectImage(images);
          setComment(true);
        }
      },
    });

    setDeliveyDataSave({
      setData: async (images: any[]) => {
        if (images?.length > 0) {
          setAllSelectImage(images);

          if (!deliveryTypeRef.current) {
            const label =
              selectCurrentDeliveryLabelRef.current ?? SelectCurrentDeliveryLabel;
            const damage = selectDamageDataRef.current ?? selectDamageData;
            if (shouldSkipCommentAfterCamera(label, damage)) {
              setComment(false);
            } else {
              setComment(true);
            }
            setShowSig(false);
          } else {
            reopenSignatureAfterCamera(images);
          }
        }
      },
      type: deliveryTypeRef.current,
    });

    return () => {
      setPickUpDataSave(null);
      if (signatureReopenTimerRef.current) {
        clearTimeout(signatureReopenTimerRef.current);
      }
    };
  }, [
    SelectCurrentDeliveryLabel?.id,
    selectDamageData?.id,
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
