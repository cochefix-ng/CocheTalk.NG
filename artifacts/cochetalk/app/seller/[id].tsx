import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
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

import { ListingCard } from '@/components/ListingCard';
import { QuestionCard } from '@/components/QuestionCard';
import { makeConvId, useApp } from '@/context/AppContext';
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

function StarRating({ value, interactive = false, max = 5, size = 20, onSelect }: { value: number; interactive?: boolean; max?: number; size?: number; onSelect?: (v: number) => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: 3 }}>
      {Array.from({ length: max }).map((_, i) => (
        <TouchableOpacity key={i} disabled={!interactive} onPress={() => onSelect?.(i + 1)}>
          <Feather name="star" size={size} color="#F59E0B" style={{ opacity: i < value ? 1 : 0.25 }} />
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function SellerProfileScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { users, questions, answers, listings, ratings, currentUser, addRating } = useApp();

  const [showRateModal, setShowRateModal] = useState(false);
  const [ratingValue, setRatingValue] = useState(5);
  const [ratingFeedback, setRatingFeedback] = useState('');

  const seller = users.find((u) => u.id === id);

  const sellerListings = useMemo(
    () => listings.filter((l) => l.userId === id && l.isApproved).sort((a, b) => b.timestamp - a.timestamp),
    [listings, id],
  );

  const sellerQuestions = useMemo(
    () => questions.filter((q) => q.userId === id && !q.isPrivateEcosystem).sort((a, b) => b.timestamp - a.timestamp).slice(0, 5),
    [questions, id],
  );

  const sellerRatings = useMemo(() => ratings.filter((r) => r.providerId === id), [ratings, id]);

  const avgRating = sellerRatings.length ? sellerRatings.reduce((sum, r) => sum + r.ratingValue, 0) / sellerRatings.length : 0;

  const myRating = currentUser ? sellerRatings.find((r) => r.raterId === currentUser.id) : null;
  const canRate = currentUser && currentUser.id !== id && seller?.role === 'Service Provider';
  const canMessage = currentUser && currentUser.id !== id;

  if (!seller) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Profile</Text>
        </View>
        <View style={styles.center}>
          <Text style={[styles.notFoundText, { color: colors.mutedForeground }]}>User not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleRate = () => {
    if (!ratingFeedback.trim()) return;
    addRating(seller.id, ratingValue, ratingFeedback.trim());
    setShowRateModal(false);
    setRatingFeedback('');
    setRatingValue(5);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]} numberOfLines={1}>{seller.name}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: seller.verified ? colors.verified + '33' : colors.primary + '33' }]}>
            <Text style={[styles.avatarText, { color: seller.verified ? colors.verified : colors.primary }]}>
              {seller.name.charAt(0)}
            </Text>
          </View>

          <View style={styles.profileInfo}>
            <View style={styles.nameRow}>
              <Text style={[styles.sellerName, { color: colors.foreground }]}>{seller.name}</Text>
              {seller.verified && (
                <View style={[styles.verifiedBadge, { backgroundColor: colors.verified + '22' }]}>
                  <Feather name="check-circle" size={12} color={colors.verified} />
                  <Text style={[styles.verifiedText, { color: colors.verified }]}>Verified</Text>
                </View>
              )}
            </View>

            <View style={[styles.roleBadge, { backgroundColor: seller.role === 'Service Provider' ? colors.proCircle + '22' : colors.primary + '22' }]}>
              <Text style={[styles.roleText, { color: seller.role === 'Service Provider' ? colors.proCircle : colors.primary }]}>
                {seller.role}
              </Text>
            </View>

            {sellerRatings.length > 0 && (
              <View style={styles.ratingRow}>
                <StarRating value={avgRating} size={14} />
                <Text style={[styles.ratingText, { color: colors.mutedForeground }]}>
                  {avgRating.toFixed(1)} ({sellerRatings.length})
                </Text>
              </View>
            )}
          </View>

          <View style={styles.detailsGrid}>
            {seller.location ? (
              <View style={styles.detailRow}>
                <Feather name="map-pin" size={13} color={colors.mutedForeground} />
                <Text style={[styles.detailText, { color: colors.mutedForeground }]}>{seller.location}</Text>
              </View>
            ) : null}
            {seller.specialization && seller.specialization.length > 0 ? (
              <View style={styles.detailRow}>
                <Feather name="tool" size={13} color={colors.mutedForeground} />
                <Text style={[styles.detailText, { color: colors.mutedForeground }]}>{seller.specialization.join(', ')}</Text>
              </View>
            ) : null}
            {seller.businessName ? (
              <View style={styles.detailRow}>
                <Feather name="briefcase" size={13} color={colors.mutedForeground} />
                <Text style={[styles.detailText, { color: colors.mutedForeground }]}>{seller.businessName}</Text>
              </View>
            ) : null}
            {seller.experience > 0 ? (
              <View style={styles.detailRow}>
                <Feather name="award" size={13} color={colors.mutedForeground} />
                <Text style={[styles.detailText, { color: colors.mutedForeground }]}>{seller.experience} years experience</Text>
              </View>
            ) : null}
          </View>

          {canMessage && (
            <View style={styles.contactBtns}>
              <TouchableOpacity
                style={[styles.messageBtn, { backgroundColor: colors.primary }]}
                onPress={() => {
                  const convId = makeConvId(currentUser!.id, seller.id);
                  router.push(`/conversation/${encodeURIComponent(convId)}`);
                }}
              >
                <Feather name="message-circle" size={14} color={colors.primaryForeground} />
                <Text style={[styles.messageBtnText, { color: colors.primaryForeground }]}>Send Message</Text>
              </TouchableOpacity>
              {seller.whatsappEnabled && (
                <TouchableOpacity
                  style={[styles.whatsappBtn, { borderColor: '#25D366' }]}
                  onPress={() => {
                    const phone = seller.phone.replace(/\D/g, '');
                    const msg = encodeURIComponent(`Hi ${seller.name}, I found you on CocheTalk.NG`);
                    require('react-native').Linking.openURL(`https://wa.me/${phone}?text=${msg}`).catch(() => {});
                  }}
                >
                  <Feather name="phone" size={13} color="#25D366" />
                  <Text style={styles.whatsappBtnText}>WhatsApp</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {canRate && (
            <TouchableOpacity
              style={[styles.rateBtn, { backgroundColor: colors.muted, borderWidth: 1, borderColor: colors.border }]}
              onPress={() => { setRatingValue(myRating?.ratingValue ?? 5); setRatingFeedback(myRating?.feedback ?? ''); setShowRateModal(true); }}
            >
              <Feather name="star" size={14} color={colors.foreground} />
              <Text style={[styles.rateBtnText, { color: colors.foreground }]}>
                {myRating ? 'Edit Your Review' : 'Rate this Provider'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {sellerListings.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Listings ({sellerListings.length})</Text>
            {sellerListings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </>
        )}

        {sellerQuestions.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Questions ({sellerQuestions.length})</Text>
            {sellerQuestions.map((q) => (
              <QuestionCard
                key={q.id}
                question={q}
                answerCount={answers.filter((a) => a.questionId === q.id).length}
              />
            ))}
          </>
        )}

        {sellerRatings.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Reviews ({sellerRatings.length})</Text>
            {sellerRatings.map((r) => (
              <View key={r.id} style={[styles.reviewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.reviewHeader}>
                  <View style={[styles.reviewAvatar, { backgroundColor: colors.primary + '33' }]}>
                    <Text style={[styles.reviewAvatarText, { color: colors.primary }]}>{r.raterName.charAt(0)}</Text>
                  </View>
                  <View style={styles.reviewInfo}>
                    <Text style={[styles.reviewerName, { color: colors.foreground }]}>{r.raterName}</Text>
                    <Text style={[styles.reviewTime, { color: colors.mutedForeground }]}>{timeAgo(r.timestamp)}</Text>
                  </View>
                  <StarRating value={r.ratingValue} size={13} />
                </View>
                {r.feedback ? <Text style={[styles.reviewFeedback, { color: colors.foreground }]}>{r.feedback}</Text> : null}
              </View>
            ))}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal visible={showRateModal} animationType="slide" transparent onRequestClose={() => setShowRateModal(false)}>
        <Pressable style={styles.overlay} onPress={() => setShowRateModal(false)} />
        <View style={[styles.sheet, { backgroundColor: colors.background }]}>
          <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
          <View style={[styles.sheetHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Rate {seller.name}</Text>
            <TouchableOpacity onPress={() => setShowRateModal(false)}>
              <Feather name="x" size={22} color={colors.foreground} />
            </TouchableOpacity>
          </View>
          <View style={styles.sheetBody}>
            <Text style={[styles.ratingLabel, { color: colors.foreground }]}>Your Rating</Text>
            <View style={styles.starRow}>
              <StarRating value={ratingValue} interactive max={5} size={36} onSelect={setRatingValue} />
              <Text style={[styles.ratingValueText, { color: colors.primary }]}>{ratingValue}/5</Text>
            </View>

            <Text style={[styles.ratingLabel, { color: colors.foreground }]}>Feedback</Text>
            <TextInput
              style={[styles.feedbackInput, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]}
              placeholder="Share your experience with this provider..."
              placeholderTextColor={colors.mutedForeground}
              value={ratingFeedback}
              onChangeText={setRatingFeedback}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              autoFocus
            />

            <TouchableOpacity
              style={[styles.submitRatingBtn, { backgroundColor: !ratingFeedback.trim() ? colors.muted : colors.primary }]}
              onPress={handleRate}
              disabled={!ratingFeedback.trim()}
            >
              <Text style={[styles.submitRatingText, { color: !ratingFeedback.trim() ? colors.mutedForeground : colors.primaryForeground }]}>
                {myRating ? 'Update Review' : 'Submit Review'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  profileCard: { borderRadius: 12, borderWidth: 1, padding: 16, marginBottom: 16, alignItems: 'center', gap: 10 },
  avatar: { width: 70, height: 70, borderRadius: 35, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 28, fontWeight: '700' },
  profileInfo: { alignItems: 'center', gap: 6 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sellerName: { fontSize: 20, fontWeight: '700' },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  verifiedText: { fontSize: 11, fontWeight: '600' },
  roleBadge: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  roleText: { fontSize: 12, fontWeight: '600' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ratingText: { fontSize: 12 },
  detailsGrid: { width: '100%', gap: 6 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailText: { fontSize: 13 },
  contactBtns: { flexDirection: 'row', gap: 8, width: '100%', marginBottom: 8 },
  messageBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 10, paddingVertical: 11 },
  messageBtnText: { fontSize: 14, fontWeight: '700' },
  whatsappBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 10, paddingVertical: 11, paddingHorizontal: 14, borderWidth: 1 },
  whatsappBtnText: { color: '#25D366', fontSize: 13, fontWeight: '600' },
  rateBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, width: '100%', justifyContent: 'center', borderRadius: 10, paddingVertical: 11 },
  rateBtnText: { fontSize: 14, fontWeight: '700' },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8, marginTop: 8 },
  reviewCard: { borderRadius: 10, borderWidth: 1, padding: 12, marginBottom: 8 },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  reviewAvatar: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  reviewAvatarText: { fontSize: 12, fontWeight: '700' },
  reviewInfo: { flex: 1 },
  reviewerName: { fontSize: 13, fontWeight: '600' },
  reviewTime: { fontSize: 11 },
  reviewFeedback: { fontSize: 13, lineHeight: 19 },
  overlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginVertical: 10 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1 },
  sheetTitle: { fontSize: 18, fontWeight: '700' },
  sheetBody: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },
  ratingLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  starRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  ratingValueText: { fontSize: 18, fontWeight: '700' },
  feedbackInput: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, minHeight: 90 },
  submitRatingBtn: { marginTop: 14, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  submitRatingText: { fontSize: 15, fontWeight: '700' },
});
