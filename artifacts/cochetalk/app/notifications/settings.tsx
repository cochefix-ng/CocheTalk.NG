import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { NotificationPreferencesUpdate } from '@workspace/api-client-react';
import { useNotifications } from '@/context/NotificationContext';
import { useColors } from '@/hooks/useColors';

const categories: Array<{
  key: keyof NotificationPreferencesUpdate;
  type: string;
  title: string;
  description: string;
  icon: React.ComponentProps<typeof Feather>['name'];
}> = [
  { key: 'newAnswersEnabled', type: 'new_answers', title: 'New Answers', description: 'When someone answers your vehicle question.', icon: 'message-square' },
  { key: 'commentsRepliesEnabled', type: 'comments_replies', title: 'Comments & Replies', description: 'Replies and activity on your discussions.', icon: 'message-circle' },
  { key: 'newMessagesEnabled', type: 'new_messages', title: 'New Messages', description: 'When another member sends you a message.', icon: 'mail' },
  { key: 'marketplaceUpdatesEnabled', type: 'marketplace_updates', title: 'Marketplace Updates', description: 'Approval and status updates for your listings.', icon: 'shopping-bag' },
  { key: 'providerUpdatesEnabled', type: 'provider_updates', title: 'Provider Updates', description: 'Updates about provider verification and services.', icon: 'tool' },
  { key: 'announcementsEnabled', type: 'announcements', title: 'Announcements', description: 'Important news and community updates.', icon: 'volume-2' },
  { key: 'systemNotificationsEnabled', type: 'system_notifications', title: 'System Notifications', description: 'Security and account-related notifications.', icon: 'shield' },
];

export default function NotificationSettingsScreen() {
  const colors = useColors();
  const { preferences, globalSettings, isLoading, error, setPreference, requestPushPermission } = useNotifications();

  const globalSettingFor = (type: string) => globalSettings.find((setting) => setting.notificationType === type);

  const toggle = async (category: (typeof categories)[number], value: boolean) => {
    try {
      await setPreference(category.key, value);
    } catch {
      Alert.alert('Could not save', 'Your notification preference could not be saved. Please try again.');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} accessibilityLabel="Go back">
          <Feather name="arrow-left" size={20} color={colors.foreground} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Notification settings</Text>
          <Text style={[styles.headerSubtitle, { color: colors.mutedForeground }]}>Choose what reaches you</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.pushCard, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '44' }]}>
          <View style={[styles.pushIcon, { backgroundColor: colors.primary + '25' }]}>
            <Feather name="smartphone" size={18} color={colors.primary} />
          </View>
          <View style={styles.pushBody}>
            <Text style={[styles.pushTitle, { color: colors.foreground }]}>Mobile push notifications</Text>
            <Text style={[styles.pushDescription, { color: colors.mutedForeground }]}>
              Allow CocheTalk to alert you even when the app is closed.
            </Text>
          </View>
          <TouchableOpacity onPress={() => void requestPushPermission()} style={[styles.allowButton, { backgroundColor: colors.primary }]}>
            <Text style={[styles.allowButtonText, { color: colors.primaryForeground }]}>Allow</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Notification categories</Text>
        {isLoading && !preferences ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
        ) : (
          categories.map((category) => {
            const globalSetting = globalSettingFor(category.type);
            const globallyEnabled = globalSetting?.enabled ?? true;
            const enabled = preferences?.[category.key] ?? true;
            return (
              <View key={category.key} style={[styles.categoryRow, { backgroundColor: colors.card, borderColor: colors.border, opacity: globallyEnabled ? 1 : 0.6 }]}>
                <View style={[styles.categoryIcon, { backgroundColor: globallyEnabled ? colors.primary + '18' : colors.muted }]}>
                  <Feather name={category.icon} size={17} color={globallyEnabled ? colors.primary : colors.mutedForeground} />
                </View>
                <View style={styles.categoryBody}>
                  <View style={styles.categoryTitleRow}>
                    <Text style={[styles.categoryTitle, { color: colors.foreground }]}>{category.title}</Text>
                    {!globallyEnabled && (
                      <View style={[styles.disabledBadge, { backgroundColor: colors.muted }]}>
                        <Text style={[styles.disabledBadgeText, { color: colors.mutedForeground }]}>Disabled by admin</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.categoryDescription, { color: colors.mutedForeground }]}>{category.description}</Text>
                </View>
                <Switch
                  value={globallyEnabled && enabled}
                  disabled={!globallyEnabled}
                  onValueChange={(value) => void toggle(category, value)}
                  trackColor={{ false: colors.muted, true: colors.primary + '88' }}
                  thumbColor={globallyEnabled && enabled ? colors.primary : colors.mutedForeground}
                />
              </View>
            );
          })
        )}
        {error && <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text>}
        <Text style={[styles.footnote, { color: colors.mutedForeground }]}>
          Admin-disabled categories are temporarily unavailable. Your personal choices are saved and will be restored if a category is re-enabled.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1 },
  backButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 19, fontWeight: '700' },
  headerSubtitle: { fontSize: 11, marginTop: 2 },
  content: { padding: 16, paddingBottom: 32 },
  pushCard: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 24 },
  pushIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  pushBody: { flex: 1 },
  pushTitle: { fontSize: 13, fontWeight: '700' },
  pushDescription: { fontSize: 11, lineHeight: 16, marginTop: 2 },
  allowButton: { borderRadius: 7, paddingHorizontal: 10, paddingVertical: 8 },
  allowButtonText: { fontSize: 11, fontWeight: '700' },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 },
  categoryRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 11, borderWidth: 1, padding: 12, marginBottom: 8 },
  categoryIcon: { width: 35, height: 35, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  categoryBody: { flex: 1 },
  categoryTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  categoryTitle: { fontSize: 13, fontWeight: '700' },
  categoryDescription: { fontSize: 11, lineHeight: 16, marginTop: 2 },
  disabledBadge: { borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  disabledBadgeText: { fontSize: 8, fontWeight: '700' },
  error: { fontSize: 12, marginTop: 8 },
  footnote: { fontSize: 11, lineHeight: 17, marginTop: 12 },
});
