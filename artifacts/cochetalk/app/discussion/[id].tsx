import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
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

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function DiscussionDetailScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { discussions, discussionComments, currentUser, upvoteDiscussion, addDiscussionComment, deleteDiscussion } = useApp();

  const [commentText, setCommentText] = useState('');
  const [lightboxUri, setLightboxUri] = useState<string | null>(null);

  const post = discussions.find((d) => d.id === Number(id));

  if (!post) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Discussion</Text>
        </View>
        <View style={styles.center}>
          <Text style={[styles.notFoundText, { color: colors.mutedForeground }]}>Post not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const tags = post.tags.split(',').map((t) => t.trim()).filter(Boolean);
  const isOwner = currentUser?.id === post.userId;
  const hasVoted = post.upvotedBy.includes(currentUser?.id ?? '');
  const postComments = discussionComments.filter((c) => c.postId === post.id).sort((a, b) => a.timestamp - b.timestamp);

  const handlePostComment = () => {
    if (!commentText.trim() || !currentUser) return;
    addDiscussionComment(post.id, commentText.trim());
    setCommentText('');
  };

  const handleDelete = () => {
    deleteDiscussion(post.id);
    router.back();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Discussion</Text>
        {isOwner && (
          <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn}>
            <Feather name="trash-2" size={18} color={colors.destructive} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Post body */}
        <View style={[styles.postCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Type badge */}
          {post.isProCircle ? (
            <View style={[styles.typeBadge, { backgroundColor: colors.proCircle + '22', borderColor: colors.proCircle + '55' }]}>
              <Feather name="lock" size={10} color={colors.proCircle} />
              <Text style={[styles.typeBadgeText, { color: colors.proCircleText }]}>Pro Circle Discussion</Text>
            </View>
          ) : (
            <View style={[styles.typeBadge, { backgroundColor: colors.secondary + '22', borderColor: colors.secondary + '55' }]}>
              <Feather name="book-open" size={10} color={colors.secondary} />
              <Text style={[styles.typeBadgeText, { color: colors.secondaryText }]}>General Discussion</Text>
            </View>
          )}

          {post.title ? (
            <Text style={[styles.postTitle, { color: colors.foreground }]}>{post.title}</Text>
          ) : null}

          <Text style={[styles.postContent, { color: colors.foreground }]}>{post.content}</Text>

          {/* Tags */}
          {tags.length > 0 && (
            <View style={styles.tagRow}>
              {tags.map((tag) => (
                <View key={tag} style={[styles.tag, { backgroundColor: colors.muted }]}>
                  <Text style={[styles.tagText, { color: colors.secondaryText }]}>{tag}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Media grid */}
          {(post.mediaUris?.length ?? 0) > 0 && (
            <View style={styles.mediaGrid}>
              {post.mediaUris!.map((uri, i) => (
                <TouchableOpacity key={i} onPress={() => setLightboxUri(uri)} activeOpacity={0.85}>
                  <Image source={{ uri }} style={styles.mediaThumb} resizeMode="cover" />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Footer */}
          <View style={[styles.postFooter, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={styles.userRow}
              onPress={() => router.push(`/seller/${encodeURIComponent(post.userId)}`)}
            >
              <View style={[styles.avatar, { backgroundColor: colors.secondary + '33' }]}>
                <Text style={[styles.avatarText, { color: colors.secondaryText }]}>{post.userName.charAt(0)}</Text>
              </View>
              <View>
                <View style={styles.nameRow}>
                  <Text style={[styles.userName, { color: colors.foreground }]}>{post.userName}</Text>
                  {post.userVerified && <Feather name="check-circle" size={12} color={colors.verified} />}
                </View>
                <Text style={[styles.userSub, { color: colors.mutedForeground }]}>{timeAgo(post.timestamp)}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.voteBtn, { backgroundColor: hasVoted ? colors.primary + '22' : colors.muted }]}
              onPress={() => currentUser && upvoteDiscussion(post.id)}
            >
              <Feather name="arrow-up" size={14} color={hasVoted ? colors.primary : colors.mutedForeground} />
              <Text style={[styles.voteCount, { color: hasVoted ? colors.primaryText : colors.mutedForeground }]}>
                {post.upvotes}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Comments section */}
        <View style={styles.commentsHeader}>
          <Text style={[styles.commentsTitle, { color: colors.foreground }]}>
            {postComments.length} {postComments.length === 1 ? 'Reply' : 'Replies'}
          </Text>
        </View>

        {postComments.map((c) => (
          <View key={c.id} style={[styles.commentCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.commentHeader}>
              <TouchableOpacity
                style={styles.commentUser}
                onPress={() => router.push(`/seller/${encodeURIComponent(c.userId)}`)}
              >
                <View style={[styles.avatarSm, { backgroundColor: colors.primary + '22' }]}>
                  <Text style={[styles.avatarSmText, { color: colors.primaryText }]}>{c.userName.charAt(0)}</Text>
                </View>
                <Text style={[styles.commentAuthor, { color: colors.foreground }]}>{c.userName}</Text>
              </TouchableOpacity>
              <Text style={[styles.commentTime, { color: colors.mutedForeground }]}>{timeAgo(c.timestamp)}</Text>
            </View>
            <Text style={[styles.commentBody, { color: colors.foreground }]}>{c.content}</Text>
          </View>
        ))}

        {/* Empty replies */}
        {postComments.length === 0 && (
          <View style={styles.emptyComments}>
            <Feather name="message-circle" size={32} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No replies yet — be the first!</Text>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Reply input */}
      {currentUser && (
        <View style={[styles.replyBar, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
          <TextInput
            style={[styles.replyInput, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]}
            placeholder="Write a reply..."
            placeholderTextColor={colors.mutedForeground}
            value={commentText}
            onChangeText={setCommentText}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: commentText.trim() ? colors.primary : colors.muted }]}
            onPress={handlePostComment}
            disabled={!commentText.trim()}
          >
            <Feather name="send" size={16} color={commentText.trim() ? colors.primaryForeground : colors.mutedForeground} />
          </TouchableOpacity>
        </View>
      )}

      {/* Lightbox */}
      <Modal visible={!!lightboxUri} transparent animationType="fade" onRequestClose={() => setLightboxUri(null)}>
        <Pressable style={[styles.lightboxOverlay, { backgroundColor: colors.lightboxOverlay }]} onPress={() => setLightboxUri(null)}>
          {lightboxUri && (
            <Image source={{ uri: lightboxUri }} style={styles.lightboxImage} resizeMode="contain" />
          )}
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFoundText: { fontSize: 15 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: { marginRight: 12, padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', flex: 1 },
  deleteBtn: { padding: 4 },
  content: { paddingBottom: 20 },
  postCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    margin: 16,
    marginBottom: 8,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 12,
    gap: 4,
  },
  typeBadgeText: { fontSize: 10, fontWeight: '600' },
  postTitle: { fontSize: 20, fontWeight: '700', lineHeight: 27, marginBottom: 10 },
  postContent: { fontSize: 15, lineHeight: 23, marginBottom: 14 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  tag: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  tagText: { fontSize: 11, fontWeight: '500' },
  mediaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  mediaThumb: { width: 100, height: 100, borderRadius: 8 },
  postFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: 12,
  },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  avatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 13, fontWeight: '700' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  userName: { fontSize: 13, fontWeight: '600' },
  userSub: { fontSize: 11, marginTop: 1 },
  voteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  voteCount: { fontSize: 13, fontWeight: '600' },
  commentsHeader: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 6 },
  commentsTitle: { fontSize: 15, fontWeight: '700' },
  commentCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  commentHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  commentUser: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  avatarSm: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  avatarSmText: { fontSize: 11, fontWeight: '700' },
  commentAuthor: { fontSize: 13, fontWeight: '600' },
  commentTime: { fontSize: 11 },
  commentBody: { fontSize: 14, lineHeight: 20 },
  emptyComments: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyText: { fontSize: 14 },
  replyBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  replyInput: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxImage: { width: '100%', height: '80%' },
});
