import apiConstants from '@/src/api/apiConstants';
import { Images } from '@/src/assets/images';
import { ApiFormatDate } from '@/src/components/ApiFormatDate';
import { useErrorHandle } from '@/src/components/ErrorHandle';
import WarehouseOrderSheet from '@/src/components/WarehouseOrderSheet';
import { goBackOrPopTo } from '@/src/components/goBackOrPopTo';
import { GlobalContextData } from '@/src/context/GlobalContext';
import ApiService from '@/src/utils/Apiservice';
import { Colors } from '@/src/utils/colors';
import { height, width } from '@/src/utils/storeData';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const API_TYPE = 'warehouse_change';

const normalizeStatusName = (value: string) =>
  value.toLowerCase().replace(/\s+/g, ' ').trim();

const findInTransitToDeliverStatusId = (list: any[]) => {
  if (!list?.length) return null;

  const matchName = (target: string) =>
    list.find(
      (item) =>
        normalizeStatusName(String(item?.status_name || '')) ===
        normalizeStatusName(target),
    );

  const exactDeliver = matchName('in transit to deliver');
  if (exactDeliver?.id != null) return Number(exactDeliver.id);

  const exactDrop = matchName('in transit to drop');
  if (exactDrop?.id != null) return Number(exactDrop.id);

  const fuzzy = list.find((item) => {
    const name = normalizeStatusName(String(item?.status_name || ''));
    return (
      name.includes('transit') &&
      (name.includes('deliver') || name.includes('drop'))
    );
  });
  if (fuzzy?.id != null) return Number(fuzzy.id);

  const byId = list.find((item) => Number(item?.id) === 3);
  return byId?.id != null ? Number(byId.id) : null;
};

const buildMasterDriverFields = (order: any, statusId: number) => {
  const today = ApiFormatDate(new Date());
  const currentDeliver = ApiFormatDate(order?.deliver_date);
  const fields: Record<string, string | number> = { status: statusId };
  if (!currentDeliver || currentDeliver !== today) {
    fields.deliver_date = today;
  }
  return fields;
};

