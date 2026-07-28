import AsyncStorage from '@react-native-async-storage/async-storage';
import { Dimensions, StyleSheet } from 'react-native';

const storeData = async (key, value) => {
  try {
    const jsonValue = JSON.stringify(value);
    await AsyncStorage.setItem(key, jsonValue);
  } catch (e) {
    console.log(e);
  }
};

const getData = async key => {
  try {
    const jsonValue = await AsyncStorage.getItem(key);
    return jsonValue != null ? JSON.parse(jsonValue) : null;
  } catch (e) {
    console.log(e);
  }
};

const clearAllData = async () => {
  try {
    await AsyncStorage.clear();
  } catch (e) {
    console.log(e);
  }
};

const removeData = async key => {
  try {
    await AsyncStorage.removeItem(key);
  } catch (e) {
    console.log(e);
  }
};

const removeMultipleData = async keys => {
  try {
    await AsyncStorage.multiRemove(keys);
  } catch (e) {
    console.log(e);
  }
};

export { clearAllData, getData, removeData, removeMultipleData, storeData };

export const token = "lbws07ifTs076zQH4Jo3ktN8tWgaS9ASh";
export const ScanPlatFormId = "mobile"
export const Stop_PickupType = "pickup"
export const SimpleFlex = StyleSheet.create({
  Flex: {
   flexDirection:'row',
   alignItems:'center',
   gap:10,
},
SpaceBetween: {
  width:"100%",
  flexDirection:'row',
  alignItems:'center',
  justifyContent:'space-between',
},
});

export const FONTS = {
  Regular:"regular",
  Bold: "Bold",
  SemiBold: "SemiBold",
  ExtraBold: "ExtraBold",
  ExtraLight:"ExtraLight",
  Medium: "Medium",
  Thin: "Thin",
};



export const { height, width } = Dimensions.get("window");