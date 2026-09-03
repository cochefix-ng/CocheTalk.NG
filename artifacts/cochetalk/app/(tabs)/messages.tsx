import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Conversation } from '@/context/AppContext';
import { makeConvId, useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { useTabBarScrollHandler } from '@/hooks/useTabBarVisibility';

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(ts).toLocaleDateString();
}

export default function MessagesScreen() {
  const colors = useColors();
  const handleScroll = useTabBarScrollHandler();
  const { currentUser, conversations, users } = useApp();

  const myConversations = (conversations ?? [])
    .filter((c) => currentUser && c.participantIds.includes(currentUser.id))
    .sort((a, b) => b.lastTimestamp - a.lastTimestamp);

  function getPartner(conv: Conversation) {
    if (!currentUser) return { id: '', name: 'Unknown' };
    const partnerId = conv.participantIds.find((id) => id !== currentUser.id) ?? '';
    const partnerName = conv.participantNames[conv.participantIds.indexOf(partnerId)] ?? 'Unknown';
    const partnerUser = users.find((u) => u.id === partnerId);
    return { id: partnerId, name: partnerName, user: partnerUser };
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Feather name="message-circle" size={18} color={colors.primary} />
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Messages</Text>
      </View>

      {myConversations.length === 0 ? (
        <View style={styles.empty}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.muted }]}>
            <Feather name="message-circle" size={32} color={colors.mutedForeground} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No messages yet</Text>
          <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
            Tap "Message" on any listing or service provider profile to start a conversation.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          {myConversations.map((conv) => {
            const partner = getPartner(conv);
            const isUnread = currentUser ? conv.unreadBy.includes(currentUser.id) : false;
            return (
              <TouchableOpacity
                key={conv.id}
                style={[styles.convRow, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => router.push(`/conversation/${encodeURIComponent(conv.id)}`)}
                activeOpacity={0.7}
              >
                <View style={[styles.avatar, { backgroundColor: colors.primary + '33' }]}>
                  <Text style={[styles.avatarText, { color: colors.primary }]}>
                    {partner.name.charAt(0).toUpperCase()}
                  </Text>
                  {isUnread && (
                    <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
                  )}
                </View>

                <View style={styles.convBody}>
                  <View style={styles.convTopRow}>
                    <View style={styles.nameRow}>
                      <Text style={[styles.partnerName, { color: colors.foreground }]} numberOfLines={1}>
                        {partner.name}
                      </Text>
                      {partner.user?.verified && (
                        <Feather name="check-circle" size={12} color={colors.verified} />
                      )}
                      {partner.user?.role === 'Service Provider' && (
                        <View style={[styles.spBadge, { backgroundColor: colors.proCircle + '22' }]}>
                          <Text style={[styles.spBadgeText, { color: colors.proCircle }]}>SP</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.convTime, { color: colors.mutedForeground }]}>
                      {timeAgo(conv.lastTimestamp)}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.lastMessage,
                      { color: isUnread ? colors.foreground : colors.mutedForeground },
                      isUnread && styles.lastMessageBold,
                    ]}
                    numberOfLines={1}
                  >
                    {conv.lastMessage}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  list: { paddingTop: 8, paddingHorizontal: 16 },
  convRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 8 },
  avatar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  avatarText: { fontSize: 18, fontWeight: '700' },
  unreadDot: { position: 'absolute', top: 0, right: 0, width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: '#fff' },
  convBody: { flex: 1, gap: 3 },
  convTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1 },
  partnerName: { fontSize: 15, fontWeight: '600' },
  spBadge: { borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  spBadgeText: { fontSize: 10, fontWeight: '700' },
  convTime: { fontSize: 11, flexShrink: 0 },
  lastMessage: { fontSize: 13, lineHeight: 18 },
  lastMessageBold: { fontWeight: '600' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 12 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  emptySubtitle: { fontSize: 14, lineHeight: 20, textAlign: 'center' },
});
