import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';

function timeLabel(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function dateSeparator(ts: number): string {
  const now = new Date();
  const d = new Date(ts);
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function ConversationScreen() {
  const colors = useColors();
  const params = useLocalSearchParams<{ id: string; partnerId?: string; partnerName?: string }>();
  const convId = decodeURIComponent(params.id ?? '');
  const { currentUser, conversations, messages, users, listings, questions, discussions, sendMessage, markConversationRead } = useApp();

  const [text, setText] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  const conv = (conversations ?? []).find((c) => c.id === convId);

  const candidatePartnerId =
    params.partnerId ||
    (conv ? conv.participantIds.find((pid) => pid !== currentUser?.id) : '') ||
    (convId.includes('__') ? convId.split('__').find((pid) => pid !== currentUser?.id) : '') ||
    '';

  const partnerUser = users.find((u) => u.id === candidatePartnerId);

  const fallbackPartnerName =
    params.partnerName ||
    partnerUser?.name ||
    (listings ?? []).find((l) => l.userId === candidatePartnerId)?.userName ||
    (questions ?? []).find((q) => q.userId === candidatePartnerId)?.userName ||
    (discussions ?? []).find((d) => d.userId === candidatePartnerId)?.userName ||
    'Member';

  const partnerId = candidatePartnerId;
  const partnerName = conv
    ? (conv.participantNames[conv.participantIds.indexOf(candidatePartnerId)] || fallbackPartnerName)
    : fallbackPartnerName;

  const convMessages = (messages ?? [])
    .filter((m) => m.conversationId === convId)
    .sort((a, b) => a.timestamp - b.timestamp);

  useEffect(() => {
    if (conv && currentUser && Array.isArray(conv.unreadBy) && conv.unreadBy.includes(currentUser.id)) {
      markConversationRead(convId);
    }
  }, [convId, conv, currentUser, markConversationRead]);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 80);
  }, [convMessages.length]);

  function handleSend() {
    const content = text.trim();
    if (!content || !partnerId) return;
    sendMessage(partnerId, partnerName, content);
    setText('');
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }

  if (!currentUser) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Chat</Text>
        </View>
        <View style={styles.center}>
          <Feather name="lock" size={40} color={colors.primary} style={{ marginBottom: 12 }} />
          <Text style={[styles.notFound, { color: colors.foreground, fontWeight: '700', fontSize: 17 }]}>
            Sign In Required
          </Text>
          <Text style={{ color: colors.mutedForeground, textAlign: 'center', marginTop: 6, marginHorizontal: 32, fontSize: 14 }}>
            Please sign in to view and send direct messages.
          </Text>
          <TouchableOpacity
            style={[styles.signInBtn, { backgroundColor: colors.primary, marginTop: 16 }]}
            onPress={() => router.push('/(auth)/sign-in')}
          >
            <Text style={{ color: colors.primaryForeground, fontWeight: '600' }}>
              Sign In
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!partnerId) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Chat</Text>
        </View>
        <View style={styles.center}>
          <Text style={[styles.notFound, { color: colors.mutedForeground }]}>Conversation not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  let lastDateLabel = '';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={[styles.headerAvatar, { backgroundColor: colors.primary + '33' }]}>
          <Text style={[styles.headerAvatarText, { color: colors.primaryText }]}>
            {partnerName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.headerMeta}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={[styles.headerTitle, { color: colors.foreground }]} numberOfLines={1}>
              {partnerName}
            </Text>
            {partnerUser?.verified && (
              <Feather name="check-circle" size={13} color={colors.verified} />
            )}
          </View>
          {partnerUser ? (
            <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
              {partnerUser.role}{partnerUser.businessName ? ` · ${partnerUser.businessName}` : ''}
            </Text>
          ) : (
            <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
              CocheTalk Member
            </Text>
          )}
        </View>
        {partnerId ? (
          <TouchableOpacity
            style={styles.viewProfileBtn}
            onPress={() => router.push(`/seller/${encodeURIComponent(partnerId)}`)}
          >
            <Feather name="user" size={16} color={colors.primary} />
          </TouchableOpacity>
        ) : null}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.messageList}
          contentContainerStyle={styles.messageContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {convMessages.length === 0 ? (
            <View style={styles.emptyChat}>
              <View style={[styles.emptyChatAvatar, { backgroundColor: colors.primary + '22' }]}>
                <Feather name="message-square" size={32} color={colors.primary} />
              </View>
              <Text style={[styles.emptyChatTitle, { color: colors.foreground }]}>
                Chat with {partnerName}
              </Text>
              <Text style={[styles.emptyChatSub, { color: colors.mutedForeground }]}>
                Send a message below to start your conversation.
              </Text>
            </View>
          ) : (
            convMessages.map((msg) => {
              const isMine = msg.senderId === currentUser?.id;
              const dateLabel = dateSeparator(msg.timestamp);
              const showDate = dateLabel !== lastDateLabel;
              lastDateLabel = dateLabel;
              return (
                <React.Fragment key={msg.id}>
                  {showDate && (
                    <View style={styles.dateSeparator}>
                      <View style={[styles.dateLine, { backgroundColor: colors.border }]} />
                      <Text style={[styles.dateLabel, { color: colors.mutedForeground, backgroundColor: colors.background }]}>
                        {dateLabel}
                      </Text>
                      <View style={[styles.dateLine, { backgroundColor: colors.border }]} />
                    </View>
                  )}
                  <View style={[styles.bubbleRow, isMine ? styles.bubbleRowMine : styles.bubbleRowTheirs]}>
                    {!isMine && (
                      <View style={[styles.bubbleAvatar, { backgroundColor: colors.muted }]}>
                        <Text style={[styles.bubbleAvatarText, { color: colors.mutedForeground }]}>
                          {msg.senderName.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <View
                      style={[
                        styles.bubble,
                        isMine
                          ? { backgroundColor: colors.primary }
                          : { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 },
                      ]}
                    >
                      <Text style={[styles.bubbleText, { color: isMine ? colors.primaryForeground : colors.foreground }]}>
                        {msg.content}
                      </Text>
                      <Text style={[styles.bubbleTime, { color: isMine ? colors.primaryForeground + 'AA' : colors.mutedForeground }]}>
                        {timeLabel(msg.timestamp)}
                        {isMine && (
                          <Text> · {msg.read ? '✓✓' : '✓'}</Text>
                        )}
                      </Text>
                    </View>
                  </View>
                </React.Fragment>
              );
            })
          )}
          <View style={{ height: 8 }} />
        </ScrollView>

        <View style={[styles.inputBar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          <TextInput
            style={[styles.input, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]}
            placeholder="Type a message…"
            placeholderTextColor={colors.mutedForeground}
            value={text}
            onChangeText={setText}
            multiline
            maxLength={1000}
            onSubmitEditing={handleSend}
            returnKeyType="send"
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: text.trim() ? colors.primary : colors.muted }]}
            onPress={handleSend}
            disabled={!text.trim()}
          >
            <Feather name="send" size={18} color={text.trim() ? colors.primaryForeground : colors.mutedForeground} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1 },
  backBtn: { padding: 4 },
  headerAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  headerAvatarText: { fontSize: 15, fontWeight: '700' },
  headerMeta: { flex: 1 },
  headerTitle: { fontSize: 15, fontWeight: '700' },
  headerSub: { fontSize: 11, marginTop: 1 },
  viewProfileBtn: { padding: 6 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  notFound: { fontSize: 15 },
  signInBtn: { borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  emptyChat: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 32 },
  emptyChatAvatar: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyChatTitle: { fontSize: 17, fontWeight: '700', textAlign: 'center', marginBottom: 6 },
  emptyChatSub: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
  messageList: { flex: 1 },
  messageContent: { paddingHorizontal: 12, paddingTop: 12 },
  dateSeparator: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 12 },
  dateLine: { flex: 1, height: 1 },
  dateLabel: { fontSize: 11, fontWeight: '600', paddingHorizontal: 8 },
  bubbleRow: { flexDirection: 'row', marginBottom: 8, gap: 6, maxWidth: '80%' },
  bubbleRowMine: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
  bubbleRowTheirs: { alignSelf: 'flex-start' },
  bubbleAvatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 4, flexShrink: 0 },
  bubbleAvatarText: { fontSize: 11, fontWeight: '700' },
  bubble: { borderRadius: 16, paddingHorizontal: 13, paddingVertical: 8, flexShrink: 1 },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  bubbleTime: { fontSize: 10, marginTop: 3, textAlign: 'right' },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, padding: 12, borderTopWidth: 1 },
  input: { flex: 1, borderRadius: 20, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, maxHeight: 120 },
  sendBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
});
