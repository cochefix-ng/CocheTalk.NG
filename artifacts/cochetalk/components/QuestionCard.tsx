import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import type { Question } from '@/context/AppContext';
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
  question: Question;
  answerCount: number;
  isProCircle?: boolean;
  onUserPress?: () => void;
}

export function QuestionCard({ question, answerCount, isProCircle = false, onUserPress }: Props) {
  const colors = useColors();

  const tags = question.tags
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  const concerns: string[] = [];
  if (question.hearConcern) concerns.push('Hear');
  if (question.seeConcern) concerns.push('See');
  if (question.smellConcern) concerns.push('Smell');
  if (question.feelConcern) concerns.push('Feel');
  if (question.notStarting) concerns.push('Not Starting');
  if (question.performanceConcern) concerns.push('Performance');
  if (question.dashboardWarningLights) concerns.push('Dash Lights');

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => router.push(`/question/${question.id}`)}
      activeOpacity={0.75}
    >
      {isProCircle && (
        <View style={[styles.proBadge, { backgroundColor: colors.proCircle + '22', borderColor: colors.proCircle }]}>
          <Feather name="lock" size={10} color={colors.proCircle} />
          <Text style={[styles.proLabel, { color: colors.proCircle }]}>Pro Circle</Text>
        </View>
      )}

      <Text style={[styles.title, { color: colors.cardForeground }]} numberOfLines={2}>
        {question.title}
      </Text>

      {question.yrModel ? (
        <Text style={[styles.model, { color: colors.mutedForeground }]}>{question.yrModel}</Text>
      ) : null}

      {tags.length > 0 && (
        <View style={styles.tagRow}>
          {tags.map((tag) => (
            <View key={tag} style={[styles.tag, { backgroundColor: colors.muted }]}>
              <Text style={[styles.tagText, { color: colors.primary }]}>{tag}</Text>
            </View>
          ))}
        </View>
      )}

      {concerns.length > 0 && (
        <View style={styles.tagRow}>
          {concerns.map((c) => (
            <View key={c} style={[styles.tag, { backgroundColor: colors.warning + '22', borderColor: colors.warning + '44' }]}>
              <Text style={[styles.tagText, { color: colors.warning }]}>{c}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.footer}>
        <TouchableOpacity style={styles.userRow} onPress={onUserPress} disabled={!onUserPress}>
          <View style={[styles.avatar, { backgroundColor: colors.primary + '33' }]}>
            <Text style={[styles.avatarText, { color: colors.primary }]}>
              {question.userName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View>
            <View style={styles.nameRow}>
              <Text style={[styles.userName, { color: colors.foreground }]}>{question.userName}</Text>
              {question.userVerified && (
                <Feather name="check-circle" size={12} color={colors.verified} style={styles.verifiedIcon} />
              )}
            </View>
            <Text style={[styles.userRole, { color: colors.mutedForeground }]}>
              {question.userSpecialization || question.userRole}
            </Text>
          </View>
        </TouchableOpacity>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Feather name="arrow-up" size={13} color={colors.mutedForeground} />
            <Text style={[styles.statText, { color: colors.mutedForeground }]}>{question.upvotes}</Text>
          </View>
          <View style={[styles.stat, { marginLeft: 10 }]}>
            <Feather name="message-square" size={13} color={colors.mutedForeground} />
            <Text style={[styles.statText, { color: colors.mutedForeground }]}>{answerCount}</Text>
          </View>
          {question.acceptedAnswerId > 0 && (
            <View style={[styles.stat, { marginLeft: 10 }]}>
              <Feather name="check-circle" size={13} color={colors.success} />
            </View>
          )}
          <Text style={[styles.time, { color: colors.mutedForeground }]}>{timeAgo(question.timestamp)}</Text>
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
  proBadge: {
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
  proLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 21,
    marginBottom: 4,
  },
  model: {
    fontSize: 12,
    marginBottom: 8,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  tag: {
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
