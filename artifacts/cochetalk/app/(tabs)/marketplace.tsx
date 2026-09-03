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
import { useTabBarScrollHandler } from '@/hooks/useTabBarVisibility';

const CATEGORIES = ['All', 'Parts', 'Services', 'Car Sales'] as const;
const PARTS_GRADES = ['Genuine OEM', 'OEM Equivalent', 'Aftermarket', 'Used/Salvage', 'Refurbished'];
const BODY_TYPES = ['Sedan', 'SUV', 'Hatchback', 'Pickup', 'Coupe', 'Van', 'Truck', 'Estate'];
const ENGINE_TYPES = ['V4 (Inline-4)', 'V6', 'V8', 'V12', 'Electric', 'Hybrid', 'Diesel-Electric'];
const FUEL_TYPES = ['Petrol', 'Diesel', 'Electric', 'Hybrid', 'CNG'];
const DRIVE_TYPES = ['FWD', 'RWD', 'AWD', '4WD'];
const CAR_CONDITIONS = ['New', 'Used', 'Tokunbo'] as const;
const REG_STATUSES = ['Registered', 'Unregistered', 'Expired'];
const CUSTOMS_OPTIONS = ['Yes — Papers Available', 'No Papers', 'In Progress'];
const SERVICE_HISTORY_OPTIONS = ['Available', 'Not Available'];

type ListingCategory = 'Parts' | 'Services' | 'Car Sales';

function SectionHeader({ title, colors }: { title: string; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={[sectionHeaderStyles.row, { borderBottomColor: colors.border }]}>
      <Text style={[sectionHeaderStyles.text, { color: colors.primary }]}>{title}</Text>
    </View>
  );
}

