import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Image,
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
import { DiscussionCard } from '@/components/DiscussionCard';
import { QuestionCard } from '@/components/QuestionCard';
import { useApp } from '@/context/AppContext';
import type { MarketplaceListing } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { useTabBarScrollHandler } from '@/hooks/useTabBarVisibility';

const SCREEN_W = Dimensions.get('window').width;
const AD_BANNER_HEIGHT = 72;

const CATEGORY_COLORS: Record<string, string> = {
  Parts: '#3B82F6',
  Services: '#10B981',
  'Car Sales': '#F59E0B',
};

function AdBannerSlider({ ads }: { ads: MarketplaceListing[] }) {
  const colors = useColors();
  const [index, setIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const advance = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: -20, duration: 250, useNativeDriver: true }),
    ]).start(() => {
      setIndex((prev) => (prev + 1) % ads.length);
      slideAnim.setValue(20);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    });
  }, [ads.length, fadeAnim, slideAnim]);

  useEffect(() => {
    if (ads.length <= 1) return;
    const timer = setInterval(advance, 4000);
    return () => clearInterval(timer);
  }, [advance, ads.length]);

  if (ads.length === 0) return null;

  const ad = ads[index];
  const catColor = CATEGORY_COLORS[ad.category] ?? colors.primary;

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={() => router.push(`/seller/${encodeURIComponent(ad.userId)}`)}
      style={[adStyles.wrapper, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      <View style={[adStyles.accent, { backgroundColor: catColor }]} />
      <Animated.View style={[adStyles.content, { opacity: fadeAnim, transform: [{ translateX: slideAnim }] }]}>
        <View style={adStyles.topRow}>
          <View style={[adStyles.sponsoredBadge, { backgroundColor: catColor + '22' }]}>
            <Feather name="star" size={9} color={catColor} />
            <Text style={[adStyles.sponsoredText, { color: catColor }]}>Sponsored</Text>
          </View>
          <View style={[adStyles.catBadge, { backgroundColor: catColor + '18' }]}>
            <Text style={[adStyles.catText, { color: catColor }]}>{ad.category}</Text>
          </View>
          <Text style={[adStyles.price, { color: colors.primary }]}>
            ₦{ad.price.toLocaleString()}
          </Text>
        </View>
        <Text style={[adStyles.title, { color: colors.foreground }]} numberOfLines={1}>
          {ad.title}
        </Text>
        <View style={adStyles.bottomRow}>
          <Feather name="map-pin" size={10} color={colors.mutedForeground} />
          <Text style={[adStyles.location, { color: colors.mutedForeground }]} numberOfLines={1}>
            {ad.location} · {ad.userName}
          </Text>
          {ads.length > 1 && (
            <View style={adStyles.dots}>
              {ads.map((_, i) => (
                <View key={i} style={[adStyles.dot, { backgroundColor: i === index ? colors.primary : colors.border }]} />
              ))}
            </View>
          )}
        </View>
      </Animated.View>
      <Feather name="chevron-right" size={14} color={colors.mutedForeground} style={{ marginRight: 12 }} />
    </TouchableOpacity>
  );
}

const adStyles = StyleSheet.create({
  wrapper: { marginHorizontal: 16, marginBottom: 8, borderRadius: 12, borderWidth: 1, flexDirection: 'row', alignItems: 'center', height: AD_BANNER_HEIGHT, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4 },
  accent: { width: 4, alignSelf: 'stretch' },
  content: { flex: 1, paddingHorizontal: 12, paddingVertical: 10, justifyContent: 'space-between' },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sponsoredBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  sponsoredText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  catBadge: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  catText: { fontSize: 9, fontWeight: '600' },
  price: { fontSize: 13, fontWeight: '700', marginLeft: 'auto' },
  title: { fontSize: 13, fontWeight: '600', lineHeight: 17 },
  bottomRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  location: { fontSize: 11, flex: 1 },
  dots: { flexDirection: 'row', gap: 4, marginLeft: 4 },
  dot: { width: 5, height: 5, borderRadius: 3 },
});

