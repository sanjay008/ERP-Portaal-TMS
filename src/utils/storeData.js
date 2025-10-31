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

export { clearAllData, getData, storeData };

export const token = "lbws07ifTs076zQH4Jo3ktN8tWgaS9ASh";


export const SimpleFlex = StyleSheet.create({
  Flex: {
   flexDirection:'row',
   alignItems:'center',
   gap:10,
}
});






export const { height, width } = Dimensions.get("window");