import { Stack } from 'expo-router';
import React from 'react';

export default function RootLayout() {

  return (
      <Stack initialRouteName='index'>
        <Stack.Screen name="index" options={{ headerShown: false }} />
      </Stack>
  );
}
