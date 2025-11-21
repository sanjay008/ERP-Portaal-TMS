import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import Modal from "react-native-modal";
import { Images } from "../assets/images";
import { Colors } from "../utils/colors";

export interface OptionItem {
  id: string | number;
  label: string;
}

interface NoParcelModal {
  visible: boolean;
  title?: string;
  options: OptionItem[];
  onClose: () => void;
  onSubmit: (selected: (string | number)[]) => void;
  selectedValues?: (string | number)[];
  submitText?: string;
  modalStyle?: ViewStyle;
  checkboxColor?: string;
  InfoTitle?: string;
  type?: number;
  personData?: object[] | any;
  OrderId?: number;
}
// !NoParcelItemIds.includes(item.id)
const NoParcelModal: React.FC<NoParcelModal> = ({
  visible,
  title,
  options = [],
  onClose,
  onSubmit,
  selectedValues = [],
  submitText = "Submit",
  modalStyle,
  checkboxColor = "#007AFF",
  InfoTitle,
  type = 0,
  personData = [],
  OrderId = 0,
}) => {
  const [selected, setSelected] = useState<(string | number)[]>(selectedValues);
  const [showReasonList, setShowReasonList] = useState<boolean>(false);
  const [showDeliveredAtList, setShowDeliveredAtList] =
    useState<boolean>(false);

  const getTitle = () => {
    if (showReasonList) return t("Reason not Delivered");
    if (showDeliveredAtList) return t("Delivered at");
    return InfoTitle || t("Order Delivery Info");
  };

  const { t } = useTranslation();
  useEffect(() => {
    setSelected(selectedValues);
  }, [selectedValues]);

  const toggleOption = (id: string | number) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={onClose}
      animationIn="bounceInUp"
      animationOut="bounceOutDown"
      backdropOpacity={0.4}
      useNativeDriver
    >
      <View style={[styles.container, modalStyle]}>
        <Text style={styles.title}>{getTitle()}</Text>

        <View
          style={{
            backgroundColor: Colors.background, 
            padding: 10,
            marginBottom: 15,
          }}
        >
          <View style={styles.TopContainer}>
            <View
              style={[
                styles.NumberBox,
                (type === 1 || type === 2) && { backgroundColor: Colors.green },
              ]}
            >
              {type === 0 ? (
                <Text style={styles.Text}>1</Text>
              ) : (
                <Image
                  source={Images.user}
                  style={{ width: 20, height: 20 }}
                  tintColor={Colors.white}
                />
              )}
            </View>

            <View style={{ marginLeft: 10 }}>
              <Text style={[styles.Text, { fontSize: 16, fontWeight: "600" }]}>
                {personData?.display_name || ""}
              </Text>
              <Text style={[styles.OrderIdText, { color: Colors.orderdark }]}>
                {`#${OrderId}`}
              </Text>
            </View>
          </View>
        </View>

        <FlatList
          data={options}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.optionRow}
              onPress={() => toggleOption(item.id)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={
                  selected.includes(item.id) ? "checkbox" : "square-outline"
                }
                size={24}
                color={checkboxColor}
              />
              <Text style={styles.optionText}>{item.label}</Text>
            </TouchableOpacity>
          )}
        />

        <TouchableOpacity
          style={styles.submitButton}
          onPress={() => onSubmit(selected)}
        >
          <Text style={styles.submitText}>{submitText}</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

export default NoParcelModal;

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderRadius: 16,
    // padding: 20,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 16,
    marginTop:10,
    marginHorizontal:10
  },
  optionRow: {
    
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    marginHorizontal:10
  },
  optionText: {
    width:'90%',
    // backgroundColor:'red',
    fontFamily:"Medium",
    fontSize: 14,
    marginLeft: 10,
    color: Colors.darkText,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 20,
    alignItems: "center",
    marginHorizontal:10,
    bottom:10
  },
  submitText: {
    color: Colors.white,
    fontSize: 14,
    fontFamily:"Medium"
  },
  Text: { fontSize: 15, fontFamily: "SemiBold", color: Colors.black },
  TopContainer: { flexDirection: "row", gap: 15, alignItems: "center" },
  NumberBox: {
    width: 40,
    height: 40,
    backgroundColor: Colors.Boxgray,
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  OrderIdText: { fontSize: 13, color: Colors.orderdark, fontFamily: "Medium" },
});
