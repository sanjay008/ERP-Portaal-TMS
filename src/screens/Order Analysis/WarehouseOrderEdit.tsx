import apiConstants from '@/src/api/apiConstants';
import { ApiFormatDate } from '@/src/components/ApiFormatDate';
import CalenderDate from '@/src/components/CalenderDate';
import DetailsHeader from '@/src/components/DetailsHeader';
import DropDownBox from '@/src/components/DropDownBox';
import { useErrorHandle } from '@/src/components/ErrorHandle';
import Loader from '@/src/components/loading';
import PickUpBox from '@/src/components/PickUpBox';
import StatusSelectSheet from '@/src/components/StatusSelectSheet';
import { GlobalContextData } from '@/src/context/GlobalContext';
import ApiService from '@/src/utils/Apiservice';
import { Colors } from '@/src/utils/colors';
import { FONTS } from '@/src/utils/storeData';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const WAREHOUSE_TYPE = 'warehouse_change';

const findRegion = (list: any[], region: any) => {
  if (!region?.id) return null;
  if (!list?.length) return region;

  return (
    list.find((item) => Number(item?.id) === Number(region.id)) || region
  );
};

const buildRegionFromOrder = (
  regionData: any,
  regionId: any,
  fallbackName = '',
) => {
  if (regionData?.id) {
    return {
      ...regionData,
      id: Number(regionData.id),
      name: regionData?.name || fallbackName,
    };
  }

  if (regionId == null || regionId === '') return null;

  return {
    id: Number(regionId),
    name: fallbackName,
  };
};

const getOrderPickupRegion = (order: any) =>
  buildRegionFromOrder(
    order?.pickup_region_data || order?.region_data,
    order?.pickup_region_id,
    order?.pickup_region_data?.name || order?.region_data?.name || '',
  );

const getOrderDeliveryRegion = (order: any) =>
  buildRegionFromOrder(
    order?.delivery_region_data || order?.deliver_region_data,
    order?.deliver_region_id || order?.delivery_region_id,
    order?.delivery_region_data?.name ||
      order?.deliver_region_data?.name ||
      '',
  );

const mergeRegionLists = (...lists: any[][]) => {
  const map = new Map<number, any>();

  lists.flat().forEach((region) => {
    if (region?.id != null) {
      map.set(Number(region.id), region);
    }
  });

  return Array.from(map.values());
};

const mergeOrderRegionsIntoList = (list: any[], order: any) =>
  mergeRegionLists(
    list,
    [getOrderPickupRegion(order)].filter(Boolean),
    [getOrderDeliveryRegion(order)].filter(Boolean),
  );

const resolveRoutesForOrder = (regions: any[], order: any) => {
  const pickupRegion = getOrderPickupRegion(order);
  const deliveryRegion = getOrderDeliveryRegion(order);

  return {
    pickupRoute: findRegion(regions, pickupRegion),
    deliveryRoute: findRegion(regions, deliveryRegion),
  };
};

const getOriginalFormValues = (order: any) => ({
  pickup_date: ApiFormatDate(order?.pickup_date) || '',
  deliver_date: ApiFormatDate(order?.deliver_date) || '',
  pickup_region_id: Number(order?.pickup_region_id) || null,
  deliver_region_id:
    Number(order?.deliver_region_id ?? order?.delivery_region_id) || null,
  status: Number(order?.tmsstatus?.id ?? order?.status) || null,
});

const buildChangedUpdatePayload = (
  original: ReturnType<typeof getOriginalFormValues>,
  current: {
    pickup_date: string;
    deliver_date: string;
    pickup_region_id: number | null;
    deliver_region_id: number | null;
    status: number | null;
  },
) => {
  const changes: Record<string, string | number> = {};

  if (current.pickup_date && current.pickup_date !== original.pickup_date) {
    changes.pickup_date = current.pickup_date;
  }
  if (current.deliver_date && current.deliver_date !== original.deliver_date) {
    changes.deliver_date = current.deliver_date;
  }
  if (
    current.pickup_region_id != null &&
    current.pickup_region_id !== original.pickup_region_id
  ) {
    changes.pickup_region_id = current.pickup_region_id;
  }
  if (
    current.deliver_region_id != null &&
    current.deliver_region_id !== original.deliver_region_id
  ) {
    changes.deliver_region_id = current.deliver_region_id;
  }
  if (current.status != null && current.status !== original.status) {
    changes.status = current.status;
  }

  return changes;
};

