import { Feather } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
  FlatList,
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

import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { ListingCard } from '@/components/ListingCard';
import { useApp } from '@/context/AppContext';
import type { MarketplaceListing } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';

const CATEGORIES = ['All', 'Parts', 'Services', 'Accessories'] as const;
const PARTS_GRADES = ['Genuine OEM', 'OEM Equivalent', 'Aftermarket', 'Used/Salvage', 'Refurbished'];

export default function MarketplaceScreen() {
  const colors = useColors();
  const { listings, currentUser, createListing, approveListing, deleteListing } = useApp();

  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [lTitle, setLTitle] = useState('');
  const [lDesc, setLDesc] = useState('');
  const [lPrice, setLPrice] = useState('');
  const [lCategory, setLCategory] = useState<'Parts' | 'Services' | 'Accessories'>('Parts');
  const [lLocation, setLLocation] = useState('');
  const [lBrand, setLBrand] = useState('');
  const [lApplication, setLApplication] = useState('');
  const [lGrade, setLGrade] = useState('');

  const isAdmin = currentUser?.role === 'Admin';

  const filteredListings = useMemo(() => {
    let result = listings.filter((l) => l.isApproved || isAdmin);
    if (activeCategory !== 'All') {
      result = result.filter((l) => l.category === activeCategory);
    }
    return result.sort((a, b) => {
      if (a.isFeaturedBottom !== b.isFeaturedBottom) return a.isFeaturedBottom ? -1 : 1;
      return b.timestamp - a.timestamp;
    });
  }, [listings, activeCategory, isAdmin]);

  const pendingCount = useMemo(() => listings.filter((l) => !l.isApproved).length, [listings]);

  const resetForm = () => {
    setLTitle(''); setLDesc(''); setLPrice(''); setLCategory('Parts');
    setLLocation(''); setLBrand(''); setLApplication(''); setLGrade('');
  };

  const handleCreate = () => {
    const price = parseInt(lPrice.replace(/\D/g, ''), 10);
    if (!lTitle.trim() || !lDesc.trim() || !lLocation.trim() || isNaN(price) || price <= 0) return;
    const data: Omit<MarketplaceListing, 'id' | 'userId' | 'userName' | 'userRole' | 'userPhone' | 'isApproved' | 'isFeaturedBottom' | 'timestamp'> = {
      title: lTitle.trim(),
      description: lDesc.trim(),
      price,
      category: lCategory,
      location: lLocation.trim(),
      partBrand: lBrand.trim(),
      application: lApplication.trim(),
      partsGrade: lGrade.trim(),
    };
    createListing(data);
    setShowCreateModal(false);
    resetForm();
  };

  const isFormValid = lTitle.trim() && lDesc.trim() && lLocation.trim() && lPrice.trim() && parseInt(lPrice.replace(/\D/g, ''), 10) > 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <Feather name="shopping-bag" size={18} color={colors.primary} />
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Marketplace</Text>
        </View>
        {isAdmin && pendingCount > 0 && (
          <View style={[styles.pendingBadge, { backgroundColor: colors.warning }]}>
            <Text style={styles.pendingBadgeText}>{pendingCount} pending</Text>
          </View>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catRow} contentContainerStyle={styles.catContent}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.catChip, { backgroundColor: activeCategory === cat ? colors.primary : colors.muted, borderColor: activeCategory === cat ? colors.primary : colors.border }]}
            onPress={() => setActiveCategory(cat)}
          >
            <Text style={[styles.catChipText, { color: activeCategory === cat ? colors.primaryForeground : colors.mutedForeground }]}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filteredListings}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <ListingCard
            listing={item}
            isAdmin={isAdmin}
            onApprove={isAdmin ? approveListing : undefined}
            onDelete={isAdmin ? deleteListing : undefined}
          />
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Feather name="shopping-bag" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No listings found</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              {activeCategory !== 'All' ? `No ${activeCategory.toLowerCase()} listings available.` : 'No listings yet. Be the first to sell!'}
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />

      {currentUser && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.primary }]}
          onPress={() => setShowCreateModal(true)}
        >
          <Feather name="plus" size={24} color={colors.primaryForeground} />
        </TouchableOpacity>
      )}

      <Modal visible={showCreateModal} animationType="slide" transparent onRequestClose={() => { setShowCreateModal(false); resetForm(); }}>
        <Pressable style={styles.overlay} onPress={() => { setShowCreateModal(false); resetForm(); }} />
        <View style={[styles.sheet, { backgroundColor: colors.background }]}>
          <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
          <View style={[styles.sheetHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Create Listing</Text>
            <TouchableOpacity onPress={() => { setShowCreateModal(false); resetForm(); }}>
              <Feather name="x" size={22} color={colors.foreground} />
            </TouchableOpacity>
          </View>
          <KeyboardAwareScrollViewCompat style={styles.sheetBody}>
            <Text style={[styles.label, { color: colors.foreground }]}>Category</Text>
            <View style={styles.categoryRow}>
              {(['Parts', 'Services', 'Accessories'] as const).map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.catOption, { backgroundColor: lCategory === cat ? colors.primary : colors.muted, borderColor: lCategory === cat ? colors.primary : colors.border, flex: 1 }]}
                  onPress={() => setLCategory(cat)}
                >
                  <Text style={[styles.catOptionText, { color: lCategory === cat ? colors.primaryForeground : colors.mutedForeground }]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.label, { color: colors.foreground }]}>Title *</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]} placeholder="What are you selling?" placeholderTextColor={colors.mutedForeground} value={lTitle} onChangeText={setLTitle} />

            <Text style={[styles.label, { color: colors.foreground }]}>Description *</Text>
            <TextInput style={[styles.textarea, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]} placeholder="Describe the item, condition, compatibility..." placeholderTextColor={colors.mutedForeground} value={lDesc} onChangeText={setLDesc} multiline numberOfLines={4} textAlignVertical="top" />

            <Text style={[styles.label, { color: colors.foreground }]}>Price (₦) *</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]} placeholder="e.g. 25000" placeholderTextColor={colors.mutedForeground} value={lPrice} onChangeText={setLPrice} keyboardType="numeric" />

            <Text style={[styles.label, { color: colors.foreground }]}>Location *</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]} placeholder="e.g. Victoria Island, Lagos" placeholderTextColor={colors.mutedForeground} value={lLocation} onChangeText={setLLocation} />

            {lCategory !== 'Services' && (
              <>
                <Text style={[styles.label, { color: colors.foreground }]}>Brand</Text>
                <TextInput style={[styles.input, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]} placeholder="e.g. Denso, Bosch, Toyota Genuine" placeholderTextColor={colors.mutedForeground} value={lBrand} onChangeText={setLBrand} />

                <Text style={[styles.label, { color: colors.foreground }]}>Application / Compatibility</Text>
                <TextInput style={[styles.input, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]} placeholder="e.g. Honda Civic 2015-2020" placeholderTextColor={colors.mutedForeground} value={lApplication} onChangeText={setLApplication} />

                <Text style={[styles.label, { color: colors.foreground }]}>Parts Grade</Text>
                <View style={styles.gradeGrid}>
                  {PARTS_GRADES.map((g) => (
                    <TouchableOpacity key={g} style={[styles.chip, { backgroundColor: lGrade === g ? colors.primary + '33' : colors.muted, borderColor: lGrade === g ? colors.primary : colors.border }]} onPress={() => setLGrade(lGrade === g ? '' : g)}>
                      <Text style={[styles.chipText, { color: lGrade === g ? colors.primary : colors.mutedForeground }]}>{g}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {currentUser?.role !== 'Admin' && (
              <View style={[styles.noteBox, { backgroundColor: colors.warning + '15', borderColor: colors.warning + '44' }]}>
                <Feather name="info" size={14} color={colors.warning} />
                <Text style={[styles.noteText, { color: colors.warning }]}>Your listing will be reviewed by an admin before it becomes visible to buyers.</Text>
              </View>
            )}

            <TouchableOpacity style={[styles.submitBtn, { backgroundColor: !isFormValid ? colors.muted : colors.primary }]} onPress={handleCreate} disabled={!isFormValid}>
              <Text style={[styles.submitBtnText, { color: !isFormValid ? colors.mutedForeground : colors.primaryForeground }]}>Create Listing</Text>
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
  pendingBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  pendingBadgeText: { fontSize: 12, fontWeight: '600', color: '#fff' },
  catRow: { marginTop: 10, maxHeight: 42 },
  catContent: { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  catChip: { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6, borderWidth: 1 },
  catChipText: { fontSize: 13, fontWeight: '600' },
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
  categoryRow: { flexDirection: 'row', gap: 8 },
  catOption: { borderRadius: 10, borderWidth: 1, paddingVertical: 10, alignItems: 'center' },
  catOptionText: { fontSize: 13, fontWeight: '600' },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6, marginTop: 14 },
  input: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  textarea: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, minHeight: 90 },
  gradeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1 },
  chipText: { fontSize: 12, fontWeight: '500' },
  noteBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: 8, borderWidth: 1, padding: 12, marginTop: 16 },
  noteText: { flex: 1, fontSize: 12, lineHeight: 18 },
  submitBtn: { marginTop: 20, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  submitBtnText: { fontSize: 16, fontWeight: '700' },
});
