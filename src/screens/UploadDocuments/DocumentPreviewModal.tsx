import { Images } from "@/src/assets/images";
import { Colors } from "@/src/utils/colors";
import { FONTS } from "@/src/utils/storeData";
import React from "react";
import { useTranslation } from "react-i18next";
import {
  Dimensions,
  Image,
  Linking,
  Modal,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  visible: boolean;
  title?: string;
  imageUri?: string | null;
  downloadUrl?: string | null;
  onClose: () => void;
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function DocumentPreviewModal({
  visible,
  title,
  imageUri,
  downloadUrl,
  onClose,
}: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const onDownload = async () => {
    if (!downloadUrl) return;
    try {
      await Linking.openURL(downloadUrl);
    } catch {
      // no-op
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <StatusBar backgroundColor="rgba(0,0,0,0.92)" barStyle="light-content" />
      <View style={styles.backdrop}>
        <View
          style={[
            styles.header,
            { paddingTop: Math.max(insets.top, 12), paddingBottom: 12 },
          ]}
        >
          <Text style={styles.title} numberOfLines={1}>
            {title || t("Document")}
          </Text>
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <Image source={Images.Close} style={styles.closeIcon} />
          </TouchableOpacity>
        </View>

        <Pressable style={styles.imageWrap} onPress={onClose}>
          {imageUri ? (
            <Image
              source={{ uri: imageUri }}
              style={styles.image}
              resizeMode="contain"
            />
          ) : null}
        </Pressable>

        {downloadUrl ? (
          <TouchableOpacity
            style={[
              styles.downloadBtn,
              { marginBottom: Math.max(insets.bottom, 16) },
            ]}
            onPress={onDownload}
            activeOpacity={0.85}
          >
            <Text style={styles.downloadText}>{t("Download")}</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ height: Math.max(insets.bottom, 16) }} />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    gap: 12,
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontFamily: FONTS.SemiBold,
    color: Colors.white,
  },
  closeIcon: {
    width: 22,
    height: 22,
    tintColor: Colors.white,
  },
  imageWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  image: {
    width: SCREEN_WIDTH - 24,
    height: SCREEN_HEIGHT * 0.72,
  },
  downloadBtn: {
    alignSelf: "center",
    backgroundColor: Colors.primary,
    borderRadius: 7,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 8,
  },
  downloadText: {
    fontSize: 14,
    fontFamily: FONTS.SemiBold,
    color: Colors.white,
  },
});
