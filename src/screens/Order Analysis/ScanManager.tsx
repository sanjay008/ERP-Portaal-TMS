import apiConstants from '@/src/api/apiConstants';
import { Images } from '@/src/assets/images';
import { useErrorHandle } from '@/src/components/ErrorHandle';
import AddWarehouseProductModal from '@/src/components/AddWarehouseProductModal';
import WarehouseOrderSheet from '@/src/components/WarehouseOrderSheet';
import { goBackOrPopTo } from '@/src/components/goBackOrPopTo';
import { GlobalContextData } from '@/src/context/GlobalContext';
import { setLatestDeliveryCameraSetData } from '@/src/context/ParcelVerifySessionContext';
import { DropboxContext } from '@/src/context/UploadProider';
import ApiService from '@/src/utils/Apiservice';
import { Colors } from '@/src/utils/colors';
import { appendToLocalUploadQueue } from '@/src/utils/localUploadQueue';
import { FONTS, height, width } from '@/src/utils/storeData';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useIsFocused, useNavigation } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import ReAnimated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const WAREHOUSE_TYPE = 'warehouse_change';

const isVideoUri = (uri: string) =>
  /\.(mp4|mov|m4v|webm|3gp|avi|mkv)(\?|$)/i.test(String(uri || ''));

export default function ScanManager({ route }: any) {
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
  const [sheetMode, setSheetMode] = useState<'scan' | 'saved'>('scan');
  const [orderData, setOrderData] = useState<any>(null);
  const [activeOrderId, setActiveOrderId] = useState<string | number | null>(null);
  const [addProductVisible, setAddProductVisible] = useState(false);
  const [manualEntryOpen, setManualEntryOpen] = useState(false);
  const [manualOrderId, setManualOrderId] = useState('');
  const [manualItemId, setManualItemId] = useState('');
  const [isVerifyingManual, setIsVerifyingManual] = useState(false);
  const [preferredItemId, setPreferredItemId] = useState<string | number | null>(
    null,
  );

  const {
    UserData,
    setToast,
    fetchTmsStatusList,
    warehouseScanResume,
    setWarehouseScanResume,
    setDeliveyDataSave,
  } = useContext(GlobalContextData);
  const { setLocalImagesUploadbeforeData } = useContext(DropboxContext);
  const { top } = useSafeAreaInsets();

  const lastScannedRef = useRef('');
  const isVerifyingScanRef = useRef(false);
  const sheetVisibleRef = useRef(false);
  const reopenSavedSheetRef = useRef(false);
  const sheetModeRef = useRef<'scan' | 'saved'>('scan');
  const activeOrderIdRef = useRef<string | number | null>(null);
  const pendingAddProductRef = useRef<{
    product_id: string | number;
    quantity: number;
    product_name?: string;
    is_set_product_price?: boolean;
    country_id?: string | number;
    price?: string | number;
  } | null>(null);
  const slideType = route?.params?.item?.type || route?.params?.type || WAREHOUSE_TYPE;

  useEffect(() => {
    sheetVisibleRef.current = sheetVisible;
  }, [sheetVisible]);

  useEffect(() => {
    sheetModeRef.current = sheetMode;
  }, [sheetMode]);

  useEffect(() => {
    activeOrderIdRef.current = activeOrderId;
  }, [activeOrderId]);

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission?.granted, requestPermission]);

  useEffect(() => {
    if (UserData?.user?.verify_token) {
      fetchTmsStatusList?.();
    }
  }, [UserData, fetchTmsStatusList]);

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
    async (orderId: string | number) => {
      setSheetLoading(true);
      setActiveOrderId(orderId);
      try {
        const res = await ApiService(apiConstants.get_order_data_by_id, {
          customData: {
            token: UserData?.user?.verify_token,
            role: UserData?.user?.role,
            relaties_id: UserData?.relaties?.id,
            user_id: UserData?.user?.id,
            order_id: orderId,
            type: slideType,
          },
        });


        if (res?.status) {
          setOrderData(res?.data);
          return true;
        }

        setToast({
          top: 45,
          text: t(res?.message) || t('something_went_wrong'),
          type: 'error',
          visible: true,
        });
        return false;
      } catch (error) {
        setToast({
          top: 45,
          text: ErrorHandle(error).message,
          type: 'error',
          visible: true,
        });
        return false;
      } finally {
        setSheetLoading(false);
      }
    },
    [UserData, slideType, setToast, t, ErrorHandle],
  );

  useFocusEffect(
    useCallback(() => {
      if (warehouseScanResume?.orderId) {
        const { orderId, sheetMode: resumeMode = 'saved' } = warehouseScanResume;
        setWarehouseScanResume(null);
        reopenSavedSheetRef.current = false;
        setSheetMode(resumeMode);
        setSheetVisible(true);
        isVerifyingScanRef.current = true;
        fetchOrderById(orderId);
        return;
      }

      if (
        reopenSavedSheetRef.current &&
        sheetMode === 'saved' &&
        activeOrderId &&
        orderData
      ) {
        reopenSavedSheetRef.current = false;
        setSheetVisible(true);
      }
    }, [
      warehouseScanResume,
      setWarehouseScanResume,
      sheetMode,
      activeOrderId,
      orderData,
      fetchOrderById,
    ]),
  );

  const hideSheet = useCallback(() => {
    setSheetVisible(false);
    if (sheetMode === 'saved') {
      reopenSavedSheetRef.current = true;
    }
  }, [sheetMode]);

  const closeSheet = useCallback(() => {
    setSheetVisible(false);
    setSheetMode('scan');
  }, []);

  const handleNextScan = useCallback(() => {
    closeSheet();
    setPreferredItemId(null);
    unlockScanner();
  }, [closeSheet, unlockScanner]);

  const handleStop = useCallback(() => {
    closeSheet();
    unlockScanner();
    goBackOrPopTo(navigation, 'BottomTabs');
  }, [closeSheet, unlockScanner, navigation]);

  const handleEdit = useCallback(() => {
    if (!activeOrderId) return;
    hideSheet();
    navigation.navigate('WarehouseOrderEdit', {
      order_id: activeOrderId,
      type: slideType,
      orderData,
    });
  }, [activeOrderId, hideSheet, navigation, slideType, orderData]);

  const handleScannerClose = useCallback(() => {
    if (sheetVisible) {
      closeSheet();
      unlockScanner();
      return;
    }
    goBack();
  }, [sheetVisible, closeSheet, unlockScanner, goBack]);

  const handleEditAgain = useCallback(() => {
    handleEdit();
  }, [handleEdit]);

  const uploadWarehouseMedia = useCallback(
    async (
      media: any[],
      options?: { minPhotos?: number; photoOnly?: boolean },
    ): Promise<boolean> => {
      const orderId = activeOrderIdRef.current;
      const uris = (media || [])
        .map((item) => (typeof item === 'string' ? item : item?.uri))
        .filter(Boolean) as string[];

      const photos = uris.filter((uri) => !isVideoUri(uri));
      const videos = uris.filter((uri) => isVideoUri(uri));
      const minPhotos = options?.minPhotos ?? 3;
      const photoOnly = Boolean(options?.photoOnly);
      const hasRequiredMedia = photoOnly
        ? photos.length >= minPhotos
        : videos.length >= 1 || photos.length >= minPhotos;

      if (!hasRequiredMedia) {
        setToast({
          top: 45,
          text: photoOnly
            ? photos.length === 0
              ? t('Please take at least 1 photo')
              : `${minPhotos - photos.length} ${t('more photo(s) needed')}`
            : photos.length === 0
              ? t('Please take at least 3 photos')
              : photos.length < 3
                ? `${3 - photos.length} ${t('more photo(s) needed')}`
                : t('Please record at least 1 video'),
          type: 'error',
          visible: true,
        });
        return false;
      }

      if (orderId == null) {
        setToast({
          top: 45,
          text: t('Invalid or missing order details. Please rescan.'),
          type: 'error',
          visible: true,
        });
        return false;
      }

      setSheetLoading(true);
      try {
        // Proof photos only — do NOT call store_tms_comment (avoids empty notes).
        appendToLocalUploadQueue(setLocalImagesUploadbeforeData, {
          order_id: orderId,
          image_data: uris,
          item_id: preferredItemId ?? null,
          commentId: null,
        });

        setToast({
          top: 45,
          text: t('Image uploaded successfully'),
          type: 'success',
          visible: true,
        });
        return true;
      } catch (error) {
        setToast({
          top: 45,
          text: ErrorHandle(error).message,
          type: 'error',
          visible: true,
        });
        return false;
      } finally {
        setSheetLoading(false);
        setWarehouseScanResume({
          orderId,
          sheetMode: sheetModeRef.current,
        });
      }
    },
    [
      setToast,
      t,
      ErrorHandle,
      setLocalImagesUploadbeforeData,
      setWarehouseScanResume,
      preferredItemId,
    ],
  );

  const handleAddImage = useCallback(() => {
    if (!activeOrderId) return;

    const onMediaReady = async (media: any[]) => {
      setLatestDeliveryCameraSetData(null);
      await uploadWarehouseMedia(media);
    };

    setLatestDeliveryCameraSetData(onMediaReady);
    setDeliveyDataSave({
      setData: onMediaReady,
    });

    setWarehouseScanResume({
      orderId: activeOrderId,
      sheetMode: sheetModeRef.current,
    });
    hideSheet();
    navigation.navigate('Camera', { from: 'warehouse_change' });
  }, [
    activeOrderId,
    hideSheet,
    navigation,
    setDeliveyDataSave,
    setWarehouseScanResume,
    uploadWarehouseMedia,
  ]);

  const handleRequestAddProduct = useCallback(
    (payload: {
      product_id: string | number;
      quantity: number;
      product_name?: string;
      is_set_product_price?: boolean;
      country_id?: string | number;
      price?: string | number;
    }) => {
      if (!activeOrderId) return;

      pendingAddProductRef.current = payload;
      setAddProductVisible(false);

      const onMediaReady = async (media: any[]) => {
        setLatestDeliveryCameraSetData(null);
        const uploaded = await uploadWarehouseMedia(media, {
          minPhotos: 1,
          photoOnly: true,
        });

        const pending = pendingAddProductRef.current;
        pendingAddProductRef.current = null;

        if (!uploaded || !pending) return;

        setSheetLoading(true);
        try {
          const res = await ApiService(apiConstants.add_product_to_order, {
            customData: {
              token: UserData?.user?.verify_token,
              relaties_id: UserData?.relaties?.id,
              role: UserData?.user?.role,
              user_id: UserData?.user?.id,
              order_id: activeOrderIdRef.current,
              product_id: pending.product_id,
              quantity: pending.quantity,
              is_set_product_price: pending.is_set_product_price ?? false,
              ...(pending.product_name ? { product_name: pending.product_name } : {}),
              ...(pending.country_id != null ? { country_id: pending.country_id } : {}),
              ...(pending.price != null && pending.price !== ''
                ? { price: pending.price }
                : {}),
            },
          });

          if (res?.status) {
            setToast({
              top: 45,
              text: t(res?.message) || t('Product added successfully'),
              type: 'success',
              visible: true,
            });
            const orderId = activeOrderIdRef.current;
            if (orderId != null) {
              await fetchOrderById(orderId);
            }
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
          setSheetLoading(false);
        }
      };

      setLatestDeliveryCameraSetData(onMediaReady);
      setDeliveyDataSave({
        setData: onMediaReady,
      });

      setWarehouseScanResume({
        orderId: activeOrderId,
        sheetMode: sheetModeRef.current,
      });
      hideSheet();
      navigation.navigate('Camera', {
        from: 'warehouse_change',
        minPhotos: 1,
        photoOnly: true,
      });
    },
    [
      activeOrderId,
      uploadWarehouseMedia,
      UserData,
      setToast,
      t,
      ErrorHandle,
      fetchOrderById,
      setDeliveyDataSave,
      setWarehouseScanResume,
      hideSheet,
      navigation,
    ],
  );

  const onBarcodeScanned = useCallback(
    ({ data }: { data: string }) => {
      if (
        !data ||
        isVerifyingScanRef.current ||
        sheetVisibleRef.current ||
        manualEntryOpen ||
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

      setPreferredItemId(parsed?.item_id ?? null);
      setManualEntryOpen(false);
      setSheetMode('scan');
      setSheetVisible(true);

      fetchOrderById(orderId).then((ok) => {
        if (!ok) {
          setSheetVisible(false);
          unlockScanner();
        }
      });
    },
    [
      cameraReady,
      isFocused,
      manualEntryOpen,
      fetchOrderById,
      setToast,
      t,
      unlockScanner,
    ],
  );

  const submitManualEntry = useCallback(async () => {
    const orderId = manualOrderId.trim();
    const itemId = manualItemId.trim();

    if (!orderId || !itemId) {
      setToast({
        top: 45,
        text: t('Please enter Order ID and Item ID'),
        type: 'error',
        visible: true,
      });
      return;
    }

    if (isVerifyingScanRef.current || isVerifyingManual) {
      return;
    }

    Keyboard.dismiss();
    isVerifyingScanRef.current = true;
    setIsVerifyingManual(true);

    try {
      setPreferredItemId(itemId);
      setSheetMode('scan');
      setSheetVisible(true);

      const ok = await fetchOrderById(orderId);
      if (!ok) {
        setSheetVisible(false);
        setPreferredItemId(null);
        unlockScanner();
        return;
      }

      setManualEntryOpen(false);
      setManualItemId('');
    } catch (error) {
      setSheetVisible(false);
      setPreferredItemId(null);
      setToast({
        top: 45,
        text: ErrorHandle(error).message || t('Something went wrong'),
        type: 'error',
        visible: true,
      });
      unlockScanner();
    } finally {
      setIsVerifyingManual(false);
    }
  }, [
    manualOrderId,
    manualItemId,
    isVerifyingManual,
    fetchOrderById,
    unlockScanner,
    setToast,
    t,
    ErrorHandle,
  ]);

  const canScan =
    isFocused &&
    permission?.granted &&
    cameraReady &&
    !sheetVisible &&
    !sheetLoading &&
    !manualEntryOpen &&
    !isVerifyingScanRef.current &&
    !isVerifyingManual;

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
        mode={sheetMode}
        onStop={handleStop}
        onNextScan={handleNextScan}
        onEdit={handleEdit}
        onEditAgain={handleEditAgain}
        onClose={handleNextScan}
        onAddImage={handleAddImage}
        onAddProduct={() => setAddProductVisible(true)}
      />

      <AddWarehouseProductModal
        visible={addProductVisible}
        orderId={activeOrderId}
        itemId={
          preferredItemId ??
          orderData?.items?.[0]?.id ??
          orderData?.item_id ??
          null
        }
        type={slideType}
        onClose={() => setAddProductVisible(false)}
        onRequestAddProduct={handleRequestAddProduct}
        onSuccess={() => {
          if (activeOrderId != null) {
            fetchOrderById(activeOrderId);
          }
        }}
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
        <View style={[styles.topIcon, { top: top ? top * 1.2 : 40 }]}>
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

          {!manualEntryOpen ? (
            <TouchableOpacity
              style={styles.manualEntryChip}
              activeOpacity={0.85}
              onPress={() => setManualEntryOpen(true)}
            >
              <Ionicons name="keypad-outline" size={16} color={Colors.white} />
              <Text style={styles.manualEntryChipText}>{t('Enter code')}</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 1 }} />
          )}

          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.iconButton}
            onPress={handleScannerClose}
          >
            <Image source={Images.Close} style={styles.closeIcon} />
          </TouchableOpacity>
        </View>
      )}

      {manualEntryOpen && !sheetVisible ? (
        <ReAnimated.View
          entering={FadeIn.duration(180)}
          style={[
            styles.manualEntryPanel,
            { top: (top ? top * 1.2 : 40) + 56 },
          ]}
        >
          <View style={styles.manualEntryHeader}>
            <Text style={styles.manualEntryTitle}>{t('Enter QR details')}</Text>
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

          <View style={styles.manualEntryFields}>
            <View style={styles.manualEntryField}>
              <Text style={styles.manualEntryLabel}>{t('Order ID')}</Text>
              <TextInput
                style={styles.manualEntryInput}
                value={manualOrderId}
                onChangeText={setManualOrderId}
                placeholder="24687"
                placeholderTextColor="rgba(255,255,255,0.35)"
                keyboardType="number-pad"
                returnKeyType="next"
                selectTextOnFocus
              />
            </View>
            <View style={styles.manualEntryField}>
              <Text style={styles.manualEntryLabel}>{t('Item ID')}</Text>
              <TextInput
                style={styles.manualEntryInput}
                value={manualItemId}
                onChangeText={setManualItemId}
                placeholder="26489"
                placeholderTextColor="rgba(255,255,255,0.35)"
                keyboardType="number-pad"
                returnKeyType="done"
                onSubmitEditing={submitManualEntry}
                selectTextOnFocus
              />
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.manualEntrySubmit,
              (!manualOrderId.trim() ||
                !manualItemId.trim() ||
                isVerifyingManual) &&
                styles.manualEntrySubmitDisabled,
            ]}
            activeOpacity={0.85}
            disabled={
              !manualOrderId.trim() ||
              !manualItemId.trim() ||
              isVerifyingManual
            }
            onPress={submitManualEntry}
          >
            {isVerifyingManual ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <>
                <Text style={styles.manualEntrySubmitText}>{t('Continue')}</Text>
                <Ionicons name="arrow-forward" size={16} color={Colors.white} />
              </>
            )}
          </TouchableOpacity>
        </ReAnimated.View>
      ) : null}
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
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 20,
    zIndex: 20,
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
  manualEntryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  manualEntryChipText: {
    fontSize: 13,
    fontFamily: FONTS.Medium,
    color: Colors.white,
  },
  manualEntryPanel: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 25,
    borderRadius: 16,
    padding: 14,
    backgroundColor: 'rgba(12,12,14,0.88)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.16)',
    gap: 12,
  },
  manualEntryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  manualEntryTitle: {
    fontSize: 13,
    fontFamily: FONTS.Medium,
    color: 'rgba(255,255,255,0.72)',
    letterSpacing: 0.2,
  },
  manualEntryFields: {
    flexDirection: 'row',
    gap: 10,
  },
  manualEntryField: {
    flex: 1,
    gap: 6,
  },
  manualEntryLabel: {
    fontSize: 11,
    fontFamily: FONTS.Medium,
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  manualEntryInput: {
    height: 44,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 16,
    fontFamily: FONTS.Medium,
    color: Colors.white,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  manualEntrySubmit: {
    height: 44,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  manualEntrySubmitDisabled: {
    opacity: 0.45,
  },
  manualEntrySubmitText: {
    fontSize: 14,
    fontFamily: FONTS.Medium,
    color: Colors.white,
  },
});
