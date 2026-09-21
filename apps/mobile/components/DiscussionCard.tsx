import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import type { DiscussionPost } from '@/context/AppContext';
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

interface Props {
  post: DiscussionPost;
  commentCount: number;
  onUserPress?: () => void;
}

export function DiscussionCard({ post, commentCount, onUserPress }: Props) {
  const colors = useColors();

  const tags = post.tags
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  const firstImage = post.mediaUris?.[0];

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => router.push(`/discussion/${post.id}`)}
      activeOpacity={0.75}
    >
      {/* Discussion badge */}
      <View style={[styles.typeBadge, { backgroundColor: colors.secondary + '22', borderColor: colors.secondary + '55' }]}>
        <Feather name="book-open" size={10} color={colors.secondary} />
        <Text style={[styles.typeBadgeText, { color: colors.secondaryText }]}>Discussion</Text>
      </View>

      <View style={styles.mainRow}>
        <View style={styles.textCol}>
          {post.title ? (
            <Text style={[styles.title, { color: colors.cardForeground }]} numberOfLines={2}>
              {post.title}
            </Text>
          ) : null}

          <Text style={[styles.content, { color: colors.mutedForeground }]} numberOfLines={post.title ? 2 : 3}>
            {post.content}
          </Text>
        </View>

        {firstImage ? (
          <Image source={{ uri: firstImage }} style={styles.thumbnail} resizeMode="cover" />
        ) : null}
      </View>

      {tags.length > 0 && (
        <View style={styles.tagRow}>
          {tags.map((tag) => (
            <View key={tag} style={[styles.tag, { backgroundColor: colors.muted }]}>
              <Text style={[styles.tagText, { color: colors.secondaryText }]}>{tag}</Text>
            </View>
          ))}
          {(post.mediaUris?.length ?? 0) > 0 && (
            <View style={[styles.tag, { backgroundColor: colors.muted }]}>
              <Feather name="image" size={10} color={colors.mutedForeground} />
              <Text style={[styles.tagText, { color: colors.mutedForeground }]}> {post.mediaUris!.length} media</Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.footer}>
        <TouchableOpacity style={styles.userRow} onPress={onUserPress} disabled={!onUserPress}>
          <View style={[styles.avatar, { backgroundColor: colors.secondary + '33' }]}>
            <Text style={[styles.avatarText, { color: colors.secondaryText }]}>
              {post.userName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View>
            <View style={styles.nameRow}>
              <Text style={[styles.userName, { color: colors.foreground }]}>{post.userName}</Text>
              {post.userVerified && (
                <Feather name="check-circle" size={12} color={colors.verified} style={styles.verifiedIcon} />
              )}
            </View>
            <Text style={[styles.userRole, { color: colors.mutedForeground }]}>
              {post.userSpecialization || post.userRole}
            </Text>
          </View>
        </TouchableOpacity>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Feather name="arrow-up" size={13} color={colors.mutedForeground} />
            <Text style={[styles.statText, { color: colors.mutedForeground }]}>{post.upvotes}</Text>
          </View>
          <View style={[styles.stat, { marginLeft: 10 }]}>
            <Feather name="message-circle" size={13} color={colors.mutedForeground} />
            <Text style={[styles.statText, { color: colors.mutedForeground }]}>{commentCount}</Text>
          </View>
          <Text style={[styles.time, { color: colors.mutedForeground }]}>{timeAgo(post.timestamp)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginHorizontal: 16,
    marginVertical: 5,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 8,
    gap: 4,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  mainRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  textCol: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 21,
    marginBottom: 4,
  },
  content: {
    fontSize: 13,
    lineHeight: 19,
  },
  thumbnail: {
    width: 64,
    height: 64,
    borderRadius: 8,
    flexShrink: 0,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '700',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  userName: {
    fontSize: 12,
    fontWeight: '600',
  },
  verifiedIcon: {
    marginTop: 1,
  },
  userRole: {
    fontSize: 11,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  statText: {
    fontSize: 12,
  },
  time: {
    fontSize: 11,
    marginLeft: 10,
  },
});
