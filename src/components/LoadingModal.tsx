import React from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Modal from "react-native-modal";
import { Colors } from "../utils/colors";


interface LoadingModalProps {
  visible: boolean;
  message?: string;
  cancelable?: boolean;
  onCancel?: () => void;
  theme?: "light" | "dark"; 
}

const LoadingModal: React.FC<LoadingModalProps> = ({
  visible,
  message,
  cancelable = false,
  onCancel,
  theme = "light",
}) => {
  const { t } = useTranslation();

  const isDark = theme === "dark";

  return (
    <Modal
      isVisible={visible}
      animationIn="fadeIn"
      animationOut="fadeOut"
      backdropOpacity={0.4}
      useNativeDriver
         propagateSwipe={true}
        coverScreen={true}
      hideModalContentWhileAnimating
      style={{
    margin: 0,
    zIndex: 9999,             
  }}
    >
      <View style={styles.modalContainer}>
        <View
          style={[
            styles.loaderBox,
            { backgroundColor: isDark ? Colors.black : Colors.white },
          ]}
        >
          <ActivityIndicator
            size="large"
            color={isDark ? Colors.primary : Colors.primary}
          />
          <Text
            style={[
              styles.messageText,
              { color: isDark ? Colors.white : Colors.black },
            ]}
          >
            {message || t("Loading... Please wait")}
          </Text>

          {cancelable && (
            <TouchableOpacity
              style={[
                styles.cancelBtn,
                { backgroundColor: Colors.green },
              ]}
              disabled={visible}
              onPress={onCancel}
            >
              <Text style={styles.cancelText}>{t("Cancel")}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};

export default LoadingModal;

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loaderBox: {
    borderRadius: 14,
    paddingVertical: 35,
    paddingHorizontal: 45,
    alignItems: "center",
    shadowColor: Colors.black,
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 8,
  },
  messageText: {
    marginTop: 18,
    fontSize: 16,
    fontFamily:"Medium",
    textAlign: "center",
  },
  cancelBtn: {
    marginTop: 22,
    paddingVertical: 10,
    paddingHorizontal: 25,
    borderRadius: 10,
  },
  cancelText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: "600",
  },
});
