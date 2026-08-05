import apiConstants from '@/src/api/apiConstants';
import { Images } from '@/src/assets/images';
import { ApiFormatDate } from '@/src/components/ApiFormatDate';
import { setLatestDeliveryCameraSetData } from '@/src/context/ParcelVerifySessionContext';
import ApiService from '@/src/utils/Apiservice';
import { Colors } from '@/src/utils/colors';
import { pingDriverLiveLocation } from '@/src/utils/driverLocationApi';
import { setLastScannedOrderId } from '@/src/utils/lastScannedOrderId';
import { syncNativeDriverTracking } from '@/src/utils/nativeDriverLocation';
import { isDeliveryOrder, isPickupOrder } from '@/src/utils/orderStatus';
import { shouldSkipCommentAfterCamera } from '@/src/utils/parcelCommentRules';
import {
  lockParcelCameraCallback,
  unlockParcelCameraCallback,
} from '@/src/utils/parcelVerifyCameraReturn';
import {
  getActiveVerifyDeliveryLabel,
  setActiveVerifyDeliveryLabel,
  setFallbackDeliveryLabelId,
} from '@/src/utils/parcelVerifyDeliveryLabelStore';
import {
  buildDeliveryDamageListEntry,
  DELIVERY_STATUS_ID,
  getMoreParcelsCountAfterScan,
  getOrderTmsStatusId,
  isDeliveryItemAlreadyScanned,
  itemNeedsDeliveryLabelSelection,
  mergeParcelIntoDamageList,
  shouldOpenPickupPlannedModal,
} from '@/src/utils/pickupPlanned';

export type ParcelVerifyScanPayload = {
  order_id: number | string;
  item_id: number | string;
  /** Tapped parcel from PickUpBox — used to seed delivery_label fallback. */
  item?: any;
};

export type DeliveryScanContinueContext = {
  data: ParcelVerifyScanPayload;
  orderData: any;
  verifyData: any;
  sessionLabel: any;
  moreCount: number;
};

export type ParcelVerifyFlowDeps = {
  userData: any;
  selectRegionData: any;
  slideType: string;
  routeSlideType?: string;
  selectCurrentDate: string;
  isScanRoute: boolean;
  isManualDirectVerify?: boolean;
  source: 'filter' | 'scanner';
  t: (key: string) => string;
  errorHandle: (error: unknown) => { message: string };
  navigation: any;
  globlyTypeSlide: string;
  allDeliveyLabel: any[];
  allDamageListReason: any[];
  selectCurrentDeliveryLabel: any;
  selectDamageData: any;
  setAllDeliveyLabel: (value: any[]) => void;
  setAllDamageListReason: (value: any[]) => void;
  setselectDamageData: (value: any) => void;
  setOrderDeliveryMapingLableOption: (value: any) => void;
  setItemsData: (value: any) => void;
  setShowDeliveryLabelList: (value: any) => void;
  setSelectPlace: (value: any) => void;
  setProductDamageList: (value: any[] | ((prev: any[]) => any[])) => void;
  setResponseOrderData: (value: any) => void;
  /** Direct-flow only: keep full verify payload for Yes/No moreCount (scanner omits). */
  onVerifyApiData?: (verifyData: any) => void;
  setConformationModal: (value: any) => void;
  setToast: (value: any) => void;
  setEvetyTimeShowDeliveryLabelList: (value: boolean) => void;
  setAlerModalOpen: (value: any) => void;
  setDeliveyDataSave: (value: any) => void;
  setAllSelectImage: (value: any[]) => void;
  setComment: (value: boolean) => void;
  setPickupPlannedSheetOpen: (value: any) => void;
  deliveryLabelModalPendingRef: { current: boolean };
  pickupPlannedModalPendingRef: { current: boolean };
  pendingPickupScanRef: { current: ParcelVerifyScanPayload | null };
  deliveryTypeRef: { current: boolean };
  statusUpdateFun: (
    data: ParcelVerifyScanPayload,
    scan?: boolean,
    is_driver_unloading?: boolean,
    options?: { keepDeliveryLabel?: boolean; skipDamage?: boolean },
  ) => Promise<void>;
  reversParcelFun: (
    order_id: number | string | null,
    item_id: number | string | null,
  ) => Promise<void>;
  getSessionDeliveryLabel: () => any;
  clearDeliveryLabelSelection?: () => void;
  unlockScanner?: () => void;
  /** Delivery-only: after verify + label, Yes/No more parcels or camera. */
  onDeliveryLabeledParcelReady?: (ctx: DeliveryScanContinueContext) => void;
};

