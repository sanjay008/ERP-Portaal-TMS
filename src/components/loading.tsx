import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Colors } from "../utils/colors";
const Loader = ({color}:any) => {
  return (
    <View>
      <ActivityIndicator
        animating={true}
        size={'large'}
        color={color? color : Colors.primary}
      />
    </View>
  );
};

export default Loader;
