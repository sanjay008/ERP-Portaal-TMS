import { Colors } from '@/src/utils/colors';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
export default function RootLayout() {

  return (
    <>
     <StatusBar style="dark" backgroundColor={Colors.white} />
      <Stack initialRouteName='index'>
        <Stack.Screen name="index" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}
