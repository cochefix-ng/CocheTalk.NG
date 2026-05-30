import { Feather } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Alert,
  Modal,
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

import { useApp } from '@/context/AppContext';
import type { User } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';

function StarRating({ value, max = 5, size = 16, color }: { value: number; max?: number; size?: number; color: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {Array.from({ length: max }).map((_, i) => (
        <Feather key={i} name={i < Math.round(value) ? 'star' : 'star'} size={size} color={i < Math.round(value) ? '#F59E0B' : color} style={{ opacity: i < Math.round(value) ? 1 : 0.3 }} />
      ))}
    </View>
  );
}

function avgRating(ratings: { ratingValue: number }[]) {
  if (!ratings.length) return 0;
  return ratings.reduce((sum, r) => sum + r.ratingValue, 0) / ratings.length;
}

export default function ProfileScreen() {
  const colors = useColors();
  const { users, currentUser, login, logout, questions, listings, ratings, toggleVerified, banUser, approveListing, featureListing, deleteListing, updateCmsConfig, cmsConfig, isLoading } = useApp();

  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [activeAdminTab, setActiveAdminTab] = useState<'users' | 'listings' | 'cms'>('users');
  const [editAnnouncement, setEditAnnouncement] = useState(cmsConfig.announcementText);

  const pendingListings = listings.filter((l) => !l.isApproved);
  const approvedListings = listings.filter((l) => l.isApproved);
  const featuredCount = listings.filter((l) => l.isFeaturedBottom).length;

  const handleSaveAnnouncement = () => {
    updateCmsConfig({ announcementText: editAnnouncement });
  };

  const handleBan = (user: User) => {
    Alert.alert(
      user.isBanned ? 'Unban User' : 'Ban User',
      `${user.isBanned ? 'Unban' : 'Ban'} ${user.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', style: 'destructive', onPress: () => banUser(user.id, !user.isBanned) },
      ],
    );
  };

  if (!currentUser) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Feather name="user" size={18} color={colors.primary} />
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Profile</Text>
        </View>
        <ScrollView contentContainerStyle={styles.guestContent}>
          <View style={[styles.guestCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.guestAvatar, { backgroundColor: colors.muted }]}>
              <Feather name="user" size={32} color={colors.mutedForeground} />
            </View>
            <Text style={[styles.guestTitle, { color: colors.foreground }]}>You are not logged in</Text>
            <Text style={[styles.guestDesc, { color: colors.mutedForeground }]}>
              Sign in to ask questions, post listings, and access all CocheTalk features.
            </Text>
          </View>

          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>DEMO ACCOUNTS</Text>
          {users.map((u) => (
            <TouchableOpacity
              key={u.id}
              style={[styles.userItem, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => login(u.id)}
            >
              <View style={[styles.userAvatar, { backgroundColor: colors.primary + '33' }]}>
                <Text style={[styles.userAvatarText, { color: colors.primary }]}>{u.name.charAt(0)}</Text>
              </View>
              <View style={styles.userInfo}>
                <View style={styles.nameRow}>
                  <Text style={[styles.userName, { color: colors.foreground }]}>{u.name}</Text>
                  {u.verified && <Feather name="check-circle" size={13} color={colors.verified} />}
                </View>
                <Text style={[styles.userRole, { color: colors.mutedForeground }]}>
                  {u.specialization ? `${u.role} — ${u.specialization}` : u.role}
                </Text>
              </View>
              <Feather name="log-in" size={16} color={colors.primary} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  const userQuestions = questions.filter((q) => q.userId === currentUser.id);
  const userListings = listings.filter((l) => l.userId === currentUser.id);
  const userRatings = ratings.filter((r) => r.providerId === currentUser.id);
  const avgRatingValue = avgRating(userRatings);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Feather name="user" size={18} color={colors.primary} />
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Profile</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.bigAvatar, { backgroundColor: colors.primary + '33' }]}>
            <Text style={[styles.bigAvatarText, { color: colors.primary }]}>{currentUser.name.charAt(0)}</Text>
          </View>
          <View style={styles.profileMain}>
            <View style={styles.nameRow}>
              <Text style={[styles.profileName, { color: colors.foreground }]}>{currentUser.name}</Text>
              {currentUser.verified && (
                <View style={[styles.verifiedBadge, { backgroundColor: colors.verified + '22' }]}>
                  <Feather name="check-circle" size={12} color={colors.verified} />
                  <Text style={[styles.verifiedText, { color: colors.verified }]}>Verified</Text>
                </View>
              )}
            </View>
            <View style={[styles.roleBadge, { backgroundColor: currentUser.role === 'Admin' ? colors.destructive + '22' : currentUser.role === 'Service Provider' ? colors.proCircle + '22' : colors.primary + '22' }]}>
              <Text style={[styles.roleText, { color: currentUser.role === 'Admin' ? colors.destructive : currentUser.role === 'Service Provider' ? colors.proCircle : colors.primary }]}>
                {currentUser.role}
              </Text>
            </View>
          </View>

          {currentUser.location ? (
            <View style={styles.infoRow}>
              <Feather name="map-pin" size={13} color={colors.mutedForeground} />
              <Text style={[styles.infoText, { color: colors.mutedForeground }]}>{currentUser.location}</Text>
            </View>
          ) : null}

          {currentUser.phone ? (
            <View style={styles.infoRow}>
              <Feather name="phone" size={13} color={colors.mutedForeground} />
              <Text style={[styles.infoText, { color: colors.mutedForeground }]}>{currentUser.phone}</Text>
            </View>
          ) : null}

          {currentUser.role === 'Service Provider' && (
            <>
              {currentUser.specialization ? (
                <View style={styles.infoRow}>
                  <Feather name="tool" size={13} color={colors.mutedForeground} />
                  <Text style={[styles.infoText, { color: colors.mutedForeground }]}>{currentUser.specialization}</Text>
                </View>
              ) : null}
              {currentUser.businessName ? (
                <View style={styles.infoRow}>
                  <Feather name="briefcase" size={13} color={colors.mutedForeground} />
                  <Text style={[styles.infoText, { color: colors.mutedForeground }]}>{currentUser.businessName}</Text>
                </View>
              ) : null}
              {currentUser.experience > 0 ? (
                <View style={styles.infoRow}>
                  <Feather name="award" size={13} color={colors.mutedForeground} />
                  <Text style={[styles.infoText, { color: colors.mutedForeground }]}>{currentUser.experience} years experience</Text>
                </View>
              ) : null}

              {userRatings.length > 0 && (
                <View style={[styles.ratingRow, { borderTopColor: colors.border }]}>
                  <StarRating value={avgRatingValue} color={colors.border} />
                  <Text style={[styles.ratingText, { color: colors.mutedForeground }]}>
                    {avgRatingValue.toFixed(1)} ({userRatings.length} {userRatings.length === 1 ? 'review' : 'reviews'})
                  </Text>
                </View>
              )}
            </>
          )}
        </View>

        <View style={styles.statsRow}>
          {[
            { label: 'Questions', value: userQuestions.length, icon: 'message-square' },
            { label: 'Listings', value: userListings.length, icon: 'shopping-bag' },
            ...(currentUser.role === 'Service Provider' ? [{ label: 'Reviews', value: userRatings.length, icon: 'star' }] : []),
          ].map((stat) => (
            <View key={stat.label} style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name={stat.icon as 'star'} size={18} color={colors.primary} />
              <Text style={[styles.statValue, { color: colors.foreground }]}>{stat.value}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{stat.label}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
          onPress={() => setShowSwitchModal(true)}
        >
          <Feather name="users" size={16} color={colors.foreground} />
          <Text style={[styles.actionBtnText, { color: colors.foreground }]}>Switch Account</Text>
          <Feather name="chevron-right" size={16} color={colors.mutedForeground} style={styles.actionChevron} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.destructive + '15', borderColor: colors.destructive + '33' }]}
          onPress={logout}
        >
          <Feather name="log-out" size={16} color={colors.destructive} />
          <Text style={[styles.actionBtnText, { color: colors.destructive }]}>Sign Out</Text>
        </TouchableOpacity>

        {currentUser.role === 'Admin' && (
          <View style={styles.adminSection}>
            <View style={[styles.adminHeader, { borderColor: colors.border }]}>
              <Feather name="shield" size={16} color={colors.destructive} />
              <Text style={[styles.adminTitle, { color: colors.destructive }]}>Admin Panel</Text>
            </View>

            <View style={styles.analytics}>
              {[
                { label: 'Total Questions', value: questions.length, color: colors.primary },
                { label: 'Approved Listings', value: listings.filter((l) => l.isApproved).length, color: colors.success },
                { label: 'Pending Approvals', value: pendingListings.length, color: colors.warning },
                { label: 'Registered Users', value: users.length, color: colors.proCircle },
              ].map((stat) => (
                <View key={stat.label} style={[styles.analyticsCard, { backgroundColor: stat.color + '15', borderColor: stat.color + '33' }]}>
                  <Text style={[styles.analyticsValue, { color: stat.color }]}>{stat.value}</Text>
                  <Text style={[styles.analyticsLabel, { color: colors.mutedForeground }]}>{stat.label}</Text>
                </View>
              ))}
            </View>

            <View style={[styles.adminTabs, { borderColor: colors.border }]}>
              {(['users', 'listings', 'cms'] as const).map((tab) => (
                <TouchableOpacity
                  key={tab}
                  style={[styles.adminTab, activeAdminTab === tab && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
                  onPress={() => setActiveAdminTab(tab)}
                >
                  <Text style={[styles.adminTabText, { color: activeAdminTab === tab ? colors.primary : colors.mutedForeground }]}>
                    {tab === 'users' ? 'Users' : tab === 'listings' ? 'Listings' : 'CMS'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {activeAdminTab === 'users' && (
              <View>
                {users.filter((u) => u.role !== 'Admin').map((u) => (
                  <View key={u.id} style={[styles.adminUserItem, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}>
                    <View style={[styles.userAvatar, { backgroundColor: colors.primary + '33' }]}>
                      <Text style={[styles.userAvatarText, { color: colors.primary }]}>{u.name.charAt(0)}</Text>
                    </View>
                    <View style={styles.adminUserInfo}>
                      <View style={styles.nameRow}>
                        <Text style={[styles.adminUserName, { color: colors.foreground }]}>{u.name}</Text>
                        {u.isBanned && <View style={[styles.bannedBadge, { backgroundColor: colors.destructive }]}><Text style={styles.bannedText}>Banned</Text></View>}
                      </View>
                      <Text style={[styles.adminUserRole, { color: colors.mutedForeground }]}>{u.specialization || u.role}</Text>
                    </View>
                    <View style={styles.adminActions}>
                      {u.role === 'Service Provider' && (
                        <TouchableOpacity style={[styles.adminActionBtn, { backgroundColor: u.verified ? colors.success + '22' : colors.muted }]} onPress={() => toggleVerified(u.id, !u.verified)}>
                          <Text style={[styles.adminActionText, { color: u.verified ? colors.success : colors.mutedForeground }]}>{u.verified ? 'Verified' : 'Verify'}</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity style={[styles.adminActionBtn, { backgroundColor: u.isBanned ? colors.success + '22' : colors.destructive + '22' }]} onPress={() => handleBan(u)}>
                        <Text style={[styles.adminActionText, { color: u.isBanned ? colors.success : colors.destructive }]}>{u.isBanned ? 'Unban' : 'Ban'}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {activeAdminTab === 'listings' && (
              <View>
                {/* Featured summary pill */}
                <View style={[styles.featuredSummary, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '44' }]}>
                  <Feather name="star" size={14} color={colors.primary} />
                  <Text style={[styles.featuredSummaryText, { color: colors.primary }]}>
                    {featuredCount} listing{featuredCount !== 1 ? 's' : ''} featured on Forum ad banner
                  </Text>
                </View>

                {/* Pending listings */}
                {pendingListings.length > 0 && (
                  <>
                    <Text style={[styles.listingsSectionLabel, { color: colors.mutedForeground }]}>PENDING APPROVAL</Text>
                    {pendingListings.map((l) => (
                      <View key={l.id} style={[styles.adminListingItem, { backgroundColor: colors.surfaceVariant, borderColor: colors.warning + '55' }]}>
                        <View style={styles.adminListingInfo}>
                          <Text style={[styles.adminListingTitle, { color: colors.foreground }]} numberOfLines={1}>{l.title}</Text>
                          <Text style={[styles.adminListingMeta, { color: colors.mutedForeground }]}>by {l.userName} · {l.category}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 6 }}>
                          <TouchableOpacity style={[styles.adminActionBtn, { backgroundColor: colors.success }]} onPress={() => approveListing(l.id, true)}>
                            <Feather name="check" size={13} color="#fff" />
                          </TouchableOpacity>
                          <TouchableOpacity style={[styles.adminActionBtn, { backgroundColor: colors.destructive + 'CC' }]} onPress={() => deleteListing(l.id)}>
                            <Feather name="trash-2" size={13} color="#fff" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </>
                )}

                {/* Approved listings */}
                {approvedListings.length > 0 && (
                  <>
                    <Text style={[styles.listingsSectionLabel, { color: colors.mutedForeground, marginTop: pendingListings.length > 0 ? 14 : 0 }]}>APPROVED LISTINGS</Text>
                    {approvedListings.map((l) => (
                      <View key={l.id} style={[styles.adminListingItem, { backgroundColor: colors.surfaceVariant, borderColor: l.isFeaturedBottom ? colors.primary + '66' : colors.border }]}>
                        <View style={styles.adminListingInfo}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            {l.isFeaturedBottom && (
                              <View style={[styles.featuredBadge, { backgroundColor: colors.primary + '22' }]}>
                                <Feather name="star" size={9} color={colors.primary} />
                                <Text style={[styles.featuredBadgeText, { color: colors.primary }]}>Featured</Text>
                              </View>
                            )}
                          </View>
                          <Text style={[styles.adminListingTitle, { color: colors.foreground }]} numberOfLines={1}>{l.title}</Text>
                          <Text style={[styles.adminListingMeta, { color: colors.mutedForeground }]}>by {l.userName} · {l.category}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 6 }}>
                          <TouchableOpacity
                            style={[styles.adminActionBtn, { backgroundColor: l.isFeaturedBottom ? colors.primary : colors.muted, borderWidth: 1, borderColor: l.isFeaturedBottom ? colors.primary : colors.border }]}
                            onPress={() => featureListing(l.id, !l.isFeaturedBottom)}
                          >
                            <Feather name="star" size={13} color={l.isFeaturedBottom ? '#fff' : colors.mutedForeground} />
                          </TouchableOpacity>
                          <TouchableOpacity style={[styles.adminActionBtn, { backgroundColor: colors.destructive + 'CC' }]} onPress={() => deleteListing(l.id)}>
                            <Feather name="trash-2" size={13} color="#fff" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </>
                )}

                {pendingListings.length === 0 && approvedListings.length === 0 && (
                  <View style={[styles.adminEmpty, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                    <Feather name="shopping-bag" size={18} color={colors.mutedForeground} />
                    <Text style={[styles.adminEmptyText, { color: colors.mutedForeground }]}>No listings yet</Text>
                  </View>
                )}
              </View>
            )}

            {activeAdminTab === 'cms' && (
              <View style={[styles.cmsCard, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}>
                <View style={styles.cmsToggleRow}>
                  <Text style={[styles.cmsLabel, { color: colors.foreground }]}>Announcement Banner</Text>
                  <Switch
                    value={cmsConfig.announcementActive}
                    onValueChange={(v) => updateCmsConfig({ announcementActive: v })}
                    trackColor={{ false: colors.muted, true: colors.primary + '88' }}
                    thumbColor={cmsConfig.announcementActive ? colors.primary : colors.mutedForeground}
                  />
                </View>
                <TextInput
                  style={[styles.cmsInput, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]}
                  value={editAnnouncement}
                  onChangeText={setEditAnnouncement}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
                <TouchableOpacity
                  style={[styles.cmsBtn, { backgroundColor: colors.primary }]}
                  onPress={handleSaveAnnouncement}
                >
                  <Text style={[styles.cmsBtnText, { color: colors.primaryForeground }]}>Save Announcement</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal visible={showSwitchModal} animationType="fade" transparent onRequestClose={() => setShowSwitchModal(false)}>
        <Pressable style={styles.overlay} onPress={() => setShowSwitchModal(false)} />
        <View style={[styles.switchSheet, { backgroundColor: colors.card }]}>
          <Text style={[styles.switchTitle, { color: colors.foreground }]}>Switch Account</Text>
          {users.map((u) => (
            <TouchableOpacity
              key={u.id}
              style={[styles.switchItem, { backgroundColor: u.id === currentUser?.id ? colors.primary + '22' : 'transparent', borderColor: u.id === currentUser?.id ? colors.primary : colors.border }]}
              onPress={() => { login(u.id); setShowSwitchModal(false); }}
            >
              <View style={[styles.userAvatar, { backgroundColor: colors.primary + '33' }]}>
                <Text style={[styles.userAvatarText, { color: colors.primary }]}>{u.name.charAt(0)}</Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={[styles.userName, { color: colors.foreground }]}>{u.name}</Text>
                <Text style={[styles.userRole, { color: colors.mutedForeground }]}>{u.role}</Text>
              </View>
              {u.id === currentUser?.id && <Feather name="check" size={16} color={colors.primary} />}
            </TouchableOpacity>
          ))}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  guestContent: { paddingHorizontal: 16, paddingTop: 20 },
  guestCard: { borderRadius: 12, borderWidth: 1, padding: 20, alignItems: 'center', gap: 10, marginBottom: 24 },
  guestAvatar: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  guestTitle: { fontSize: 18, fontWeight: '700' },
  guestDesc: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  sectionTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 10 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16 },
  profileCard: { borderRadius: 12, borderWidth: 1, padding: 16, marginBottom: 12 },
  bigAvatar: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 10 },
  bigAvatarText: { fontSize: 24, fontWeight: '700' },
  profileMain: { alignItems: 'center', gap: 6, marginBottom: 10 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  profileName: { fontSize: 20, fontWeight: '700' },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  verifiedText: { fontSize: 11, fontWeight: '600' },
  roleBadge: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  roleText: { fontSize: 12, fontWeight: '600' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  infoText: { fontSize: 13 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, paddingTop: 10, borderTopWidth: 1 },
  ratingText: { fontSize: 12 },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  statCard: { flex: 1, borderRadius: 10, borderWidth: 1, padding: 12, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 22, fontWeight: '700' },
  statLabel: { fontSize: 11 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 10, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 13, marginBottom: 8 },
  actionBtnText: { flex: 1, fontSize: 14, fontWeight: '600' },
  actionChevron: { marginLeft: 'auto' },
  adminSection: { marginTop: 12 },
  adminHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 14, borderBottomWidth: 1, marginBottom: 14 },
  adminTitle: { fontSize: 16, fontWeight: '700' },
  analytics: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  analyticsCard: { flex: 1, minWidth: '45%', borderRadius: 10, borderWidth: 1, padding: 12 },
  analyticsValue: { fontSize: 26, fontWeight: '700' },
  analyticsLabel: { fontSize: 11, marginTop: 2 },
  adminTabs: { flexDirection: 'row', borderBottomWidth: 1, marginBottom: 14 },
  adminTab: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  adminTabText: { fontSize: 13, fontWeight: '600' },
  adminUserItem: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 10, borderWidth: 1, padding: 10, marginBottom: 6 },
  adminUserInfo: { flex: 1 },
  adminUserName: { fontSize: 14, fontWeight: '600' },
  adminUserRole: { fontSize: 12, marginTop: 2 },
  bannedBadge: { borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  bannedText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  adminActions: { flexDirection: 'row', gap: 6 },
  adminActionBtn: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
  adminActionText: { fontSize: 11, fontWeight: '600' },
  adminEmpty: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, borderWidth: 1, padding: 12 },
  adminEmptyText: { fontSize: 14, fontWeight: '500' },
  adminListingItem: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 10, borderWidth: 1, padding: 10, marginBottom: 6 },
  adminListingInfo: { flex: 1 },
  adminListingTitle: { fontSize: 13, fontWeight: '600' },
  adminListingMeta: { fontSize: 11, marginTop: 2 },
  approveBtn: { borderRadius: 6, paddingHorizontal: 12, paddingVertical: 7 },
  approveBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  featuredSummary: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 8, borderWidth: 1, padding: 10, marginBottom: 12 },
  featuredSummaryText: { fontSize: 13, fontWeight: '600' },
  listingsSectionLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8, marginBottom: 6 },
  featuredBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, marginBottom: 2 },
  featuredBadgeText: { fontSize: 10, fontWeight: '700' },
  cmsCard: { borderRadius: 10, borderWidth: 1, padding: 14, gap: 10 },
  cmsToggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cmsLabel: { fontSize: 14, fontWeight: '600' },
  cmsInput: { borderRadius: 8, borderWidth: 1, padding: 10, fontSize: 13, minHeight: 70 },
  cmsBtn: { borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  cmsBtnText: { fontSize: 13, fontWeight: '700' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  switchSheet: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40, gap: 8 },
  switchTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  switchItem: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 10, borderWidth: 1, padding: 12 },
  userItem: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 10, borderWidth: 1, padding: 12, marginBottom: 8 },
  userAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  userAvatarText: { fontSize: 14, fontWeight: '700' },
  userInfo: { flex: 1 },
  userName: { fontSize: 14, fontWeight: '600' },
  userRole: { fontSize: 12, marginTop: 2 },
});
