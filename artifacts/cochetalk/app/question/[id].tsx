import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import {
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

export default function QuestionDetailScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    questions, answers, comments, currentUser,
    upvoteQuestion, answerQuestion, upvoteAnswer, acceptAnswer, addComment,
  } = useApp();

  const [answerText, setAnswerText] = useState('');
  const [commentTarget, setCommentTarget] = useState<{ id: number; isAnswer: boolean } | null>(null);
  const [commentText, setCommentText] = useState('');
  const [expandedAnswerId, setExpandedAnswerId] = useState<number | null>(null);

  const question = questions.find((q) => q.id === Number(id));
  if (!question) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Question</Text>
        </View>
        <View style={styles.center}>
          <Text style={[styles.notFoundText, { color: colors.mutedForeground }]}>Question not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const questionAnswers = answers.filter((a) => a.questionId === question.id).sort((a, b) => {
    if (a.isAccepted !== b.isAccepted) return a.isAccepted ? -1 : 1;
    return b.upvotes - a.upvotes;
  });
  const questionComments = comments.filter((c) => c.questionOrAnswerId === question.id && !c.isAnswer);
  const tags = question.tags.split(',').map((t) => t.trim()).filter(Boolean);
  const isOwner = currentUser?.id === question.userId;
  const hasVotedQ = question.upvotedBy.includes(currentUser?.id ?? '');

  const handlePostAnswer = () => {
    if (!answerText.trim() || !currentUser) return;
    answerQuestion(question.id, answerText.trim());
    setAnswerText('');
  };

  const handlePostComment = () => {
    if (!commentText.trim() || !currentUser || !commentTarget) return;
    addComment(commentTarget.id, commentTarget.isAnswer, commentText.trim());
    setCommentText('');
    setCommentTarget(null);
  };

  const concerns: string[] = [];
  if (question.hearConcern) concerns.push('Hear');
  if (question.seeConcern) concerns.push('See');
  if (question.smellConcern) concerns.push('Smell');
  if (question.feelConcern) concerns.push('Feel');
  if (question.notStarting) concerns.push('Not Starting');
  if (question.performanceConcern) concerns.push('Performance');
  if (question.dashboardWarningLights) concerns.push('Dash Lights');

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]} numberOfLines={1}>
          {question.isPrivateEcosystem ? 'Pro Circle' : 'Forum'}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={[styles.questionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {question.isPrivateEcosystem && (
            <View style={[styles.proTag, { backgroundColor: colors.proCircle + '22', borderColor: colors.proCircle }]}>
              <Feather name="lock" size={10} color={colors.proCircle} />
              <Text style={[styles.proTagText, { color: colors.proCircle }]}>Pro Circle</Text>
            </View>
          )}

          <Text style={[styles.questionTitle, { color: colors.foreground }]}>{question.title}</Text>

          {question.yrModel ? <Text style={[styles.vehicleModel, { color: colors.primary }]}>{question.yrModel} · {question.vehicleType}</Text> : null}

          <Text style={[styles.questionDesc, { color: colors.foreground }]}>{question.description}</Text>

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
                <View key={c} style={[styles.tag, { backgroundColor: colors.warning + '22' }]}>
                  <Text style={[styles.tagText, { color: colors.warning }]}>{c}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={[styles.questionFooter, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={styles.userRow}
              onPress={() => router.push(`/seller/${encodeURIComponent(question.userId)}`)}
            >
              <View style={[styles.avatar, { backgroundColor: colors.primary + '33' }]}>
                <Text style={[styles.avatarText, { color: colors.primary }]}>{question.userName.charAt(0)}</Text>
              </View>
              <View>
                <View style={styles.nameRow}>
                  <Text style={[styles.userName, { color: colors.foreground }]}>{question.userName}</Text>
                  {question.userVerified && <Feather name="check-circle" size={12} color={colors.verified} />}
                </View>
                <Text style={[styles.userSub, { color: colors.mutedForeground }]}>{timeAgo(question.timestamp)}</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.voteRow}>
              <TouchableOpacity
                style={[styles.voteBtn, { backgroundColor: hasVotedQ ? colors.primary + '22' : colors.muted }]}
                onPress={() => currentUser && upvoteQuestion(question.id)}
              >
                <Feather name="arrow-up" size={14} color={hasVotedQ ? colors.primary : colors.mutedForeground} />
                <Text style={[styles.voteCount, { color: hasVotedQ ? colors.primary : colors.mutedForeground }]}>{question.upvotes}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.commentBtn, { backgroundColor: colors.muted }]}
                onPress={() => setCommentTarget(commentTarget?.id === question.id && !commentTarget.isAnswer ? null : { id: question.id, isAnswer: false })}
              >
                <Feather name="message-circle" size={14} color={colors.mutedForeground} />
                <Text style={[styles.voteCount, { color: colors.mutedForeground }]}>Comment</Text>
              </TouchableOpacity>
            </View>
          </View>

          {questionComments.length > 0 && (
            <View style={[styles.commentsSection, { borderTopColor: colors.border }]}>
              {questionComments.map((c) => (
                <View key={c.id} style={[styles.comment, { borderLeftColor: colors.border }]}>
                  <Text style={[styles.commentAuthor, { color: colors.primary }]}>{c.userName}</Text>
                  <Text style={[styles.commentText, { color: colors.foreground }]}> {c.content}</Text>
                  <Text style={[styles.commentTime, { color: colors.mutedForeground }]}> · {timeAgo(c.timestamp)}</Text>
                </View>
              ))}
            </View>
          )}

          {commentTarget?.id === question.id && !commentTarget.isAnswer && currentUser && (
            <View style={[styles.commentInput, { borderTopColor: colors.border }]}>
              <TextInput
                style={[styles.commentTextInput, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]}
                placeholder="Add a comment..."
                placeholderTextColor={colors.mutedForeground}
                value={commentText}
                onChangeText={setCommentText}
                autoFocus
              />
              <TouchableOpacity style={[styles.commentSubmit, { backgroundColor: colors.primary }]} onPress={handlePostComment} disabled={!commentText.trim()}>
                <Feather name="send" size={14} color={colors.primaryForeground} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.answersHeader}>
          <Text style={[styles.answersTitle, { color: colors.foreground }]}>
            {questionAnswers.length} {questionAnswers.length === 1 ? 'Answer' : 'Answers'}
          </Text>
          {question.acceptedAnswerId > 0 && (
            <View style={[styles.acceptedBadge, { backgroundColor: colors.success + '22' }]}>
              <Feather name="check-circle" size={13} color={colors.success} />
              <Text style={[styles.acceptedBadgeText, { color: colors.success }]}>Resolved</Text>
            </View>
          )}
        </View>

        {questionAnswers.map((answer) => {
          const answerComments = comments.filter((c) => c.questionOrAnswerId === answer.id && c.isAnswer);
          const hasVotedA = answer.upvotedBy.includes(currentUser?.id ?? '');
          const isExpanded = expandedAnswerId === answer.id;

          return (
            <View
              key={answer.id}
              style={[
                styles.answerCard,
                { backgroundColor: colors.card, borderColor: answer.isAccepted ? colors.success : colors.border },
                answer.isAccepted && { borderWidth: 2 },
              ]}
            >
              {answer.isAccepted && (
                <View style={[styles.acceptedTag, { backgroundColor: colors.success + '22' }]}>
                  <Feather name="check-circle" size={12} color={colors.success} />
                  <Text style={[styles.acceptedTagText, { color: colors.success }]}>Accepted Answer</Text>
                </View>
              )}

              <View style={styles.answerUserRow}>
                <TouchableOpacity style={styles.userRow} onPress={() => router.push(`/seller/${encodeURIComponent(answer.userId)}`)}>
                  <View style={[styles.avatar, { backgroundColor: answer.userVerified ? colors.verified + '33' : colors.muted }]}>
                    <Text style={[styles.avatarText, { color: answer.userVerified ? colors.verified : colors.mutedForeground }]}>{answer.userName.charAt(0)}</Text>
                  </View>
                  <View>
                    <View style={styles.nameRow}>
                      <Text style={[styles.userName, { color: colors.foreground }]}>{answer.userName}</Text>
                      {answer.userVerified && <Feather name="check-circle" size={12} color={colors.verified} />}
                    </View>
                    <Text style={[styles.userSub, { color: colors.mutedForeground }]}>
                      {answer.userSpecialization || answer.userRole} · {timeAgo(answer.timestamp)}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              <Text style={[styles.answerContent, { color: colors.foreground }]}>{answer.content}</Text>

              <View style={[styles.answerActions, { borderTopColor: colors.border }]}>
                <TouchableOpacity
                  style={[styles.voteBtn, { backgroundColor: hasVotedA ? colors.primary + '22' : colors.muted }]}
                  onPress={() => currentUser && upvoteAnswer(answer.id)}
                >
                  <Feather name="arrow-up" size={13} color={hasVotedA ? colors.primary : colors.mutedForeground} />
                  <Text style={[styles.voteCount, { color: hasVotedA ? colors.primary : colors.mutedForeground }]}>{answer.upvotes}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.commentBtn, { backgroundColor: colors.muted }]}
                  onPress={() => setCommentTarget(commentTarget?.id === answer.id && commentTarget.isAnswer ? null : { id: answer.id, isAnswer: true })}
                >
                  <Feather name="message-circle" size={13} color={colors.mutedForeground} />
                  <Text style={[styles.voteCount, { color: colors.mutedForeground }]}>
                    {answerComments.length > 0 ? `${answerComments.length}` : 'Comment'}
                  </Text>
                </TouchableOpacity>

                {isOwner && !answer.isAccepted && (
                  <TouchableOpacity
                    style={[styles.acceptBtn, { backgroundColor: colors.success + '22', borderColor: colors.success + '44' }]}
                    onPress={() => acceptAnswer(question.id, answer.id)}
                  >
                    <Feather name="check" size={13} color={colors.success} />
                    <Text style={[styles.acceptBtnText, { color: colors.success }]}>Accept</Text>
                  </TouchableOpacity>
                )}
              </View>

              {answerComments.length > 0 && (
                <View style={[styles.commentsSection, { borderTopColor: colors.border }]}>
                  {answerComments.map((c) => (
                    <View key={c.id} style={[styles.comment, { borderLeftColor: colors.border }]}>
                      <Text style={[styles.commentAuthor, { color: colors.primary }]}>{c.userName}</Text>
                      <Text style={[styles.commentText, { color: colors.foreground }]}> {c.content}</Text>
                      <Text style={[styles.commentTime, { color: colors.mutedForeground }]}> · {timeAgo(c.timestamp)}</Text>
                    </View>
                  ))}
                </View>
              )}

              {commentTarget?.id === answer.id && commentTarget.isAnswer && currentUser && (
                <View style={[styles.commentInput, { borderTopColor: colors.border }]}>
                  <TextInput
                    style={[styles.commentTextInput, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]}
                    placeholder="Add a comment..."
                    placeholderTextColor={colors.mutedForeground}
                    value={commentText}
                    onChangeText={setCommentText}
                    autoFocus
                  />
                  <TouchableOpacity style={[styles.commentSubmit, { backgroundColor: colors.primary }]} onPress={handlePostComment} disabled={!commentText.trim()}>
                    <Feather name="send" size={14} color={colors.primaryForeground} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}

        {questionAnswers.length === 0 && (
          <View style={[styles.noAnswers, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Feather name="message-square" size={28} color={colors.mutedForeground} />
            <Text style={[styles.noAnswersText, { color: colors.mutedForeground }]}>No answers yet. Be the first to help!</Text>
          </View>
        )}

        {currentUser && (
          <View style={[styles.postAnswerSection, { borderTopColor: colors.border }]}>
            <Text style={[styles.postAnswerTitle, { color: colors.foreground }]}>Your Answer</Text>
            <TextInput
              style={[styles.answerInput, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]}
              placeholder="Share your knowledge and experience..."
              placeholderTextColor={colors.mutedForeground}
              value={answerText}
              onChangeText={setAnswerText}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
            <TouchableOpacity
              style={[styles.postAnswerBtn, { backgroundColor: !answerText.trim() ? colors.muted : colors.primary }]}
              onPress={handlePostAnswer}
              disabled={!answerText.trim()}
            >
              <Text style={[styles.postAnswerBtnText, { color: !answerText.trim() ? colors.mutedForeground : colors.primaryForeground }]}>
                Post Answer
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {!currentUser && (
          <View style={[styles.loginPrompt, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Text style={[styles.loginPromptText, { color: colors.mutedForeground }]}>Sign in to answer this question</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/profile')}>
              <Text style={[styles.loginLink, { color: colors.primary }]}>Sign In</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFoundText: { fontSize: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  backBtn: { padding: 2 },
  headerTitle: { fontSize: 17, fontWeight: '700', flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 14 },
  questionCard: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 14 },
  proTag: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', borderRadius: 20, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2, marginBottom: 8 },
  proTagText: { fontSize: 10, fontWeight: '600' },
  questionTitle: { fontSize: 17, fontWeight: '700', lineHeight: 24, marginBottom: 6 },
  vehicleModel: { fontSize: 12, fontWeight: '500', marginBottom: 10 },
  questionDesc: { fontSize: 14, lineHeight: 22, marginBottom: 12 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  tag: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  tagText: { fontSize: 11, fontWeight: '500' },
  questionFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, marginTop: 6, borderTopWidth: 1 },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatar: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 13, fontWeight: '700' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  userName: { fontSize: 13, fontWeight: '600' },
  userSub: { fontSize: 11, marginTop: 1 },
  voteRow: { flexDirection: 'row', gap: 6 },
  voteBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  voteCount: { fontSize: 12, fontWeight: '600' },
  commentBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  commentsSection: { borderTopWidth: 1, marginTop: 10, paddingTop: 10, gap: 6 },
  comment: { borderLeftWidth: 2, paddingLeft: 8 },
  commentAuthor: { fontSize: 12, fontWeight: '700' },
  commentText: { fontSize: 12 },
  commentTime: { fontSize: 11 },
  commentInput: { flexDirection: 'row', gap: 8, borderTopWidth: 1, paddingTop: 10, marginTop: 8 },
  commentTextInput: { flex: 1, borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13 },
  commentSubmit: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  answersHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  answersTitle: { fontSize: 16, fontWeight: '700' },
  acceptedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4 },
  acceptedBadgeText: { fontSize: 12, fontWeight: '600' },
  answerCard: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 10 },
  acceptedTag: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2, marginBottom: 8 },
  acceptedTagText: { fontSize: 10, fontWeight: '700' },
  answerUserRow: { marginBottom: 10 },
  answerContent: { fontSize: 14, lineHeight: 22, marginBottom: 12 },
  answerActions: { flexDirection: 'row', gap: 6, borderTopWidth: 1, paddingTop: 10 },
  acceptBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 20, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5 },
  acceptBtnText: { fontSize: 12, fontWeight: '600' },
  noAnswers: { borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8, marginBottom: 14 },
  noAnswersText: { fontSize: 14, textAlign: 'center' },
  postAnswerSection: { borderTopWidth: 1, paddingTop: 14, marginTop: 4 },
  postAnswerTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10 },
  answerInput: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, minHeight: 100 },
  postAnswerBtn: { marginTop: 10, borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  postAnswerBtnText: { fontSize: 15, fontWeight: '700' },
  loginPrompt: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 10, borderWidth: 1, padding: 14 },
  loginPromptText: { fontSize: 14 },
  loginLink: { fontSize: 14, fontWeight: '700' },
});
