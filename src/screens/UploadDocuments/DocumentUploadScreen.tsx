import { Images } from "@/src/assets/images";
import ButtonComponent from "@/src/components/buttonComponent";
import { formatDate, toApiDateString } from "@/src/components/DateFormate";
import DetailsHeader from "@/src/components/DetailsHeader";
import { useErrorHandle } from "@/src/components/ErrorHandle";
import LoadingModal from "@/src/components/LoadingModal";
import { GlobalContextData } from "@/src/context/GlobalContext";
import { Colors } from "@/src/utils/colors";
import { FONTS } from "@/src/utils/storeData";
import { useNavigation, useRoute } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import React, { useContext, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Image,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Calendar } from "react-native-calendars";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import Modal from "react-native-modal";
import { SafeAreaView } from "react-native-safe-area-context";
import { styles } from "./styles";
import type { PickedDocumentFile, QuickUploadType } from "./types";
import {
  extractDocumentApiError,
  isApiSuccess,
  quickUploadDocuments,
} from "./uploadDocumentsApi";

const calendarTheme = {
  backgroundColor: Colors.white,
  calendarBackground: Colors.white,
  textSectionTitleColor: Colors.darkText,
  selectedDayBackgroundColor: Colors.primary,
  selectedDayTextColor: Colors.white,
  todayTextColor: Colors.primary,
  dayTextColor: Colors.black,
  monthTextColor: Colors.black,
  textMonthFontSize: 18,
  textMonthFontWeight: "600",
  textMonthFontFamily: FONTS.SemiBold,
  arrowColor: Colors.black,
  textDayFontSize: 15,
  textDayHeaderFontSize: 13,
  textDayFontWeight: "400",
  textDayFontFamily: FONTS.Regular,
  textDayHeaderFontFamily: FONTS.Medium,
  "stylesheet.calendar.header": {
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginHorizontal: 10,
      marginTop: 10,
      marginBottom: 10,
    },
    monthText: {
      fontSize: 18,
      fontWeight: "600",
      fontFamily: FONTS.SemiBold,
      color: Colors.black,
    },
    dayHeader: {
      fontSize: 13,
      fontFamily: FONTS.Medium,
      color: Colors.darkText,
    },
  },
  "stylesheet.day.basic": {
    base: {
      width: 32,
      height: 32,
      alignItems: "center",
      justifyContent: "center",
    },
    text: {
      fontSize: 15,
      fontFamily: FONTS.Regular,
      color: Colors.black,
    },
  },
} as any;

