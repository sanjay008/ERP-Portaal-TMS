import apiConstants from "@/src/api/apiConstants";
import { Images } from "@/src/assets/images";
import { useErrorHandle } from "@/src/components/ErrorHandle";
import LoadingModal from "@/src/components/LoadingModal";
import PickUpBox from "@/src/components/PickUpBox";
import { GlobalContextData } from "@/src/context/GlobalContext";
import { setLatestPickupCameraSetData } from "@/src/context/ParcelVerifySessionContext";
import { DropboxContext } from "@/src/context/UploadProider";
import ApiService from "@/src/utils/Apiservice";
import { Colors } from "@/src/utils/colors";
import { appendToLocalUploadQueue } from "@/src/utils/localUploadQueue";
import {
  lockParcelCameraCallback,
  unlockParcelCameraCallback,
} from "@/src/utils/parcelVerifyCameraReturn";
import { FONTS, height, width } from "@/src/utils/storeData";
import { Ionicons } from "@expo/vector-icons";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import axios from "axios";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Image } from "expo-image";
import React, { useCallback, useContext, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Keyboard,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Modal from "react-native-modal";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Driver Photos only:
 * scan / manual entry → order PickUpBox → Cancel / Photos → min 3 photos → optional comment → save.
 */
export default function DriverPhotosScanner({ route }: any) {
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();
  const { t } = useTranslation();
  const { ErrorHandle } = useErrorHandle();
  const { top, bottom } = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();

  const { UserData, setToast, setPickUpDataSave } =
    useContext(GlobalContextData);
  const { setLocalImagesUploadbeforeData } = useContext(DropboxContext);

  const [flashEnabled, setFlashEnabled] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [orderData, setOrderData] = useState<any>(null);
  const [selectPlace, setSelectPlace] = useState<{
    order_id: string | number;
    item_id: string | number | null;
  } | null>(null);
  const [qrData, setQrData] = useState<any>(null);
  const [infoVisible, setInfoVisible] = useState(false);
  const [photos, setPhotos] = useState<any[]>([]);
  const [commentVisible, setCommentVisible] = useState(false);
  const [description, setDescription] = useState("");
  const [commentLoader, setCommentLoader] = useState(false);
  const [manualEntryOpen, setManualEntryOpen] = useState(false);
  const [manualOrderId, setManualOrderId] = useState("");
  const [manualItemId, setManualItemId] = useState("");
  const [isVerifyingManual, setIsVerifyingManual] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const lastScannedRef = useRef("");
  const isScanningRef = useRef(false);
  const orderIdRef = useRef<string | number | null>(null);
  const itemIdRef = useRef<string | number | null>(null);
  const photosRef = useRef<any[]>([]);

  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission?.granted, requestPermission]);

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", (e) => {
      setKeyboardHeight(e?.endCoordinates?.height || 0);
    });
    const hideSub = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const unlockScanner = useCallback(() => {
    lastScannedRef.current = "";
    isScanningRef.current = false;
    setIsVerifyingManual(false);
  }, []);

  useEffect(() => {
    if (isFocused) {
      unlockScanner();
      setCameraReady(false);
    }
  }, [isFocused, unlockScanner]);

  const resetSession = useCallback(() => {
    setInfoVisible(false);
    setCommentVisible(false);
    setOrderData(null);
    setSelectPlace(null);
    setQrData(null);
    setPhotos([]);
    setDescription("");
    orderIdRef.current = null;
    itemIdRef.current = null;
    unlockScanner();
  }, [unlockScanner]);

  const fetchOrderById = useCallback(
    async (orderId: string | number, itemId: string | number | null, parsed: any) => {
      setIsLoading(true);
      try {
        const res = await ApiService(apiConstants.get_order_data_by_id, {
          customData: {
            token: UserData?.user?.verify_token,
            role: UserData?.user?.role,
            relaties_id: UserData?.relaties?.id,
            user_id: UserData?.user?.id,
            order_id: orderId,
            type: route?.params?.type || "driver_photos",
            qr_data: JSON.stringify(parsed ?? null),
          },
        });

        if (res?.status) {
          setOrderData(res?.data);
          setSelectPlace({ order_id: orderId, item_id: itemId });
          orderIdRef.current = orderId;
          itemIdRef.current = itemId;
          setInfoVisible(true);
          return true;
        }

        setToast({
          top: 45,
          text: t(res?.message) || t("Something went wrong"),
          type: "error",
          visible: true,
        });
        unlockScanner();
        return false;
      } catch (error) {
        setToast({
          top: 45,
          text: ErrorHandle(error).message,
          type: "error",
          visible: true,
        });
        unlockScanner();
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [UserData, route?.params?.type, setToast, t, ErrorHandle, unlockScanner],
  );

  const onBarcodeScanned = useCallback(
    async ({ data }: { data: string }) => {
      if (
        !data ||
        !cameraReady ||
        isScanningRef.current ||
        infoVisible ||
        commentVisible ||
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
        setToast({
          top: 45,
          text: t("Invalid QR code format"),
          type: "error",
          visible: true,
        });
        unlockScanner();
        return;
      }

      const orderId = parsed?.order_id;
      const itemId = parsed?.item_id ?? null;
      if (!orderId) {
        setToast({
          top: 45,
          text: t("Invalid QR: Missing item or order ID"),
          type: "error",
          visible: true,
        });
        unlockScanner();
        return;
      }

      setQrData(parsed);
      await fetchOrderById(orderId, itemId, parsed);
    },
    [
      cameraReady,
      infoVisible,
      commentVisible,
      manualEntryOpen,
      isFocused,
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
        text: t("Please enter Order ID and Item ID"),
        type: "error",
        visible: true,
      });
      return;
    }
    if (isScanningRef.current || isVerifyingManual) return;

    Keyboard.dismiss();
    isScanningRef.current = true;
    setIsVerifyingManual(true);

    const parsed = { order_id: orderId, item_id: itemId };
    setQrData(parsed);
    setManualEntryOpen(false);
    const ok = await fetchOrderById(orderId, itemId, parsed);
    if (ok) {
      setManualOrderId("");
      setManualItemId("");
    }
    setIsVerifyingManual(false);
  }, [
    manualOrderId,
    manualItemId,
    isVerifyingManual,
    fetchOrderById,
    setToast,
    t,
  ]);

  const openCamera = useCallback(() => {
    const orderId = orderIdRef.current;
    if (orderId == null) return;

    setInfoVisible(false);
    lockParcelCameraCallback();
    const setData = async (media: any[]) => {
      try {
        if (media?.length > 0) {
          setPhotos(media);
          setCommentVisible(true);
        } else {
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
      minPhotos: 3,
      photoOnly: true,
    });
  }, [navigation, setPickUpDataSave, unlockScanner]);

  const savePhotosAndComment = useCallback(
    async (commentText: string) => {
      const orderId = orderIdRef.current ?? selectPlace?.order_id;
      const itemId = itemIdRef.current ?? selectPlace?.item_id;
      const imageData = photosRef.current;

      if (orderId == null) {
        setToast({
          top: 45,
          text: t("Invalid or missing order details. Please rescan."),
          type: "error",
          visible: true,
        });
        return;
      }
      if (!imageData?.length) {
        setToast({
          top: 45,
          text: t("Please take at least 3 photos"),
          type: "error",
          visible: true,
        });
        return;
      }

      setCommentLoader(true);
      try {
        const trimmed = commentText?.trim() || "";

        if (trimmed) {
          const formData: any = new FormData();
          formData.append("token", UserData?.user?.verify_token);
          formData.append("role", UserData?.user?.role);
          formData.append("relaties_id", UserData?.relaties?.id);
          formData.append("user_id", UserData?.user?.id);
          formData.append("order_comment", trimmed);
          formData.append("order_id", String(orderId));
          if (qrData) {
            formData.append("qr_data", JSON.stringify(qrData));
          }

          const res: any = await axios.post(
            apiConstants.store_tms_comment,
            formData,
            {
              headers: { "Content-Type": "multipart/form-data" },
            },
          );

          if (!Boolean(res?.data?.status)) {
            setToast({
              top: 45,
              text: t(res?.data?.message) || t("Something went wrong"),
              type: "error",
              visible: true,
            });
            return;
          }

          const orderLogId = res?.data?.data?.order_log_id;
          appendToLocalUploadQueue(setLocalImagesUploadbeforeData, {
            order_id: orderId,
            image_data: [...imageData],
            item_id: itemId,
            commentId: orderLogId ?? null,
            qr_data: qrData ? JSON.stringify(qrData) : undefined,
          });

          setToast({
            top: 45,
            text: t(res?.data?.message) || t("Success"),
            type: "success",
            visible: true,
          });
        } else {
          appendToLocalUploadQueue(setLocalImagesUploadbeforeData, {
            order_id: orderId,
            image_data: [...imageData],
            item_id: itemId,
            commentId: null,
            qr_data: qrData ? JSON.stringify(qrData) : undefined,
          });

          setToast({
            top: 45,
            text: t("Image uploaded successfully"),
            type: "success",
            visible: true,
          });
        }

    setCommentVisible(false);
    setDescription("");
    setPhotos([]);
    setKeyboardHeight(0);
    setPickUpDataSave([]);
    resetSession();
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
    },
    [
      selectPlace,
      qrData,
      UserData,
      setLocalImagesUploadbeforeData,
      setPickUpDataSave,
      setToast,
      t,
      ErrorHandle,
      resetSession,
    ],
  );

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
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
      {isFocused && !infoVisible && !commentVisible && (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          enableTorch={flashEnabled}
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          onBarcodeScanned={onBarcodeScanned}
          onCameraReady={() => setCameraReady(true)}
        />
      )}

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
          onPress={() => navigation.goBack()}
        >
          <Image source={Images.Close} style={styles.closeIcon} />
        </TouchableOpacity>
      </View>

      {manualEntryOpen && !infoVisible && !commentVisible ? (
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
              }}
            >
              <Ionicons name="chevron-up" size={20} color={Colors.white} />
            </TouchableOpacity>
          </View>

          <View style={styles.manualEntryFields}>
            <View style={styles.manualEntryField}>
              <Text style={styles.manualEntryLabel}>{t("Order ID")}</Text>
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
              <Text style={styles.manualEntryLabel}>{t("Item ID")}</Text>
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
                <Text style={styles.manualEntrySubmitText}>{t("Continue")}</Text>
                <Ionicons name="arrow-forward" size={16} color={Colors.white} />
              </>
            )}
          </TouchableOpacity>
        </View>
      ) : null}

      <Modal
        isVisible={infoVisible}
        animationIn="slideInUp"
        animationOut="slideOutDown"
        style={{ margin: 0, justifyContent: "flex-end" }}
        onBackdropPress={() => {
          setInfoVisible(false);
          unlockScanner();
        }}
        onBackButtonPress={() => {
          setInfoVisible(false);
          unlockScanner();
        }}
        useNativeDriver={false}
        hideModalContentWhileAnimating
      >
        <View style={[styles.orderPopup, { paddingBottom: Math.max(bottom, 16) + 8 }]}>
          <ScrollView
            bounces={false}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 12 }}
          >
            {orderData ? (
              <PickUpBox
                AllisCollapsed={true}
                downButton={true}
                index={0}
                LableStatus={orderData?.tmsstatus?.status_name}
                OrderId={orderData?.id || selectPlace?.order_id}
                ProductItem={orderData?.items || []}
                driver_note={orderData?.driver_note || null}
                LableBackground={orderData?.tmsstatus?.color}
                start={orderData?.pickup_location}
                end={orderData?.deliver_location}
                ItemData={orderData}
                additional_cost_label={orderData?.additional_cost_label}
                customerData={orderData?.customer}
                external_platform_data={orderData?.display_name}
                external_order_id={orderData?.external_order_id}
                statusData={orderData?.tmsstatus}
                LacationProgress={true}
                contact={false}
              />
            ) : null}
          </ScrollView>

          <View style={styles.orderPopupActions}>
            <TouchableOpacity
              style={[styles.orderPopupBtn, styles.orderPopupCancel]}
              activeOpacity={0.85}
              onPress={() => {
                setInfoVisible(false);
                unlockScanner();
              }}
            >
              <Text style={styles.orderPopupCancelText}>{t("Cancel")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.orderPopupBtn, styles.orderPopupPhotos]}
              activeOpacity={0.85}
              onPress={openCamera}
            >
              <Text style={styles.orderPopupPhotosText}>{t("Photos")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        isVisible={commentVisible}
        animationIn="slideInUp"
        animationOut="slideOutDown"
        style={{ margin: 0 }}
        onBackdropPress={() => Keyboard.dismiss()}
        onBackButtonPress={() => Keyboard.dismiss()}
        onModalHide={() => setKeyboardHeight(0)}
        avoidKeyboard={false}
        useNativeDriver={false}
        hideModalContentWhileAnimating
        coverScreen
        propagateSwipe
      >
        <View
          style={[
            styles.commentOverlay,
            { paddingBottom: keyboardHeight },
          ]}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={Keyboard.dismiss}
          />
          <View
            style={[
              styles.commentBox,
              {
                paddingBottom: Math.max(bottom, 16) + 8,
              },
            ]}
          >
            <View style={styles.commentHeader}>
              <Text style={styles.commentTitle}>
                {t("Write Comment")} ({t("Optional")})
              </Text>
              <TouchableOpacity
                style={styles.commentClose}
                onPress={() => {
                  Keyboard.dismiss();
                  setKeyboardHeight(0);
                  setCommentVisible(false);
                  setPhotos([]);
                  unlockScanner();
                }}
              >
                <Image
                  source={Images.Close}
                  style={{ width: 18, height: 18 }}
                  tintColor={Colors.black}
                />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.commentInput}
              value={description}
              onChangeText={setDescription}
              placeholder={t("Type here...")}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={styles.commentSubmit}
              disabled={commentLoader}
              onPress={() => {
                Keyboard.dismiss();
                savePhotosAndComment(description);
              }}
            >
              {commentLoader ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.commentSubmitText}>{t("Submit")}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <LoadingModal visible={isLoading} message={t("Please wait…")} />
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
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.22)",
  },
  manualEntryChipText: {
    fontSize: 13,
    fontFamily: FONTS.Medium,
    color: Colors.white,
  },
  manualEntryPanel: {
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
  manualEntryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  manualEntryTitle: {
    fontSize: 13,
    fontFamily: FONTS.Medium,
    color: "rgba(255,255,255,0.72)",
    letterSpacing: 0.2,
  },
  manualEntryFields: {
    flexDirection: "row",
    gap: 10,
  },
  manualEntryField: {
    flex: 1,
    gap: 6,
  },
  manualEntryLabel: {
    fontSize: 11,
    fontFamily: FONTS.Medium,
    color: "rgba(255,255,255,0.5)",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  manualEntryInput: {
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
  manualEntrySubmit: {
    height: 44,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
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
  orderPopup: {
    maxHeight: height * 0.85,
    backgroundColor: Colors.background,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    paddingHorizontal: 15,
    paddingTop: 15,
  },
  orderPopupActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  orderPopupBtn: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  orderPopupCancel: {
    backgroundColor: Colors.Boxgray,
  },
  orderPopupPhotos: {
    backgroundColor: Colors.primary,
  },
  orderPopupCancelText: {
    fontFamily: FONTS.SemiBold,
    fontSize: 14,
    color: Colors.black,
  },
  orderPopupPhotosText: {
    fontFamily: FONTS.SemiBold,
    fontSize: 14,
    color: Colors.white,
  },
  commentOverlay: {
    flex: 1,
    width: "100%",
    justifyContent: "flex-end",
  },
  commentBox: {
    width,
    paddingHorizontal: 15,
    paddingTop: 15,
    backgroundColor: Colors.background,
    borderTopRightRadius: 10,
    borderTopLeftRadius: 10,
  },
  commentHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  commentTitle: {
    fontSize: 14,
    fontFamily: FONTS.SemiBold,
    color: Colors.black,
  },
  commentClose: {
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 4,
    backgroundColor: Colors.white,
  },
  commentInput: {
    borderRadius: 10,
    padding: 10,
    fontSize: 14,
    backgroundColor: Colors.white,
    minHeight: 120,
    fontFamily: FONTS.Regular,
    color: Colors.black,
  },
  commentSubmit: {
    width: "100%",
    height: 50,
    backgroundColor: Colors.primary,
    borderRadius: 7,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 15,
  },
  commentSubmitText: {
    color: Colors.white,
    fontFamily: FONTS.SemiBold,
    fontSize: 14,
  },
});