export default function WarehouseOrderEdit({ navigation, route }: any) {
  const { t } = useTranslation();
  const { ErrorHandle } = useErrorHandle();
  const {
    order_id,
    type = WAREHOUSE_TYPE,
    orderData: initialOrderData,
  } = route?.params || {};

  const {
    UserData,
    setToast,
    fetchTmsStatusList,
    AllTmsStatusList,
    setWarehouseScanResume,
  } = useContext(GlobalContextData);
const {top,bottom} = useSafeAreaInsets();
  const [orderData, setOrderData] = useState<any>(initialOrderData || null);
  const [dataLoading, setDataLoading] = useState(!initialOrderData);
  const [saving, setSaving] = useState(false);
  const [regionList, setRegionList] = useState<any[]>([]);
  const [regionsLoading, setRegionsLoading] = useState(false);
  const [statusSheetVisible, setStatusSheetVisible] = useState(false);

  const [pickupDate, setPickupDate] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [pickupRoute, setPickupRoute] = useState<any>(null);
  const [deliveryRoute, setDeliveryRoute] = useState<any>(null);
  const [selectedStatus, setSelectedStatus] = useState<any>(null);
  const formInitializedRef = useRef(false);
  const orderDataRef = useRef<any>(initialOrderData || null);
  const originalFormRef = useRef(getOriginalFormValues(initialOrderData || {}));

  useEffect(() => {
    orderDataRef.current = orderData;
  }, [orderData]);

  const statusList = useMemo(
    () => (AllTmsStatusList?.length ? AllTmsStatusList : []),
    [AllTmsStatusList],
  );

  const applyOrderToForm = useCallback((order: any) => {
    if (!order) return;

    originalFormRef.current = getOriginalFormValues(order);
    setPickupDate(originalFormRef.current.pickup_date);
    setDeliveryDate(originalFormRef.current.deliver_date);
    setSelectedStatus(order?.tmsstatus || null);
    setPickupRoute(getOrderPickupRegion(order));
    setDeliveryRoute(getOrderDeliveryRegion(order));
  }, []);

  const fetchRegions = useCallback(
    async (dateValue: string) => {
      const formattedDate = ApiFormatDate(dateValue);
      if (!formattedDate || !UserData?.user?.verify_token) {
        return [];
      }

      try {
        const res = await ApiService(apiConstants.getOrderByDriver, {
          customData: {
            token: UserData.user.verify_token,
            role: UserData.user.role,
            relaties_id: UserData.relaties?.id,
            user_id: UserData.user.id,
            date: formattedDate,
            type,
          },
        });

        if (Boolean(res?.status)) {
          return Array.isArray(res?.data) ? res.data : [];
        }
      } catch {
        return [];
      }

      return [];
    },
    [UserData, type],
  );

  const syncRegionsAndRoutes = useCallback(
    async (order: any, nextPickupDate: string, nextDeliveryDate: string) => {
      if (!order) return;

      setRegionsLoading(true);
      try {
        const pickupFormatted = ApiFormatDate(nextPickupDate);
        const deliveryFormatted = ApiFormatDate(nextDeliveryDate);

        const pickupRegions = pickupFormatted
          ? await fetchRegions(pickupFormatted)
          : [];
        const deliveryRegions =
          deliveryFormatted && deliveryFormatted !== pickupFormatted
            ? await fetchRegions(deliveryFormatted)
            : [];

        const mergedRegions = mergeOrderRegionsIntoList(
          mergeRegionLists(pickupRegions, deliveryRegions),
          order,
        );

        setRegionList(mergedRegions);

        const routes = resolveRoutesForOrder(mergedRegions, order);
        setPickupRoute(routes.pickupRoute);
        setDeliveryRoute(routes.deliveryRoute);
      } finally {
        setRegionsLoading(false);
      }
    },
    [fetchRegions],
  );

  const loadOrder = useCallback(async () => {
    if (!order_id) return;

    setDataLoading(true);
    try {
      const res = await ApiService(apiConstants.get_order_data_by_id, {
        customData: {
          token: UserData?.user?.verify_token,
          role: UserData?.user?.role,
          relaties_id: UserData?.relaties?.id,
          user_id: UserData?.user?.id,
          order_id,
          type,
        },
      });

      if (res?.status_code == 200) {
        setOrderData(res?.data);
        applyOrderToForm(res?.data);
        await syncRegionsAndRoutes(
          res?.data,
          ApiFormatDate(res?.data?.pickup_date) || '',
          ApiFormatDate(res?.data?.deliver_date) || '',
        );
      } else {
        setToast({
          top: 45,
          text: t(res?.message) || t('something_went_wrong'),
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
      setDataLoading(false);
    }
  }, [order_id, type, UserData, setToast, t, ErrorHandle, applyOrderToForm, syncRegionsAndRoutes]);

  useEffect(() => {
    fetchTmsStatusList?.();
  }, [fetchTmsStatusList]);

  useEffect(() => {
    if (formInitializedRef.current) return;

    if (initialOrderData) {
      formInitializedRef.current = true;
      orderDataRef.current = initialOrderData;
      setOrderData(initialOrderData);
      applyOrderToForm(initialOrderData);
      setDataLoading(false);
      syncRegionsAndRoutes(
        initialOrderData,
        ApiFormatDate(initialOrderData?.pickup_date) || '',
        ApiFormatDate(initialOrderData?.deliver_date) || '',
      );
      return;
    }

    if (!order_id || !UserData?.user?.verify_token) return;

    formInitializedRef.current = true;
    loadOrder();
  }, [initialOrderData, order_id, UserData, loadOrder, applyOrderToForm, syncRegionsAndRoutes]);

  const routesInitializedRef = useRef(false);

  useEffect(() => {
    if (!formInitializedRef.current) return;

    const order = orderDataRef.current;
    if (!order || (!pickupDate && !deliveryDate)) return;

    // Skip the first run — init already synced routes from order data.
    if (!routesInitializedRef.current) {
      routesInitializedRef.current = true;
      return;
    }

    syncRegionsAndRoutes(order, pickupDate, deliveryDate);
  }, [pickupDate, deliveryDate, syncRegionsAndRoutes]);

  const validateForm = () => {
    if (!ApiFormatDate(pickupDate)) {
      setToast({ top: 45, text: t('Please select pickup date'), type: 'error', visible: true });
      return false;
    }
    if (!ApiFormatDate(deliveryDate)) {
      setToast({ top: 45, text: t('Please select delivery date'), type: 'error', visible: true });
      return false;
    }
    if (!pickupRoute?.id) {
      setToast({ top: 45, text: t('Please select pickup route'), type: 'error', visible: true });
      return false;
    }
    if (!deliveryRoute?.id) {
      setToast({ top: 45, text: t('Please select delivery route'), type: 'error', visible: true });
      return false;
    }
    if (!selectedStatus?.id) {
      setToast({ top: 45, text: t('Please select status'), type: 'error', visible: true });
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    const resolvedOrderId = Number(order_id ?? orderData?.id);
    if (!resolvedOrderId) {
      setToast({
        top: 45,
        text: t('Missing order details. Please rescan.'),
        type: 'error',
        visible: true,
      });
      return;
    }

    const formattedPickupDate = ApiFormatDate(pickupDate);
    const formattedDeliveryDate = ApiFormatDate(deliveryDate);

    const changedFields = buildChangedUpdatePayload(originalFormRef.current, {
      pickup_date: formattedPickupDate,
      deliver_date: formattedDeliveryDate,
      pickup_region_id: Number(pickupRoute?.id) || null,
      deliver_region_id: Number(deliveryRoute?.id) || null,
      status: Number(selectedStatus?.id) || null,
    });

    if (Object.keys(changedFields).length === 0) {
      setToast({
        top: 45,
        text: t('No changes to save'),
        type: 'error',
        visible: true,
      });
      return;
    }

    const payload = {
      token: UserData?.user?.verify_token,
      role: UserData?.user?.role,
      relaties_id: UserData?.relaties?.id,
      user_id: UserData?.user?.id,
      type,
      order_id: resolvedOrderId,
      ...changedFields,
    };

    setSaving(true);
    try {
      const res = await ApiService(apiConstants.update_order_data, {
        customData: payload,
      });

      if (res?.status) {
        setToast({
          top: 45,
          text: t(res?.message) || t('Saved successfully'),
          type: 'success',
          visible: true,
        });

        setWarehouseScanResume({
          orderId: resolvedOrderId,
          sheetMode: 'saved',
        });
        navigation.goBack();
        return;
      }

      setToast({
        top: 45,
        text: t(res?.message) || t('something_went_wrong'),
        type: 'error',
        visible: true,
      });
    } catch (error) {
      setToast({
        top: 45,
        text: ErrorHandle(error).message,
        type: 'error',
        visible: true,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container,{paddingTop:top,paddingBottom:bottom}]}>
      <StatusBar backgroundColor="white" />
      <DetailsHeader title={t('Order Edit')} Backbutton={true} />

      {dataLoading ? (
        <View style={styles.loaderWrap}>
          <Loader />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          bounces={false}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {!!orderData && (
            <PickUpBox
              AllisCollapsed={true}
              downButton={true}
              LableStatus={orderData?.tmsstatus?.status_name}
              OrderId={orderData?.id}
              ProductItem={orderData?.items}
              driver_note={null}
              LableBackground={orderData?.tmsstatus?.color}
              start={orderData?.pickup_location}
              end={orderData?.deliver_location}
              ItemData={orderData}
              additional_cost_label={orderData?.additional_cost_label}
              customerData={orderData?.customer}
              external_platform_data={orderData?.display_name}
              external_order_id={orderData?.external_order_id}
              contact={true}
            />
          )}

          <View style={styles.formCard}>
            <Text style={styles.label}>{t('Pickup date')}</Text>
            <CalenderDate date={pickupDate} setDate={setPickupDate} />

            <Text style={styles.label}>{t('Pickup route')}</Text>
            <DropDownBox
              data={regionList}
              value={pickupRoute?.id ?? null}
              setValue={setPickupRoute}
              placeholder="Select pickup route"
              labelFieldKey="name"
              valueFieldKey="id"
              disbled={regionsLoading}
            />

            <Text style={styles.label}>{t('Delivery date')}</Text>
            <CalenderDate date={deliveryDate} setDate={setDeliveryDate} />

            <Text style={styles.label}>{t('Delivery route')}</Text>
            <DropDownBox
              data={regionList}
              value={deliveryRoute?.id ?? null}
              setValue={setDeliveryRoute}
              placeholder="Select delivery route"
              labelFieldKey="name"
              valueFieldKey="id"
              disbled={regionsLoading}
            />

            <Text style={styles.label}>{t('Status')}</Text>
            <Pressable
              style={styles.statusField}
              onPress={() => setStatusSheetVisible(true)}
            >
              <Text
                style={[
                  styles.statusFieldText,
                  !selectedStatus?.status_name && styles.placeholderText,
                ]}
                numberOfLines={1}
              >
                {selectedStatus?.status_name || t('Select Status')}
              </Text>
              <Ionicons name="chevron-down" size={20} color={Colors.darkText} />
            </Pressable>
          </View>

          <View style={styles.footerRow}>
            <TouchableOpacity
              style={[styles.cancelBtn, saving && styles.btnDisabled]}
              activeOpacity={0.85}
              disabled={saving}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.cancelBtnText}>{t('Cancel')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.btnDisabled]}
              activeOpacity={0.85}
              disabled={saving}
              onPress={handleSave}
            >
              {saving ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <Text style={styles.saveBtnText}>{t('Save')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      <StatusSelectSheet
        visible={statusSheetVisible}
        data={statusList}
        selected={selectedStatus}
        onClose={() => setStatusSheetVisible(false)}
        onConfirm={(item) => {
          setSelectedStatus(item);
          setStatusSheetVisible(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.litegray1 || Colors.white,
  },
  loaderWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 14,
    paddingBottom: 30,
  },
  formCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.litegray,
  },
  label: {
    fontSize: 14,
    fontFamily: FONTS.SemiBold,
    color: Colors.black,
    marginTop: 6,
  },
  statusField: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: Colors.litegray,
    borderRadius: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
  },
  statusFieldText: {
    flex: 1,
    fontSize: 15,
    fontFamily: FONTS.Medium,
    color: Colors.black,
    marginRight: 8,
  },
  placeholderText: {
    color: Colors.textgray,
  },
  footerRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: Colors.black,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    color: Colors.white,
    fontSize: 16,
    fontFamily: FONTS.SemiBold,
  },
  saveBtn: {
    flex: 1,
    backgroundColor: Colors.approve,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: {
    opacity: 0.7,
  },
  saveBtnText: {
    color: Colors.white,
    fontSize: 16,
    fontFamily: FONTS.SemiBold,
  },
});
