import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
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

export default function ProCircleScreen() {
  const colors = useColors();
  const { questions, answers, currentUser, askQuestion } = useApp();

  const [showAskModal, setShowAskModal] = useState(false);
  const [activeFilter, setActiveFilter] = useState('Latest');

  const [qTitle, setQTitle] = useState('');
  const [qDesc, setQDesc] = useState('');
  const [qModel, setQModel] = useState('');
  const [qType, setQType] = useState('Sedan');
  const [qTags, setQTags] = useState<string[]>([]);
  const [qConcerns, setQConcerns] = useState<Record<ConcernKey, boolean>>({
    hearConcern: false, seeConcern: false, smellConcern: false, feelConcern: false,
    notStarting: false, performanceConcern: false, dashboardWarningLights: false,
  });

  const isRestricted = !currentUser || currentUser.role === 'Car Owner';

  const proQuestions = useMemo(() => {
    let result = questions.filter((q) => q.isPrivateEcosystem);
    if (activeFilter === 'Most Answered') {
      return result.sort((a, b) => answers.filter((ans) => ans.questionId === b.id).length - answers.filter((ans) => ans.questionId === a.id).length);
    }
    if (activeFilter === 'Unanswered') {
      return result.filter((q) => !answers.some((a) => a.questionId === q.id));
    }
    return result.sort((a, b) => b.timestamp - a.timestamp);
  }, [questions, answers, activeFilter]);

  const resetForm = () => {
    setQTitle(''); setQDesc(''); setQModel(''); setQType('Sedan');
    setQTags([]);
    setQConcerns({ hearConcern: false, seeConcern: false, smellConcern: false, feelConcern: false, notStarting: false, performanceConcern: false, dashboardWarningLights: false });
  };

  const handleSubmit = () => {
    if (!qTitle.trim() || !qDesc.trim()) return;
    askQuestion({
      title: qTitle.trim(), description: qDesc.trim(), tags: qTags.join(','),
      yrModel: qModel.trim(), vehicleType: qType, isPrivateEcosystem: true, ...qConcerns,
    });
    setShowAskModal(false);
    resetForm();
  };

  const toggleTag = (tag: string) => setQTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);
  const toggleConcern = (key: ConcernKey) => setQConcerns((prev) => ({ ...prev, [key]: !prev[key] }));

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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <Feather name="lock" size={16} color={colors.proCircle} />
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Pro Circle</Text>
        </View>
        <View style={[styles.proBadge, { backgroundColor: colors.proCircle + '22' }]}>
          <Text style={[styles.proBadgeText, { color: colors.proCircle }]}>Mechanics Only</Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterContent}>
        {['Latest', 'Most Answered', 'Unanswered'].map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.chip, { backgroundColor: activeFilter === f ? colors.proCircle : colors.muted, borderColor: activeFilter === f ? colors.proCircle : colors.border }]}
            onPress={() => setActiveFilter(f)}
          >
            <Text style={[styles.chipText, { color: activeFilter === f ? '#fff' : colors.mutedForeground }]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={proQuestions}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <QuestionCard
            question={item}
            answerCount={answers.filter((a) => a.questionId === item.id).length}
            isProCircle
            onUserPress={() => router.push(`/seller/${encodeURIComponent(item.userId)}`)}
          />
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Feather name="lock" size={40} color={colors.proCircle} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No pro questions yet</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Share your technical expertise with fellow mechanics.</Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.proCircle }]}
        onPress={() => setShowAskModal(true)}
      >
        <Feather name="plus" size={24} color="#fff" />
      </TouchableOpacity>

      <Modal visible={showAskModal} animationType="slide" transparent onRequestClose={() => { setShowAskModal(false); resetForm(); }}>
        <Pressable style={styles.overlay} onPress={() => { setShowAskModal(false); resetForm(); }} />
        <View style={[styles.sheet, { backgroundColor: colors.background }]}>
          <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
          <View style={[styles.sheetHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>New Pro Question</Text>
            <TouchableOpacity onPress={() => { setShowAskModal(false); resetForm(); }}>
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
                  <Text style={[styles.chipText, { color: qType === t ? '#fff' : colors.mutedForeground }]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={[styles.label, { color: colors.foreground }]}>Tags</Text>
            <View style={styles.tagGrid}>
              {COMMON_TAGS.map((tag) => (
                <TouchableOpacity key={tag} style={[styles.chip, { backgroundColor: qTags.includes(tag) ? colors.proCircle + '33' : colors.muted, borderColor: qTags.includes(tag) ? colors.proCircle : colors.border }]} onPress={() => toggleTag(tag)}>
                  <Text style={[styles.chipText, { color: qTags.includes(tag) ? colors.proCircle : colors.mutedForeground }]}>{tag}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.label, { color: colors.foreground }]}>Symptoms</Text>
            <View style={styles.concernGrid}>
              {CONCERNS.map((c) => (
                <TouchableOpacity key={c.key} style={[styles.concernChip, { backgroundColor: qConcerns[c.key] ? colors.proCircle + '22' : colors.muted, borderColor: qConcerns[c.key] ? colors.proCircle : colors.border }]} onPress={() => toggleConcern(c.key)}>
                  {qConcerns[c.key] && <Feather name="check" size={10} color={colors.proCircle} />}
                  <Text style={[styles.chipText, { color: qConcerns[c.key] ? colors.proCircle : colors.mutedForeground }]}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={[styles.submitBtn, { backgroundColor: !qTitle.trim() || !qDesc.trim() ? colors.muted : colors.proCircle }]} onPress={handleSubmit} disabled={!qTitle.trim() || !qDesc.trim()}>
              <Text style={[styles.submitBtnText, { color: !qTitle.trim() || !qDesc.trim() ? colors.mutedForeground : '#fff' }]}>Post to Pro Circle</Text>
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
  filterRow: { marginTop: 10, maxHeight: 42 },
  filterContent: { paddingHorizontal: 16, gap: 6, alignItems: 'center' },
  chip: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1 },
  chipText: { fontSize: 12, fontWeight: '500' },
  listContent: { paddingTop: 10, paddingBottom: 100 },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyTitle: { fontSize: 17, fontWeight: '600' },
  emptyText: { fontSize: 14, textAlign: 'center', paddingHorizontal: 20 },
  fab: { position: 'absolute', bottom: Platform.OS === 'ios' ? 95 : 75, right: 20, width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '92%' },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginVertical: 10 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1 },
  sheetTitle: { fontSize: 18, fontWeight: '700' },
  sheetBody: { paddingHorizontal: 20, paddingTop: 16 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6, marginTop: 14 },
  input: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  textarea: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, minHeight: 90 },
  tagGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  concernGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  concernChip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1 },
  submitBtn: { marginTop: 20, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  submitBtnText: { fontSize: 16, fontWeight: '700' },
});
