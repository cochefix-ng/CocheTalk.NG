import { BlurView } from 'expo-blur';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { Tabs } from 'expo-router';
import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';
import { SymbolView } from 'expo-symbols';
import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Platform, StyleSheet, Text, View, useColorScheme } from 'react-native';

import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';

function UnreadBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <View style={{ position: 'absolute', top: -4, right: -6, backgroundColor: '#EF4444', borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 }}>
      <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>{count > 9 ? '9+' : count}</Text>
    </View>
  );
}

function NativeTabLayout({ hideProTab, hideMarketplace, hideClinic, unreadCount }: { hideProTab: boolean; hideMarketplace: boolean; hideClinic: boolean; unreadCount: number }) {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: 'bubble.left.and.bubble.right', selected: 'bubble.left.and.bubble.right.fill' }} />
        <Label>Forum</Label>
      </NativeTabs.Trigger>
      {!hideProTab && (
        <NativeTabs.Trigger name="pro">
          <Icon sf={{ default: 'lock.shield', selected: 'lock.shield.fill' }} />
          <Label>Pro</Label>
        </NativeTabs.Trigger>
      )}
      {!hideMarketplace && (
        <NativeTabs.Trigger name="marketplace">
          <Icon sf={{ default: 'cart', selected: 'cart.fill' }} />
          <Label>Market</Label>
        </NativeTabs.Trigger>
      )}
      <NativeTabs.Trigger name="messages">
        <Icon sf={{ default: 'message.badge', selected: 'message.badge.fill' }} />
        <Label>{unreadCount > 0 ? `Messages (${unreadCount})` : 'Messages'}</Label>
      </NativeTabs.Trigger>
      {!hideClinic && (
        <NativeTabs.Trigger name="clinic">
          <Icon sf={{ default: 'stethoscope', selected: 'stethoscope' }} />
          <Label>Clinic</Label>
        </NativeTabs.Trigger>
      )}
      <NativeTabs.Trigger name="profile">
        <Icon sf={{ default: 'person.crop.circle', selected: 'person.crop.circle.fill' }} />
        <Label>Profile</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout({ hideProTab, hideMarketplace, hideClinic, unreadCount }: { hideProTab: boolean; hideMarketplace: boolean; hideClinic: boolean; unreadCount: number }) {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const isIOS = Platform.OS === 'ios';
  const isWeb = Platform.OS === 'web';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        tabBarStyle: isWeb
          ? {
              position: 'absolute',
              backgroundColor: colors.background,
              borderTopWidth: 1,
              borderTopColor: colors.border,
              elevation: 0,
              height: 84,
            }
          : {
              position: 'absolute',
              bottom: isIOS ? 24 : 16,
              left: 16,
              right: 16,
              height: 64,
              borderRadius: 28,
              borderTopWidth: 0,
              backgroundColor: isIOS ? 'transparent' : isDark ? '#1a1a1a' : '#ffffff',
              elevation: 16,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: isDark ? 0.45 : 0.18,
              shadowRadius: 16,
              overflow: 'hidden',
            },
        tabBarItemStyle: isWeb ? {} : { paddingVertical: 4 },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={85}
              tint={isDark ? 'systemChromeMaterialDark' : 'systemChromeMaterial'}
              style={StyleSheet.absoluteFill}
            />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]} />
          ) : null,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Forum',
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="bubble.left.and.bubble.right" tintColor={color} size={22} />
            ) : (
              <Feather name="message-square" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="pro"
        options={{
          title: 'Pro',
          href: hideProTab ? null : undefined,
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="lock.shield" tintColor={color} size={22} />
            ) : (
              <Feather name="lock" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="marketplace"
        options={{
          title: 'Market',
          href: hideMarketplace ? null : undefined,
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="cart" tintColor={color} size={22} />
            ) : (
              <Feather name="shopping-bag" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color }) => (
            <View style={{ position: 'relative' }}>
              {isIOS ? (
                <SymbolView name="message" tintColor={color} size={22} />
              ) : (
                <Feather name="message-circle" size={22} color={color} />
              )}
              <UnreadBadge count={unreadCount} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="clinic"
        options={{
          title: 'Clinic',
          href: hideClinic ? null : undefined,
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="stethoscope" tintColor={color} size={22} />
            ) : (
              <Feather name="activity" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="person.crop.circle" tintColor={color} size={22} />
            ) : (
              <Feather name="user" size={22} color={color} />
            ),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  const { currentUser, unreadCount, cmsConfig } = useApp();
  const isAdmin = currentUser?.role === 'Admin';
  const hideProTab = currentUser?.role === 'Car Owner';
  const hideMarketplace = !isAdmin && !cmsConfig.marketplaceVisible;
  const hideClinic = !isAdmin && !cmsConfig.clinicVisible;

  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout hideProTab={hideProTab} hideMarketplace={hideMarketplace} hideClinic={hideClinic} unreadCount={unreadCount} />;
  }
  return <ClassicTabLayout hideProTab={hideProTab} hideMarketplace={hideMarketplace} hideClinic={hideClinic} unreadCount={unreadCount} />;
}
