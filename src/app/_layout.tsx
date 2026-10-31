import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider, useApp } from '../state/AppProvider';
import { colors } from '../ui';

function Routes() {
  const { state } = useApp();
  return <>
    <StatusBar style="dark" />
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background }, animation: 'slide_from_right' }}>
      <Stack.Protected guard={!state.onboardingDone}>
        <Stack.Screen name="welcome" />
      </Stack.Protected>
      <Stack.Protected guard={state.onboardingDone && !state.session}>
        <Stack.Screen name="login" />
      </Stack.Protected>
      <Stack.Protected guard={state.onboardingDone && !!state.session}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="task/[id]" options={{ headerShown: true, title: 'Cleaning task', headerTintColor: colors.navy, headerShadowVisible: false }} />
      </Stack.Protected>
    </Stack>
  </>;
}
export default function RootLayout() {
  return <SafeAreaProvider><AppProvider><Routes /></AppProvider></SafeAreaProvider>;
}
