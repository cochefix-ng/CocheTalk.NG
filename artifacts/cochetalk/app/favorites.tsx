import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useState, useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInfiniteQuery } from '@tanstack/react-query';
import { getListFavoritesQueryOptions, listFavorites } from '@workspace/api-client-react';

import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';

type FilterType = 'All' | 'discussion' | 'question' | 'answer' | 'listing';

function timeAgo(ts: string | number): string {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function FavoritesScreen() {
  const colors = useColors();
  const { currentUser } = useApp();
  const [filter, setFilter] = useState<FilterType>('All');

  // Authenticated guard handled by (tabs) layout usually, but for safe navigation behavior:
  if (!currentUser) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Favorites</Text>
        </View>
        <View style={styles.center}>
          <Text style={{ color: colors.mutedForeground }}>Sign in to view favorites.</Text>
          <TouchableOpacity 
            style={[styles.loginBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/(auth)/sign-in')}
          >
            <Text style={{ color: colors.primaryForeground, fontWeight: '600' }}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch
  } = useInfiniteQuery({
    queryKey: ['favorites', filter],
    queryFn: ({ pageParam = 0 }) => 
      listFavorites({ 
        offset: pageParam, 
        limit: 20, 
        contentType: filter === 'All' ? undefined : filter 
      }),
    getNextPageParam: (lastPage) => {
      const nextOffset = lastPage.offset + lastPage.limit;
      return nextOffset < lastPage.items.length ? nextOffset : undefined; // wait, limit is per page, but backend returns offset/limit
      // Actually backend just returns items. If items.length === limit, there MIGHT be a next page.
      if (lastPage.items.length === lastPage.limit) {
        return lastPage.offset + lastPage.limit;
      }
      return undefined;
    },
    initialPageParam: 0,
  });

  const flattenItems = data?.pages.flatMap((page) => page.items) ?? [];

  const handlePressItem = (item: any) => {
    if (!item.available || !item.item) return;
    const { contentType, contentId } = item.favorite;
    
    if (contentType === 'question') {
      router.push(`/question/${contentId}`);
    } else if (contentType === 'answer') {
      // Saved answers open their parent question and focus/identify the answer if practical
      // We know the answer has a questionId in its payload
      const answerData = item.item as any;
      if (answerData.questionId) {
        // Just go to question, but we don't have anchor hash in mobile easily without redesigning question/[id].tsx
        // So we route to question. The user will have to scroll.
        router.push(`/question/${answerData.questionId}`);
      }
    } else if (contentType === 'discussion') {
      router.push(`/discussion/${contentId}`);
    } else if (contentType === 'listing') {
      router.push(`/listing/${contentId}`);
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const { contentType, createdAt } = item.favorite;
    const isAvailable = item.available && !!item.item;

    let iconName = 'bookmark';
    let title = 'Unavailable content';
    let subtitle = '';

    if (isAvailable) {
      if (contentType === 'question') {
        iconName = 'help-circle';
        title = item.item.title;
        subtitle = `Question by ${item.item.userName}`;
      } else if (contentType === 'answer') {
        iconName = 'message-square';
        title = item.item.content;
        subtitle = `Answer by ${item.item.userName}`;
      } else if (contentType === 'discussion') {
        iconName = 'message-circle';
        title = item.item.title || item.item.content;
        subtitle = `Discussion by ${item.item.userName}`;
      } else if (contentType === 'listing') {
        iconName = 'shopping-bag';
        title = item.item.title;
        subtitle = `Listing by ${item.item.userName}`;
      }
    }

    return (
      <TouchableOpacity 
        style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => handlePressItem(item)}
        activeOpacity={0.7}
        disabled={!isAvailable}
      >
        <View style={[styles.iconWrapper, { backgroundColor: colors.muted }]}>
          <Feather name={iconName as any} size={18} color={isAvailable ? colors.foreground : colors.mutedForeground} />
        </View>
        <View style={styles.itemContent}>
          <Text 
            style={[styles.itemTitle, { color: isAvailable ? colors.foreground : colors.mutedForeground }]} 
            numberOfLines={2}
          >
            {title}
          </Text>
          <View style={styles.itemMeta}>
            {!!subtitle && (
              <Text style={[styles.itemSubtitle, { color: colors.mutedForeground }]} numberOfLines={1}>
                {subtitle}
              </Text>
            )}
            <Text style={[styles.itemTime, { color: colors.mutedForeground }]}>
              {timeAgo(createdAt)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const filters: { label: string; value: FilterType }[] = [
    { label: 'All', value: 'All' },
    { label: 'Discussions', value: 'discussion' },
    { label: 'Questions', value: 'question' },
    { label: 'Answers', value: 'answer' },
    { label: 'Marketplace', value: 'listing' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Favorites</Text>
      </View>

      <View style={styles.filterScroll}>
        <FlatList 
          horizontal
          showsHorizontalScrollIndicator={false}
          data={filters}
          keyExtractor={(f) => f.value}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterChip,
                { 
                  backgroundColor: filter === item.value ? colors.primary : colors.muted,
                  borderColor: filter === item.value ? colors.primary : colors.border
                }
              ]}
              onPress={() => setFilter(item.value)}
            >
              <Text 
                style={[
                  styles.filterText, 
                  { color: filter === item.value ? colors.primaryForeground : colors.foreground }
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <Text style={{ color: colors.destructive }}>Failed to load favorites</Text>
          <TouchableOpacity onPress={() => refetch()} style={[styles.retryBtn, { backgroundColor: colors.muted }]}>
            <Text style={{ color: colors.foreground }}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : flattenItems.length === 0 ? (
        <View style={styles.center}>
          <Feather name="bookmark" size={48} color={colors.mutedForeground} style={{ marginBottom: 16 }} />
          <Text style={[styles.emptyText, { color: colors.foreground }]}>No favorites found</Text>
          <Text style={[styles.emptySubText, { color: colors.mutedForeground }]}>
            {filter === 'All' ? 'Save interesting posts and parts to find them easily.' : `You haven't saved any ${filter}s yet.`}
          </Text>
        </View>
      ) : (
        <FlatList
          data={flattenItems}
          keyExtractor={(item) => String(item.favorite.id)}
          contentContainerStyle={styles.listContent}
          renderItem={renderItem}
          onEndReached={() => {
            if (hasNextPage) fetchNextPage();
          }}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            isFetchingNextPage ? (
              <View style={{ paddingVertical: 16 }}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  backBtn: { padding: 2 },
  headerTitle: { fontSize: 17, fontWeight: '700', flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  loginBtn: { marginTop: 16, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  filterScroll: { paddingVertical: 12 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  filterText: { fontSize: 13, fontWeight: '600' },
  listContent: { padding: 16, gap: 12 },
  itemCard: { flexDirection: 'row', gap: 12, padding: 12, borderRadius: 12, borderWidth: 1 },
  iconWrapper: { width: 40, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  itemContent: { flex: 1, justifyContent: 'center' },
  itemTitle: { fontSize: 15, fontWeight: '600', lineHeight: 20, marginBottom: 4 },
  itemMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  itemSubtitle: { fontSize: 12, flex: 1, marginRight: 8 },
  itemTime: { fontSize: 11 },
  retryBtn: { marginTop: 12, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  emptyText: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  emptySubText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
