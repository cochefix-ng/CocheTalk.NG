import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { setBaseUrl } from '@workspace/api-client-react';
import { setAuthTokenGetter, updateCurrentProfile, getCurrentProfile } from '@workspace/api-client-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SupabaseAuthProvider, useAuth, useUser } from '@/context/SupabaseAuthContext';
import { Stack } from 'expo-router';
import { router, usePathname, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useRef, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { CommunityLoader } from '@/components/CommunityLoader';
import { GlobalFetchIndicator } from '@/components/GlobalFetchIndicator';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AppProvider, getAnalyticsPageName, type UserRole } from '@/context/AppContext';
import { useApp } from '@/context/AppContext';
import { NotificationProvider } from '@/context/NotificationContext';
import { getApiOrigin } from '@/lib/apiBase';

const apiOrigin = getApiOrigin();
if (apiOrigin) {
  setBaseUrl(apiOrigin);
}

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();
const PENDING_ROLE_KEY = 'cochetalk_pending_signup_role';

const ADMIN_IDS = new Set(
  (process.env.EXPO_PUBLIC_ADMIN_USER_IDS || '93282787-2751-4bba-ab81-362aab67114f')
    .split(',')
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean)
);

const ADMIN_EMAILS = new Set(
  (process.env.EXPO_PUBLIC_ADMIN_EMAILS || 'devjoseph83@gmail.com')
    .split(',')
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean)
);

function checkClientAdmin(userId: string, email?: string): boolean {
  if (ADMIN_IDS.has(userId.toLowerCase())) return true;
  if (email && ADMIN_EMAILS.has(email.toLowerCase())) return true;
  return false;
}

function AuthSessionBridge({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const { isLoading, users, currentUser, logout, syncCurrentUser } = useApp();
  const segments = useSegments();
  const syncedUserRef = useRef<string | null>(null);

  useEffect(() => {
    setAuthTokenGetter(isSignedIn ? () => getToken() : null);
    return () => setAuthTokenGetter(null);
  }, [getToken, isSignedIn]);

  useEffect(() => {
    if (!isLoaded || isLoading) return;

    if (!isSignedIn || !user) {
      syncedUserRef.current = null;
      if (currentUser) logout();
      return;
    }

    const email = user.primaryEmailAddress?.emailAddress ?? user.email ?? '';
    const isKnownAdmin = checkClientAdmin(user.id, email);

    if (
      syncedUserRef.current === user.id &&
      currentUser &&
      (!isKnownAdmin || currentUser.role === 'Admin')
    ) {
      return;
    }

    const syncUser = async () => {
      const existing = users.find((candidate) => candidate.id === user.id);
      const defaultName =
        user.fullName?.trim() ||
        user.firstName?.trim() ||
        email.split('@')[0] ||
        (isKnownAdmin ? 'Chief Admin' : 'CocheTalk member');

      const pendingRole = await AsyncStorage.getItem(PENDING_ROLE_KEY);
      let resolvedRole: UserRole = isKnownAdmin
        ? 'Admin'
        : (existing?.role ?? (pendingRole === 'Service Provider' ? 'Service Provider' : 'Car Owner'));

      let resolvedName = existing?.name || defaultName;
      let isVerified = isKnownAdmin || (existing?.verified ?? false);

      try {
        const remoteProfile = await getCurrentProfile();
        if (remoteProfile.admin || isKnownAdmin) {
          resolvedRole = 'Admin';
        } else if (remoteProfile.accountType === 'Service Provider') {
          resolvedRole = 'Service Provider';
        } else {
          resolvedRole = 'Car Owner';
        }

        resolvedName = remoteProfile.displayName || resolvedName;
        isVerified = remoteProfile.verified ?? isVerified;

        if (!remoteProfile.admin && !isKnownAdmin) {
          await updateCurrentProfile({
            displayName: resolvedName,
            accountType: resolvedRole === 'Service Provider' ? 'Service Provider' : 'Car Owner',
            specialization: remoteProfile.specialization ?? (existing?.specialization?.join(', ') ?? ''),
          });
        }
      } catch (error) {
        if (isKnownAdmin) {
          resolvedRole = 'Admin';
        }
        console.warn('Profile fetch/sync failed, using resolved role', error);
      }

      syncCurrentUser({
        id: user.id,
        name: resolvedName,
        email,
        role: resolvedRole,
        verified: isVerified,
      });

      await AsyncStorage.removeItem(PENDING_ROLE_KEY);
      syncedUserRef.current = user.id;
    };

    void syncUser();
  }, [currentUser, isLoading, isLoaded, isSignedIn, logout, syncCurrentUser, user, users]);

  useEffect(() => {
    if (!isLoaded || isLoading) return;
    const inAuthGroup = segments[0] === '(auth)';

    if (!isSignedIn && !inAuthGroup) {
      router.replace('/(auth)/sign-in');
    } else if (isSignedIn && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isLoaded, isLoading, isSignedIn, segments]);

  return <>{children}</>;
}

function AnalyticsTracker() {
  const pathname = usePathname();
  const { isLoading, trackPageView } = useApp();
  const trackPageViewRef = useRef(trackPageView);
  const sessionStartedRef = useRef(false);

  trackPageViewRef.current = trackPageView;

  useEffect(() => {
    if (isLoading || !pathname) return;
    trackPageViewRef.current(getAnalyticsPageName(pathname), !sessionStartedRef.current);
    sessionStartedRef.current = true;
  }, [isLoading, pathname]);

  return null;
}

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: 'Back' }}>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="question/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="seller/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="conversation/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="listing/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="discussion/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="notifications" options={{ headerShown: false }} />
      <Stack.Screen name="notifications/settings" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  const [showLoader, setShowLoader] = useState(true);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SupabaseAuthProvider>
      <SafeAreaProvider>
        <ErrorBoundary>
          <QueryClientProvider client={queryClient}>
            <AppProvider>
              <AnalyticsTracker />
              <AuthSessionBridge>
                <NotificationProvider>
                  <GestureHandlerRootView>
                    <KeyboardProvider>
                      <RootLayoutNav />
                      <GlobalFetchIndicator />
                      {showLoader && (
                        <CommunityLoader onFinished={() => setShowLoader(false)} />
                      )}
                    </KeyboardProvider>
                  </GestureHandlerRootView>
                </NotificationProvider>
              </AuthSessionBridge>
            </AppProvider>
          </QueryClientProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </SupabaseAuthProvider>
  );
}
