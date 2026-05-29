import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { QuestionCard } from '@/components/QuestionCard';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';

const FILTERS = ['Latest', 'Most Answered', 'Unanswered'];
const VEHICLE_TYPES = ['Sedan', 'SUV', 'Hatchback', 'Pickup', 'Van', 'Bus', 'Other'];
const COMMON_TAGS = [
  'Honda', 'Toyota', 'Volkswagen', 'Nissan', 'Ford', 'Hyundai',
  'Engine', 'Transmission', 'Brakes', 'Suspension', 'Electrical', 'Cooling', 'AC', 'Tires',
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

export default function ForumScreen() {
  const colors = useColors();
  const { questions, answers, currentUser, askQuestion, cmsConfig, isLoading } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [activeFilter, setActiveFilter] = useState('Latest');
  const [activeTag, setActiveTag] = useState('');
  const [showAskModal, setShowAskModal] = useState(false);

  const [qTitle, setQTitle] = useState('');
  const [qDesc, setQDesc] = useState('');
  const [qModel, setQModel] = useState('');
  const [qType, setQType] = useState('Sedan');
  const [qTags, setQTags] = useState<string[]>([]);
  const [qIsPrivate, setQIsPrivate] = useState(false);
  const [qConcerns, setQConcerns] = useState<Record<ConcernKey, boolean>>({
    hearConcern: false,
    seeConcern: false,
    smellConcern: false,
    feelConcern: false,
    notStarting: false,
    performanceConcern: false,
    dashboardWarningLights: false,
  });

  const publicQuestions = useMemo(
    () => questions.filter((q) => !q.isPrivateEcosystem),
    [questions],
  );

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    publicQuestions.forEach((q) => q.tags.split(',').forEach((t) => { const trimmed = t.trim(); if (trimmed) tagSet.add(trimmed); }));
    return Array.from(tagSet).slice(0, 15);
  }, [publicQuestions]);

  const filteredQuestions = useMemo(() => {
    let result = [...publicQuestions];
    if (searchQuery) {
      const lq = searchQuery.toLowerCase();
      result = result.filter((q) => q.title.toLowerCase().includes(lq) || q.description.toLowerCase().includes(lq));
    }
    if (activeTag) {
      result = result.filter((q) => q.tags.includes(activeTag));
    }
    if (activeFilter === 'Most Answered') {
      return result.sort((a, b) => answers.filter((ans) => ans.questionId === b.id).length - answers.filter((ans) => ans.questionId === a.id).length);
    }
    if (activeFilter === 'Unanswered') {
      return result.filter((q) => !answers.some((a) => a.questionId === q.id));
    }
    return result.sort((a, b) => b.timestamp - a.timestamp);
  }, [publicQuestions, answers, searchQuery, activeFilter, activeTag]);

  const resetForm = () => {
    setQTitle(''); setQDesc(''); setQModel(''); setQType('Sedan');
    setQTags([]); setQIsPrivate(false);
    setQConcerns({ hearConcern: false, seeConcern: false, smellConcern: false, feelConcern: false, notStarting: false, performanceConcern: false, dashboardWarningLights: false });
  };

  const handleSubmit = () => {
    if (!qTitle.trim() || !qDesc.trim()) return;
    askQuestion({
      title: qTitle.trim(),
      description: qDesc.trim(),
      tags: qTags.join(','),
      yrModel: qModel.trim(),
      vehicleType: qType,
      isPrivateEcosystem: qIsPrivate,
      ...qConcerns,
    });
    setShowAskModal(false);
    resetForm();
  };

  const toggleTag = (tag: string) => {
    setQTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const toggleConcern = (key: ConcernKey) => {
    setQConcerns((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <View style={[styles.logoMark, { backgroundColor: colors.primary }]} />
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>CocheTalk</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => setShowSearch((v) => !v)} style={styles.iconBtn}>
            <Feather name={showSearch ? 'x' : 'search'} size={20} color={colors.foreground} />
          </TouchableOpacity>
          {currentUser && (
            <TouchableOpacity
              style={[styles.avatarSmall, { backgroundColor: colors.primary + '33' }]}
              onPress={() => router.push(`/seller/${encodeURIComponent(currentUser.id)}`)}
            >
              <Text style={[styles.avatarSmallText, { color: colors.primary }]}>
                {currentUser.name.charAt(0)}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {showSearch && (
        <View style={[styles.searchBar, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search questions..."
            placeholderTextColor={colors.mutedForeground}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Feather name="x-circle" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          ) : null}
        </View>
      )}

      {cmsConfig.announcementActive && cmsConfig.announcementText ? (
        <View style={[styles.announcement, { backgroundColor: colors.primary + '22', borderColor: colors.primary + '44' }]}>
          <Feather name="bell" size={13} color={colors.primary} />
          <Text style={[styles.announcementText, { color: colors.primary }]} numberOfLines={1}>
            {cmsConfig.announcementText}
          </Text>
        </View>
      ) : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterContent}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.chip, { backgroundColor: activeFilter === f ? colors.primary : colors.muted, borderColor: activeFilter === f ? colors.primary : colors.border }]}
            onPress={() => setActiveFilter(f)}
          >
            <Text style={[styles.chipText, { color: activeFilter === f ? colors.primaryForeground : colors.mutedForeground }]}>{f}</Text>
          </TouchableOpacity>
        ))}
        <View style={styles.chipDivider} />
        {allTags.map((tag) => (
          <TouchableOpacity
            key={tag}
            style={[styles.chip, { backgroundColor: activeTag === tag ? colors.secondary + '33' : 'transparent', borderColor: activeTag === tag ? colors.secondary : colors.border }]}
            onPress={() => setActiveTag(activeTag === tag ? '' : tag)}
          >
            <Text style={[styles.chipText, { color: activeTag === tag ? colors.secondary : colors.mutedForeground }]}>#{tag}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filteredQuestions}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <QuestionCard
            question={item}
            answerCount={answers.filter((a) => a.questionId === item.id).length}
            onUserPress={() => router.push(`/seller/${encodeURIComponent(item.userId)}`)}
          />
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Feather name="message-square" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No questions yet</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Be the first to ask a question!</Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />

      {currentUser && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.primary }]}
          onPress={() => setShowAskModal(true)}
        >
          <Feather name="plus" size={24} color={colors.primaryForeground} />
        </TouchableOpacity>
      )}

      <Modal
        visible={showAskModal}
        animationType="slide"
        transparent
        onRequestClose={() => { setShowAskModal(false); resetForm(); }}
      >
        <Pressable style={styles.overlay} onPress={() => { setShowAskModal(false); resetForm(); }} />
        <View style={[styles.sheet, { backgroundColor: colors.background }]}>
          <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
          <View style={[styles.sheetHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Ask a Question</Text>
            <TouchableOpacity onPress={() => { setShowAskModal(false); resetForm(); }}>
              <Feather name="x" size={22} color={colors.foreground} />
            </TouchableOpacity>
          </View>
          <KeyboardAwareScrollViewCompat style={styles.sheetBody}>
            <Text style={[styles.label, { color: colors.foreground }]}>Title *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]}
              placeholder="Briefly describe your issue"
              placeholderTextColor={colors.mutedForeground}
              value={qTitle}
              onChangeText={setQTitle}
            />

            <Text style={[styles.label, { color: colors.foreground }]}>Description *</Text>
            <TextInput
              style={[styles.textarea, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]}
              placeholder="Provide as much detail as possible..."
              placeholderTextColor={colors.mutedForeground}
              value={qDesc}
              onChangeText={setQDesc}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <Text style={[styles.label, { color: colors.foreground }]}>Vehicle Year / Model</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]}
              placeholder="e.g. 2017 Honda Civic"
              placeholderTextColor={colors.mutedForeground}
              value={qModel}
              onChangeText={setQModel}
            />

            <Text style={[styles.label, { color: colors.foreground }]}>Vehicle Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeRow}>
              {VEHICLE_TYPES.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.chip, { backgroundColor: qType === t ? colors.primary : colors.muted, borderColor: qType === t ? colors.primary : colors.border, marginRight: 6 }]}
                  onPress={() => setQType(t)}
                >
                  <Text style={[styles.chipText, { color: qType === t ? colors.primaryForeground : colors.mutedForeground }]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={[styles.label, { color: colors.foreground }]}>Tags</Text>
            <View style={styles.tagGrid}>
              {COMMON_TAGS.map((tag) => (
                <TouchableOpacity
                  key={tag}
                  style={[styles.chip, { backgroundColor: qTags.includes(tag) ? colors.primary + '33' : colors.muted, borderColor: qTags.includes(tag) ? colors.primary : colors.border }]}
                  onPress={() => toggleTag(tag)}
                >
                  <Text style={[styles.chipText, { color: qTags.includes(tag) ? colors.primary : colors.mutedForeground }]}>{tag}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.label, { color: colors.foreground }]}>What are you experiencing?</Text>
            <View style={styles.concernGrid}>
              {CONCERNS.map((c) => (
                <TouchableOpacity
                  key={c.key}
                  style={[styles.concernChip, { backgroundColor: qConcerns[c.key] ? colors.warning + '22' : colors.muted, borderColor: qConcerns[c.key] ? colors.warning : colors.border }]}
                  onPress={() => toggleConcern(c.key)}
                >
                  {qConcerns[c.key] && <Feather name="check" size={10} color={colors.warning} />}
                  <Text style={[styles.chipText, { color: qConcerns[c.key] ? colors.warning : colors.mutedForeground }]}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {currentUser && currentUser.role !== 'Car Owner' && (
              <View style={[styles.switchRow, { borderColor: colors.border }]}>
                <View>
                  <Text style={[styles.switchLabel, { color: colors.foreground }]}>Post to Pro Circle only</Text>
                  <Text style={[styles.switchDesc, { color: colors.mutedForeground }]}>Only visible to mechanics and service providers</Text>
                </View>
                <Switch
                  value={qIsPrivate}
                  onValueChange={setQIsPrivate}
                  trackColor={{ false: colors.muted, true: colors.proCircle + '88' }}
                  thumbColor={qIsPrivate ? colors.proCircle : colors.mutedForeground}
                />
              </View>
            )}

            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: !qTitle.trim() || !qDesc.trim() ? colors.muted : colors.primary }]}
              onPress={handleSubmit}
              disabled={!qTitle.trim() || !qDesc.trim()}
            >
              <Text style={[styles.submitBtnText, { color: !qTitle.trim() || !qDesc.trim() ? colors.mutedForeground : colors.primaryForeground }]}>
                Post Question
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoMark: { width: 22, height: 22, borderRadius: 6 },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBtn: { padding: 4 },
  avatarSmall: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  avatarSmallText: { fontSize: 13, fontWeight: '700' },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginTop: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },
  announcement: { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: 16, marginTop: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  announcementText: { flex: 1, fontSize: 12, fontWeight: '500' },
  filterRow: { marginTop: 10, maxHeight: 42 },
  filterContent: { paddingHorizontal: 16, gap: 6, alignItems: 'center' },
  chip: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1 },
  chipText: { fontSize: 12, fontWeight: '500' },
  chipDivider: { width: 1, height: 20, backgroundColor: '#ccc', marginHorizontal: 4 },
  listContent: { paddingTop: 10, paddingBottom: 100 },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyTitle: { fontSize: 17, fontWeight: '600' },
  emptyText: { fontSize: 14 },
  fab: { position: 'absolute', bottom: Platform.OS === 'ios' ? 95 : 75, right: 20, width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '92%' },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginVertical: 10 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1 },
  sheetTitle: { fontSize: 18, fontWeight: '700' },
  sheetBody: { paddingHorizontal: 20, paddingTop: 16 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6, marginTop: 14 },
  input: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  textarea: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, minHeight: 90, maxHeight: 150 },
  typeRow: { marginBottom: 4 },
  tagGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  concernGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  concernChip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderTopWidth: 1, marginTop: 16, gap: 12 },
  switchLabel: { fontSize: 14, fontWeight: '600' },
  switchDesc: { fontSize: 12, marginTop: 2 },
  submitBtn: { marginTop: 20, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  submitBtnText: { fontSize: 16, fontWeight: '700' },
});
