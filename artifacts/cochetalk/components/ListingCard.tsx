import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import type { MarketplaceListing } from '@/context/AppContext';
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

interface Props {
  listing: MarketplaceListing;
  isAdmin?: boolean;
  onApprove?: (id: number, approved: boolean) => void;
  onDelete?: (id: number) => void;
}

function CarSalesMeta({ listing, colors }: { listing: MarketplaceListing; colors: ReturnType<typeof useColors> }) {
  const specs = [
    listing.carCondition && { icon: 'tag' as const, label: listing.carCondition },
    listing.carTransmission && { icon: 'settings' as const, label: listing.carTransmission },
    listing.carFuelType && { icon: 'droplet' as const, label: listing.carFuelType },
    listing.carMileage != null && { icon: 'navigation' as const, label: `${listing.carMileage.toLocaleString()} km` },
    listing.carEngineType && { icon: 'cpu' as const, label: listing.carEngineType.replace(' (Inline-4)', '') },
    listing.carDriveType && { icon: 'sliders' as const, label: listing.carDriveType },
  ].filter(Boolean) as { icon: React.ComponentProps<typeof Feather>['name']; label: string }[];

  const docBadges = [
    listing.carRegistrationStatus === 'Registered' && { label: 'Registered', color: '#10B981' },
    listing.carCustomsPapers?.startsWith('Yes') && { label: 'Customs Papers', color: '#10B981' },
    listing.carAccidentHistory === 'None' || listing.carAccidentHistory === undefined ? null : { label: 'Accident History', color: '#EF4444' },
  ].filter(Boolean) as { label: string; color: string }[];

  if (specs.length === 0 && docBadges.length === 0) return null;

  return (
    <View style={{ marginBottom: 8, gap: 6 }}>
      {specs.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {specs.map((s) => (
            <View key={s.label} style={[carMetaStyles.spec, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <Feather name={s.icon} size={10} color={colors.mutedForeground} />
              <Text style={[carMetaStyles.specText, { color: colors.mutedForeground }]}>{s.label}</Text>
            </View>
          ))}
        </View>
      )}
      {docBadges.length > 0 && (
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {docBadges.map((b) => (
            <View key={b.label} style={[carMetaStyles.docBadge, { backgroundColor: b.color + '22' }]}>
              <Text style={[carMetaStyles.docText, { color: b.color }]}>{b.label}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const carMetaStyles = StyleSheet.create({
  spec: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 6, borderWidth: 1, paddingHorizontal: 7, paddingVertical: 3 },
  specText: { fontSize: 11, fontWeight: '500' },
  docBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  docText: { fontSize: 11, fontWeight: '600' },
});

export function ListingCard({ listing, isAdmin = false, onApprove, onDelete }: Props) {
  const colors = useColors();
  const { currentUser, users, conversations } = useApp();
  const catColor = CATEGORY_COLORS[listing.category] ?? colors.primary;
  const isCarSale = listing.category === 'Car Sales';

  const seller = users.find((u) => u.id === listing.userId);
  const whatsappEnabled = seller?.whatsappEnabled ?? false;
  const isSelf = currentUser?.id === listing.userId;

  const handleWhatsApp = () => {
    const phone = listing.userPhone.replace(/\D/g, '');
    const msg = encodeURIComponent(`Hi ${listing.userName}, I'm interested in your listing: "${listing.title}" on CocheTalk.NG`);
    Linking.openURL(`https://wa.me/${phone}?text=${msg}`).catch(() => {});
  };

  const handleMessage = () => {
    if (!currentUser) return;
    const convId = makeConvId(currentUser.id, listing.userId);
    router.push(`/conversation/${encodeURIComponent(convId)}`);
  };

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
        !listing.isApproved && { opacity: 0.75 },
      ]}
    >
      {!listing.isApproved && (
        <View style={[styles.pendingBanner, { backgroundColor: colors.warning + '22' }]}>
          <Feather name="clock" size={12} color={colors.warning} />
          <Text style={[styles.pendingText, { color: colors.warning }]}>Pending Approval</Text>
        </View>
      )}

      <View style={styles.headerRow}>
        <View style={[styles.catBadge, { backgroundColor: catColor + '22' }]}>
          <Text style={[styles.catText, { color: catColor }]}>{listing.category}</Text>
        </View>
        <Text style={[styles.price, { color: colors.primary }]}>{formatPrice(listing.price)}</Text>
      </View>

      <Text style={[styles.title, { color: colors.cardForeground }]} numberOfLines={2}>
        {listing.title}
      </Text>

      {listing.description ? (
        <Text style={[styles.desc, { color: colors.mutedForeground }]} numberOfLines={isCarSale ? 1 : 2}>
          {listing.description}
        </Text>
      ) : null}

      {isCarSale ? (
        <CarSalesMeta listing={listing} colors={colors} />
      ) : (
        (listing.partBrand || listing.partsGrade) ? (
          <View style={styles.metaRow}>
            {listing.partBrand ? <Text style={[styles.metaItem, { color: colors.mutedForeground }]}>Brand: {listing.partBrand}</Text> : null}
            {listing.partsGrade ? <Text style={[styles.metaItem, { color: colors.mutedForeground }]}>Grade: {listing.partsGrade}</Text> : null}
          </View>
        ) : null
      )}

      <View style={styles.footerRow}>
        <TouchableOpacity
          style={styles.sellerRow}
          onPress={() => router.push(`/seller/${listing.userId}`)}
        >
          <View style={[styles.avatar, { backgroundColor: colors.primary + '33' }]}>
            <Text style={[styles.avatarText, { color: colors.primary }]}>
              {listing.userName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View>
            <Text style={[styles.sellerName, { color: colors.foreground }]}>{listing.userName}</Text>
            <Text style={[styles.sellerLocation, { color: colors.mutedForeground }]}>{listing.location}</Text>
          </View>
        </TouchableOpacity>

        <Text style={[styles.time, { color: colors.mutedForeground }]}>{timeAgo(listing.timestamp)}</Text>
      </View>

      <View style={styles.actions}>
        {listing.isApproved && !isSelf && currentUser && (
          <View style={styles.contactBtns}>
            <TouchableOpacity
              style={[styles.messageBtn, { backgroundColor: colors.primary }]}
              onPress={handleMessage}
            >
              <Feather name="message-circle" size={14} color={colors.primaryForeground} />
              <Text style={[styles.messageBtnText, { color: colors.primaryForeground }]}>Message</Text>
            </TouchableOpacity>
            {whatsappEnabled && (
              <TouchableOpacity
                style={[styles.whatsappBtnSmall, { borderColor: '#25D366' }]}
                onPress={handleWhatsApp}
              >
                <Feather name="phone" size={13} color="#25D366" />
                <Text style={styles.whatsappSmallText}>WhatsApp</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {isAdmin && onApprove && (
          <TouchableOpacity
            style={[
              styles.approveBtn,
              {
                backgroundColor: listing.isApproved ? colors.muted : colors.primary,
                borderColor: listing.isApproved ? colors.border : colors.primary,
              },
            ]}
            onPress={() => onApprove(listing.id, !listing.isApproved)}
          >
            <Text
              style={[
                styles.approveBtnText,
                { color: listing.isApproved ? colors.mutedForeground : colors.primaryForeground },
              ]}
            >
              {listing.isApproved ? 'Unapprove' : 'Approve'}
            </Text>
          </TouchableOpacity>
        )}

        {isAdmin && onDelete && (
          <TouchableOpacity
            style={[styles.deleteBtn, { backgroundColor: colors.destructive + '22' }]}
            onPress={() => onDelete(listing.id)}
          >
            <Feather name="trash-2" size={14} color={colors.destructive} />
          </TouchableOpacity>
        )}
      </View>
    </View>
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
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 6,
    borderRadius: 6,
    marginBottom: 10,
  },
  pendingText: {
    fontSize: 12,
    fontWeight: '500',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  catBadge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  catText: {
    fontSize: 11,
    fontWeight: '600',
  },
  price: {
    fontSize: 17,
    fontWeight: '700',
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 21,
    marginBottom: 4,
  },
  desc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  metaItem: {
    fontSize: 12,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  sellerName: {
    fontSize: 12,
    fontWeight: '600',
  },
  sellerLocation: {
    fontSize: 11,
  },
  time: {
    fontSize: 11,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  contactBtns: { flex: 1, flexDirection: 'row', gap: 8, alignItems: 'center' },
  messageBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 8,
    paddingVertical: 9,
  },
  messageBtnText: { fontSize: 13, fontWeight: '600' },
  whatsappBtnSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 8,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  whatsappSmallText: { color: '#25D366', fontSize: 12, fontWeight: '600' },
  approveBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  approveBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  deleteBtn: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
