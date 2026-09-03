import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { setBaseUrl } from '@workspace/api-client-react';
import { setAuthTokenGetter } from '@workspace/api-client-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ClerkLoaded, ClerkProvider, useAuth, useUser } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import { Stack } from 'expo-router';
import { router, usePathname, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useRef, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { CommunityLoader } from '@/components/CommunityLoader';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AppProvider, getAnalyticsPageName } from '@/context/AppContext';
import { useApp } from '@/context/AppContext';
import { NotificationProvider } from '@/context/NotificationContext';

if (process.env.EXPO_PUBLIC_DOMAIN) {
  setBaseUrl(`https://${process.env.EXPO_PUBLIC_DOMAIN}`);
}

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();
const clerkPublishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
const clerkProxyUrl = process.env.EXPO_PUBLIC_CLERK_PROXY_URL || undefined;
const PENDING_ROLE_KEY = 'cochetalk_pending_signup_role';

function AuthSessionBridge({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const { isLoading, users, currentUser, login, logout, register } = useApp();
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

    if (syncedUserRef.current === user.id) return;

    const syncUser = async () => {
      const email = user.primaryEmailAddress?.emailAddress ?? '';
      const existing = users.find(
        (candidate) =>
          candidate.id === user.id ||
          (email && candidate.email.toLowerCase() === email.toLowerCase()),
      );

      if (existing) {
        if (currentUser?.id !== existing.id) login(existing.id);
      } else {
        const pendingRole = await AsyncStorage.getItem(PENDING_ROLE_KEY);
        const role = pendingRole === 'Service Provider' ? 'Service Provider' : 'Car Owner';
        const name =
          user.fullName?.trim() ||
          user.firstName?.trim() ||
          email.split('@')[0] ||
          'CocheTalk member';

        register({
          id: user.id,
          name,
          email,
          role,
          phone: '',
          specialization: [],
          businessName: '',
          experience: 0,
          location: '',
        });
        await AsyncStorage.removeItem(PENDING_ROLE_KEY);
      }

      syncedUserRef.current = user.id;
    };

    void syncUser();
  }, [currentUser, isLoading, isLoaded, isSignedIn, login, logout, register, user, users]);

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

  if (!clerkPublishableKey) {
    throw new Error('Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY');
  }

  return (
    <ClerkProvider
      publishableKey={clerkPublishableKey}
      tokenCache={tokenCache}
      proxyUrl={clerkProxyUrl}
    >
      <ClerkLoaded>
        <SafeAreaProvider>
          <ErrorBoundary>
            <AppProvider>
              <AnalyticsTracker />
              <AuthSessionBridge>
                <NotificationProvider>
                  <QueryClientProvider client={queryClient}>
                    <GestureHandlerRootView>
                      <KeyboardProvider>
                        <RootLayoutNav />
                        {showLoader && (
                          <CommunityLoader onFinished={() => setShowLoader(false)} />
                        )}
                      </KeyboardProvider>
                    </GestureHandlerRootView>
                  </QueryClientProvider>
                </NotificationProvider>
              </AuthSessionBridge>
            </AppProvider>
          </ErrorBoundary>
        </SafeAreaProvider>
      </ClerkLoaded>
    </ClerkProvider>
  );
}
