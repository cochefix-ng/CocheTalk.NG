import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DiscussionCard } from '@/components/DiscussionCard';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { primitives } from '@/constants/colors';
import { QuestionCard } from '@/components/QuestionCard';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { useTabBarScrollHandler } from '@/hooks/useTabBarVisibility';

const VEHICLE_TYPES = ['Sedan', 'SUV', 'Hatchback', 'Pickup', 'Van', 'Bus', 'Other'];
const COMMON_TAGS = [
  'Honda', 'Toyota', 'Volkswagen', 'Nissan', 'Ford', 'Hyundai',
  'Engine', 'Transmission', 'Brakes', 'Suspension', 'Electrical', 'Cooling', 'AC', 'Tires',
  'Diagnostics', 'Tools', 'Business', 'Workshop',
];
const CONCERNS = [
  { key: 'hearConcern', label: 'Hear Something' },
  { key: 'seeConcern', label: 'See Something' },
  { key: 'smellConcern', label: 'Smell Something' },
  { key: 'feelConcern', label: 'Feel Something' },
  { key: 'notStarting', label: 'Not Starting' },
  { key: 'performanceConcern', label: 'Performance Issue' },
  { key: 'dashboardWarningLights', label: 'Dashboard Warning' },
] as const;
type ConcernKey = (typeof CONCERNS)[number]['key'];

const TYPE_FILTERS = ['All', 'Questions', 'Discussions'] as const;
type TypeFilter = (typeof TYPE_FILTERS)[number];
const SORT_FILTERS = ['Latest', 'Most Answered', 'Unanswered'];

