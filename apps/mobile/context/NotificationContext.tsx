import {
  createNotificationEvent,
  getNotificationPreferences,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  deactivateNotificationPushToken,
  registerNotificationPushToken,
  updateNotificationPreferences,
  type Notification as ApiNotification,
  type NotificationGlobalSetting,
  type NotificationPreferences,
  type NotificationEventRequest,
  type NotificationPreferencesUpdate,
} from '@workspace/api-client-react';
import { useAuth } from '@clerk/expo';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Platform } from 'react-native';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { primitives } from '@/constants/colors';

type NotificationContextValue = {
  preferences: NotificationPreferences | null;
  globalSettings: NotificationGlobalSetting[];
  notifications: ApiNotification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  setPreference: (key: keyof NotificationPreferencesUpdate, enabled: boolean) => Promise<void>;
  markRead: (id: number) => Promise<void>;
  markAllRead: () => Promise<void>;
  requestPushPermission: () => Promise<boolean>;
  emitEvent: (event: NotificationEventRequest) => void;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

const pushProjectId =
  Constants.expoConfig?.extra?.eas?.projectId ??
  Constants.easConfig?.projectId ??
  process.env.EXPO_PUBLIC_EAS_PROJECT_ID;

function configureNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

async function registerForPushNotifications() {
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') return null;
  if (!pushProjectId) {
    console.warn('[notifications] Missing Expo EAS project ID; push registration skipped.');
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'CocheTalk notifications',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: primitives.PRIMARY,
      sound: 'default',
    });
  }

  const currentPermissions = await Notifications.getPermissionsAsync();
  let status = currentPermissions.status;
  if (status !== 'granted') {
    const requestedPermissions = await Notifications.requestPermissionsAsync();
    status = requestedPermissions.status;
  }
  if (status !== 'granted') return null;

  const token = await Notifications.getExpoPushTokenAsync({ projectId: pushProjectId });
  return token.data;
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [globalSettings, setGlobalSettings] = useState<NotificationGlobalSetting[]>([]);
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const registeredTokenRef = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isLoaded || !isSignedIn) {
      setPreferences(null);
      setGlobalSettings([]);
      setNotifications([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const [preferenceResponse, notificationResponse] = await Promise.all([
        getNotificationPreferences(),
        listNotifications({ limit: 100 }),
      ]);
      setPreferences(preferenceResponse.preferences);
      setGlobalSettings(preferenceResponse.globalSettings);
      setNotifications(notificationResponse.notifications);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load notifications');
    } finally {
      setIsLoading(false);
    }
  }, [isLoaded, isSignedIn]);

  useEffect(() => {
    configureNotificationHandler();
    if (Platform.OS === 'web') return undefined;
    const handleResponse = (response: any) => {
      const data = response.notification.request.content.data as Record<string, unknown> | undefined;
      const notificationId = typeof data?.notificationId === 'number' ? data.notificationId : null;
      if (notificationId) void markNotificationRead(notificationId).catch(() => undefined);

      const screen = typeof data?.screen === 'string' ? data.screen : '';
      if (screen === 'notifications' || screen === '/notifications') {
        router.push('/notifications');
      } else if (typeof data?.conversationId === 'string' && data.conversationId) {
        router.push(`/conversation/${encodeURIComponent(data.conversationId)}`);
      } else if (typeof data?.questionId === 'number') {
        router.push(`/question/${data.questionId}`);
      } else if (typeof data?.listingId === 'number') {
        router.push(`/listing/${data.listingId}`);
      } else if (typeof data?.discussionId === 'number') {
        router.push(`/discussion/${data.discussionId}`);
      } else if (screen === 'profile' || screen === '/profile') {
        router.push('/(tabs)/profile');
      }
    };
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(handleResponse);
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) handleResponse(response);
    });
    return () => responseSubscription.remove();
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      const token = registeredTokenRef.current;
      registeredTokenRef.current = null;
      if (token) void deactivateNotificationPushToken({ token }).catch(() => undefined);
      return;
    }
    let cancelled = false;
    void registerForPushNotifications()
      .then(async (token) => {
        if (!token || cancelled || registeredTokenRef.current === token) return;
        await registerNotificationPushToken({
          token,
          platform: Platform.OS,
          deviceIdentifier: Constants.deviceName ?? null,
        });
        registeredTokenRef.current = token;
      })
      .catch((cause) => {
        console.warn('[notifications] Push registration failed', cause);
      });
    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn]);

  const setPreference = useCallback(
    async (key: keyof NotificationPreferencesUpdate, enabled: boolean) => {
      const previous = preferences;
      if (previous) setPreferences({ ...previous, [key]: enabled });
      try {
        const response = await updateNotificationPreferences({ [key]: enabled });
        setPreferences(response.preferences);
      } catch (cause) {
        if (previous) setPreferences(previous);
        throw cause;
      }
    },
    [preferences],
  );

  const markRead = useCallback(async (id: number) => {
    setNotifications((current) => current.map((item) => (item.id === id ? { ...item, isRead: true } : item)));
    try {
      await markNotificationRead(id);
    } catch (cause) {
      void refresh();
      throw cause;
    }
  }, [refresh]);

  const markAllRead = useCallback(async () => {
    setNotifications((current) => current.map((item) => ({ ...item, isRead: true })));
    try {
      await markAllNotificationsRead();
    } catch (cause) {
      void refresh();
      throw cause;
    }
  }, [refresh]);

  const requestPushPermission = useCallback(async () => {
    try {
      const token = await registerForPushNotifications();
      if (!token) return false;
      await registerNotificationPushToken({
        token,
        platform: Platform.OS,
        deviceIdentifier: Constants.deviceName ?? null,
      });
      registeredTokenRef.current = token;
      return true;
    } catch {
      return false;
    }
  }, []);

  const emitEvent = useCallback((event: NotificationEventRequest) => {
    void createNotificationEvent(event).catch((cause) => {
      console.warn('[notifications] Event delivery failed', cause);
    });
  }, []);

  const value = useMemo<NotificationContextValue>(
    () => ({
      preferences,
      globalSettings,
      notifications,
      unreadCount: notifications.filter((item) => !item.isRead).length,
      isLoading,
      error,
      refresh,
      setPreference,
      markRead,
      markAllRead,
      requestPushPermission,
      emitEvent,
    }),
    [
      preferences,
      globalSettings,
      notifications,
      isLoading,
      error,
      refresh,
      setPreference,
      markRead,
      markAllRead,
      requestPushPermission,
      emitEvent,
    ],
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used inside NotificationProvider');
  return context;
}
