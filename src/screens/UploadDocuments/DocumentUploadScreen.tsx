import { Images } from "@/src/assets/images";
import ButtonComponent from "@/src/components/buttonComponent";
import { formatDate, toApiDateString } from "@/src/components/DateFormate";
import DetailsHeader from "@/src/components/DetailsHeader";
import { useErrorHandle } from "@/src/components/ErrorHandle";
import ImageSourceSheet, {
  type ImageSourceChoice,
} from "@/src/components/ImageSourceSheet";
import LoadingModal from "@/src/components/LoadingModal";
import { GlobalContextData } from "@/src/context/GlobalContext";
import { Colors } from "@/src/utils/colors";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useNavigation, useRoute } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import React, { useCallback, useContext, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Image,
  Modal,
  Platform,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { SafeAreaView } from "react-native-safe-area-context";
import { styles } from "./styles";
import type { PickedDocumentFile, QuickUploadType } from "./types";
import { resolveMinPhotos } from "./types";
import {
  extractDocumentApiError,
  isApiSuccess,
  quickUploadDocuments,
} from "./uploadDocumentsApi";

function ymdToDate(ymd: string): Date {
  if (!ymd) return new Date();
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return new Date();
  return new Date(y, m - 1, d);
}

function dateToYmd(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function assetToFile(asset: ImagePicker.ImagePickerAsset): PickedDocumentFile {
  const uri = asset.uri;
  const ext =
    uri?.split(".").pop()?.split("?")[0]?.toLowerCase() ||
    (asset.mimeType?.includes("png") ? "png" : "jpg");
  const mime =
    asset.mimeType || (ext === "png" ? "image/png" : "image/jpeg");
  return {
    // Keep platform URI as-is (file:// / content://).
    uri,
    name:
      asset.fileName ||
      `document_${Date.now()}.${ext === "jpeg" ? "jpg" : ext}`,
    type: mime,
  };
}

type RouteParams = {
  documentType?: QuickUploadType;
};

export default function DocumentUploadScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const params = (route?.params || {}) as RouteParams;
  const { UserData, setToast, SelectLanguage } = useContext(GlobalContextData);
  const { ErrorHandle } = useErrorHandle();

  const documentType = params.documentType;
  const minPhotos = resolveMinPhotos(documentType);
  const singlePhoto = minPhotos === 1;
  const requiresExpiry = documentType?.expire_date_required !== false;
  const allowCamera = documentType?.allow_camera !== false;
  const typeName = documentType?.type || "";
  const typeSlug = documentType?.slug || "";

  const [photos, setPhotos] = useState<(PickedDocumentFile | null)[]>(() =>
    Array.from({ length: minPhotos }, () => null),
  );
  const [expiryDate, setExpiryDate] = useState("");
  const [expiryPickerOpen, setExpiryPickerOpen] = useState(false);
  const [iosExpiryDraft, setIosExpiryDraft] = useState(() => new Date());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [sourceSheetOpen, setSourceSheetOpen] = useState(false);
  const [pendingSlotIndex, setPendingSlotIndex] = useState<number | null>(null);

  const locale = SelectLanguage || i18n.language || "en";

  const subtitle = useMemo(() => {
    const parts: string[] = [];
    parts.push(
      minPhotos === 1
        ? t("At least 1 photo")
        : t(`At least ${minPhotos} photos`),
    );
    if (requiresExpiry) parts.push(t("Expiry date required"));
    return parts.join(" · ");
  }, [minPhotos, requiresExpiry, t]);

  const applyPhotoAt = useCallback(
    (index: number, file: PickedDocumentFile) => {
      setPhotos((prev) => {
        const next = [...prev];
        while (next.length < minPhotos) next.push(null);
        next[index] = file;
        return next;
      });
      setErrors((prev) => {
        const next = { ...prev };
        delete next.photos;
        delete next[`photo_${index}`];
        if (index === 0) delete next.front;
        if (index === 1) delete next.back;
        return next;
      });
    },
    [minPhotos],
  );

  const openCamera = async (): Promise<PickedDocumentFile | null> => {
    const { granted } = await ImagePicker.requestCameraPermissionsAsync();
    if (!granted) {
      setToast({
        visible: true,
        text: t("Please allow camera access"),
        type: "error",
        top: 45,
      });
      return null;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.85,
      exif: false,
    });

    if (result.canceled || !result.assets?.[0]) return null;
    return assetToFile(result.assets[0]);
  };

  const openGallery = async (): Promise<PickedDocumentFile | null> => {
    if (Platform.OS !== "web") {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        setToast({
          visible: true,
          text: t("Permission denied"),
          type: "error",
          top: 45,
        });
        return null;
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsMultipleSelection: false,
      exif: false,
    });

    if (result.canceled || !result.assets?.[0]) return null;
    return assetToFile(result.assets[0]);
  };

  const openSourcePicker = (index: number) => {
    // Camera disabled by API → gallery only (no sheet).
    if (!allowCamera) {
      void (async () => {
        const file = await openGallery();
        if (file) applyPhotoAt(index, file);
      })();
      return;
    }
    setPendingSlotIndex(index);
    setSourceSheetOpen(true);
  };

  const onSourceSelect = async (source: ImageSourceChoice) => {
    const index = pendingSlotIndex;
    setSourceSheetOpen(false);
    setPendingSlotIndex(null);
    if (index == null) return;

    // Let sheet close animation start before opening native picker.
    await new Promise((r) => setTimeout(r, 280));

    const file =
      source === "camera" ? await openCamera() : await openGallery();
    if (!file) return;
    applyPhotoAt(index, file);
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!photos[0]) {
      next.front = singlePhoto
        ? t("Photo is required")
        : t("Front photo is required");
    }
    if (!singlePhoto && !photos[1]) {
      next.back = t("Back photo is required");
    }
    if (requiresExpiry && !expiryDate) {
      next.expiry_date = t("Expiry date is required");
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onUpload = async () => {
    if (!documentType || !validate()) return;

    const frontPhoto = photos[0];
    if (!frontPhoto) return;
    if (!singlePhoto && !photos[1]) return;

    setLoading(true);
    try {
      const res = await quickUploadDocuments(UserData, {
        type: typeName || typeSlug,
        expire_date: requiresExpiry ? toApiDateString(expiryDate) : undefined,
        front_file: {
          ...frontPhoto,
          name: singlePhoto ? "photo.jpg" : "photo_front.jpg",
        },
        ...(singlePhoto
          ? {}
          : {
              back_file: {
                ...photos[1]!,
                name: "photo_back.jpg",
              },
            }),
      });

      if (isApiSuccess(res)) {
        setToast({
          visible: true,
          text: t(res?.message) || t("Submitted successfully"),
          type: "success",
          top: 45,
        });
        navigation.goBack();
        return;
      }

      setToast({
        visible: true,
        text:
          extractDocumentApiError(res) ||
          t(res?.message) ||
          t("Something went wrong. Please try again."),
        type: "error",
        top: 45,
      });
    } catch (error: any) {
      const apiMsg = extractDocumentApiError(error?.response?.data);
      const handled = ErrorHandle(error);
      setToast({
        visible: true,
        text:
          apiMsg ||
          handled?.message ||
          t("Something went wrong. Please try again."),
        type: "error",
        top: 45,
      });
    } finally {
      setLoading(false);
    }
  };

  if (!documentType) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <DetailsHeader title={t("Upload Documents")} />
        <View style={[styles.background, styles.content]}>
          <Text style={styles.sectionHint}>
            {t("Something went wrong. Please try again.")}
          </Text>
          <ButtonComponent
            title={t("Back")}
            onPress={() => navigation.goBack()}
          />
        </View>
      </SafeAreaView>
    );
  }

  const uploadDisabled = loading;

  const slots = useMemo(
    () => Array.from({ length: minPhotos }, (_, i) => i),
    [minPhotos],
  );
  const slotErrorKey = (index: number) =>
    index === 0 ? "front" : index === 1 ? "back" : `photo_${index}`;

  return (
    <>
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <DetailsHeader title={t(typeName)} />
        <View style={styles.background}>
          <KeyboardAwareScrollView
            enableOnAndroid
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
          <View style={styles.introCard}>
            <Text style={styles.introTitle}>{t(typeName)}</Text>
            <Text style={styles.introText}>{subtitle}</Text>
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t("Photos")}</Text>
              <Text style={styles.sectionMeta}>
                {`${photos.filter(Boolean).length}/${minPhotos}`}
              </Text>
            </View>
            <Text style={styles.sectionHint}>
              {singlePhoto
                ? t("Add a clear photo of the document")
                : t("Add clear Front and Back photos of the document")}
            </Text>

            <View style={styles.photoRow}>
              {slots.map((index) => {
                const photo = photos[index];
                const errKey = slotErrorKey(index);
                const slotError = errors[errKey];
                const slotLabel = singlePhoto
                  ? t("Photo")
                  : index === 0
                    ? t("Front")
                    : index === 1
                      ? t("Back")
                      : `${t("Photo")} ${index + 1}`;
                return (
                  <View
                    key={`slot-${index}`}
                    style={[
                      styles.photoColumn,
                      singlePhoto ? styles.photoColumnSingle : null,
                    ]}
                  >
                    <Text style={styles.slotCaption}>
                      {slotLabel}
                      <Text style={styles.required}> *</Text>
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.photoSlot,
                        singlePhoto ? styles.photoSlotSingle : null,
                        photo ? styles.photoSlotFilled : null,
                        slotError ? styles.photoSlotError : null,
                      ]}
                      activeOpacity={0.85}
                      onPress={() => openSourcePicker(index)}
                    >
                      {photo ? (
                        <>
                          <Image
                            source={{ uri: photo.uri }}
                            style={styles.photoPreview}
                          />
                          <View style={styles.photoOverlay}>
                            <View style={styles.retakeBtn}>
                              <Text style={styles.retakeText}>
                                {t("Change")}
                              </Text>
                            </View>
                          </View>
                        </>
                      ) : (
                        <View style={styles.photoPlaceholder}>
                          <View
                            style={[
                              styles.photoIconCircle,
                              slotError ? styles.photoIconCircleError : null,
                            ]}
                          >
                            <Image
                              source={Images.UploadPhoto}
                              style={styles.photoPlaceholderIcon}
                              tintColor={
                                slotError ? Colors.red : Colors.primary
                              }
                            />
                          </View>
                          <Text
                            style={[
                              styles.photoAction,
                              slotError ? styles.photoActionError : null,
                            ]}
                          >
                            {allowCamera
                              ? t("Camera or Gallery")
                              : t("Tap to select")}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                    {slotError ? (
                      <Text style={styles.fieldError}>{slotError}</Text>
                    ) : null}
                  </View>
                );
              })}
            </View>
          </View>

          {requiresExpiry ? (
            <View style={styles.sectionCard}>
              <View style={styles.field}>
                <Text style={styles.label}>
                  {t("Expiry Date")}
                  <Text style={styles.required}> *</Text>
                </Text>
                <Pressable
                  style={[
                    styles.dateField,
                    expiryDate ? styles.dateFieldActive : null,
                    errors.expiry_date ? styles.dateFieldError : null,
                  ]}
                  onPress={() => {
                    setIosExpiryDraft(ymdToDate(expiryDate));
                    setExpiryPickerOpen(true);
                    setErrors((prev) => {
                      if (!prev.expiry_date) return prev;
                      const next = { ...prev };
                      delete next.expiry_date;
                      return next;
                    });
                  }}
                >
                  <Image
                    source={Images.date}
                    style={styles.dateIcon}
                    tintColor={
                      errors.expiry_date
                        ? Colors.red
                        : expiryDate
                          ? Colors.primary
                          : Colors.darkText
                    }
                  />
                  {expiryDate ? (
                    <Text style={styles.dateText}>
                      {formatDate(expiryDate, locale)}
                    </Text>
                  ) : (
                    <Text style={styles.datePlaceholder}>
                      {t("Select Date")}
                    </Text>
                  )}
                </Pressable>
                {errors.expiry_date ? (
                  <Text style={styles.fieldError}>{errors.expiry_date}</Text>
                ) : null}
              </View>
            </View>
          ) : null}

          <ButtonComponent
            title={t("Upload")}
            onPress={onUpload}
            disabled={uploadDisabled}
            marginTop={4}
          />
        </KeyboardAwareScrollView>
      </View>

      {expiryPickerOpen && Platform.OS === "android" ? (
        <DateTimePicker
          value={ymdToDate(expiryDate)}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setExpiryPickerOpen(false);
            if (event.type === "dismissed" || !selectedDate) return;
            setExpiryDate(dateToYmd(selectedDate));
            setErrors((prev) => {
              const next = { ...prev };
              delete next.expiry_date;
              return next;
            });
          }}
        />
      ) : null}

      {Platform.OS === "ios" ? (
        <Modal
          visible={expiryPickerOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setExpiryPickerOpen(false)}
        >
          <Pressable
            style={styles.datePickerBackdrop}
            onPress={() => setExpiryPickerOpen(false)}
          >
            <Pressable
              style={styles.datePickerSheet}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.datePickerHeader}>
                <Pressable onPress={() => setExpiryPickerOpen(false)}>
                  <Text style={styles.datePickerAction}>{t("Cancel")}</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setExpiryDate(dateToYmd(iosExpiryDraft));
                    setExpiryPickerOpen(false);
                    setErrors((prev) => {
                      const next = { ...prev };
                      delete next.expiry_date;
                      return next;
                    });
                  }}
                >
                  <Text
                    style={[styles.datePickerAction, styles.datePickerDone]}
                  >
                    {t("Done")}
                  </Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={iosExpiryDraft}
                mode="date"
                display="spinner"
                onChange={(_event, selectedDate) => {
                  if (selectedDate) setIosExpiryDraft(selectedDate);
                }}
              />
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}

      <LoadingModal visible={loading} message={t("Please wait…")} />
      </SafeAreaView>

      {/* Full-screen overlay outside SafeAreaView; sheet uses bottom inset. */}
      <ImageSourceSheet
        visible={sourceSheetOpen}
        showCamera={allowCamera}
        showGallery
        onClose={() => {
          setSourceSheetOpen(false);
          setPendingSlotIndex(null);
        }}
        onSelect={(source) => {
          void onSourceSelect(source);
        }}
      />
    </>
  );
}
