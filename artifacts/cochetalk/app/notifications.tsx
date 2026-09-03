import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Notification as ApiNotification } from '@workspace/api-client-react';
import { useNotifications } from '@/context/NotificationContext';
import { useColors } from '@/hooks/useColors';

function timeAgo(value: string) {
  const diff = Math.max(0, Date.now() - new Date(value).getTime());
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(value).toLocaleDateString();
}

function openNotification(item: ApiNotification) {
  const data = item.data ?? {};
  if (typeof data.screen === 'string' && data.screen === 'notifications') {
    router.push('/notifications');
  } else if (typeof data.conversationId === 'string') {
    router.push(`/conversation/${encodeURIComponent(data.conversationId)}`);
  } else if (typeof data.questionId === 'number') {
    router.push(`/question/${data.questionId}`);
  } else if (typeof data.listingId === 'number') {
    router.push(`/listing/${data.listingId}`);
  }
}

export default function NotificationsScreen() {
  const colors = useColors();
  const { notifications, unreadCount, isLoading, error, refresh, markRead, markAllRead } = useNotifications();

  const handlePress = async (item: ApiNotification) => {
    if (!item.isRead) await markRead(item.id).catch(() => undefined);
    openNotification(item);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          style={styles.headerButton}
        >
          <Feather name="arrow-left" size={20} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <View style={styles.titleRow}>
            <Feather name="bell" size={18} color={colors.primary} />
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>Notifications</Text>
            {unreadCount > 0 && (
              <View style={[styles.countBadge, { backgroundColor: colors.primary }]}>
                <Text style={[styles.countText, { color: colors.primaryForeground }]}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </View>
          <Text style={[styles.headerSubtitle, { color: colors.mutedForeground }]}>
            Stay up to date with CocheTalk.NG
          </Text>
        </View>
        <TouchableOpacity
          accessibilityLabel="Notification settings"
          onPress={() => router.push('/notifications/settings')}
          style={styles.headerButton}
        >
          <Feather name="settings" size={19} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      {unreadCount > 0 && (
        <TouchableOpacity onPress={() => void markAllRead()} style={styles.markAllButton}>
          <Feather name="check-circle" size={15} color={colors.primary} />
          <Text style={[styles.markAllText, { color: colors.primary }]}>Mark all as read</Text>
        </TouchableOpacity>
      )}

      {isLoading && notifications.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
          <Text style={[styles.centerText, { color: colors.mutedForeground }]}>Loading notifications…</Text>
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.center}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.muted }]}>
            <Feather name="bell-off" size={28} color={colors.mutedForeground} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>You’re all caught up</Text>
          <Text style={[styles.centerText, { color: colors.mutedForeground }]}>
            New answers, messages, and marketplace updates will appear here.
          </Text>
          <TouchableOpacity onPress={() => router.push('/notifications/settings')} style={[styles.settingsButton, { borderColor: colors.border }]}>
            <Feather name="sliders" size={15} color={colors.primary} />
            <Text style={[styles.settingsButtonText, { color: colors.primary }]}>Notification settings</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refresh} tintColor={colors.primary} />}
          showsVerticalScrollIndicator={false}
        >
          {error && <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text>}
          {notifications.map((item) => (
            <TouchableOpacity
              key={item.id}
              onPress={() => void handlePress(item)}
              activeOpacity={0.75}
              style={[
                styles.notificationRow,
                {
                  backgroundColor: item.isRead ? colors.card : colors.primary + '12',
                  borderColor: item.isRead ? colors.border : colors.primary + '55',
                },
              ]}
            >
              <View style={[styles.notificationIcon, { backgroundColor: item.isRead ? colors.muted : colors.primary + '25' }]}>
                <Feather
                  name={item.notificationType === 'new_messages' ? 'message-circle' : item.notificationType === 'marketplace_updates' ? 'shopping-bag' : 'bell'}
                  size={17}
                  color={item.isRead ? colors.mutedForeground : colors.primary}
                />
              </View>
              <View style={styles.notificationBody}>
                <View style={styles.notificationTop}>
                  <Text style={[styles.notificationTitle, { color: colors.foreground }]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={[styles.notificationTime, { color: colors.mutedForeground }]}>{timeAgo(item.createdAt)}</Text>
                </View>
                <Text style={[styles.notificationText, { color: colors.mutedForeground }]} numberOfLines={3}>
                  {item.body}
                </Text>
              </View>
              {!item.isRead && <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />}
            </TouchableOpacity>
          ))}
          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1 },
  headerButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  headerTitleWrap: { flex: 1, paddingHorizontal: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  headerTitle: { fontSize: 19, fontWeight: '700' },
  headerSubtitle: { fontSize: 11, marginTop: 2 },
  countBadge: { minWidth: 19, height: 19, borderRadius: 10, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center' },
  countText: { fontSize: 10, fontWeight: '800' },
  markAllButton: { flexDirection: 'row', gap: 7, alignItems: 'center', alignSelf: 'flex-end', marginHorizontal: 16, marginTop: 12 },
  markAllText: { fontSize: 12, fontWeight: '700' },
  list: { paddingHorizontal: 16, paddingTop: 12 },
  notificationRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 11, borderRadius: 12, borderWidth: 1, padding: 13, marginBottom: 8 },
  notificationIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  notificationBody: { flex: 1 },
  notificationTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  notificationTitle: { flex: 1, fontSize: 14, fontWeight: '700' },
  notificationTime: { fontSize: 10 },
  notificationText: { fontSize: 12, lineHeight: 18, marginTop: 5 },
  unreadDot: { width: 7, height: 7, borderRadius: 4, marginTop: 5 },
  error: { fontSize: 12, marginBottom: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
  centerText: { fontSize: 13, textAlign: 'center', lineHeight: 19, marginTop: 10 },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  settingsButton: { flexDirection: 'row', gap: 7, alignItems: 'center', borderWidth: 1, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 9, marginTop: 18 },
  settingsButtonText: { fontSize: 12, fontWeight: '700' },
});