// ─────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────

const SORT_FILTERS = ['Latest', 'Most Answered', 'Unanswered'];
const TYPE_FILTERS = ['All', 'Questions', 'Discussions'] as const;
type TypeFilter = (typeof TYPE_FILTERS)[number];

const VEHICLE_TYPES = ['Sedan', 'SUV', 'Hatchback', 'Pickup', 'Van', 'Bus', 'Other'];
const COMMON_TAGS = [
  'Honda', 'Toyota', 'Volkswagen', 'Nissan', 'Ford', 'Hyundai',
  'Engine', 'Transmission', 'Brakes', 'Suspension', 'Electrical', 'Cooling', 'AC', 'Tires',
  'Lagos mechanic', 'Maintenance', 'Tips', 'Spare Parts',
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

// ─────────────────────────────────────────────────────────
// Forum Screen
// ─────────────────────────────────────────────────────────

export default function ForumScreen() {
  const colors = useColors();
  const handleScroll = useTabBarScrollHandler();
  const {
    questions, answers, discussions, discussionComments,
    currentUser, askQuestion, createDiscussion,
    cmsConfig, isLoading, listings,
  } = useApp();

  const featuredAds = useMemo(
    () => listings.filter((l) => l.isApproved && l.isFeaturedBottom),
    [listings],
  );

  // ── Filter state ─────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [activeSortFilter, setActiveSortFilter] = useState('Latest');
  const [activeTypeFilter, setActiveTypeFilter] = useState<TypeFilter>('All');
  const [activeTag, setActiveTag] = useState('');

  // ── Modal visibility ──────────────────────────────────
  const [showFabMenu, setShowFabMenu] = useState(false);
  const [showAskModal, setShowAskModal] = useState(false);
  const [showDiscussModal, setShowDiscussModal] = useState(false);

  // ── Ask-a-question form ───────────────────────────────
  const [qTitle, setQTitle] = useState('');
  const [qDesc, setQDesc] = useState('');
  const [qModel, setQModel] = useState('');
  const [qType, setQType] = useState('Sedan');
  const [qTags, setQTags] = useState<string[]>([]);
  const [qIsPrivate, setQIsPrivate] = useState(false);
  const [qConcerns, setQConcerns] = useState<Record<ConcernKey, boolean>>({
    hearConcern: false, seeConcern: false, smellConcern: false,
    feelConcern: false, notStarting: false, performanceConcern: false,
    dashboardWarningLights: false,
  });

  // ── General Discussion form ────────────────────────────
  const [dTitle, setDTitle] = useState('');
  const [dContent, setDContent] = useState('');
  const [dTags, setDTags] = useState<string[]>([]);
  const [dCustomTag, setDCustomTag] = useState('');
  const [dMedia, setDMedia] = useState<string[]>([]);

  // ── Derived feed ──────────────────────────────────────
  const publicQuestions = useMemo(
    () => questions.filter((q) => !q.isPrivateEcosystem),
    [questions],
  );

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    publicQuestions.forEach((q) =>
      q.tags.split(',').forEach((t) => { const trimmed = t.trim(); if (trimmed) tagSet.add(trimmed); }),
    );
    discussions.forEach((d) =>
      d.tags.split(',').forEach((t) => { const trimmed = t.trim(); if (trimmed) tagSet.add(trimmed); }),
    );
    return Array.from(tagSet).slice(0, 18);
  }, [publicQuestions, discussions]);

  type FeedItem =
    | { kind: 'question'; data: (typeof questions)[number] }
    | { kind: 'discussion'; data: (typeof discussions)[number] };

  const feedItems = useMemo((): FeedItem[] => {
    let qItems: FeedItem[] = publicQuestions
      .filter((q) => {
        if (searchQuery) {
          const lq = searchQuery.toLowerCase();
          return q.title.toLowerCase().includes(lq) || q.description.toLowerCase().includes(lq);
        }
        return true;
      })
      .filter((q) => !activeTag || q.tags.includes(activeTag))
      .map((q) => ({ kind: 'question' as const, data: q }));

    let dItems: FeedItem[] = discussions
      .filter((d) => !d.isProCircle) // exclude Pro Circle-only discussions from public feed
      .filter((d) => {
        if (searchQuery) {
          const lq = searchQuery.toLowerCase();
          return (
            (d.title ?? '').toLowerCase().includes(lq) ||
            d.content.toLowerCase().includes(lq)
          );
        }
        return true;
      })
      .filter((d) => !activeTag || d.tags.includes(activeTag))
      .map((d) => ({ kind: 'discussion' as const, data: d }));

    let combined: FeedItem[];
    if (activeTypeFilter === 'Questions') {
      combined = qItems;
    } else if (activeTypeFilter === 'Discussions') {
      combined = dItems;
    } else {
      combined = [...qItems, ...dItems];
    }

    // Sort
    if (activeSortFilter === 'Most Answered') {
      combined = combined.sort((a, b) => {
        const countA = a.kind === 'question'
          ? answers.filter((ans) => ans.questionId === a.data.id).length
          : discussionComments.filter((c) => c.postId === a.data.id).length;
        const countB = b.kind === 'question'
          ? answers.filter((ans) => ans.questionId === b.data.id).length
          : discussionComments.filter((c) => c.postId === b.data.id).length;
        return countB - countA;
      });
    } else if (activeSortFilter === 'Unanswered') {
      combined = combined.filter((item) => {
        if (item.kind === 'question') {
          return !answers.some((a) => a.questionId === item.data.id);
        }
        return discussionComments.filter((c) => c.postId === item.data.id).length === 0;
      });
    } else {
      // Latest
      combined = combined.sort((a, b) => b.data.timestamp - a.data.timestamp);
    }

    return combined;
  }, [publicQuestions, discussions, answers, discussionComments, searchQuery, activeSortFilter, activeTypeFilter, activeTag]);

  // ── Q form helpers ────────────────────────────────────
  const resetQForm = () => {
    setQTitle(''); setQDesc(''); setQModel(''); setQType('Sedan');
    setQTags([]); setQIsPrivate(false);
    setQConcerns({ hearConcern: false, seeConcern: false, smellConcern: false, feelConcern: false, notStarting: false, performanceConcern: false, dashboardWarningLights: false });
  };

  const handleQSubmit = () => {
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
    resetQForm();
  };

  const toggleQTag = (tag: string) =>
    setQTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));

  const toggleConcern = (key: ConcernKey) =>
    setQConcerns((prev) => ({ ...prev, [key]: !prev[key] }));

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
    });
    setShowDiscussModal(false);
    resetDForm();
  };

  const toggleDTag = (tag: string) =>
    setDTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));

  const addCustomTag = () => {
    const t = dCustomTag.trim();
    if (t && !dTags.includes(t)) {
      setDTags((prev) => [...prev, t]);
    }
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

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* ── Header ── */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          {cmsConfig.forumLogoUri ? (
            <Image source={{ uri: cmsConfig.forumLogoUri }} style={styles.logoMark} resizeMode="cover" />
          ) : (
            <View style={[styles.logoMark, { backgroundColor: colors.primary }]} />
          )}
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

      {/* ── Search bar ── */}
      {showSearch && (
        <View style={[styles.searchBar, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search posts..."
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

      {/* ── Announcement ── */}
      {cmsConfig.announcementActive && cmsConfig.announcementText ? (
        <View style={[styles.announcement, { backgroundColor: colors.primary + '22', borderColor: colors.primary + '44' }]}>
          <Feather name="bell" size={13} color={colors.primary} />
          <Text style={[styles.announcementText, { color: colors.primary }]} numberOfLines={1}>
            {cmsConfig.announcementText}
          </Text>
        </View>
      ) : null}

      {/* ── Type filter row ── */}
      <View style={[styles.typeRow, { borderBottomColor: colors.border }]}>
        {TYPE_FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[
              styles.typeTab,
              activeTypeFilter === f && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
            ]}
            onPress={() => setActiveTypeFilter(f)}
          >
            {f === 'Discussions' ? (
              <Feather name="book-open" size={13} color={activeTypeFilter === f ? colors.primary : colors.mutedForeground} style={{ marginRight: 4 }} />
            ) : f === 'Questions' ? (
              <Feather name="help-circle" size={13} color={activeTypeFilter === f ? colors.primary : colors.mutedForeground} style={{ marginRight: 4 }} />
            ) : null}
            <Text style={[styles.typeTabText, { color: activeTypeFilter === f ? colors.primary : colors.mutedForeground }]}>
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Sort + tag chip row ── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterContent}>
        {SORT_FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.chip, { backgroundColor: activeSortFilter === f ? colors.primary : colors.muted, borderColor: activeSortFilter === f ? colors.primary : colors.border }]}
            onPress={() => setActiveSortFilter(f)}
          >
            <Text style={[styles.chipText, { color: activeSortFilter === f ? colors.primaryForeground : colors.mutedForeground }]}>{f}</Text>
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

      {/* ── Feed ── */}
      <FlatList
        data={feedItems}
        keyExtractor={(item) => `${item.kind}-${item.data.id}`}
        renderItem={({ item }) => {
          if (item.kind === 'question') {
            return (
              <QuestionCard
                question={item.data}
                answerCount={answers.filter((a) => a.questionId === item.data.id).length}
                onUserPress={() => router.push(`/seller/${encodeURIComponent(item.data.userId)}`)}
              />
            );
          }
          return (
            <DiscussionCard
              post={item.data}
              commentCount={discussionComments.filter((c) => c.postId === item.data.id).length}
              onUserPress={() => router.push(`/seller/${encodeURIComponent(item.data.userId)}`)}
            />
          );
        }}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Feather name="message-square" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Nothing here yet</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              {activeTypeFilter === 'Discussions' ? 'Start the first discussion!' : 'Be the first to ask a question!'}
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      />

      {/* ── Sponsored ad banner ── */}
      {featuredAds.length > 0 && (
        <View style={[styles.adContainer, { backgroundColor: colors.background }]}>
          <AdBannerSlider ads={featuredAds} />
        </View>
      )}

      {/* ── FAB ── */}
      {currentUser && (
        <TouchableOpacity
          style={[
            styles.fab,
            { backgroundColor: colors.primary },
            featuredAds.length > 0 && styles.fabWithAd,
          ]}
          onPress={() => setShowFabMenu(true)}
        >
          <Feather name="plus" size={24} color={colors.primaryForeground} />
        </TouchableOpacity>
      )}

      {/* ════════════════════════════════════════════════
          FAB action menu
      ════════════════════════════════════════════════ */}
      <Modal
        visible={showFabMenu}
        animationType="fade"
        transparent
        onRequestClose={() => setShowFabMenu(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setShowFabMenu(false)} />
        <View style={[styles.fabMenu, { backgroundColor: colors.card }, featuredAds.length > 0 && styles.fabMenuWithAd]}>
          <Text style={[styles.fabMenuTitle, { color: colors.mutedForeground }]}>What would you like to post?</Text>

          <TouchableOpacity
            style={[styles.fabMenuOption, { borderColor: colors.border }]}
            onPress={() => { setShowFabMenu(false); setShowAskModal(true); }}
          >
            <View style={[styles.fabMenuIcon, { backgroundColor: colors.primary + '22' }]}>
              <Feather name="help-circle" size={20} color={colors.primary} />
            </View>
            <View style={styles.fabMenuText}>
              <Text style={[styles.fabMenuOptionTitle, { color: colors.foreground }]}>Ask a Question</Text>
              <Text style={[styles.fabMenuOptionDesc, { color: colors.mutedForeground }]}>Get help with a vehicle problem</Text>
            </View>
            <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.fabMenuOption, { borderColor: colors.border }]}
            onPress={() => { setShowFabMenu(false); setShowDiscussModal(true); }}
          >
            <View style={[styles.fabMenuIcon, { backgroundColor: colors.secondary + '22' }]}>
              <Feather name="book-open" size={20} color={colors.secondary} />
            </View>
            <View style={styles.fabMenuText}>
              <Text style={[styles.fabMenuOptionTitle, { color: colors.foreground }]}>General Discussion</Text>
              <Text style={[styles.fabMenuOptionDesc, { color: colors.mutedForeground }]}>Share experiences, tips & knowledge</Text>
            </View>
            <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>
      </Modal>

      {/* ════════════════════════════════════════════════
          Ask a Question modal
      ════════════════════════════════════════════════ */}
      <Modal
        visible={showAskModal}
        animationType="slide"
        transparent
        onRequestClose={() => { setShowAskModal(false); resetQForm(); }}
      >
        <Pressable style={styles.overlay} onPress={() => { setShowAskModal(false); resetQForm(); }} />
        <View style={[styles.sheet, { backgroundColor: colors.background }]}>
          <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
          <View style={[styles.sheetHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Ask a Question</Text>
            <TouchableOpacity onPress={() => { setShowAskModal(false); resetQForm(); }}>
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
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScrollRow}>
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
                  onPress={() => toggleQTag(tag)}
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
              onPress={handleQSubmit}
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

      {/* ════════════════════════════════════════════════
          General Discussion modal
      ════════════════════════════════════════════════ */}
      <Modal
        visible={showDiscussModal}
        animationType="slide"
        transparent
        onRequestClose={() => { setShowDiscussModal(false); resetDForm(); }}
      >
        <Pressable style={styles.overlay} onPress={() => { setShowDiscussModal(false); resetDForm(); }} />
        <View style={[styles.sheet, { backgroundColor: colors.background }]}>
          <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
          <View style={[styles.sheetHeader, { borderBottomColor: colors.border }]}>
            <View style={styles.sheetTitleRow}>
              <Feather name="book-open" size={18} color={colors.secondary} />
              <Text style={[styles.sheetTitle, { color: colors.foreground }]}>General Discussion</Text>
            </View>
            <TouchableOpacity onPress={() => { setShowDiscussModal(false); resetDForm(); }}>
              <Feather name="x" size={22} color={colors.foreground} />
            </TouchableOpacity>
          </View>

          <KeyboardAwareScrollViewCompat style={styles.sheetBody}>
            {/* Title – optional */}
            <View style={styles.labelRow}>
              <Text style={[styles.label, { color: colors.foreground, marginTop: 0 }]}>Title</Text>
              <Text style={[styles.optionalBadge, { color: colors.mutedForeground }]}>optional but recommended</Text>
            </View>
            <TextInput
              style={[styles.input, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]}
              placeholder="e.g. My experience with Lagos spare parts market"
              placeholderTextColor={colors.mutedForeground}
              value={dTitle}
              onChangeText={setDTitle}
            />

            {/* Content – required */}
            <Text style={[styles.label, { color: colors.foreground }]}>Content *</Text>
            <TextInput
              style={[styles.textarea, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground, minHeight: 120 }]}
              placeholder="Share your experience, knowledge or insight..."
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
                  style={[styles.chip, { backgroundColor: dTags.includes(tag) ? colors.secondary + '33' : colors.muted, borderColor: dTags.includes(tag) ? colors.secondary : colors.border }]}
                  onPress={() => toggleDTag(tag)}
                >
                  <Text style={[styles.chipText, { color: dTags.includes(tag) ? colors.secondary : colors.mutedForeground }]}>{tag}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Custom tag input */}
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
                style={[styles.customTagBtn, { backgroundColor: dCustomTag.trim() ? colors.secondary : colors.muted }]}
                onPress={addCustomTag}
                disabled={!dCustomTag.trim()}
              >
                <Feather name="plus" size={16} color={dCustomTag.trim() ? colors.primaryForeground : colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            {/* Show selected custom tags */}
            {dTags.filter((t) => !COMMON_TAGS.includes(t)).length > 0 && (
              <View style={[styles.tagGrid, { marginTop: 6 }]}>
                {dTags.filter((t) => !COMMON_TAGS.includes(t)).map((tag) => (
                  <TouchableOpacity
                    key={tag}
                    style={[styles.chip, { backgroundColor: colors.secondary + '33', borderColor: colors.secondary, flexDirection: 'row', gap: 4 }]}
                    onPress={() => toggleDTag(tag)}
                  >
                    <Text style={[styles.chipText, { color: colors.secondary }]}>{tag}</Text>
                    <Feather name="x" size={10} color={colors.secondary} />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Media upload */}
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
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaPreviewRow} contentContainerStyle={{ gap: 8 }}>
                {dMedia.map((uri) => (
                  <View key={uri} style={styles.mediaPreviewItem}>
                    <Image source={{ uri }} style={styles.mediaPreviewThumb} resizeMode="cover" />
                    <TouchableOpacity style={styles.mediaRemoveBtn} onPress={() => removeMedia(uri)}>
                      <Feather name="x" size={12} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}

            {/* Submit */}
            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: !dContent.trim() ? colors.muted : colors.secondary, marginTop: 20 }]}
              onPress={handleDSubmit}
              disabled={!dContent.trim()}
            >
              <Feather name="send" size={16} color={!dContent.trim() ? colors.mutedForeground : colors.primaryForeground} style={{ marginRight: 8 }} />
              <Text style={[styles.submitBtnText, { color: !dContent.trim() ? colors.mutedForeground : colors.primaryForeground }]}>
                Post Discussion
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
  // Type tabs
  typeRow: { flexDirection: 'row', borderBottomWidth: 1, paddingHorizontal: 16 },
  typeTab: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 4, marginRight: 20, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  typeTabText: { fontSize: 13, fontWeight: '600' },
  // Sort + tag chips
  filterRow: { marginTop: 8, maxHeight: 42 },
  filterContent: { paddingHorizontal: 16, gap: 6, alignItems: 'center' },
  chip: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1 },
  chipText: { fontSize: 12, fontWeight: '500' },
  chipDivider: { width: 1, height: 20, backgroundColor: '#ccc', marginHorizontal: 4 },
  // List
  listContent: { paddingTop: 10, paddingBottom: 160 },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyTitle: { fontSize: 17, fontWeight: '600' },
  emptyText: { fontSize: 14 },
  adContainer: { position: 'absolute', bottom: Platform.OS === 'ios' ? 88 : 68, left: 0, right: 0 },
  fab: { position: 'absolute', bottom: Platform.OS === 'ios' ? 95 : 75, right: 20, width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4 },
  fabWithAd: { bottom: Platform.OS === 'ios' ? 175 : 155 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  // FAB menu
  fabMenu: { position: 'absolute', bottom: Platform.OS === 'ios' ? 160 : 140, right: 16, left: 16, borderRadius: 16, padding: 16, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
  fabMenuWithAd: { bottom: Platform.OS === 'ios' ? 240 : 220 },
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
  typeScrollRow: { marginBottom: 4 },
  tagGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  concernGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  concernChip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderTopWidth: 1, marginTop: 16, gap: 12 },
  switchLabel: { fontSize: 14, fontWeight: '600' },
  switchDesc: { fontSize: 12, marginTop: 2 },
  submitBtn: { marginTop: 20, borderRadius: 12, paddingVertical: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  submitBtnText: { fontSize: 16, fontWeight: '700' },
  // Discussion-specific
  customTagRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  customTagInput: { flex: 1, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14 },
  customTagBtn: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  mediaPickerBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 10, borderWidth: 1, borderStyle: 'dashed', paddingHorizontal: 14, paddingVertical: 12 },
  mediaPickerText: { fontSize: 13, flex: 1 },
  mediaPreviewRow: { marginTop: 10 },
  mediaPreviewItem: { position: 'relative' },
  mediaPreviewThumb: { width: 80, height: 80, borderRadius: 8 },
  mediaRemoveBtn: { position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
});