export async function runParcelVerifyFlow(
  data: ParcelVerifyScanPayload,
  deps: ParcelVerifyFlowDeps,
): Promise<void> {
  const slideType = deps.routeSlideType ?? deps.slideType ?? deps.globlyTypeSlide;

  try {
    const payload = {
      token: deps.userData?.user?.verify_token,
      role: deps.userData?.user?.role,
      relaties_id: deps.userData?.relaties?.id,
      user_id: deps.userData?.user?.id,
      item_id: data?.item_id,
      order_id: data?.order_id,
      region_id:deps?.selectRegionData?.id,
      date:
        deps.globlyTypeSlide === 'outbound_scan'
          ? ApiFormatDate(new Date())
          : ApiFormatDate(deps.selectCurrentDate),
      type: slideType,
    };

    if (!payload.item_id || !payload.order_id) {
      deps.setToast({
        top: 45,
        text: deps.t('Invalid QR: Missing item or order ID'),
        type: 'error',
        visible: true,
      });
      return;
    }

    const res = await ApiService(apiConstants.Verify_status, {
      customData: payload,
    });

    if (!Boolean(res?.status)) {
      const orderData = res?.data?.order_data || null;
      const productItems =
        (Array.isArray(orderData?.items) && orderData.items.length > 0
          ? orderData.items
          : null) ||
        (Array.isArray(res?.data?.items) && res.data.items.length > 0
          ? res.data.items
          : null) ||
        [];
      deps.setConformationModal({
        visible: true,
        Icon: Images.InValidScanner,
        title: deps.t(res?.message) || deps.t('Invalid QR code. Please try again.'),
        LButtonText: deps.t('Cancel'),
        RColor: Colors.white,
        bgColor: Colors.red,
        personData: orderData || [],
        ProductItem: productItems,
        order_id: orderData?.id || data?.order_id,
        OrderData: res?.data,
      });
      deps.setToast({
        top: 45,
        text: deps.t(res?.message) || deps.t('Something went wrong'),
        type: 'error',
        visible: true,
      });
      return;
    }

    await setLastScannedOrderId(data?.order_id);
    void pingDriverLiveLocation(deps.userData);
    void syncNativeDriverTracking(deps.userData);

    if (Array.isArray(res?.data?.damaged_parcel) && res.data.damaged_parcel.length > 0) {
      deps.setAllDamageListReason(res.data.damaged_parcel);
    } else if (deps.allDamageListReason?.length === 0) {
      deps.setAllDamageListReason(res?.data?.damaged_parcel || []);
    }

    if (Array.isArray(res?.data?.delivery_label_title_map) && res.data.delivery_label_title_map.length > 0) {
      deps.setAllDeliveyLabel(res.data.delivery_label_title_map);
    } else if (deps.allDeliveyLabel?.length === 0) {
      deps.setAllDeliveyLabel(res?.data?.delivery_label_title_map || []);
    }

    deps.setselectDamageData(
      res?.data?.damaged_parcel?.find((el: any) => el?.id == 34) || null,
    );

    if (
      !deps.isManualDirectVerify &&
      !deps.isScanRoute &&
      !isPickupOrder(res?.data?.order_data) &&
      slideType === 'pickup_dropoff'
    ) {
      deps.setConformationModal({
        visible: true,
        title: deps.t(
          'This parcel cannot be scanned. Only pickup parcels are allowed for scanning.',
        ),
        Icon: Images.OrderIconFull,
        LButtonText: deps.t('Cancel'),
        RButtonText: '',
        RButtonStyle: Colors.primary,
        RColor: Colors.white,
        personData: res?.data?.order_data || [],
        ProductItem: res?.data?.order_data?.items || [],
        order_id: data?.order_id,
        type: res?.data?.order_data?.tmsstatus?.id == 2 ? 2 : 1,
        delivery_btn: 0,
        OrderData: res?.data,
      });
      return;
    }

    deps.setOrderDeliveryMapingLableOption(res?.data?.order_label_mapping || []);
    deps.setItemsData(res?.data?.order_data);
    deps.setResponseOrderData(res?.data?.order_data);
    deps.onVerifyApiData?.(res?.data);
    deps.setShowDeliveryLabelList(res?.data?.delivery_btn || 0);
    deps.setSelectPlace({
      item_id: data?.item_id,
      order_id: data?.order_id,
    });

    // Seed delivery_label fallback from verify response / tapped item.
    const orderItems = res?.data?.order_data?.items ?? [];
    const matchedItem =
      orderItems.find(
        (el: any) => Number(el?.id) === Number(data?.item_id),
      ) ?? data?.item;
    const seedLabelId = matchedItem?.delivery_label;
    if (seedLabelId != null && seedLabelId !== '') {
      setFallbackDeliveryLabelId(seedLabelId);
    }
    // If user already pinned a label this session, keep it hot.
    const pinned = getActiveVerifyDeliveryLabel();
    if (pinned != null) {
      setActiveVerifyDeliveryLabel(pinned);
    }

    const isStatus4 =
      isDeliveryOrder(res?.data?.order_data) ||
      getOrderTmsStatusId(res?.data?.order_data) === DELIVERY_STATUS_ID;

    // Delivery: accumulate every scanned parcel for per-parcel damage on comment.
    // Pickup: keep prior last-parcel-only seed.
    if (isStatus4) {
      const entry = buildDeliveryDamageListEntry(
        res?.data?.order_data,
        data?.item_id,
        res?.data?.item_data_list,
      );
      deps.setProductDamageList((prev: any[]) =>
        mergeParcelIntoDamageList(prev, entry),
      );
    } else if (Number(res?.data?.total_remaining_item_to_scan) <= 1) {
      deps.setProductDamageList(res?.data?.item_data_list || []);
    }
    const questionText = res?.data?.quetion ?? res?.data?.question ?? '';
    const modalConfig: any = {
      visible: true,
      title: questionText ? deps.t(questionText) : deps.t('Order Delivery Info'),
      Icon: Images.OrderIconFull,
      LButtonText:
        res?.data?.delivery_btn == 1 ? deps.t('No delivery') : deps.t('Cancel'),
      RButtonText: deps.t(res?.data?.btn_lable),
      RButtonStyle: Colors.primary,
      RColor: Colors.black,
      personData: res?.data?.order_data || [],
      ProductItem: res?.data?.order_data?.items || [],
      order_id: data?.order_id,
      type: res?.data?.order_data?.tmsstatus?.id == 2 ? 2 : 1,
      delivery_btn: res?.data?.delivery_btn,
      OrderData: res?.data,
      stopData: res?.data?.order_data?.stop_data?.sort_order || null,
    };

    if (res?.data?.isscaned || Number(res?.data?.is_scan) === 1) {
      modalConfig.NewScanText =
        deps.source === 'scanner' ? deps.t('New scan') : undefined;
      modalConfig.onPress = async () => {
        await deps.statusUpdateFun(data, true);
      };
    }

    if (
      slideType === 'driver_loading' &&
      res?.data?.order_data?.items[0]?.tmsstatus?.id === 11
    ) {
      // modalConfig.UnloadingText = deps.t('Unloading');
      // modalConfig.onUnloadingPress = async () => {
      //   await deps.reversParcelFun(data?.order_id, data?.item_id);
      // };
      modalConfig.NewScanText =
        deps.source === 'scanner' ? deps.t('New scan') : undefined;
    }

    const sessionDeliveryLabel = deps.isManualDirectVerify
      ? null
      : deps.getSessionDeliveryLabel();

    // Yes/No + labeled continue — delivery (status 4) only.
    // Do not use sessionDeliveryLabel alone (that hijacked pickup → planned sheet skipped).
    if (
      isStatus4 &&
      (slideType === 'pickup_dropoff' || slideType === 'additional_address')
    ) {
      const itemAlreadyScanned = isDeliveryItemAlreadyScanned(res?.data, data);

      if (itemAlreadyScanned || Boolean(res?.data?.error_key)) {
        deps.setResponseOrderData(res?.data?.order_data);
        deps.setConformationModal(modalConfig);
        return;
      }

      const resolvedLabel = sessionDeliveryLabel;

      if (resolvedLabel == null) {
        // Soft clear only — do not wipe pinned/remembered label mid Direct Flow.
        deps.clearDeliveryLabelSelection?.();
        deps.deliveryLabelModalPendingRef.current = true;
        deps.setEvetyTimeShowDeliveryLabelList(true);
        return;
      }

      const moreCount = getMoreParcelsCountAfterScan(
        res?.data?.order_data,
        res?.data,
        data?.item_id,
      );

      console.log('[DeliveryContinue]', {
        moreCount,
        apiRemaining:
          res?.data?.total_remaining_item_to_scan ??
          res?.data?.remaining_item_to_scan ??
          res?.data?.remaining_item ??
          null,
        itemId: data?.item_id,
        orderId: data?.order_id,
        labelId: resolvedLabel?.id ?? null,
        isStatus4,
      });

      if (deps.onDeliveryLabeledParcelReady) {
        deps.onDeliveryLabeledParcelReady({
          data,
          orderData: res?.data?.order_data,
          verifyData: res?.data,
          sessionLabel: resolvedLabel,
          moreCount,
        });
        return;
      }

      // Fallback: legacy camera proof if host did not wire continue choice.
      deps.setAlerModalOpen({
        visible: true,
        title: deps.t('Camera'),
        Description: deps.t('You have to take a picture for proof?'),
        LButtonText: deps.t('Cancel'),
        RButtonText: deps.t('Camera'),
        Icon: Images.UploadPhoto,
        RButtonStyle: Colors.primary,
        RColor: Colors.white,
        LButtonStyle: Colors.gray,
        LColor: Colors.black,
        onPress: () => {
          deps.deliveryTypeRef.current = false;
          lockParcelCameraCallback();
          const setData = async (images: any[]) => {
            try {
              if (images?.length > 0) {
                deps.setAllSelectImage(images);
                if (
                  shouldSkipCommentAfterCamera(
                    resolvedLabel,
                    deps.selectDamageData,
                  )
                ) {
                  deps.setComment(false);
                } else {
                  deps.setComment(true);
                }
              }
            } finally {
              unlockParcelCameraCallback();
            }
          };
          setLatestDeliveryCameraSetData(setData);
          deps.setDeliveyDataSave({
            Data: res?.data?.order_data,
            selectReason: resolvedLabel,
            setData,
            type: false,
          });
          deps.navigation.navigate('Camera');
          deps.setAlerModalOpen((prev: any) => ({ ...prev, visible: false }));
        },
      });
      return;
    }

    const isPickupPlannedFlow = shouldOpenPickupPlannedModal(
      res?.data,
      data,
      slideType,
      deps.globlyTypeSlide,
    );

    if (isPickupPlannedFlow) {
      deps.pickupPlannedModalPendingRef.current = true;
      deps.pendingPickupScanRef.current = data;
      deps.setPickupPlannedSheetOpen({
        visible: true,
        orderData: res?.data?.order_data,
        scanPayload: data,
      });
      return;
    }

    const sessionLabelForCamera = deps.isManualDirectVerify
      ? null
      : deps.getSessionDeliveryLabel();
    const isDeliveryPendingItem =
      isStatus4 &&
      slideType === 'pickup_dropoff' &&
      itemNeedsDeliveryLabelSelection(res?.data, data);

    let scanOverlayShown = false;

    if (sessionLabelForCamera == null || Boolean(res?.data?.error_key)) {
      if (!isDeliveryPendingItem) {
        deps.setResponseOrderData(res?.data?.order_data);
        deps.setConformationModal(modalConfig);
        scanOverlayShown = true;
      }
    } else if (!isDeliveryPendingItem && !isStatus4) {
      deps.setAlerModalOpen({
        visible: true,
        title: deps.t('Camera'),
        Description: deps.t('You have to take a picture for proof?'),
        LButtonText: deps.t('Cancel'),
        RButtonText: deps.t('Camera'),
        Icon: Images.UploadPhoto,
        RButtonStyle: Colors.primary,
        RColor: Colors.white,
        LButtonStyle: Colors.gray,
        LColor: Colors.black,
        onPress: () => {
          deps.deliveryTypeRef.current = false;
          lockParcelCameraCallback();
          const setData = async (images: any[]) => {
            try {
              if (images?.length > 0) {
                deps.setAllSelectImage(images);
                if (
                  shouldSkipCommentAfterCamera(
                    sessionLabelForCamera,
                    deps.selectDamageData,
                  )
                ) {
                  deps.setComment(false);
                } else {
                  deps.setComment(true);
                }
              }
            } finally {
              unlockParcelCameraCallback();
            }
          };
          setLatestDeliveryCameraSetData(setData);
          deps.setDeliveyDataSave({
            Data: res?.data?.order_data,
            selectReason: sessionLabelForCamera,
            setData,
            type: false,
          });
          deps.navigation.navigate('Camera');
          deps.setAlerModalOpen((prev: any) => ({ ...prev, visible: false }));
        },
      });
      scanOverlayShown = true;
    }

    if (!scanOverlayShown) {
      deps.setResponseOrderData(res?.data?.order_data);
      deps.setConformationModal(modalConfig);
    }
  } catch (error) {
    deps.unlockScanner?.();
    deps.setToast({
      top: 45,
      text: deps.errorHandle(error).message,
      type: 'error',
      visible: true,
    });
  }
}
