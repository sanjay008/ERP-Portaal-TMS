import React from "react";
import { useTranslation } from "react-i18next";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Modal from "react-native-modal";
import { RFPercentage } from "react-native-responsive-fontsize";
import { Images } from "../assets/images";
import { Colors } from "../utils/colors";

type Props = {
  IsVisible: boolean;
  onClose?: () => void;
  Icon?: React.ReactNode;
  Title?: string;
  LeftButtonText?: string;
  RightButtonText?: string;
  RightBgColor?: string | any;
  LeftBGColor?: string | any;
  RightButtonIcon?: React.ReactNode | any;
  Description?: string;
  LTextColor?: any;
  RTextColor?: any;
  onPress?: () => void;
};
export default function ConformationModal({
  IsVisible,
  onClose,
  Icon,
  Title,
  LeftButtonText,
  RightButtonText,
  RightBgColor,
  LeftBGColor,
  RightButtonIcon,
  Description,
  LTextColor,
  RTextColor,
  onPress,
}: Props) {
  const { t } = useTranslation();
  return (
    <Modal
      isVisible={IsVisible}
      animationIn={"bounceInUp"}
      animationOut={"bounceOutDown"}
      onBackdropPress={onClose}
      onBackButtonPress={onClose}
      style={{ margin: 0, justifyContent: "center", alignItems: "center" }}
    >
      <View style={styles.Container}>
        <View style={styles.Header}>
          <Image source={Icon || Images.DeleteBtn} style={styles.Icon} />
          <View style={{width:'90%'}}>
            <Text style={styles.Text}>{Title || t("Title")}</Text>
            {(Description || "").length > 0 && (
              <Text style={styles.Description}>
                {Description || t("Desctiption")}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.ButtonContainer}>
          <TouchableOpacity
            style={[
              styles.ButtonStyle,
              { backgroundColor: LeftBGColor || Colors.Boxgray },
            ]}
            onPress={onClose}
          >
            <Text
              style={[styles.ButtonText, { color: LTextColor || Colors.black }]}
            >
              {LeftButtonText || t("Cancel")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.ButtonStyle,
              { backgroundColor: RightBgColor || Colors.Boxgray },
            ]}
            onPress={() => {
              if (onPress) {
                onPress();
              }
              onClose?.();
            }}
          >
            {RightButtonIcon && (
              <Image
                source={RightButtonIcon}
                style={{ width: 24, height: 24 }}
              />
            )}
            <Text
              style={[styles.ButtonText, { color: RTextColor || Colors.black }]}
            >
              {RightButtonText || t("Okay")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  Container: {
    width: "90%",
    backgroundColor: Colors.white,
    alignSelf: "center",
    borderRadius: 7,
    overflow: "hidden",
    // paddingVertical: 15,
  },
  Icon: {
    width: 48,
    height: 48,
  },
  Header: {
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderColor: Colors.modalBorder,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
    paddingVertical: 10,
  },
  Text: {
    fontFamily: "Medium",
    fontSize: 15,
    color: Colors.black,
  },
  ButtonContainer: {
    width: "100%",
    paddingHorizontal: 15,
    paddingVertical: 15,
    backgroundColor: Colors.white,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  ButtonStyle: {
    width: "48%",
    height: RFPercentage(6),
    backgroundColor: Colors.BtnBg,
    borderRadius: 5,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  ButtonText: {
    fontSize: 15,
    fontFamily: "Medium",
    color: Colors.black,
    textAlign: "center",
  },
  Description: {
    fontSize: 13,
    fontFamily: "regular",
    color: Colors.darkText,
    width:"90%",
  },
});
