import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Feather } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { TabBarVisibilityProvider, useTabBarVisibility } from '@/hooks/useTabBarVisibility';

const TAB_BAR_HEIGHT = 64;
const TAB_BAR_BOTTOM_GAP = 16;
const WEB_TAB_BAR_HEIGHT = 84;

function UnreadBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <View style={{ position: 'absolute', top: -4, right: -6, backgroundColor: '#EF4444', borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 }}>
      <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>{count > 9 ? '9+' : count}</Text>
    </View>
  );
}

function ClassicTabLayout({ hideProTab, hideMarketplace, hideClinic, unreadCount }: { hideProTab: boolean; hideMarketplace: boolean; hideClinic: boolean; unreadCount: number }) {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const safeAreaInsets = useSafeAreaInsets();
  const { isVisible } = useTabBarVisibility();
  const translateY = useRef(new Animated.Value(0)).current;
  const isDark = colorScheme === 'dark';
  const isIOS = Platform.OS === 'ios';
  const isWeb = Platform.OS === 'web';
  const safeBottomGap = Math.max(TAB_BAR_BOTTOM_GAP, safeAreaInsets.bottom);
  const contentBottomPadding = isWeb ? WEB_TAB_BAR_HEIGHT : TAB_BAR_HEIGHT + safeBottomGap;
  const hiddenOffset = isWeb ? WEB_TAB_BAR_HEIGHT : contentBottomPadding;

  useEffect(() => {
    const animation = Animated.timing(translateY, {
      toValue: isVisible ? 0 : hiddenOffset,
      duration: 280,
      useNativeDriver: !isWeb,
    });
    animation.start();
    return () => animation.stop();
  }, [hiddenOffset, isVisible, isWeb, translateY]);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        // The tab bar is absolute/floating, so reserve its real footprint in
        // the shared scene wrapper. This keeps every screen's actual scroller
        // clear of the bar without adding a second scroll area.
        sceneStyle: {
          paddingBottom: contentBottomPadding,
        },
        tabBarStyle: isWeb
          ? {
              position: 'absolute',
              backgroundColor: colors.background,
              borderTopWidth: 1,
              borderTopColor: colors.border,
              elevation: 0,
              height: WEB_TAB_BAR_HEIGHT,
              transform: [{ translateY }],
            }
          : {
              position: 'absolute',
              bottom: safeBottomGap,
              left: 16,
              right: 16,
              height: TAB_BAR_HEIGHT,
              borderRadius: 28,
              borderTopWidth: 0,
              backgroundColor: isIOS ? 'transparent' : isDark ? '#1a1a1a' : '#ffffff',
              elevation: 16,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: isDark ? 0.45 : 0.18,
              shadowRadius: 16,
              overflow: 'hidden',
              transform: [{ translateY }],
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

  return (
    <TabBarVisibilityProvider>
      <ClassicTabLayout
        hideProTab={hideProTab}
        hideMarketplace={hideMarketplace}
        hideClinic={hideClinic}
        unreadCount={unreadCount}
      />
    </TabBarVisibilityProvider>
  );
}
