import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Image, StyleSheet, View } from "react-native";
import { Dropdown } from "react-native-element-dropdown";
import { Images } from "../assets/images";
import { Colors } from "../utils/colors";

type DropdownItem = {
  [key: string]: string | number;
};

type Props = {
  data: DropdownItem[] | any;
  value: string | number | null;
  setValue: (value: string | number) => void;
  placeholder?: string;
  iconName?: keyof typeof Ionicons.glyphMap;
  labelFieldKey?: string;
  valueFieldKey?: string;
  ContainerStyle?: object;
  disbled?: boolean;
  fun?:(value:any) => void;
};

const DropDownBox: React.FC<Props> = ({
  data,
  value,
  setValue,
  placeholder = "Select Region",
  iconName = "location-outline",
  labelFieldKey = "name",
  valueFieldKey = "name",
  ContainerStyle,
  disbled = false,
  fun,
}) => {
  const { t } = useTranslation();
    const [isFocus, setIsFocus] = useState(false);
  return (
    <View style={[styles.container, ContainerStyle]}>
      <Dropdown
        disable={disbled}
        style={[styles.dropdown]}
        data={data}
        labelField={labelFieldKey}
        valueField={valueFieldKey}
        placeholder={t(placeholder)}
        containerStyle={[styles.container,{width:'92%'}]}
        value={value}
        onChange={(item) => {
          setValue(item);
          fun?.(item)
        }}
            onFocus={() => {
          setIsFocus(true);
    
        }}
        onBlur={() => {
          setIsFocus(false);
    
        }}
        renderLeftIcon={() => (
          <Image
            source={Images.location}
            style={{ width: 22, height: 22, marginRight: 10 }}
          />
        )}
        renderRightIcon={() => (
          <Image
            source={Images.DropIcon}
            style={{ width: 20, height: 20,transform:[{rotate:isFocus ? '180deg' : '0deg'}]}}
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
    backgroundColor: Colors.white,
    borderRadius: 7,
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
    color: Colors.black,
    fontFamily: "regular",
  },
});

export default DropDownBox;
