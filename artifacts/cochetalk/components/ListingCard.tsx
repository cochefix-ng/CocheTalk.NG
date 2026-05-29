import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import type { MarketplaceListing } from '@/context/AppContext';
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
  Accessories: '#F59E0B',
};

interface Props {
  listing: MarketplaceListing;
  isAdmin?: boolean;
  onApprove?: (id: number, approved: boolean) => void;
  onDelete?: (id: number) => void;
}

export function ListingCard({ listing, isAdmin = false, onApprove, onDelete }: Props) {
  const colors = useColors();
  const catColor = CATEGORY_COLORS[listing.category] ?? colors.primary;

  const handleWhatsApp = () => {
    const phone = listing.userPhone.replace(/\D/g, '');
    const msg = encodeURIComponent(`Hi ${listing.userName}, I'm interested in your listing: "${listing.title}" on CocheTalk.NG`);
    Linking.openURL(`https://wa.me/${phone}?text=${msg}`).catch(() => {});
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

      <Text style={[styles.desc, { color: colors.mutedForeground }]} numberOfLines={2}>
        {listing.description}
      </Text>

      {(listing.partBrand || listing.application || listing.partsGrade) && (
        <View style={styles.metaRow}>
          {listing.partBrand ? (
            <Text style={[styles.metaItem, { color: colors.mutedForeground }]}>Brand: {listing.partBrand}</Text>
          ) : null}
          {listing.partsGrade ? (
            <Text style={[styles.metaItem, { color: colors.mutedForeground }]}>Grade: {listing.partsGrade}</Text>
          ) : null}
        </View>
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
        {listing.isApproved && (
          <TouchableOpacity
            style={[styles.whatsappBtn, { backgroundColor: '#25D366' }]}
            onPress={handleWhatsApp}
          >
            <Feather name="message-circle" size={14} color="#fff" />
            <Text style={styles.whatsappText}>Contact via WhatsApp</Text>
          </TouchableOpacity>
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
  whatsappBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 8,
    paddingVertical: 9,
  },
  whatsappText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
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