export default function ProCircleScreen() {
  const colors = useColors();
  const handleScroll = useTabBarScrollHandler();
  const { questions, answers, discussions, discussionComments, currentUser, askQuestion, createDiscussion } = useApp();

  // ── Modal state ───────────────────────────────────────
  const [showFabMenu, setShowFabMenu] = useState(false);
  const [showAskModal, setShowAskModal] = useState(false);
  const [showDiscussModal, setShowDiscussModal] = useState(false);

  // ── Filter state ──────────────────────────────────────
  const [activeTypeFilter, setActiveTypeFilter] = useState<TypeFilter>('All');
  const [activeSortFilter, setActiveSortFilter] = useState('Latest');

  // ── Question form state ───────────────────────────────
  const [qTitle, setQTitle] = useState('');
  const [qDesc, setQDesc] = useState('');
  const [qModel, setQModel] = useState('');
  const [qType, setQType] = useState('Sedan');
  const [qTags, setQTags] = useState<string[]>([]);
  const [qConcerns, setQConcerns] = useState<Record<ConcernKey, boolean>>({
    hearConcern: false, seeConcern: false, smellConcern: false, feelConcern: false,
    notStarting: false, performanceConcern: false, dashboardWarningLights: false,
  });

  // ── Discussion form state ─────────────────────────────
  const [dTitle, setDTitle] = useState('');
  const [dContent, setDContent] = useState('');
  const [dTags, setDTags] = useState<string[]>([]);
  const [dCustomTag, setDCustomTag] = useState('');
  const [dMedia, setDMedia] = useState<string[]>([]);

  const isRestricted = !currentUser || currentUser.role === 'Car Owner';

  // ── Derived data ──────────────────────────────────────
  const proQuestions = useMemo(() => questions.filter((q) => q.isPrivateEcosystem), [questions]);
  const proDiscussions = useMemo(() => (discussions ?? []).filter((d) => d.isProCircle), [discussions]);

  type FeedItem =
    | { kind: 'question'; data: (typeof questions)[number] }
    | { kind: 'discussion'; data: (typeof discussions)[number] };

  const feedItems = useMemo((): FeedItem[] => {
    let qItems: FeedItem[] = proQuestions.map((q) => ({ kind: 'question' as const, data: q }));
    let dItems: FeedItem[] = proDiscussions.map((d) => ({ kind: 'discussion' as const, data: d }));

    let combined: FeedItem[];
    if (activeTypeFilter === 'Questions') combined = qItems;
    else if (activeTypeFilter === 'Discussions') combined = dItems;
    else combined = [...qItems, ...dItems];

    if (activeSortFilter === 'Most Answered') {
      return combined.sort((a, b) => {
        const countA = a.kind === 'question'
          ? answers.filter((ans) => ans.questionId === a.data.id).length
          : (discussionComments ?? []).filter((c) => c.postId === a.data.id).length;
        const countB = b.kind === 'question'
          ? answers.filter((ans) => ans.questionId === b.data.id).length
          : (discussionComments ?? []).filter((c) => c.postId === b.data.id).length;
        return countB - countA;
      });
    }
    if (activeSortFilter === 'Unanswered') {
      return combined.filter((item) => {
        if (item.kind === 'question') return !answers.some((a) => a.questionId === item.data.id);
        return (discussionComments ?? []).filter((c) => c.postId === item.data.id).length === 0;
      });
    }
    return combined.sort((a, b) => b.data.timestamp - a.data.timestamp);
  }, [proQuestions, proDiscussions, answers, discussionComments, activeTypeFilter, activeSortFilter]);

  // ── Question form helpers ─────────────────────────────
  const resetQForm = () => {
    setQTitle(''); setQDesc(''); setQModel(''); setQType('Sedan'); setQTags([]);
    setQConcerns({ hearConcern: false, seeConcern: false, smellConcern: false, feelConcern: false, notStarting: false, performanceConcern: false, dashboardWarningLights: false });
  };

  const handleQSubmit = () => {
    if (!qTitle.trim() || !qDesc.trim()) return;
    askQuestion({
      title: qTitle.trim(), description: qDesc.trim(), tags: qTags.join(','),
      yrModel: qModel.trim(), vehicleType: qType, isPrivateEcosystem: true, ...qConcerns,
    });
    setShowAskModal(false);
    resetQForm();
  };

  const toggleQTag = (tag: string) => setQTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);
  const toggleConcern = (key: ConcernKey) => setQConcerns((prev) => ({ ...prev, [key]: !prev[key] }));

  // ── Discussion form helpers ───────────────────────────
  const resetDForm = () => {
    setDTitle(''); setDContent(''); setDTags([]); setDCustomTag(''); setDMedia([]);
  };

  const handleDSubmit = () => {
    if (!dContent.trim()) return;
    createDiscussion({
      title: dTitle.trim() || undefined,
      content: dContent.trim(),
      tags: dTags.join(','),
      mediaUris: dMedia,
      isProCircle: true,
    });
    setShowDiscussModal(false);
    resetDForm();
  };

  const toggleDTag = (tag: string) =>
    setDTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);

  const addCustomTag = () => {
    const t = dCustomTag.trim();
    if (t && !dTags.includes(t)) setDTags((prev) => [...prev, t]);
    setDCustomTag('');
  };

  const pickMedia = async () => {
    if (dMedia.length >= 4) {
      Alert.alert('Limit reached', 'You can attach up to 4 images or videos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection: true,
      selectionLimit: 4 - dMedia.length,
      quality: 0.8,
    });
    if (!result.canceled) {
      const uris = result.assets.map((a) => a.uri);
      setDMedia((prev) => [...prev, ...uris].slice(0, 4));
    }
  };

  const removeMedia = (uri: string) => setDMedia((prev) => prev.filter((u) => u !== uri));

  // ── Restricted screen ─────────────────────────────────
  if (isRestricted) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Feather name="lock" size={18} color={colors.proCircle} />
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Pro Circle</Text>
        </View>
        <View style={styles.restrictedContent}>
          <View style={[styles.restrictedIcon, { backgroundColor: colors.proCircle + '22' }]}>
            <Feather name="lock" size={40} color={colors.proCircle} />
          </View>
          <Text style={[styles.restrictedTitle, { color: colors.foreground }]}>Restricted Access</Text>
          <Text style={[styles.restrictedDesc, { color: colors.mutedForeground }]}>
            Pro Circle is exclusively for verified mechanics and service providers on CocheTalk.NG. Technical discussions, trade secrets, and professional advice live here.
          </Text>
          <TouchableOpacity
            style={[styles.switchAccountBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
            onPress={() => router.push('/(tabs)/profile')}
          >
            <Feather name="user" size={15} color={colors.foreground} />
            <Text style={[styles.switchAccountText, { color: colors.foreground }]}>Switch to a Pro Account</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Main screen ───────────────────────────────────────
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <Feather name="lock" size={16} color={colors.proCircle} />
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Pro Circle</Text>
        </View>
        <View style={[styles.proBadge, { backgroundColor: colors.proCircle + '22' }]}>
          <Text style={[styles.proBadgeText, { color: colors.proCircleText }]}>Mechanics Only</Text>
        </View>
      </View>

      {/* Type filter tabs */}
      <View style={[styles.typeRow, { borderBottomColor: colors.border }]}>
        {TYPE_FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.typeTab, activeTypeFilter === f && { borderBottomColor: colors.proCircle, borderBottomWidth: 2 }]}
            onPress={() => setActiveTypeFilter(f)}
          >
            {f === 'Discussions' ? (
              <Feather name="book-open" size={13} color={activeTypeFilter === f ? colors.proCircle : colors.mutedForeground} style={{ marginRight: 4 }} />
            ) : f === 'Questions' ? (
              <Feather name="help-circle" size={13} color={activeTypeFilter === f ? colors.proCircle : colors.mutedForeground} style={{ marginRight: 4 }} />
            ) : null}
            <Text style={[styles.typeTabText, { color: activeTypeFilter === f ? colors.proCircleText : colors.mutedForeground }]}>
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Sort chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterContent}>
        {SORT_FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.chip, { backgroundColor: activeSortFilter === f ? colors.proCircle : colors.muted, borderColor: activeSortFilter === f ? colors.proCircle : colors.border }]}
            onPress={() => setActiveSortFilter(f)}
          >
            <Text style={[styles.chipText, { color: activeSortFilter === f ? colors.accentForeground : colors.mutedForeground }]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Feed */}
      <FlatList
        data={feedItems}
        keyExtractor={(item) => `${item.kind}-${item.data.id}`}
        renderItem={({ item }) => {
          if (item.kind === 'question') {
            return (
              <QuestionCard
                question={item.data}
                answerCount={answers.filter((a) => a.questionId === item.data.id).length}
                isProCircle
                onUserPress={() => router.push(`/seller/${encodeURIComponent(item.data.userId)}`)}
              />
            );
          }
          return (
            <DiscussionCard
              post={item.data}
              commentCount={(discussionComments ?? []).filter((c) => c.postId === item.data.id).length}
              onUserPress={() => router.push(`/seller/${encodeURIComponent(item.data.userId)}`)}
            />
          );
        }}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Feather name="lock" size={40} color={colors.proCircle} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              {activeTypeFilter === 'Discussions' ? 'No pro discussions yet' : 'No pro questions yet'}
            </Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              {activeTypeFilter === 'Discussions'
                ? 'Share your expertise or workshop knowledge with fellow mechanics.'
                : 'Share your technical expertise with fellow mechanics.'}
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      />

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.proCircle }]}
        onPress={() => setShowFabMenu(true)}
      >
        <Feather name="plus" size={24} color={colors.proCircleForeground} />
      </TouchableOpacity>

      {/* ═══════════════════════════════════════════
          FAB menu
      ═══════════════════════════════════════════ */}
      <Modal visible={showFabMenu} animationType="fade" transparent onRequestClose={() => setShowFabMenu(false)}>
        <Pressable style={[styles.overlay, { backgroundColor: colors.overlay }]} onPress={() => setShowFabMenu(false)} />
        <View style={[styles.fabMenu, { backgroundColor: colors.card }]}>
          <Text style={[styles.fabMenuTitle, { color: colors.mutedForeground }]}>What would you like to post?</Text>

          <TouchableOpacity
            style={[styles.fabMenuOption, { borderColor: colors.border }]}
            onPress={() => { setShowFabMenu(false); setShowAskModal(true); }}
          >
            <View style={[styles.fabMenuIcon, { backgroundColor: colors.proCircle + '22' }]}>
              <Feather name="help-circle" size={20} color={colors.proCircle} />
            </View>
            <View style={styles.fabMenuText}>
              <Text style={[styles.fabMenuOptionTitle, { color: colors.foreground }]}>Ask a Technical Question</Text>
              <Text style={[styles.fabMenuOptionDesc, { color: colors.mutedForeground }]}>Get help from fellow mechanics</Text>
            </View>
            <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.fabMenuOption, { borderColor: colors.border }]}
            onPress={() => { setShowFabMenu(false); setShowDiscussModal(true); }}
          >
            <View style={[styles.fabMenuIcon, { backgroundColor: colors.proCircle + '22' }]}>
              <Feather name="book-open" size={20} color={colors.proCircle} />
            </View>
            <View style={styles.fabMenuText}>
              <Text style={[styles.fabMenuOptionTitle, { color: colors.foreground }]}>General Discussion</Text>
              <Text style={[styles.fabMenuOptionDesc, { color: colors.mutedForeground }]}>Share experiences, tools & workshop tips</Text>
            </View>
            <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>
      </Modal>

      {/* ═══════════════════════════════════════════
          Ask a Technical Question modal
      ═══════════════════════════════════════════ */}
      <Modal visible={showAskModal} animationType="slide" transparent onRequestClose={() => { setShowAskModal(false); resetQForm(); }}>
        <Pressable style={[styles.overlay, { backgroundColor: colors.overlay }]} onPress={() => { setShowAskModal(false); resetQForm(); }} />
        <View style={[styles.sheet, { backgroundColor: colors.background }]}>
          <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
          <View style={[styles.sheetHeader, { borderBottomColor: colors.border }]}>
            <View style={styles.sheetTitleRow}>
              <Feather name="lock" size={16} color={colors.proCircle} />
              <Text style={[styles.sheetTitle, { color: colors.foreground }]}>New Pro Question</Text>
            </View>
            <TouchableOpacity onPress={() => { setShowAskModal(false); resetQForm(); }}>
              <Feather name="x" size={22} color={colors.foreground} />
            </TouchableOpacity>
          </View>
          <KeyboardAwareScrollViewCompat style={styles.sheetBody}>
            <Text style={[styles.label, { color: colors.foreground }]}>Title *</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]} placeholder="Describe the technical issue" placeholderTextColor={colors.mutedForeground} value={qTitle} onChangeText={setQTitle} />

            <Text style={[styles.label, { color: colors.foreground }]}>Details *</Text>
            <TextInput style={[styles.textarea, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]} placeholder="Provide technical details, error codes, measurements..." placeholderTextColor={colors.mutedForeground} value={qDesc} onChangeText={setQDesc} multiline numberOfLines={4} textAlignVertical="top" />

            <Text style={[styles.label, { color: colors.foreground }]}>Vehicle Year / Model</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]} placeholder="e.g. 2017 VW Golf Mk7" placeholderTextColor={colors.mutedForeground} value={qModel} onChangeText={setQModel} />

            <Text style={[styles.label, { color: colors.foreground }]}>Vehicle Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {VEHICLE_TYPES.map((t) => (
                <TouchableOpacity key={t} style={[styles.chip, { backgroundColor: qType === t ? colors.proCircle : colors.muted, borderColor: qType === t ? colors.proCircle : colors.border, marginRight: 6 }]} onPress={() => setQType(t)}>
                  <Text style={[styles.chipText, { color: qType === t ? colors.proCircleForeground : colors.mutedForeground }]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={[styles.label, { color: colors.foreground }]}>Tags</Text>
            <View style={styles.tagGrid}>
              {COMMON_TAGS.map((tag) => (
                <TouchableOpacity key={tag} style={[styles.chip, { backgroundColor: qTags.includes(tag) ? colors.proCircle + '33' : colors.muted, borderColor: qTags.includes(tag) ? colors.proCircle : colors.border }]} onPress={() => toggleQTag(tag)}>
                  <Text style={[styles.chipText, { color: qTags.includes(tag) ? colors.proCircleText : colors.mutedForeground }]}>{tag}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.label, { color: colors.foreground }]}>Symptoms</Text>
            <View style={styles.concernGrid}>
              {CONCERNS.map((c) => (
                <TouchableOpacity key={c.key} style={[styles.concernChip, { backgroundColor: qConcerns[c.key] ? colors.proCircle + '22' : colors.muted, borderColor: qConcerns[c.key] ? colors.proCircle : colors.border }]} onPress={() => toggleConcern(c.key)}>
                  {qConcerns[c.key] && <Feather name="check" size={10} color={colors.proCircle} />}
                  <Text style={[styles.chipText, { color: qConcerns[c.key] ? colors.proCircleText : colors.mutedForeground }]}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={[styles.submitBtn, { backgroundColor: !qTitle.trim() || !qDesc.trim() ? colors.muted : colors.proCircle }]} onPress={handleQSubmit} disabled={!qTitle.trim() || !qDesc.trim()}>
              <Text style={[styles.submitBtnText, { color: !qTitle.trim() || !qDesc.trim() ? colors.mutedForeground : colors.proCircleForeground }]}>Post to Pro Circle</Text>
            </TouchableOpacity>
            <View style={{ height: 40 }} />
          </KeyboardAwareScrollViewCompat>
        </View>
      </Modal>

      {/* ═══════════════════════════════════════════
          General Discussion modal
      ═══════════════════════════════════════════ */}
      <Modal visible={showDiscussModal} animationType="slide" transparent onRequestClose={() => { setShowDiscussModal(false); resetDForm(); }}>
        <Pressable style={[styles.overlay, { backgroundColor: colors.overlay }]} onPress={() => { setShowDiscussModal(false); resetDForm(); }} />
        <View style={[styles.sheet, { backgroundColor: colors.background }]}>
          <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
          <View style={[styles.sheetHeader, { borderBottomColor: colors.border }]}>
            <View style={styles.sheetTitleRow}>
              <Feather name="book-open" size={16} color={colors.proCircle} />
              <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Pro Discussion</Text>
            </View>
            <TouchableOpacity onPress={() => { setShowDiscussModal(false); resetDForm(); }}>
              <Feather name="x" size={22} color={colors.foreground} />
            </TouchableOpacity>
          </View>

          <KeyboardAwareScrollViewCompat style={styles.sheetBody}>
            {/* Title — optional */}
            <View style={styles.labelRow}>
              <Text style={[styles.label, { color: colors.foreground, marginTop: 0 }]}>Title</Text>
              <Text style={[styles.optionalBadge, { color: colors.mutedForeground }]}>optional but recommended</Text>
            </View>
            <TextInput
              style={[styles.input, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]}
              placeholder="e.g. How I handle customer disputes over labour charges"
              placeholderTextColor={colors.mutedForeground}
              value={dTitle}
              onChangeText={setDTitle}
            />

            {/* Content — required */}
            <Text style={[styles.label, { color: colors.foreground }]}>Content *</Text>
            <TextInput
              style={[styles.textarea, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground, minHeight: 120 }]}
              placeholder="Share your experience, workshop knowledge or insight..."
              placeholderTextColor={colors.mutedForeground}
              value={dContent}
              onChangeText={setDContent}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />

            {/* Tags */}
            <Text style={[styles.label, { color: colors.foreground }]}>Tags</Text>
            <View style={styles.tagGrid}>
              {COMMON_TAGS.map((tag) => (
                <TouchableOpacity
                  key={tag}
                  style={[styles.chip, { backgroundColor: dTags.includes(tag) ? colors.proCircle + '33' : colors.muted, borderColor: dTags.includes(tag) ? colors.proCircle : colors.border }]}
                  onPress={() => toggleDTag(tag)}
                >
                  <Text style={[styles.chipText, { color: dTags.includes(tag) ? colors.proCircleText : colors.mutedForeground }]}>{tag}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Custom tag */}
            <View style={styles.customTagRow}>
              <TextInput
                style={[styles.customTagInput, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]}
                placeholder="Add custom tag..."
                placeholderTextColor={colors.mutedForeground}
                value={dCustomTag}
                onChangeText={setDCustomTag}
                onSubmitEditing={addCustomTag}
                returnKeyType="done"
              />
              <TouchableOpacity
                style={[styles.customTagBtn, { backgroundColor: dCustomTag.trim() ? colors.proCircle : colors.muted }]}
                onPress={addCustomTag}
                disabled={!dCustomTag.trim()}
              >
                <Feather name="plus" size={16} color={dCustomTag.trim() ? colors.accentForeground : colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            {/* Selected custom tags */}
            {dTags.filter((t) => !COMMON_TAGS.includes(t)).length > 0 && (
              <View style={[styles.tagGrid, { marginTop: 6 }]}>
                {dTags.filter((t) => !COMMON_TAGS.includes(t)).map((tag) => (
                  <TouchableOpacity
                    key={tag}
                    style={[styles.chip, { backgroundColor: colors.proCircle + '33', borderColor: colors.proCircle, flexDirection: 'row', gap: 4 }]}
                    onPress={() => toggleDTag(tag)}
                  >
                    <Text style={[styles.chipText, { color: colors.proCircleText }]}>{tag}</Text>
                    <Feather name="x" size={10} color={colors.proCircle} />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Media */}
            <View style={styles.labelRow}>
              <Text style={[styles.label, { color: colors.foreground, marginTop: 14 }]}>Media</Text>
              <Text style={[styles.optionalBadge, { color: colors.mutedForeground }]}>optional – up to 4 images/videos</Text>
            </View>

            <TouchableOpacity
              style={[styles.mediaPickerBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
              onPress={pickMedia}
            >
              <Feather name="image" size={18} color={colors.mutedForeground} />
              <Text style={[styles.mediaPickerText, { color: colors.mutedForeground }]}>
                {dMedia.length > 0 ? `${dMedia.length} file${dMedia.length > 1 ? 's' : ''} selected — tap to add more` : 'Tap to pick images or videos'}
              </Text>
            </TouchableOpacity>

            {dMedia.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }} contentContainerStyle={{ gap: 8 }}>
                {dMedia.map((uri) => (
                  <View key={uri} style={styles.mediaPreviewItem}>
                    <Image source={{ uri }} style={styles.mediaPreviewThumb} resizeMode="cover" />
                    <TouchableOpacity style={styles.mediaRemoveBtn} onPress={() => removeMedia(uri)}>
                      <Feather name="x" size={12} color={colors.errorForeground} />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}

            {/* Submit */}
            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: !dContent.trim() ? colors.muted : colors.proCircle, marginTop: 20, flexDirection: 'row', justifyContent: 'center' }]}
              onPress={handleDSubmit}
              disabled={!dContent.trim()}
            >
              <Feather name="send" size={16} color={!dContent.trim() ? colors.mutedForeground : colors.proCircleForeground} style={{ marginRight: 8 }} />
              <Text style={[styles.submitBtnText, { color: !dContent.trim() ? colors.mutedForeground : colors.proCircleForeground }]}>
                Post to Pro Circle
              </Text>
            </TouchableOpacity>

            <View style={{ height: 40 }} />
          </KeyboardAwareScrollViewCompat>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  proBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  proBadgeText: { fontSize: 12, fontWeight: '600' },
  restrictedContent: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 16 },
  restrictedIcon: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  restrictedTitle: { fontSize: 22, fontWeight: '700', textAlign: 'center' },
  restrictedDesc: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  switchAccountBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, borderWidth: 1, paddingHorizontal: 20, paddingVertical: 12, marginTop: 8 },
  switchAccountText: { fontSize: 14, fontWeight: '600' },
  // Type tabs
  typeRow: { flexDirection: 'row', borderBottomWidth: 1, paddingHorizontal: 16 },
  typeTab: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 4, marginRight: 20, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  typeTabText: { fontSize: 13, fontWeight: '600' },
  // Sort chips
  filterRow: { marginTop: 8, maxHeight: 42 },
  filterContent: { paddingHorizontal: 16, gap: 6, alignItems: 'center' },
  chip: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1 },
  chipText: { fontSize: 12, fontWeight: '500' },
  // List
  listContent: { paddingTop: 10, paddingBottom: 100 },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyTitle: { fontSize: 17, fontWeight: '600' },
  emptyText: { fontSize: 14, textAlign: 'center', paddingHorizontal: 20 },
  fab: { position: 'absolute', bottom: Platform.OS === 'ios' ? 95 : 75, right: 20, width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: primitives.BLACK, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4 },
  overlay: { ...StyleSheet.absoluteFill },
  // FAB menu
  fabMenu: { position: 'absolute', bottom: Platform.OS === 'ios' ? 160 : 140, right: 16, left: 16, borderRadius: 16, padding: 16, elevation: 8, shadowColor: primitives.BLACK, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
  fabMenuTitle: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 12 },
  fabMenuOption: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderTopWidth: 1 },
  fabMenuIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  fabMenuText: { flex: 1 },
  fabMenuOptionTitle: { fontSize: 15, fontWeight: '600' },
  fabMenuOptionDesc: { fontSize: 12, marginTop: 2 },
  // Bottom sheet
  sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '92%' },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginVertical: 10 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1 },
  sheetTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sheetTitle: { fontSize: 18, fontWeight: '700' },
  sheetBody: { paddingHorizontal: 20, paddingTop: 16 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6, marginTop: 14 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, marginBottom: 6 },
  optionalBadge: { fontSize: 11, fontStyle: 'italic' },
  input: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  textarea: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, minHeight: 90, maxHeight: 180 },
  tagGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  concernGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  concernChip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1 },
  submitBtn: { marginTop: 20, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  submitBtnText: { fontSize: 16, fontWeight: '700' },
  customTagRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  customTagInput: { flex: 1, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14 },
  customTagBtn: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  mediaPickerBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 10, borderWidth: 1, borderStyle: 'dashed', paddingHorizontal: 14, paddingVertical: 12 },
  mediaPickerText: { fontSize: 13, flex: 1 },
  mediaPreviewItem: { position: 'relative' },
  mediaPreviewThumb: { width: 80, height: 80, borderRadius: 8 },
  mediaRemoveBtn: { position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: 10, backgroundColor: primitives.IMAGE_SCRIM, alignItems: 'center', justifyContent: 'center' },
});
