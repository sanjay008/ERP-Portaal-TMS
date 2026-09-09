import { Images } from "@/src/assets/images";
import { Colors } from "@/src/utils/colors";
import { FONTS } from "@/src/utils/storeData";
import React from "react";
import { useTranslation } from "react-i18next";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Modal from "react-native-modal";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  visible: boolean;
  onClose: () => void;
  onCamera: () => void;
  onGallery: () => void;
};

export default function ProfilePhotoPickerModal({
  visible,
  onClose,
  onCamera,
  onGallery,
}: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      isVisible={visible}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      backdropColor="rgba(0,0,0,0.45)"
      onBackdropPress={onClose}
      onBackButtonPress={onClose}
      useNativeDriver
      hideModalContentWhileAnimating
      statusBarTranslucent
      style={styles.modalHost}
    >
      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.handle} />
        <View style={styles.header}>
          <Text style={styles.title}>{t("Update profile photo")}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <Image source={Images.Close} style={styles.closeIcon} />
          </TouchableOpacity>
        </View>
        <Text style={styles.subtitle}>{t("Choose an option")}</Text>

        <TouchableOpacity
          style={styles.optionBtn}
          activeOpacity={0.85}
          onPress={() => {
            onClose();
            onCamera();
          }}
        >
          <View style={styles.optionIconWrap}>
            <Image source={Images.UploadPhoto} style={styles.optionIcon} />
          </View>
          <Text style={styles.optionText}>{t("Camera")}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.optionBtn}
          activeOpacity={0.85}
          onPress={() => {
            onClose();
            onGallery();
          }}
        >
          <View style={[styles.optionIconWrap, styles.optionIconWrapAlt]}>
            <Image source={Images.GalleryIcon} style={styles.optionIcon} />
          </View>
          <Text style={styles.optionText}>{t("Gallery")}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
          <Text style={styles.cancelText}>{t("Cancel")}</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalHost: {
    justifyContent: "flex-end",
    margin: 0,
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  handle: {
    alignSelf: "center",
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.litegray,
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontFamily: FONTS.SemiBold,
    color: Colors.black,
  },
  closeIcon: {
    width: 22,
    height: 22,
    tintColor: Colors.darkText,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: FONTS.Regular,
    color: Colors.darkText,
    marginBottom: 16,
  },
  optionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.Boxgray,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
    backgroundColor: Colors.white,
  },
  optionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.primarylite,
    alignItems: "center",
    justifyContent: "center",
  },
  optionIconWrapAlt: {
    backgroundColor: Colors.litegreen,
  },
  optionIcon: {
    width: 22,
    height: 22,
    tintColor: Colors.primary,
  },
  optionText: {
    fontSize: 15,
    fontFamily: FONTS.Medium,
    color: Colors.black,
  },
  cancelBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    marginTop: 4,
  },
  cancelText: {
    fontSize: 15,
    fontFamily: FONTS.Medium,
    color: Colors.darkText,
  },
});