export default function MasterDriver() {
  const navigation = useNavigation<any>();
  const { goBack } = navigation;
  const isFocused = useIsFocused();
  const { t } = useTranslation();
  const { ErrorHandle } = useErrorHandle();
  const [permission, requestPermission] = useCameraPermissions();
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [sheetLoading, setSheetLoading] = useState(false);
  const [orderData, setOrderData] = useState<any>(null);

  const {
    UserData,
    setToast,
    fetchTmsStatusList,
    AllTmsStatusList,
    setGloblyTypeSlide,
  } = useContext(GlobalContextData);

  const lastScannedRef = useRef('');
  const isVerifyingScanRef = useRef(false);
  const sheetVisibleRef = useRef(false);
  const statusListRef = useRef<any[]>([]);

  useEffect(() => {
    sheetVisibleRef.current = sheetVisible;
  }, [sheetVisible]);

  useEffect(() => {
    setGloblyTypeSlide('master_driver');
  }, [setGloblyTypeSlide]);

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission?.granted, requestPermission]);

  useEffect(() => {
    if (!UserData?.user?.verify_token) return;
    fetchTmsStatusList?.().then((list) => {
      if (list?.length) {
        statusListRef.current = list;
      }
    });
  }, [UserData, fetchTmsStatusList]);

  useEffect(() => {
    if (AllTmsStatusList?.length) {
      statusListRef.current = AllTmsStatusList;
    }
  }, [AllTmsStatusList]);

  const unlockScanner = useCallback(() => {
    lastScannedRef.current = '';
    isVerifyingScanRef.current = false;
  }, []);

  useEffect(() => {
    if (isFocused) {
      unlockScanner();
      setCameraReady(false);
    }
  }, [isFocused, unlockScanner]);

  const fetchOrderById = useCallback(
    async (orderId: string | number, silent = false) => {
      const res = await ApiService(apiConstants.get_order_data_by_id, {
        customData: {
          token: UserData?.user?.verify_token,
          role: UserData?.user?.role,
          relaties_id: UserData?.relaties?.id,
          user_id: UserData?.user?.id,
          order_id: orderId,
          type: API_TYPE,
        },
      });

      if (Boolean(res?.status) || res?.status_code == 200) {
        return res?.data;
      }

      if (!silent) {
        setToast({
          top: 45,
          text: t(res?.message) || t('something_went_wrong'),
          type: 'error',
          visible: true,
        });
      }
      return null;
    },
    [UserData, setToast, t],
  );

  const applyMasterDriverUpdate = useCallback(
    async (orderId: string | number, order: any) => {
      let list = statusListRef.current;
      if (!list?.length) {
        const fetched = await fetchTmsStatusList?.(true);
        list = fetched?.length ? fetched : AllTmsStatusList;
        statusListRef.current = list;
      }

      const statusId = findInTransitToDeliverStatusId(list);
      if (statusId == null) {
        setToast({
          top: 45,
          text: t('something_went_wrong'),
          type: 'error',
          visible: true,
        });
        return false;
      }

      const payload = {
        token: UserData?.user?.verify_token,
        role: UserData?.user?.role,
        relaties_id: UserData?.relaties?.id,
        user_id: UserData?.user?.id,
        type: API_TYPE,
        order_id: Number(orderId),
        ...buildMasterDriverFields(order, statusId),
      };

      const res = await ApiService(apiConstants.update_order_data, {
        customData: payload,
      });

      if (Boolean(res?.status) || res?.status_code == 200) {
        setToast({
          top: 45,
          text: t(res?.message) || t('Saved successfully'),
          type: 'success',
          visible: true,
        });
        return true;
      }

      setToast({
        top: 45,
        text: t(res?.message) || t('something_went_wrong'),
        type: 'error',
        visible: true,
      });
      return false;
    },
    [UserData, fetchTmsStatusList, AllTmsStatusList, setToast, t],
  );

  const processScannedOrder = useCallback(
    async (orderId: string | number) => {
      setSheetLoading(true);
      setOrderData(null);
      setSheetVisible(true);

      try {
        const order = await fetchOrderById(orderId);
        if (!order) {
          setSheetVisible(false);
          unlockScanner();
          return;
        }

        const saved = await applyMasterDriverUpdate(orderId, order);
        if (!saved) {
          setSheetVisible(false);
          unlockScanner();
          return;
        }

        const refreshed = await fetchOrderById(orderId, true);
        setOrderData(refreshed || order);
      } catch (error) {
        setToast({
          top: 45,
          text: ErrorHandle(error).message,
          type: 'error',
          visible: true,
        });
        setSheetVisible(false);
        unlockScanner();
      } finally {
        setSheetLoading(false);
      }
    },
    [fetchOrderById, applyMasterDriverUpdate, unlockScanner, setToast, ErrorHandle],
  );

  const closeSheet = useCallback(() => {
    setSheetVisible(false);
    setOrderData(null);
  }, []);

  const handleNextScan = useCallback(() => {
    closeSheet();
    unlockScanner();
  }, [closeSheet, unlockScanner]);

  const handleStop = useCallback(() => {
    closeSheet();
    unlockScanner();
    goBackOrPopTo(navigation, 'BottomTabs');
  }, [closeSheet, unlockScanner, navigation]);

  const handleScannerClose = useCallback(() => {
    if (sheetVisible) {
      closeSheet();
      unlockScanner();
      return;
    }
    goBack();
  }, [sheetVisible, closeSheet, unlockScanner, goBack]);

  const onBarcodeScanned = useCallback(
    ({ data }: { data: string }) => {
      if (
        !data ||
        isVerifyingScanRef.current ||
        sheetVisibleRef.current ||
        !cameraReady ||
        !isFocused
      ) {
        return;
      }
      if (data === lastScannedRef.current) {
        return;
      }

      isVerifyingScanRef.current = true;
      lastScannedRef.current = data;

      let parsed: any;
      try {
        parsed = JSON.parse(data);
      } catch {
        setToast({
          top: 45,
          text: t('Invalid QR code format'),
          type: 'error',
          visible: true,
        });
        unlockScanner();
        return;
      }

      const orderId = parsed?.order_id;
      if (!orderId) {
        setToast({
          top: 45,
          text: t('Invalid QR: Missing item or order ID'),
          type: 'error',
          visible: true,
        });
        unlockScanner();
        return;
      }

      processScannedOrder(orderId);
    },
    [cameraReady, isFocused, processScannedOrder, setToast, t, unlockScanner],
  );

  const canScan =
    isFocused &&
    permission?.granted &&
    cameraReady &&
    !sheetVisible &&
    !sheetLoading &&
    !isVerifyingScanRef.current;

  if (!permission) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color={Colors.white} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centeredContainer}>
        <Text style={styles.permissionText}>
          {t('Camera permission is required to scan QR codes.')}
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>{t('Grant Permission')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.permissionButton, styles.permissionButtonGhost]}
          onPress={goBack}
        >
          <Text style={styles.permissionButtonText}>{t('Go Back')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {isFocused && permission.granted && !sheetVisible && (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          enableTorch={flashEnabled}
          onCameraReady={() => setCameraReady(true)}
          onBarcodeScanned={canScan ? onBarcodeScanned : undefined}
          barcodeScannerSettings={{
            barcodeTypes: ['qr', 'ean13', 'ean8', 'code128', 'code39', 'upc_a', 'upc_e'],
          }}
        />
      )}

      {!cameraReady && !sheetVisible && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={Colors.white} />
        </View>
      )}

      <Image source={Images.ScannerCenter} style={styles.scannerOverlay} />

      <WarehouseOrderSheet
        visible={sheetVisible}
        loading={sheetLoading}
        orderData={orderData}
        mode="saved"
        onStop={handleStop}
        onNextScan={handleNextScan}
        onEdit={handleNextScan}
        onEditAgain={handleNextScan}
        onClose={handleNextScan}
      />

      {sheetVisible && (
        <View style={styles.topIconAboveSheet} pointerEvents="box-none">
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.sheetCloseBtn}
            onPress={handleScannerClose}
          >
            <Ionicons name="close" size={26} color={Colors.white} />
          </TouchableOpacity>
        </View>
      )}

      {!sheetVisible && (
        <View style={styles.topIcon}>
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.iconButton}
            onPress={() => setFlashEnabled((prev) => !prev)}
          >
            <Ionicons
              name={flashEnabled ? 'flash-sharp' : 'flash-outline'}
              size={24}
              color={Colors.white}
            />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.iconButton}
            onPress={handleScannerClose}
          >
            <Image source={Images.Close} style={styles.closeIcon} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  centeredContainer: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerOverlay: {
    width,
    height,
    position: 'absolute',
    pointerEvents: 'none',
  },
  permissionText: {
    color: Colors.white,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  permissionButton: {
    backgroundColor: Colors.white,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  permissionButtonGhost: {
    marginTop: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  permissionButtonText: {
    color: 'black',
    fontSize: 15,
    fontWeight: '600',
  },
  topIcon: {
    position: 'absolute',
    top: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 20,
  },
  topIconAboveSheet: {
    position: 'absolute',
    top: 44,
    right: 20,
    zIndex: 11001,
    elevation: 11001,
  },
  sheetCloseBtn: {
    backgroundColor: 'rgba(0,0,0,0.62)',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 10,
    borderRadius: 25,
  },
  closeIcon: {
    width: 24,
    height: 24,
    tintColor: Colors.white,
  },
});
