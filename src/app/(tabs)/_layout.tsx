import React, { type ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';
import { Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../ui';

type IconName = ComponentProps<typeof Ionicons>['name'];

function NavigationIcon({ name, focused, color }: { name: IconName; focused: boolean; color: unknown }) {
  return (
    <View style={[styles.iconContainer, focused && styles.iconContainerActive]}>
      <Ionicons name={name} size={21} color={typeof color === 'string' ? color : colors.muted} accessible={false} />
    </View>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
      <Tabs screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.tealDark,
        tabBarInactiveTintColor: colors.muted,
        tabBarAllowFontScaling: true,
        tabBarLabelPosition: 'below-icon',
        tabBarHideOnKeyboard: true,
        tabBarStyle: [styles.tabBar, { height: 70 + insets.bottom, paddingBottom: Math.max(insets.bottom, 8) }],
        tabBarItemStyle: styles.tabItem,
        tabBarLabelStyle: styles.tabLabel,
      }}>
        <Tabs.Screen name="index" options={{ title: 'Overview', tabBarIcon: ({ color, focused }) => <NavigationIcon name={focused ? 'grid' : 'grid-outline'} color={color} focused={focused} /> }} />
        <Tabs.Screen name="tasks" options={{ title: 'Tasks', tabBarIcon: ({ color, focused }) => <NavigationIcon name={focused ? 'checkbox' : 'checkbox-outline'} color={color} focused={focused} /> }} />
        <Tabs.Screen name="inventory" options={{ title: 'Stock', tabBarIcon: ({ color, focused }) => <NavigationIcon name={focused ? 'cube' : 'cube-outline'} color={color} focused={focused} /> }} />
        <Tabs.Screen name="facilities" options={{ title: 'Facilities', tabBarIcon: ({ color, focused }) => <NavigationIcon name={focused ? 'business' : 'business-outline'} color={color} focused={focused} /> }} />
        <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color, focused }) => <NavigationIcon name={focused ? 'person-circle' : 'person-circle-outline'} color={color} focused={focused} /> }} />
      </Tabs>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  tabBar: { backgroundColor: colors.white, borderTopColor: colors.border, borderTopWidth: 1, paddingTop: 6, elevation: 6, shadowColor: colors.navy, shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.04, shadowRadius: 12 },
  tabItem: { minHeight: 48 },
  tabLabel: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  iconContainer: { width: 48, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  iconContainerActive: { backgroundColor: colors.tealLight },
});
