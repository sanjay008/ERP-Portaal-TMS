import AsyncStorage from '@react-native-async-storage/async-storage';
import { useWindowDimensions } from 'react-native';

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

export const SimpleFlex = {
   flexDirection:'row',
   alignItems:'center',
   gap:5
}


export const {width,height} = useWindowDimensions();