const sectionHeaderStyles = StyleSheet.create({
  row: { borderBottomWidth: 1, paddingBottom: 6, marginTop: 22, marginBottom: 4 },
  text: { fontSize: 12, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
});

function OptionChips({
  options, value, onSelect, colors,
}: { options: string[]; value: string; onSelect: (v: string) => void; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
      {options.map((opt) => (
        <TouchableOpacity
          key={opt}
          style={[chipStyles.chip, { backgroundColor: value === opt ? colors.primary + '22' : colors.muted, borderColor: value === opt ? colors.primary : colors.border }]}
          onPress={() => onSelect(value === opt ? '' : opt)}
        >
          <Text style={[chipStyles.text, { color: value === opt ? colors.primary : colors.mutedForeground }]}>{opt}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const chipStyles = StyleSheet.create({
  chip: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1 },
  text: { fontSize: 12, fontWeight: '500' },
});

export default function MarketplaceScreen() {
  const colors = useColors();
  const handleScroll = useTabBarScrollHandler();
  const { listings, currentUser, createListing, approveListing, deleteListing } = useApp();

  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Common fields
  const [lCategory, setLCategory] = useState<ListingCategory>('Parts');
  const [lTitle, setLTitle] = useState('');
  const [lDesc, setLDesc] = useState('');
  const [lPrice, setLPrice] = useState('');
  const [lLocation, setLLocation] = useState('');

  // Parts fields
  const [lBrand, setLBrand] = useState('');
  const [lApplication, setLApplication] = useState('');
  const [lGrade, setLGrade] = useState('');
  const [lPartNumber, setLPartNumber] = useState('');

  // Car Sales — Basic Details
  const [csMake, setCsMake] = useState('');
  const [csModel, setCsModel] = useState('');
  const [csYear, setCsYear] = useState('');
  const [csTrim, setCsTrim] = useState('');
  const [csBodyType, setCsBodyType] = useState('');
  const [csExteriorColor, setCsExteriorColor] = useState('');
  const [csInteriorColor, setCsInteriorColor] = useState('');
  // Car Sales — Technical Specs
  const [csEngineType, setCsEngineType] = useState('');
  const [csTransmission, setCsTransmission] = useState('');
  const [csFuelType, setCsFuelType] = useState('');
  const [csMileage, setCsMileage] = useState('');
  const [csDriveType, setCsDriveType] = useState('');
  // Car Sales — Condition
  const [csCondition, setCsCondition] = useState('');
  const [csAccidentHistory, setCsAccidentHistory] = useState('');
  const [csAccidentDetails, setCsAccidentDetails] = useState('');
  const [csServiceHistory, setCsServiceHistory] = useState('');
  const [csPreviousOwners, setCsPreviousOwners] = useState('');
  // Car Sales — Documentation
  const [csRegStatus, setCsRegStatus] = useState('');
  const [csCustomsPapers, setCsCustomsPapers] = useState('');
  const [csVin, setCsVin] = useState('');
  const [csPlateNumber, setCsPlateNumber] = useState('');

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
    setLCategory('Parts'); setLTitle(''); setLDesc(''); setLPrice(''); setLLocation('');
    setLBrand(''); setLApplication(''); setLGrade(''); setLPartNumber('');
    setCsMake(''); setCsModel(''); setCsYear(''); setCsTrim(''); setCsBodyType('');
    setCsExteriorColor(''); setCsInteriorColor(''); setCsEngineType('');
    setCsTransmission(''); setCsFuelType(''); setCsMileage(''); setCsDriveType('');
    setCsCondition(''); setCsAccidentHistory(''); setCsAccidentDetails('');
    setCsServiceHistory(''); setCsPreviousOwners(''); setCsRegStatus('');
    setCsCustomsPapers(''); setCsVin(''); setCsPlateNumber('');
  };

  const isCarSales = lCategory === 'Car Sales';

  const isFormValid = useMemo(() => {
    if (!lPrice.trim() || parseInt(lPrice.replace(/\D/g, ''), 10) <= 0) return false;
    if (!lLocation.trim()) return false;
    if (isCarSales) {
      return !!(csMake.trim() && csModel.trim() && csYear.trim() && csCondition);
    }
    return !!(lTitle.trim() && lDesc.trim());
  }, [lTitle, lDesc, lPrice, lLocation, isCarSales, csMake, csModel, csYear, csCondition]);

  const handleCreate = () => {
    if (!isFormValid) return;
    const price = parseInt(lPrice.replace(/\D/g, ''), 10);

    let data: Omit<MarketplaceListing, 'id' | 'userId' | 'userName' | 'userRole' | 'userPhone' | 'isApproved' | 'isFeaturedBottom' | 'timestamp'>;

    if (isCarSales) {
      const autoTitle = `${csYear} ${csMake.trim()} ${csModel.trim()}${csTrim.trim() ? ' ' + csTrim.trim() : ''}`;
      const autoDesc = [
        csCondition && `Condition: ${csCondition}`,
        csEngineType && `Engine: ${csEngineType}`,
        csTransmission && `Transmission: ${csTransmission}`,
        csFuelType && `Fuel: ${csFuelType}`,
        csMileage && `Mileage: ${parseInt(csMileage.replace(/\D/g, ''), 10).toLocaleString()} km`,
        csDriveType && `Drive: ${csDriveType}`,
        csAccidentHistory === 'Yes' && csAccidentDetails ? `Accident History: ${csAccidentDetails}` : csAccidentHistory && `Accident History: ${csAccidentHistory}`,
      ].filter(Boolean).join(' • ');
      data = {
        title: autoTitle,
        description: lDesc.trim() || autoDesc,
        price,
        category: 'Car Sales',
        location: lLocation.trim(),
        partsGrade: '',
        application: '',
        partBrand: csMake.trim(),
        carMake: csMake.trim(),
        carModel: csModel.trim(),
        carYear: parseInt(csYear, 10) || undefined,
        carTrim: csTrim.trim() || undefined,
        carBodyType: csBodyType || undefined,
        carExteriorColor: csExteriorColor.trim() || undefined,
        carInteriorColor: csInteriorColor.trim() || undefined,
        carEngineType: csEngineType || undefined,
        carTransmission: csTransmission || undefined,
        carFuelType: csFuelType || undefined,
        carMileage: csMileage ? parseInt(csMileage.replace(/\D/g, ''), 10) : undefined,
        carDriveType: csDriveType || undefined,
        carCondition: csCondition || undefined,
        carAccidentHistory: csAccidentHistory === 'Yes' ? (csAccidentDetails.trim() || 'Yes') : (csAccidentHistory || undefined),
        carServiceHistory: csServiceHistory || undefined,
        carPreviousOwners: csPreviousOwners ? parseInt(csPreviousOwners, 10) : undefined,
        carRegistrationStatus: csRegStatus || undefined,
        carCustomsPapers: csCustomsPapers || undefined,
        carVin: csVin.trim() || undefined,
        carPlateNumber: csPlateNumber.trim() || undefined,
      };
    } else {
      data = {
        title: lTitle.trim(),
        description: lDesc.trim(),
        price,
        category: lCategory,
        location: lLocation.trim(),
        partBrand: lBrand.trim(),
        partNumber: lCategory === 'Parts' ? lPartNumber.trim() || undefined : undefined,
        application: lApplication.trim(),
        partsGrade: lGrade.trim(),
      };
    }

    createListing(data);
    setShowCreateModal(false);
    resetForm();
  };

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
        onScroll={handleScroll}
        scrollEventThrottle={16}
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

            {/* Category picker */}
            <Text style={[styles.label, { color: colors.foreground }]}>Category</Text>
            <View style={styles.categoryRow}>
              {(['Parts', 'Services', 'Car Sales'] as const).map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.catOption, { backgroundColor: lCategory === cat ? colors.primary : colors.muted, borderColor: lCategory === cat ? colors.primary : colors.border, flex: 1 }]}
                  onPress={() => setLCategory(cat)}
                >
                  <Text style={[styles.catOptionText, { color: lCategory === cat ? colors.primaryForeground : colors.mutedForeground }]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* ── CAR SALES FORM ── */}
            {isCarSales ? (
              <>
                <SectionHeader title="Basic Details" colors={colors} />

                <Text style={[styles.label, { color: colors.foreground }]}>Make *</Text>
                <TextInput style={[styles.input, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]} placeholder="e.g. Toyota" placeholderTextColor={colors.mutedForeground} value={csMake} onChangeText={setCsMake} />

                <Text style={[styles.label, { color: colors.foreground }]}>Model *</Text>
                <TextInput style={[styles.input, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]} placeholder="e.g. Corolla" placeholderTextColor={colors.mutedForeground} value={csModel} onChangeText={setCsModel} />

                <Text style={[styles.label, { color: colors.foreground }]}>Year of Manufacture *</Text>
                <TextInput style={[styles.input, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]} placeholder="e.g. 2019" placeholderTextColor={colors.mutedForeground} value={csYear} onChangeText={setCsYear} keyboardType="numeric" maxLength={4} />

                <Text style={[styles.label, { color: colors.foreground }]}>Trim / Variant</Text>
                <TextInput style={[styles.input, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]} placeholder="e.g. LE, Sport, Luxury" placeholderTextColor={colors.mutedForeground} value={csTrim} onChangeText={setCsTrim} />

                <Text style={[styles.label, { color: colors.foreground }]}>Body Type</Text>
                <OptionChips options={BODY_TYPES} value={csBodyType} onSelect={setCsBodyType} colors={colors} />

                <Text style={[styles.label, { color: colors.foreground }]}>Exterior Color</Text>
                <TextInput style={[styles.input, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]} placeholder="e.g. Pearl White" placeholderTextColor={colors.mutedForeground} value={csExteriorColor} onChangeText={setCsExteriorColor} />

                <Text style={[styles.label, { color: colors.foreground }]}>Interior Color</Text>
                <TextInput style={[styles.input, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]} placeholder="e.g. Black Leather" placeholderTextColor={colors.mutedForeground} value={csInteriorColor} onChangeText={setCsInteriorColor} />

                <SectionHeader title="Technical Specs" colors={colors} />

                <Text style={[styles.label, { color: colors.foreground }]}>Engine Type</Text>
                <OptionChips options={ENGINE_TYPES} value={csEngineType} onSelect={setCsEngineType} colors={colors} />

                <Text style={[styles.label, { color: colors.foreground }]}>Transmission</Text>
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
                  {['Manual', 'Automatic'].map((t) => (
                    <TouchableOpacity
                      key={t}
                      style={[styles.toggleBtn, { flex: 1, backgroundColor: csTransmission === t ? colors.primary : colors.muted, borderColor: csTransmission === t ? colors.primary : colors.border }]}
                      onPress={() => setCsTransmission(csTransmission === t ? '' : t)}
                    >
                      <Text style={[styles.toggleBtnText, { color: csTransmission === t ? colors.primaryForeground : colors.mutedForeground }]}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.label, { color: colors.foreground }]}>Fuel Type</Text>
                <OptionChips options={FUEL_TYPES} value={csFuelType} onSelect={setCsFuelType} colors={colors} />

                <Text style={[styles.label, { color: colors.foreground }]}>Mileage (km)</Text>
                <TextInput style={[styles.input, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]} placeholder="e.g. 45000" placeholderTextColor={colors.mutedForeground} value={csMileage} onChangeText={setCsMileage} keyboardType="numeric" />

                <Text style={[styles.label, { color: colors.foreground }]}>Drive Type</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                  {DRIVE_TYPES.map((d) => (
                    <TouchableOpacity
                      key={d}
                      style={[styles.toggleBtn, { flex: 1, backgroundColor: csDriveType === d ? colors.primary : colors.muted, borderColor: csDriveType === d ? colors.primary : colors.border }]}
                      onPress={() => setCsDriveType(csDriveType === d ? '' : d)}
                    >
                      <Text style={[styles.toggleBtnText, { color: csDriveType === d ? colors.primaryForeground : colors.mutedForeground }]}>{d}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <SectionHeader title="Condition" colors={colors} />

                <Text style={[styles.label, { color: colors.foreground }]}>Condition *</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                  {CAR_CONDITIONS.map((c) => (
                    <TouchableOpacity
                      key={c}
                      style={[styles.toggleBtn, { flex: 1, backgroundColor: csCondition === c ? colors.primary : colors.muted, borderColor: csCondition === c ? colors.primary : colors.border }]}
                      onPress={() => setCsCondition(c)}
                    >
                      <Text style={[styles.toggleBtnText, { color: csCondition === c ? colors.primaryForeground : colors.mutedForeground }]}>{c}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {csCondition === 'Tokunbo' && (
                  <View style={[styles.noteBox, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '44', marginTop: 8 }]}>
                    <Feather name="info" size={13} color={colors.primary} />
                    <Text style={[styles.noteText, { color: colors.primary }]}>Tokunbo — foreign-used vehicle imported into Nigeria. Ensure customs papers are available.</Text>
                  </View>
                )}

                <Text style={[styles.label, { color: colors.foreground }]}>Accident History</Text>
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
                  {['None', 'Yes'].map((a) => (
                    <TouchableOpacity
                      key={a}
                      style={[styles.toggleBtn, { flex: 1, backgroundColor: csAccidentHistory === a ? (a === 'Yes' ? colors.warning + 'DD' : colors.success + 'CC') : colors.muted, borderColor: csAccidentHistory === a ? (a === 'Yes' ? colors.warning : colors.success) : colors.border }]}
                      onPress={() => { setCsAccidentHistory(csAccidentHistory === a ? '' : a); if (a === 'None') setCsAccidentDetails(''); }}
                    >
                      <Text style={[styles.toggleBtnText, { color: csAccidentHistory === a ? '#fff' : colors.mutedForeground }]}>{a === 'None' ? 'No Accidents' : 'Has Accident History'}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {csAccidentHistory === 'Yes' && (
                  <>
                    <Text style={[styles.label, { color: colors.foreground }]}>Accident Details</Text>
                    <TextInput style={[styles.textarea, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]} placeholder="Describe the accident(s) and repairs done..." placeholderTextColor={colors.mutedForeground} value={csAccidentDetails} onChangeText={setCsAccidentDetails} multiline numberOfLines={3} textAlignVertical="top" />
                  </>
                )}

                <Text style={[styles.label, { color: colors.foreground }]}>Service History</Text>
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
                  {SERVICE_HISTORY_OPTIONS.map((s) => (
                    <TouchableOpacity
                      key={s}
                      style={[styles.toggleBtn, { flex: 1, backgroundColor: csServiceHistory === s ? colors.primary : colors.muted, borderColor: csServiceHistory === s ? colors.primary : colors.border }]}
                      onPress={() => setCsServiceHistory(csServiceHistory === s ? '' : s)}
                    >
                      <Text style={[styles.toggleBtnText, { color: csServiceHistory === s ? colors.primaryForeground : colors.mutedForeground }]}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.label, { color: colors.foreground }]}>Number of Previous Owners</Text>
                <TextInput style={[styles.input, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]} placeholder="e.g. 1" placeholderTextColor={colors.mutedForeground} value={csPreviousOwners} onChangeText={setCsPreviousOwners} keyboardType="numeric" maxLength={2} />

                <SectionHeader title="Documentation" colors={colors} />

                <Text style={[styles.label, { color: colors.foreground }]}>Registration Status</Text>
                <OptionChips options={REG_STATUSES} value={csRegStatus} onSelect={setCsRegStatus} colors={colors} />

                <Text style={[styles.label, { color: colors.foreground }]}>Customs Papers</Text>
                <OptionChips options={CUSTOMS_OPTIONS} value={csCustomsPapers} onSelect={setCsCustomsPapers} colors={colors} />

                <Text style={[styles.label, { color: colors.foreground }]}>VIN (Vehicle Identification Number)</Text>
                <TextInput style={[styles.input, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]} placeholder="17-character VIN" placeholderTextColor={colors.mutedForeground} value={csVin} onChangeText={(t) => setCsVin(t.toUpperCase())} autoCapitalize="characters" maxLength={17} />

                <Text style={[styles.label, { color: colors.foreground }]}>Plate Number <Text style={{ fontWeight: '400', color: colors.mutedForeground }}>(optional)</Text></Text>
                <TextInput style={[styles.input, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]} placeholder="e.g. LAG-123-AA" placeholderTextColor={colors.mutedForeground} value={csPlateNumber} onChangeText={(t) => setCsPlateNumber(t.toUpperCase())} autoCapitalize="characters" />

                <SectionHeader title="Pricing & Location" colors={colors} />

                <Text style={[styles.label, { color: colors.foreground }]}>Asking Price (₦) *</Text>
                <TextInput style={[styles.input, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]} placeholder="e.g. 8500000" placeholderTextColor={colors.mutedForeground} value={lPrice} onChangeText={setLPrice} keyboardType="numeric" />

                <Text style={[styles.label, { color: colors.foreground }]}>Location *</Text>
                <TextInput style={[styles.input, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]} placeholder="e.g. Apapa, Lagos" placeholderTextColor={colors.mutedForeground} value={lLocation} onChangeText={setLLocation} />

                <Text style={[styles.label, { color: colors.foreground }]}>Additional Notes</Text>
                <TextInput style={[styles.textarea, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]} placeholder="Any extra details about the car, reason for selling, negotiation terms..." placeholderTextColor={colors.mutedForeground} value={lDesc} onChangeText={setLDesc} multiline numberOfLines={4} textAlignVertical="top" />
              </>
            ) : (
              /* ── PARTS / SERVICES FORM ── */
              <>
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

                    {lCategory === 'Parts' && (
                      <>
                        <Text style={[styles.label, { color: colors.foreground }]}>Parts Number</Text>
                        <TextInput
                          style={[styles.input, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]}
                          placeholder="e.g. 12345-ABC"
                          placeholderTextColor={colors.mutedForeground}
                          value={lPartNumber}
                          onChangeText={setLPartNumber}
                          autoCapitalize="characters"
                        />
                      </>
                    )}

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
              </>
            )}

            {currentUser?.role !== 'Admin' && (
              <View style={[styles.noteBox, { backgroundColor: colors.warning + '15', borderColor: colors.warning + '44', marginTop: 16 }]}>
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
  sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '94%' },
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
  toggleBtn: { borderRadius: 10, borderWidth: 1, paddingVertical: 9, alignItems: 'center', justifyContent: 'center' },
  toggleBtnText: { fontSize: 12, fontWeight: '600' },
  gradeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1 },
  chipText: { fontSize: 12, fontWeight: '500' },
  noteBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: 8, borderWidth: 1, padding: 12 },
  noteText: { flex: 1, fontSize: 12, lineHeight: 18 },
  submitBtn: { marginTop: 20, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  submitBtnText: { fontSize: 16, fontWeight: '700' },
});