function assetToFile(asset: ImagePicker.ImagePickerAsset): PickedDocumentFile {
  return {
    uri: asset.uri,
    name: asset.fileName || `document_${Date.now()}.jpg`,
    type: asset.mimeType || "image/jpeg",
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
  const minPhotos = Math.max(1, Number(documentType?.min_photos || 2));
  const requiresExpiry = documentType?.expire_date_required !== false;
  const allowCamera = documentType?.allow_camera !== false;
  const typeName = documentType?.type || "";
  const typeSlug = documentType?.slug || "";

  const [photos, setPhotos] = useState<(PickedDocumentFile | null)[]>([
    null,
    null,
  ]);
  const [expiryDate, setExpiryDate] = useState("");
  const [expiryPickerOpen, setExpiryPickerOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const locale = SelectLanguage || i18n.language || "en";
  const capturedCount = useMemo(
    () => photos.filter(Boolean).length,
    [photos],
  );

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

  const openCamera = async () => {
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
    });

    if (result.canceled || !result.assets?.[0]) return null;
    return assetToFile(result.assets[0]);
  };

  const openGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      setToast({
        visible: true,
        text: t("Permission denied"),
        type: "error",
        top: 45,
      });
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsMultipleSelection: false,
    });

    if (result.canceled || !result.assets?.[0]) return null;
    return assetToFile(result.assets[0]);
  };

  const capturePhotoAt = async (index: number) => {
    const file = allowCamera ? await openCamera() : await openGallery();
    if (!file) return;
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
      return next;
    });
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!photos[0]) {
      next.front = t("This field is required");
    }
    if (!photos[1]) {
      next.back = t("This field is required");
    }
    if (requiresExpiry && !expiryDate) {
      next.expiry_date = t("This field is required");
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onUpload = async () => {
    if (!documentType || !validate()) return;

    const frontPhoto = photos[0];
    const backPhoto = photos[1];
    if (!frontPhoto || !backPhoto) return;

    setLoading(true);
    try {
      const res = await quickUploadDocuments(UserData, {
        type: typeName || typeSlug,
        expire_date: requiresExpiry ? toApiDateString(expiryDate) : undefined,
        front_file: {
          ...frontPhoto,
          name: "photo_front.jpg",
        },
        back_file: {
          ...backPhoto,
          name: "photo_back.jpg",
        },
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
          <ButtonComponent title={t("Back")} onPress={() => navigation.goBack()} />
        </View>
      </SafeAreaView>
    );
  }

  const uploadDisabled =
    !photos[0] || !photos[1] || (requiresExpiry && !expiryDate);

  const slots = [0, 1];

  return (
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
            <Text style={styles.sectionTitle}>{t("Photos")}</Text>

            <View style={styles.progressRow}>
              {slots.map((index) => (
                <View
                  key={`chip-${index}`}
                  style={[
                    styles.progressChip,
                    photos[index] ? styles.progressChipDone : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.progressChipText,
                      photos[index] ? styles.progressChipTextDone : null,
                    ]}
                  >
                    {`${t("Photo")} ${index + 1}`} {photos[index] ? "✓" : ""}
                  </Text>
                </View>
              ))}
            </View>

            <View style={styles.photoRow}>
              {slots.map((index) => {
                const photo = photos[index];
                const slotLabel =
                  index === 0
                    ? t("Front")
                    : index === 1
                      ? t("Back")
                      : `${t("Photo")} ${index + 1}`;
                return (
                  <TouchableOpacity
                    key={`slot-${index}`}
                    style={[
                      styles.photoSlot,
                      photo ? styles.photoSlotFilled : null,
                    ]}
                    activeOpacity={0.85}
                    onPress={() => capturePhotoAt(index)}
                  >
                    {photo ? (
                      <>
                        <Image
                          source={{ uri: photo.uri }}
                          style={styles.photoPreview}
                        />
                        <View style={styles.retakeBtn}>
                          <Text style={styles.retakeText}>{t("Retake")}</Text>
                        </View>
                      </>
                    ) : (
                      <View style={styles.photoPlaceholder}>
                        <Image
                          source={Images.UploadPhoto}
                          style={styles.photoPlaceholderIcon}
                        />
                        <Text style={styles.photoLabel}>{slotLabel}</Text>
                        <Text style={styles.photoAction}>
                          {allowCamera
                            ? t("Tap to capture")
                            : t("Tap to select")}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {errors.front || errors.back ? (
              <Text style={styles.error}>
                {errors.front || errors.back}
              </Text>
            ) : null}
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
                  ]}
                  onPress={() => setExpiryPickerOpen(true)}
                >
                  <Image
                    source={Images.date}
                    style={styles.dateIcon}
                    tintColor={expiryDate ? Colors.primary : Colors.darkText}
                  />
                  {expiryDate ? (
                    <Text style={styles.dateText}>
                      {formatDate(expiryDate, locale)}
                    </Text>
                  ) : (
                    <Text style={styles.datePlaceholder}>{t("Select Date")}</Text>
                  )}
                </Pressable>
                {errors.expiry_date ? (
                  <Text style={styles.error}>{errors.expiry_date}</Text>
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

      <Modal
        isVisible={expiryPickerOpen}
        animationIn="zoomIn"
        animationOut="zoomOut"
        backdropColor="rgba(0,0,0,0.4)"
        onBackButtonPress={() => setExpiryPickerOpen(false)}
        onBackdropPress={() => setExpiryPickerOpen(false)}
        useNativeDriver
        hideModalContentWhileAnimating
        statusBarTranslucent
      >
        <View style={styles.calendarModal}>
          <Calendar
            onDayPress={(day) => {
              setExpiryDate(day.dateString);
              setExpiryPickerOpen(false);
              setErrors((prev) => {
                const next = { ...prev };
                delete next.expiry_date;
                return next;
              });
            }}
            markedDates={
              expiryDate
                ? {
                    [expiryDate]: {
                      selected: true,
                      selectedColor: Colors.primary,
                    },
                  }
                : {}
            }
            theme={calendarTheme}
          />
        </View>
      </Modal>

      <LoadingModal visible={loading} message={t("Please wait…")} />
    </SafeAreaView>
  );
}
