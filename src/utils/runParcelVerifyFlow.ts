import apiConstants from '@/src/api/apiConstants';
import { Images } from '@/src/assets/images';
import { ApiFormatDate } from '@/src/components/ApiFormatDate';
import { setLatestDeliveryCameraSetData } from '@/src/context/ParcelVerifySessionContext';
import ApiService from '@/src/utils/Apiservice';
import { Colors } from '@/src/utils/colors';
import { isDeliveryOrder, isPickupOrder } from '@/src/utils/orderStatus';
import { shouldSkipCommentAfterCamera } from '@/src/utils/parcelCommentRules';
import {
  lockParcelCameraCallback,
  unlockParcelCameraCallback,
} from '@/src/utils/parcelVerifyCameraReturn';
import {
  isDeliveryItemAlreadyScanned,
  itemNeedsDeliveryLabelSelection,
  shouldOpenPickupPlannedModal,
} from '@/src/utils/pickupPlanned';

export type ParcelVerifyScanPayload = {
  order_id: number | string;
  item_id: number | string;
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
  setProductDamageList: (value: any[]) => void;
  setResponseOrderData: (value: any) => void;
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
  ) => Promise<void>;
  reversParcelFun: (
    order_id: number | string | null,
    item_id: number | string | null,
  ) => Promise<void>;
  getSessionDeliveryLabel: () => any;
  clearDeliveryLabelSelection?: () => void;
  unlockScanner?: () => void;
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
      deps.setConformationModal({
        visible: true,
        Icon: Images.InValidScanner,
        title: deps.t(res?.message) || deps.t('Invalid QR code. Please try again.'),
        LButtonText: deps.t('Cancel'),
        RColor: Colors.white,
        bgColor: Colors.red,
        personData: res?.data?.order_data || [],
        ProductItem: res?.data?.order_data?.items || [],
        order_id: data?.order_id,
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
    deps.setShowDeliveryLabelList(res?.data?.delivery_btn || 0);
    deps.setSelectPlace({
      item_id: data?.item_id,
      order_id: data?.order_id,
    });

    if (Number(res?.data?.total_remaining_item_to_scan) <= 1) {
      deps.setProductDamageList(res?.data?.item_data_list || []);
    }

    const isStatus4 = isDeliveryOrder(res?.data?.order_data);
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

    if (isStatus4 && slideType === 'pickup_dropoff') {
      const itemAlreadyScanned = isDeliveryItemAlreadyScanned(res?.data, data);

      if (itemAlreadyScanned || Boolean(res?.data?.error_key)) {
        deps.setResponseOrderData(res?.data?.order_data);
        deps.setConformationModal(modalConfig);
        return;
      }

      const sessionDeliveryLabel = deps.isManualDirectVerify
        ? null
        : deps.getSessionDeliveryLabel();
      const needsLabel = itemNeedsDeliveryLabelSelection(res?.data, data);

      if (needsLabel) {
        if (sessionDeliveryLabel == null) {
          // Fresh parcel: context must be empty so next select replaces cleanly.
          deps.clearDeliveryLabelSelection?.();
          deps.deliveryLabelModalPendingRef.current = true;
          deps.setEvetyTimeShowDeliveryLabelList(true);
          return;
        }

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
                      sessionDeliveryLabel,
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
              selectReason: sessionDeliveryLabel,
              setData,
              type: false,
            });
            deps.navigation.navigate('Camera');
            deps.setAlerModalOpen((prev: any) => ({ ...prev, visible: false }));
          },
        });
        return;
      }
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
    } else if (!isDeliveryPendingItem) {
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
