import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { makeConvId, useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';

function formatPrice(price: number): string {
  return `\u20a6${price.toLocaleString()}`;
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const CATEGORY_COLORS: Record<string, string> = {
  Parts: '#3B82F6',
  Services: '#10B981',
  'Car Sales': '#F59E0B',
};

export default function ListingDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const { listings, users, currentUser } = useApp();

  const listing = listings.find((l) => String(l.id) === id);

  if (!listing) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.notFound}>
          <Text style={[styles.notFoundText, { color: colors.mutedForeground }]}>Listing not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const seller = users.find((u) => u.id === listing.userId);
  const whatsappEnabled = seller?.whatsappEnabled ?? false;
  const isSelf = currentUser?.id === listing.userId;
  const catColor = CATEGORY_COLORS[listing.category] ?? colors.primary;
  const isCarSale = listing.category === 'Car Sales';

  const handleWhatsApp = () => {
    const phone = listing.userPhone.replace(/\D/g, '');
    const msg = encodeURIComponent(
      `Hi ${listing.userName}, I'm interested in your listing: "${listing.title}" on CocheTalk.NG`,
    );
    Linking.openURL(`https://wa.me/${phone}?text=${msg}`).catch(() => {
      Alert.alert('Could Not Open WhatsApp', 'Please make sure WhatsApp is installed on your device.');
    });
  };

  const handleMessage = () => {
    if (!currentUser) return;
    const convId = makeConvId(currentUser.id, listing.userId);
    router.push(`/conversation/${encodeURIComponent(convId)}`);
  };

  const carSpecs = isCarSale
    ? [
        listing.carMake && listing.carModel && listing.carYear
          ? { label: 'Vehicle', value: `${listing.carYear} ${listing.carMake} ${listing.carModel}` }
          : null,
        listing.carCondition ? { label: 'Condition', value: listing.carCondition } : null,
        listing.carTransmission ? { label: 'Transmission', value: listing.carTransmission } : null,
        listing.carFuelType ? { label: 'Fuel Type', value: listing.carFuelType } : null,
        listing.carEngineType
          ? { label: 'Engine', value: listing.carEngineType.replace(' (Inline-4)', '') }
          : null,
        listing.carDriveType ? { label: 'Drive Type', value: listing.carDriveType } : null,
        listing.carMileage != null
          ? { label: 'Mileage', value: `${listing.carMileage.toLocaleString()} km` }
          : null,
        listing.carBodyType ? { label: 'Body Type', value: listing.carBodyType } : null,
        listing.carRegistrationStatus
          ? { label: 'Registration', value: listing.carRegistrationStatus }
          : null,
        listing.carCustomsPapers
          ? { label: 'Customs Papers', value: listing.carCustomsPapers }
          : null,
        listing.carAccidentHistory
          ? { label: 'Accident History', value: listing.carAccidentHistory }
          : null,
        listing.carServiceHistory
          ? { label: 'Service History', value: listing.carServiceHistory }
          : null,
      ].filter(Boolean) as { label: string; value: string }[]
    : [];

  const partsSpecs =
    !isCarSale
      ? [
          listing.partBrand ? { label: 'Brand', value: listing.partBrand } : null,
          listing.partsGrade ? { label: 'Grade', value: listing.partsGrade } : null,
          listing.application ? { label: 'Fits', value: listing.application } : null,
        ].filter(Boolean) as { label: string; value: string }[]
      : [];

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]} numberOfLines={1}>
          Listing Details
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Pending banner */}
        {!listing.isApproved && (
          <View style={[styles.pendingBanner, { backgroundColor: colors.warning + '22' }]}>
            <Feather name="clock" size={13} color={colors.warning} />
            <Text style={[styles.pendingText, { color: colors.warning }]}>Pending Approval — only visible to you</Text>
          </View>
        )}

        {/* Category + price */}
        <View style={styles.topRow}>
          <View style={[styles.catBadge, { backgroundColor: catColor + '22' }]}>
            <Text style={[styles.catText, { color: catColor }]}>{listing.category}</Text>
          </View>
          <Text style={[styles.price, { color: colors.primary }]}>{formatPrice(listing.price)}</Text>
        </View>

        {/* Title */}
        <Text style={[styles.title, { color: colors.foreground }]}>{listing.title}</Text>

        {/* Meta row */}
        <View style={styles.metaRow}>
          <Feather name="map-pin" size={12} color={colors.mutedForeground} />
          <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{listing.location}</Text>
          <Text style={[styles.metaDot, { color: colors.mutedForeground }]}>·</Text>
          <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{timeAgo(listing.timestamp)}</Text>
        </View>

        {/* Description */}
        {listing.description ? (
          <View style={[styles.section, { borderColor: colors.border }]}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Description</Text>
            <Text style={[styles.descText, { color: colors.foreground }]}>{listing.description}</Text>
          </View>
        ) : null}

        {/* Specs table */}
        {(isCarSale ? carSpecs : partsSpecs).length > 0 && (
          <View style={[styles.section, { borderColor: colors.border }]}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
              {isCarSale ? 'Vehicle Details' : 'Part Details'}
            </Text>
            <View style={[styles.specTable, { borderColor: colors.border, backgroundColor: colors.card }]}>
              {(isCarSale ? carSpecs : partsSpecs).map((spec, i) => (
                <View
                  key={spec.label}
                  style={[
                    styles.specRow,
                    { borderTopColor: colors.border },
                    i === 0 && { borderTopWidth: 0 },
                  ]}
                >
                  <Text style={[styles.specLabel, { color: colors.mutedForeground }]}>{spec.label}</Text>
                  <Text style={[styles.specValue, { color: colors.foreground }]}>{spec.value}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Seller card */}
        <View style={[styles.section, { borderColor: colors.border }]}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Seller</Text>
          <TouchableOpacity
            style={[styles.sellerCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push(`/seller/${encodeURIComponent(listing.userId)}`)}
          >
            <View style={[styles.avatar, { backgroundColor: colors.primary + '33' }]}>
              <Text style={[styles.avatarText, { color: colors.primary }]}>
                {listing.userName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.sellerInfo}>
              <Text style={[styles.sellerName, { color: colors.foreground }]}>{listing.userName}</Text>
              <View style={styles.sellerMeta}>
                <Text style={[styles.sellerRole, { color: colors.mutedForeground }]}>{listing.userRole}</Text>
                {seller?.verified && (
                  <View style={[styles.verifiedBadge, { backgroundColor: colors.primary + '22' }]}>
                    <Feather name="check-circle" size={10} color={colors.primary} />
                    <Text style={[styles.verifiedText, { color: colors.primary }]}>Verified</Text>
                  </View>
                )}
              </View>
            </View>
            <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        {/* Contact actions */}
        {listing.isApproved && !isSelf && currentUser && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
              onPress={handleMessage}
            >
              <Feather name="message-circle" size={16} color={colors.primaryForeground} />
              <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>Message Seller</Text>
            </TouchableOpacity>

            {whatsappEnabled && (
              <TouchableOpacity
                style={[styles.whatsappBtn, { borderColor: '#25D366' }]}
                onPress={handleWhatsApp}
              >
                <Feather name="phone" size={16} color="#25D366" />
                <Text style={[styles.whatsappBtnText]}>WhatsApp</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {!currentUser && listing.isApproved && (
          <View style={[styles.loginPrompt, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Text style={[styles.loginPromptText, { color: colors.mutedForeground }]}>
              Log in to contact this seller.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', flex: 1, textAlign: 'center' },
  scroll: { padding: 16, gap: 0 },
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 10,
    borderRadius: 8,
    marginBottom: 14,
  },
  pendingText: { fontSize: 13, fontWeight: '500' },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  catBadge: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  catText: { fontSize: 12, fontWeight: '700' },
  price: { fontSize: 22, fontWeight: '800' },
  title: { fontSize: 18, fontWeight: '700', lineHeight: 26, marginBottom: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20 },
  metaText: { fontSize: 12 },
  metaDot: { fontSize: 12 },
  section: { borderTopWidth: 1, paddingTop: 18, marginBottom: 18 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  descText: { fontSize: 14, lineHeight: 22 },
  specTable: { borderRadius: 10, borderWidth: 1, overflow: 'hidden' },
  specRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderTopWidth: 1,
  },
  specLabel: { fontSize: 13, flex: 1 },
  specValue: { fontSize: 13, fontWeight: '600', flex: 1, textAlign: 'right' },
  sellerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '700' },
  sellerInfo: { flex: 1 },
  sellerName: { fontSize: 15, fontWeight: '700' },
  sellerMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  sellerRole: { fontSize: 12 },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  verifiedText: { fontSize: 10, fontWeight: '700' },
  actions: { gap: 10, marginTop: 4 },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 14,
  },
  primaryBtnText: { fontSize: 15, fontWeight: '700' },
  whatsappBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 13,
    borderWidth: 1.5,
  },
  whatsappBtnText: { color: '#25D366', fontSize: 15, fontWeight: '700' },
  loginPrompt: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 4,
  },
  loginPromptText: { fontSize: 13 },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFoundText: { fontSize: 15 },
});
