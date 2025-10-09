import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Image, StyleSheet, View } from "react-native";
import { Dropdown } from "react-native-element-dropdown";
import { Images } from "../assets/images";
import { Colors } from "../utils/colors";

type DropdownItem = {
  [key: string]: string | number;
};

type Props = {
  data: DropdownItem[];
  value: string | number | null;
  setValue: (value: string | number) => void;
  placeholder?: string;
  iconName?: keyof typeof Ionicons.glyphMap;
  labelFieldKey?: string;
  valueFieldKey?: string;
};

const DropDownBox: React.FC<Props> = ({
  data,
  value,
  setValue,
  placeholder = "Select option",
  iconName = "location-outline",
  labelFieldKey = "label",
  valueFieldKey = "value",
}) => {
  return (
    <View style={styles.container}>
      <Dropdown
        style={styles.dropdown}
        data={data}
        labelField={labelFieldKey}
        valueField={valueFieldKey}
        placeholder={placeholder}
        value={value}
        onChange={(item) => {
          if (item && item[valueFieldKey] !== undefined) {
            setValue(item[valueFieldKey]);
          }
        }}
        renderLeftIcon={() => (
          <Image
            source={Images.location}
            style={{ width: 22, height: 22, marginRight: 10 }}
          />
        )}
        placeholderStyle={styles.placeholderStyle}
        selectedTextStyle={styles.selectedTextStyle}
        itemTextStyle={styles.itemTextStyle}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
    backgroundColor:Colors.white
  },
  dropdown: {
    height: 50,
    borderColor: Colors.primary,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  icon: {
    marginRight: 8,
  },
  placeholderStyle: {
    fontSize: 16,
    color: Colors.darkText,
    fontFamily: "regular",
  },
  selectedTextStyle: {
    fontSize: 16,
    color: Colors.black,
    fontFamily: "regular",
  },
  itemTextStyle: {
    fontSize: 15,
  },
});

export default DropDownBox;
