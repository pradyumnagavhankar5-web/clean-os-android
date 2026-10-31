import React from 'react';
import { Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../ui';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  return <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.background }}>
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.teal, tabBarInactiveTintColor: colors.muted, tabBarAllowFontScaling: true, tabBarStyle: { backgroundColor: colors.white, borderTopColor: colors.border, height: 64 + insets.bottom, paddingBottom: Math.max(insets.bottom, 8), paddingTop: 8 }, tabBarItemStyle: { minHeight: 48 }, tabBarLabelStyle: { fontSize: 11, fontWeight: '600' } }}>
      <Tabs.Screen name="index" options={{ title: 'Overview', tabBarIcon: ({color,size}) => <Ionicons name="grid-outline" size={size} color={typeof color === 'string' ? color : colors.muted} /> }} />
      <Tabs.Screen name="tasks" options={{ title: 'Tasks', tabBarIcon: ({color,size}) => <Ionicons name="checkbox-outline" size={size} color={typeof color === 'string' ? color : colors.muted} /> }} />
      <Tabs.Screen name="inventory" options={{ title: 'Stock', tabBarIcon: ({color,size}) => <Ionicons name="cube-outline" size={size} color={typeof color === 'string' ? color : colors.muted} /> }} />
      <Tabs.Screen name="facilities" options={{ title: 'Facilities', tabBarIcon: ({color,size}) => <Ionicons name="business-outline" size={size} color={typeof color === 'string' ? color : colors.muted} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({color,size}) => <Ionicons name="person-circle-outline" size={size} color={typeof color === 'string' ? color : colors.muted} /> }} />
    </Tabs>
  </SafeAreaView>;
}
