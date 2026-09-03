import { Feather } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
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

import { useApp } from '@/context/AppContext';
import type { AnalyticsState, User, UserRole } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import {
  exportActivitiesReport,
  exportAnalyticsReport,
  exportListingsReport,
  exportUsersReport,
} from '@/utils/exportUtils';
import { useTabBarScrollHandler } from '@/hooks/useTabBarVisibility';

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

type AnalyticsPeriod = 'all' | '30d' | '7d';

function formatMetric(value: number) {
  return value.toLocaleString();
}

function formatAnalyticsDate(timestamp: number) {
  if (!timestamp) return 'No visits yet';
  return new Date(timestamp).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function AnalyticsDashboard({
  colors,
  analytics,
  users,
  questions,
  answers,
  comments,
  discussions,
  discussionComments,
  listings,
  ratings,
  messages,
}: {
  colors: ReturnType<typeof useColors>;
  analytics: AnalyticsState;
  users: User[];
  questions: ReturnType<typeof useApp>['questions'];
  answers: ReturnType<typeof useApp>['answers'];
  comments: ReturnType<typeof useApp>['comments'];
  discussions: ReturnType<typeof useApp>['discussions'];
  discussionComments: ReturnType<typeof useApp>['discussionComments'];
  listings: ReturnType<typeof useApp>['listings'];
  ratings: ReturnType<typeof useApp>['ratings'];
  messages: ReturnType<typeof useApp>['messages'];
}) {
  const [period, setPeriod] = useState<AnalyticsPeriod>('30d');
  const colorsForAnalytics = colors;

  const traffic = useMemo(() => {
    const cutoff = period === 'all' ? 0 : Date.now() - (period === '7d' ? 7 : 30) * 86400000;
    const pageEvents = analytics.events.filter((event) => event.type === 'page_view' && event.timestamp >= cutoff);
    const counts = period === 'all'
      ? Object.entries(analytics.pageVisits)
      : Object.entries(pageEvents.reduce<Record<string, number>>((acc, event) => {
          acc[event.page] = (acc[event.page] ?? 0) + 1;
          return acc;
        }, {}));
    const sortedPages = counts.sort(([, a], [, b]) => b - a);
    return {
      pageVisits: sortedPages.reduce((sum, [, visits]) => sum + visits, 0),
      sessions: period === 'all'
        ? analytics.sessionCount
        : analytics.events.filter((event) => event.type === 'session_start' && event.timestamp >= cutoff).length,
      pages: sortedPages,
      activePages: sortedPages.filter(([, visits]) => visits > 0).length,
    };
  }, [analytics, period]);

  const answeredQuestions = questions.filter((question) => answers.some((answer) => answer.questionId === question.id)).length;
  const acceptedQuestions = questions.filter((question) => question.acceptedAnswerId > 0).length;
  const verifiedProviders = users.filter((user) => user.role === 'Service Provider' && user.verified).length;
  const serviceProviders = users.filter((user) => user.role === 'Service Provider').length;
  const approvedListings = listings.filter((listing) => listing.isApproved).length;
  const totalListingValue = listings
    .filter((listing) => listing.isApproved)
    .reduce((sum, listing) => sum + listing.price, 0);
  const interactionCount = answers.length + comments.length + discussionComments.length + messages.length + ratings.length;
  const maxPageVisits = traffic.pages[0]?.[1] ?? 1;

  const roleBreakdown = [
    { label: 'Car owners', value: users.filter((user) => user.role === 'Car Owner').length, color: colorsForAnalytics.primary },
    { label: 'Service providers', value: serviceProviders, color: colorsForAnalytics.proCircle },
    { label: 'Admins', value: users.filter((user) => user.role === 'Admin').length, color: colorsForAnalytics.destructive },
  ];

  const contributorRows = users
    .map((user) => ({
      name: user.name,
      score:
        questions.filter((question) => question.userId === user.id).length * 3 +
        answers.filter((answer) => answer.userId === user.id).length * 2 +
        listings.filter((listing) => listing.userId === user.id).length,
    }))
    .filter((user) => user.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  return (
    <View style={styles.dashboard}>
      <View style={styles.dashboardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.dashboardTitle, { color: colorsForAnalytics.foreground }]}>Platform analytics</Text>
          <Text style={[styles.dashboardSubtitle, { color: colorsForAnalytics.mutedForeground }]}>
            Live product health and traffic from this app
          </Text>
        </View>
        <View style={[styles.livePill, { backgroundColor: colorsForAnalytics.success + '18' }]}>
          <View style={[styles.liveDot, { backgroundColor: colorsForAnalytics.success }]} />
          <Text style={[styles.livePillText, { color: colorsForAnalytics.success }]}>Live</Text>
        </View>
      </View>

      <View style={[styles.periodPicker, { backgroundColor: colorsForAnalytics.muted, borderColor: colorsForAnalytics.border }]}>
        {([
          { key: '7d', label: '7 days' },
          { key: '30d', label: '30 days' },
          { key: 'all', label: 'All time' },
        ] as const).map((option) => (
          <TouchableOpacity
            key={option.key}
            style={[
              styles.periodOption,
              period === option.key && { backgroundColor: colorsForAnalytics.card, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
            ]}
            onPress={() => setPeriod(option.key)}
          >
            <Text style={[styles.periodOptionText, { color: period === option.key ? colorsForAnalytics.primary : colorsForAnalytics.mutedForeground }]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.dashboardMetricGrid}>
        {[
          { label: 'Page visits', value: traffic.pageVisits, icon: 'eye' as const, color: colorsForAnalytics.primary },
          { label: 'Sessions', value: traffic.sessions, icon: 'activity' as const, color: colorsForAnalytics.proCircle },
          { label: 'Active pages', value: traffic.activePages, icon: 'layers' as const, color: colorsForAnalytics.success },
          { label: 'Members', value: users.length, icon: 'users' as const, color: colorsForAnalytics.warning },
        ].map((metric) => (
          <View key={metric.label} style={[styles.dashboardMetric, { backgroundColor: metric.color + '12', borderColor: metric.color + '30' }]}>
            <View style={[styles.metricIcon, { backgroundColor: metric.color + '20' }]}>
              <Feather name={metric.icon} size={14} color={metric.color} />
            </View>
            <Text style={[styles.dashboardMetricValue, { color: metric.color }]}>{formatMetric(metric.value)}</Text>
            <Text style={[styles.dashboardMetricLabel, { color: colorsForAnalytics.mutedForeground }]}>{metric.label}</Text>
          </View>
        ))}
      </View>

      <View style={[styles.dashboardCard, { backgroundColor: colorsForAnalytics.surfaceVariant, borderColor: colorsForAnalytics.border }]}>
        <View style={styles.cardHeadingRow}>
          <View>
            <Text style={[styles.cardHeading, { color: colorsForAnalytics.foreground }]}>Page visits</Text>
            <Text style={[styles.cardCaption, { color: colorsForAnalytics.mutedForeground }]}>
              Most visited screens · {period === 'all' ? 'all time' : period === '7d' ? 'last 7 days' : 'last 30 days'}
            </Text>
          </View>
          <Feather name="bar-chart-2" size={17} color={colorsForAnalytics.primary} />
        </View>
        {traffic.pages.length === 0 ? (
          <View style={styles.emptyAnalytics}>
            <Feather name="bar-chart" size={17} color={colorsForAnalytics.mutedForeground} />
            <Text style={[styles.emptyAnalyticsText, { color: colorsForAnalytics.mutedForeground }]}>Visits will appear as people use the app.</Text>
          </View>
        ) : (
          traffic.pages.slice(0, 5).map(([page, visits]) => (
            <View key={page} style={styles.pageRow}>
              <View style={styles.pageRowTop}>
                <Text style={[styles.pageName, { color: colorsForAnalytics.foreground }]} numberOfLines={1}>{page}</Text>
                <Text style={[styles.pageVisits, { color: colorsForAnalytics.mutedForeground }]}>{formatMetric(visits)}</Text>
              </View>
              <View style={[styles.pageTrack, { backgroundColor: colorsForAnalytics.border }]}>
                <View style={[styles.pageFill, { width: `${Math.max(8, (visits / maxPageVisits) * 100)}%`, backgroundColor: colorsForAnalytics.primary }]} />
              </View>
            </View>
          ))
        )}
      </View>

      <View style={[styles.dashboardCard, { backgroundColor: colorsForAnalytics.surfaceVariant, borderColor: colorsForAnalytics.border }]}>
        <View style={styles.cardHeadingRow}>
          <View>
            <Text style={[styles.cardHeading, { color: colorsForAnalytics.foreground }]}>Platform health</Text>
            <Text style={[styles.cardCaption, { color: colorsForAnalytics.mutedForeground }]}>Key operating parameters</Text>
          </View>
          <Feather name="activity" size={17} color={colorsForAnalytics.success} />
        </View>
        <View style={styles.healthGrid}>
          {[
            { label: 'Questions', value: questions.length },
            { label: 'Answered', value: answeredQuestions },
            { label: 'Accepted', value: acceptedQuestions },
            { label: 'Answers', value: answers.length },
            { label: 'Discussions', value: discussions.length },
            { label: 'Comments', value: comments.length + discussionComments.length },
            { label: 'Messages', value: messages.length },
            { label: 'Ratings', value: ratings.length },
            { label: 'Listings', value: listings.length },
            { label: 'Approved', value: approvedListings },
            { label: 'Verified providers', value: verifiedProviders },
            { label: 'Banned users', value: users.filter((user) => user.isBanned).length },
          ].map((metric) => (
            <View key={metric.label} style={[styles.healthItem, { borderColor: colorsForAnalytics.border }]}>
              <Text style={[styles.healthValue, { color: colorsForAnalytics.foreground }]}>{formatMetric(metric.value)}</Text>
              <Text style={[styles.healthLabel, { color: colorsForAnalytics.mutedForeground }]} numberOfLines={1}>{metric.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.splitAnalyticsRow}>
        <View style={[styles.dashboardCard, styles.splitCard, { backgroundColor: colorsForAnalytics.surfaceVariant, borderColor: colorsForAnalytics.border }]}>
          <View style={styles.cardHeadingRow}>
            <Text style={[styles.cardHeading, { color: colorsForAnalytics.foreground }]}>Audience</Text>
            <Feather name="users" size={16} color={colorsForAnalytics.proCircle} />
          </View>
          {roleBreakdown.map((role) => (
            <View key={role.label} style={styles.breakdownRow}>
              <View style={styles.breakdownLabelRow}>
                <Text style={[styles.breakdownLabel, { color: colorsForAnalytics.mutedForeground }]}>{role.label}</Text>
                <Text style={[styles.breakdownValue, { color: colorsForAnalytics.foreground }]}>{role.value}</Text>
              </View>
              <View style={[styles.pageTrack, { backgroundColor: colorsForAnalytics.border }]}>
                <View style={[styles.pageFill, { width: `${users.length ? Math.max(4, (role.value / users.length) * 100) : 0}%`, backgroundColor: role.color }]} />
              </View>
            </View>
          ))}
        </View>

        <View style={[styles.dashboardCard, styles.splitCard, { backgroundColor: colorsForAnalytics.surfaceVariant, borderColor: colorsForAnalytics.border }]}>
          <View style={styles.cardHeadingRow}>
            <Text style={[styles.cardHeading, { color: colorsForAnalytics.foreground }]}>Conversion signals</Text>
            <Feather name="trending-up" size={16} color={colorsForAnalytics.success} />
          </View>
          {[
            { label: 'Questions answered', value: questions.length ? `${Math.round((answeredQuestions / questions.length) * 100)}%` : '0%' },
            { label: 'Accepted answers', value: questions.length ? `${Math.round((acceptedQuestions / questions.length) * 100)}%` : '0%' },
            { label: 'Provider verification', value: serviceProviders ? `${Math.round((verifiedProviders / serviceProviders) * 100)}%` : '0%' },
            { label: 'Listing approval', value: listings.length ? `${Math.round((approvedListings / listings.length) * 100)}%` : '0%' },
          ].map((metric) => (
            <View key={metric.label} style={styles.signalRow}>
              <Text style={[styles.breakdownLabel, { color: colorsForAnalytics.mutedForeground }]}>{metric.label}</Text>
              <Text style={[styles.signalValue, { color: colorsForAnalytics.success }]}>{metric.value}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={[styles.dashboardCard, { backgroundColor: colorsForAnalytics.surfaceVariant, borderColor: colorsForAnalytics.border }]}>
        <View style={styles.cardHeadingRow}>
          <View>
            <Text style={[styles.cardHeading, { color: colorsForAnalytics.foreground }]}>Business snapshot</Text>
            <Text style={[styles.cardCaption, { color: colorsForAnalytics.mutedForeground }]}>Activity and marketplace value</Text>
          </View>
          <Feather name="briefcase" size={17} color={colorsForAnalytics.warning} />
        </View>
        <View style={styles.snapshotGrid}>
          <View style={styles.snapshotItem}>
            <Text style={[styles.snapshotValue, { color: colorsForAnalytics.foreground }]}>{formatMetric(interactionCount)}</Text>
            <Text style={[styles.snapshotLabel, { color: colorsForAnalytics.mutedForeground }]}>Interactions</Text>
          </View>
          <View style={styles.snapshotItem}>
            <Text style={[styles.snapshotValue, { color: colorsForAnalytics.foreground }]}>₦{totalListingValue.toLocaleString()}</Text>
            <Text style={[styles.snapshotLabel, { color: colorsForAnalytics.mutedForeground }]}>Approved listing value</Text>
          </View>
          <View style={styles.snapshotItem}>
            <Text style={[styles.snapshotValue, { color: colorsForAnalytics.foreground }]}>{ratings.length ? avgRating(ratings).toFixed(1) : '0.0'}</Text>
            <Text style={[styles.snapshotLabel, { color: colorsForAnalytics.mutedForeground }]}>Average rating</Text>
          </View>
          <View style={styles.snapshotItem}>
            <Text style={[styles.snapshotValue, { color: colorsForAnalytics.foreground }]}>{formatAnalyticsDate(analytics.lastVisitAt)}</Text>
            <Text style={[styles.snapshotLabel, { color: colorsForAnalytics.mutedForeground }]}>Last visit captured</Text>
          </View>
        </View>
      </View>

      {contributorRows.length > 0 && (
        <View style={[styles.dashboardCard, { backgroundColor: colorsForAnalytics.surfaceVariant, borderColor: colorsForAnalytics.border }]}>
          <View style={styles.cardHeadingRow}>
            <Text style={[styles.cardHeading, { color: colorsForAnalytics.foreground }]}>Top contributors</Text>
            <Feather name="award" size={17} color={colorsForAnalytics.warning} />
          </View>
          {contributorRows.map((contributor, index) => (
            <View key={contributor.name} style={styles.contributorRow}>
              <View style={[styles.rankBubble, { backgroundColor: colorsForAnalytics.warning + '20' }]}>
                <Text style={[styles.rankText, { color: colorsForAnalytics.warning }]}>{index + 1}</Text>
              </View>
              <Text style={[styles.contributorName, { color: colorsForAnalytics.foreground }]}>{contributor.name}</Text>
              <Text style={[styles.contributorScore, { color: colorsForAnalytics.mutedForeground }]}>{contributor.score} pts</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export default function ProfileScreen() {
  const colors = useColors();
  const handleScroll = useTabBarScrollHandler();
  const { users, currentUser, login, logout, questions, answers, comments, discussions, discussionComments, listings, ratings, messages, analytics, toggleVerified, banUser, approveListing, featureListing, deleteListing, updateCmsConfig, cmsConfig, isLoading, adminAddUser, adminUpdateUser, adminDeleteUser, editProfile, adminToggleWhatsApp } = useApp();

  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [activeAdminTab, setActiveAdminTab] = useState<'users' | 'listings' | 'cms' | 'export'>('users');
  const [logoUploading, setLogoUploading] = useState<'forum' | 'loader' | null>(null);

  const pickLogo = async (field: 'forumLogoUri' | 'loaderLogoUri') => {
    const key = field === 'forumLogoUri' ? 'forum' : 'loader';
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your photo library to upload a logo.');
      return;
    }
    setLogoUploading(key as 'forum' | 'loader');
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.4,
        base64: true,
      });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const uri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
        updateCmsConfig({ [field]: uri });
      }
    } finally {
      setLogoUploading(null);
    }
  };
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [newTagInput, setNewTagInput] = useState('');
  const [editAnnouncement, setEditAnnouncement] = useState(cmsConfig.announcementText);

  type UserForm = {
    name: string;
    email: string;
    role: UserRole;
    phone: string;
    location: string;
    specialization: string[];
    businessName: string;
    experience: string;
    verified: boolean;
  };

  const blankForm: UserForm = {
    name: '', email: '', role: 'Car Owner', phone: '', location: '',
    specialization: [], businessName: '', experience: '0', verified: false,
  };

  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userForm, setUserForm] = useState<UserForm>(blankForm);

  function openAddUser() {
    setEditingUserId(null);
    setUserForm(blankForm);
    setShowUserModal(true);
  }

  function openEditUser(u: User) {
    setEditingUserId(u.id);
    setUserForm({
      name: u.name,
      email: u.email,
      role: u.role,
      phone: u.phone ?? '',
      location: u.location ?? '',
      specialization: u.specialization ?? [],
      businessName: u.businessName ?? '',
      experience: String(u.experience ?? 0),
      verified: u.verified,
    });
    setShowUserModal(true);
  }

  function saveUserForm() {
    const name = userForm.name.trim();
    const email = userForm.email.trim().toLowerCase();
    if (!name) { Alert.alert('Validation', 'Full name is required.'); return; }
    if (!email.includes('@')) { Alert.alert('Validation', 'Enter a valid email address.'); return; }
    if (!editingUserId && users.some((u) => u.id === email)) {
      Alert.alert('Duplicate Email', 'A user with this email already exists.'); return;
    }
    const data = {
      name,
      email,
      role: userForm.role,
      phone: userForm.phone.trim(),
      location: userForm.location.trim(),
      specialization: userForm.role === 'Service Provider' ? userForm.specialization : [],
      businessName: userForm.role === 'Service Provider' ? userForm.businessName.trim() : '',
      experience: userForm.role === 'Service Provider' ? (parseInt(userForm.experience, 10) || 0) : 0,
    };
    if (editingUserId) {
      adminUpdateUser(editingUserId, { ...data, verified: userForm.role === 'Service Provider' ? userForm.verified : false });
    } else {
      adminAddUser({ ...data, id: email });
    }
    setShowUserModal(false);
  }

  function confirmDeleteUser(u: User) {
    Alert.alert(
      'Delete User',
      `Permanently delete "${u.name}"? This will also remove all their questions, answers, and listings.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => adminDeleteUser(u.id) },
      ],
    );
  }

  // ── Self-edit (one-time) ──────────────────────────────────────────
  type SelfEditForm = {
    name: string;
    phone: string;
    location: string;
    specialization: string[];
    businessName: string;
    experience: string;
  };

  const [showSelfEditModal, setShowSelfEditModal] = useState(false);
  const [selfEditForm, setSelfEditForm] = useState<SelfEditForm>({
    name: '', phone: '', location: '', specialization: [], businessName: '', experience: '0',
  });

  function openSelfEdit() {
    if (!currentUser) return;
    setSelfEditForm({
      name: currentUser.name,
      phone: currentUser.phone ?? '',
      location: currentUser.location ?? '',
      specialization: currentUser.specialization ?? [],
      businessName: currentUser.businessName ?? '',
      experience: String(currentUser.experience ?? 0),
    });
    setShowSelfEditModal(true);
  }

  function saveSelfEdit() {
    const name = selfEditForm.name.trim();
    if (!name) { Alert.alert('Required', 'Your name cannot be empty.'); return; }
    Alert.alert(
      'Confirm One-Time Edit',
      'You can only edit your profile once. This cannot be undone. Save now?',
      [
        { text: 'Go Back', style: 'cancel' },
        {
          text: 'Save Forever',
          style: 'destructive',
          onPress: () => {
            editProfile({
              name,
              phone: selfEditForm.phone.trim(),
              location: selfEditForm.location.trim(),
              specialization: selfEditForm.specialization,
              businessName: selfEditForm.businessName.trim(),
              experience: parseInt(selfEditForm.experience, 10) || 0,
            });
            setShowSelfEditModal(false);
          },
        },
      ],
    );
  }

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
        <ScrollView
          contentContainerStyle={styles.guestContent}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
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
                  {u.specialization?.length > 0 ? `${u.role} — ${u.specialization.join(', ')}` : u.role}
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

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
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
              {currentUser.specialization.length > 0 ? (
                <View style={styles.infoRow}>
                  <Feather name="tool" size={13} color={colors.mutedForeground} />
                  <Text style={[styles.infoText, { color: colors.mutedForeground }]}>{currentUser.specialization.join(', ')}</Text>
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

        {/* One-time edit profile button */}
        {currentUser.hasEditedProfile ? (
          <View style={[styles.editProfileUsed, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Feather name="lock" size={13} color={colors.mutedForeground} />
            <Text style={[styles.editProfileUsedText, { color: colors.mutedForeground }]}>Profile edit already used</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.editProfileBtn, { backgroundColor: colors.primary + '14', borderColor: colors.primary + '44' }]}
            onPress={openSelfEdit}
          >
            <Feather name="edit-3" size={15} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.editProfileBtnTitle, { color: colors.primary }]}>Edit My Profile</Text>
              <Text style={[styles.editProfileBtnSub, { color: colors.primary + 'AA' }]}>One-time only · cannot be undone</Text>
            </View>
            <Feather name="chevron-right" size={15} color={colors.primary + '88'} />
          </TouchableOpacity>
        )}

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
              {([
                { key: 'users', label: 'Users' },
                { key: 'listings', label: 'Listings' },
                { key: 'cms', label: 'CMS' },
                { key: 'export', label: 'Export' },
              ] as const).map(({ key, label }) => (
                <TouchableOpacity
                  key={key}
                  style={[styles.adminTab, activeAdminTab === key && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
                  onPress={() => setActiveAdminTab(key)}
                >
                  <Text style={[styles.adminTabText, { color: activeAdminTab === key ? colors.primary : colors.mutedForeground }]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {activeAdminTab === 'users' && (
              <View>
                {/* Add User button */}
                <TouchableOpacity
                  style={[styles.addUserBtn, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '44' }]}
                  onPress={openAddUser}
                >
                  <Feather name="user-plus" size={15} color={colors.primary} />
                  <Text style={[styles.addUserBtnText, { color: colors.primary }]}>Add New User</Text>
                </TouchableOpacity>

                {users.map((u) => (
                  <View key={u.id} style={[styles.adminUserItem, { backgroundColor: colors.surfaceVariant, borderColor: u.role === 'Admin' ? colors.destructive + '44' : colors.border }]}>
                    <View style={[styles.userAvatar, { backgroundColor: u.role === 'Admin' ? colors.destructive + '33' : colors.primary + '33' }]}>
                      <Text style={[styles.userAvatarText, { color: u.role === 'Admin' ? colors.destructive : colors.primary }]}>{u.name.charAt(0)}</Text>
                    </View>
                    <View style={styles.adminUserInfo}>
                      <View style={styles.nameRow}>
                        <Text style={[styles.adminUserName, { color: colors.foreground }]}>{u.name}</Text>
                        {u.isBanned && <View style={[styles.bannedBadge, { backgroundColor: colors.destructive }]}><Text style={styles.bannedText}>Banned</Text></View>}
                        {u.role === 'Admin' && <View style={[styles.bannedBadge, { backgroundColor: colors.destructive + 'CC' }]}><Text style={styles.bannedText}>Admin</Text></View>}
                      </View>
                      <Text style={[styles.adminUserRole, { color: colors.mutedForeground }]} numberOfLines={1}>
                        {u.specialization && u.specialization.length > 0 ? `${u.role} · ${u.specialization.join(', ')}` : u.role}
                        {u.location ? ` · ${u.location}` : ''}
                      </Text>
                    </View>
                    <View style={styles.adminActions}>
                      {u.role === 'Service Provider' && (
                        <TouchableOpacity
                          style={[styles.adminActionBtn, { backgroundColor: u.whatsappEnabled ? '#25D36622' : colors.muted }]}
                          onPress={() => adminToggleWhatsApp(u.id, !u.whatsappEnabled)}
                        >
                          <Feather name="phone" size={12} color={u.whatsappEnabled ? '#25D366' : colors.mutedForeground} />
                        </TouchableOpacity>
                      )}
                      {u.role === 'Service Provider' && (
                        <TouchableOpacity style={[styles.adminActionBtn, { backgroundColor: u.verified ? colors.success + '22' : colors.muted }]} onPress={() => toggleVerified(u.id, !u.verified)}>
                          <Feather name={u.verified ? 'check-circle' : 'circle'} size={12} color={u.verified ? colors.success : colors.mutedForeground} />
                        </TouchableOpacity>
                      )}
                      {u.role !== 'Admin' && (
                        <TouchableOpacity style={[styles.adminActionBtn, { backgroundColor: u.isBanned ? colors.success + '22' : colors.warning + '22' }]} onPress={() => handleBan(u)}>
                          <Feather name={u.isBanned ? 'unlock' : 'slash'} size={12} color={u.isBanned ? colors.success : colors.warning} />
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity style={[styles.adminActionBtn, { backgroundColor: colors.primary + '22' }]} onPress={() => openEditUser(u)}>
                        <Feather name="edit-2" size={12} color={colors.primary} />
                      </TouchableOpacity>
                      {u.id !== currentUser?.id && (
                        <TouchableOpacity style={[styles.adminActionBtn, { backgroundColor: colors.destructive + '22' }]} onPress={() => confirmDeleteUser(u)}>
                          <Feather name="trash-2" size={12} color={colors.destructive} />
                        </TouchableOpacity>
                      )}
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
              <>
                {/* Logo Management */}
                <View style={[styles.cmsCard, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}>
                  <Text style={[styles.cmsLabel, { color: colors.foreground }]}>Brand Logos</Text>
                  <Text style={[styles.cmsTagsSubtitle, { color: colors.mutedForeground }]}>
                    Upload custom logos. Tap "Change" to pick from your photo library, "Reset" to restore the default.
                  </Text>

                  {([
                    {
                      key: 'forum' as const,
                      field: 'forumLogoUri' as const,
                      label: 'Forum Header Logo',
                      desc: 'Small square shown in the Forum tab header bar.',
                      defaultEl: <View style={[styles.logoPreviewDefault, { backgroundColor: colors.primary }]} />,
                    },
                    {
                      key: 'loader' as const,
                      field: 'loaderLogoUri' as const,
                      label: 'Loading Screen Logo',
                      desc: 'Large icon shown on the splash screen when the app first opens.',
                      defaultEl: <Text style={styles.logoPreviewEmoji}>🔧</Text>,
                    },
                  ] as const).map(({ key, field, label, desc, defaultEl }) => {
                    const uri = cmsConfig[field];
                    const isUploading = logoUploading === key;
                    return (
                      <View key={key} style={[styles.logoRow, { borderTopColor: colors.border }]}>
                        <View style={[styles.logoPreviewWrap, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                          {uri ? (
                            <Image source={{ uri }} style={styles.logoPreviewImg} resizeMode="cover" />
                          ) : defaultEl}
                        </View>
                        <View style={styles.logoRowBody}>
                          <Text style={[styles.logoRowLabel, { color: colors.foreground }]}>{label}</Text>
                          <Text style={[styles.logoRowDesc, { color: colors.mutedForeground }]}>{desc}</Text>
                          <View style={styles.logoBtnRow}>
                            <TouchableOpacity
                              style={[styles.logoBtn, { backgroundColor: colors.primary }]}
                              onPress={() => pickLogo(field)}
                              disabled={isUploading}
                            >
                              <Feather name={isUploading ? 'loader' : 'upload'} size={12} color={colors.primaryForeground} />
                              <Text style={[styles.logoBtnText, { color: colors.primaryForeground }]}>
                                {isUploading ? 'Uploading…' : uri ? 'Change' : 'Upload'}
                              </Text>
                            </TouchableOpacity>
                            {uri ? (
                              <TouchableOpacity
                                style={[styles.logoBtn, { backgroundColor: colors.muted, borderWidth: 1, borderColor: colors.border }]}
                                onPress={() => updateCmsConfig({ [field]: '' })}
                              >
                                <Feather name="rotate-ccw" size={12} color={colors.mutedForeground} />
                                <Text style={[styles.logoBtnText, { color: colors.mutedForeground }]}>Reset</Text>
                              </TouchableOpacity>
                            ) : null}
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>

                {/* Page Visibility */}
                <View style={[styles.cmsCard, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}>
                  <Text style={[styles.cmsLabel, { color: colors.foreground }]}>Page Visibility</Text>
                  <Text style={[styles.cmsTagsSubtitle, { color: colors.mutedForeground }]}>
                    Hide or show pages for all users. Admins always see every page.
                  </Text>
                  {([
                    { key: 'marketplaceVisible' as const, label: 'Marketplace', desc: 'Parts, services & car sales listings' },
                    { key: 'clinicVisible' as const, label: 'AI Vehicle Clinic', desc: 'AI-powered diagnostic tool' },
                  ] as const).map(({ key, label, desc }) => (
                    <View key={key} style={[styles.cmsToggleRow, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.cmsLabel, { color: colors.foreground }]}>{label}</Text>
                        <Text style={[styles.cmsTagsSubtitle, { color: colors.mutedForeground, marginTop: 0 }]}>{desc}</Text>
                      </View>
                      <Switch
                        value={cmsConfig[key]}
                        onValueChange={(v) => updateCmsConfig({ [key]: v })}
                        trackColor={{ false: colors.muted, true: colors.primary + '88' }}
                        thumbColor={cmsConfig[key] ? colors.primary : colors.mutedForeground}
                      />
                    </View>
                  ))}
                </View>

                {/* Announcement */}
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

                {/* Specialization Tags */}
                <View style={[styles.cmsCard, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}>
                  <Text style={[styles.cmsLabel, { color: colors.foreground }]}>Specialization Tags</Text>
                  <Text style={[styles.cmsTagsSubtitle, { color: colors.mutedForeground }]}>
                    These tags appear as options when users or admins set a Service Provider's specialization.
                  </Text>

                  {/* Existing tags */}
                  <View style={styles.tagGrid}>
                    {(cmsConfig.specializationTags ?? []).map((tag) => (
                      <View
                        key={tag}
                        style={[styles.cmsTagPill, { backgroundColor: colors.muted, borderColor: colors.border }]}
                      >
                        <Text style={[styles.cmsTagPillText, { color: colors.foreground }]}>{tag}</Text>
                        <TouchableOpacity
                          hitSlop={8}
                          onPress={() =>
                            updateCmsConfig({
                              specializationTags: (cmsConfig.specializationTags ?? []).filter((t) => t !== tag),
                            })
                          }
                        >
                          <Feather name="x" size={12} color={colors.destructive} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>

                  {/* Add new tag */}
                  <View style={styles.cmsTagAddRow}>
                    <TextInput
                      style={[styles.cmsTagAddInput, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground, flex: 1 }]}
                      placeholder="New tag…"
                      placeholderTextColor={colors.mutedForeground}
                      value={newTagInput}
                      onChangeText={setNewTagInput}
                      onSubmitEditing={() => {
                        const t = newTagInput.trim();
                        if (!t || (cmsConfig.specializationTags ?? []).includes(t)) return;
                        updateCmsConfig({ specializationTags: [...(cmsConfig.specializationTags ?? []), t] });
                        setNewTagInput('');
                      }}
                      returnKeyType="done"
                    />
                    <TouchableOpacity
                      style={[styles.cmsTagAddBtn, { backgroundColor: colors.primary }]}
                      onPress={() => {
                        const t = newTagInput.trim();
                        if (!t || (cmsConfig.specializationTags ?? []).includes(t)) return;
                        updateCmsConfig({ specializationTags: [...(cmsConfig.specializationTags ?? []), t] });
                        setNewTagInput('');
                      }}
                    >
                      <Feather name="plus" size={16} color={colors.primaryForeground} />
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}

            {activeAdminTab === 'export' && (
              <View style={styles.exportSection}>
                <AnalyticsDashboard
                  colors={colors}
                  analytics={analytics}
                  users={users}
                  questions={questions}
                  answers={answers}
                  comments={comments}
                  discussions={discussions}
                  discussionComments={discussionComments}
                  listings={listings}
                  ratings={ratings}
                  messages={messages}
                />
                <Text style={[styles.exportHeading, { color: colors.mutedForeground }]}>
                  Download platform data as CSV files. Reports include the current live state and tracked page visits.
                </Text>

                {[
                  {
                    id: 'users',
                    icon: 'users' as const,
                    title: 'Users Report',
                    desc: 'All user accounts with role, verification status, ban status, activity counts, and average rating.',
                    color: colors.proCircle,
                    rows: users.length,
                    unit: 'users',
                    onExport: () => exportUsersReport(users, questions, answers, listings, ratings),
                  },
                  {
                    id: 'activities',
                    icon: 'activity' as const,
                    title: 'Activities Report',
                    desc: 'All questions, answers, marketplace listings, and provider ratings with full details.',
                    color: colors.primary,
                    rows: questions.length + answers.length + listings.length + ratings.length,
                    unit: 'records',
                    onExport: () => exportActivitiesReport(questions, answers, listings, ratings),
                  },
                  {
                    id: 'analytics',
                    icon: 'bar-chart-2' as const,
                    title: 'Analytics Summary',
                    desc: 'Platform-wide totals, engagement stats, marketplace value, top contributors, and category breakdowns.',
                    color: colors.success,
                    rows: null,
                    unit: null,
                     onExport: () => exportAnalyticsReport(users, questions, answers, listings, ratings, analytics),
                  },
                  {
                    id: 'listings',
                    icon: 'shopping-bag' as const,
                    title: 'Listings Report',
                    desc: 'Full listing details including category-specific fields, approval status, featured flag, and pricing.',
                    color: colors.warning,
                    rows: listings.length,
                    unit: 'listings',
                    onExport: () => exportListingsReport(listings),
                  },
                ].map((card) => (
                  <View
                    key={card.id}
                    style={[styles.exportCard, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}
                  >
                    <View style={[styles.exportIconWrap, { backgroundColor: card.color + '1A' }]}>
                      <Feather name={card.icon} size={20} color={card.color} />
                    </View>
                    <View style={styles.exportCardBody}>
                      <View style={styles.exportCardTop}>
                        <Text style={[styles.exportCardTitle, { color: colors.foreground }]}>{card.title}</Text>
                        {card.rows != null && (
                          <View style={[styles.exportBadge, { backgroundColor: card.color + '1A' }]}>
                            <Text style={[styles.exportBadgeText, { color: card.color }]}>
                              {card.rows} {card.unit}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.exportCardDesc, { color: colors.mutedForeground }]}>{card.desc}</Text>
                      <TouchableOpacity
                        style={[
                          styles.exportBtn,
                          { backgroundColor: exportingId === card.id ? card.color + '33' : card.color },
                        ]}
                        disabled={exportingId !== null}
                        onPress={async () => {
                          setExportingId(card.id);
                          try {
                            await card.onExport();
                          } catch (e) {
                            Alert.alert('Export Failed', 'Could not generate the export file. Please try again.');
                          } finally {
                            setExportingId(null);
                          }
                        }}
                      >
                        {exportingId === card.id ? (
                          <Text style={[styles.exportBtnText, { color: '#fff' }]}>Generating…</Text>
                        ) : (
                          <>
                            <Feather name="download" size={13} color="#fff" />
                            <Text style={[styles.exportBtnText, { color: '#fff' }]}>Download CSV</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
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

      {/* ── One-Time Self-Edit Modal ── */}
      <Modal visible={showSelfEditModal} animationType="slide" transparent onRequestClose={() => setShowSelfEditModal(false)}>
        <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setShowSelfEditModal(false)} />
          <View style={[styles.userModalSheet, { backgroundColor: colors.card }]}>
            <View style={[styles.userModalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.userModalTitle, { color: colors.foreground }]}>Edit My Profile</Text>
              <TouchableOpacity onPress={() => setShowSelfEditModal(false)}>
                <Feather name="x" size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            {/* One-time warning banner */}
            <View style={[styles.oneTimeWarning, { backgroundColor: colors.warning + '18', borderColor: colors.warning + '44' }]}>
              <Feather name="alert-triangle" size={14} color={colors.warning} />
              <Text style={[styles.oneTimeWarningText, { color: colors.warning }]}>
                This is your one and only profile edit. Once saved, this option is gone permanently.
              </Text>
            </View>

            <ScrollView style={styles.userModalBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Full Name *</Text>
              <TextInput
                style={[styles.fieldInput, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]}
                placeholder="Your full name"
                placeholderTextColor={colors.mutedForeground}
                value={selfEditForm.name}
                onChangeText={(v) => setSelfEditForm((f) => ({ ...f, name: v }))}
              />

              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Phone Number</Text>
              <TextInput
                style={[styles.fieldInput, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]}
                placeholder="+2348001234567"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="phone-pad"
                value={selfEditForm.phone}
                onChangeText={(v) => setSelfEditForm((f) => ({ ...f, phone: v }))}
              />

              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Location</Text>
              <TextInput
                style={[styles.fieldInput, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]}
                placeholder="e.g. Ikeja, Lagos"
                placeholderTextColor={colors.mutedForeground}
                value={selfEditForm.location}
                onChangeText={(v) => setSelfEditForm((f) => ({ ...f, location: v }))}
              />

              {currentUser?.role === 'Service Provider' && (
                <>
                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Specialization</Text>
                  <View style={styles.tagGrid}>
                    {(cmsConfig.specializationTags ?? []).map((tag) => {
                      const selected = selfEditForm.specialization.includes(tag);
                      return (
                        <TouchableOpacity
                          key={tag}
                          style={[styles.tagChip, { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primary + '18' : colors.muted }]}
                          onPress={() => setSelfEditForm((f) => ({
                            ...f,
                            specialization: selected
                              ? f.specialization.filter((t) => t !== tag)
                              : [...f.specialization, tag],
                          }))}
                        >
                          {selected && <Feather name="check" size={11} color={colors.primary} />}
                          <Text style={[styles.tagChipText, { color: selected ? colors.primary : colors.mutedForeground }]}>{tag}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Business Name</Text>
                  <TextInput
                    style={[styles.fieldInput, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]}
                    placeholder="e.g. BelloAuto Garage"
                    placeholderTextColor={colors.mutedForeground}
                    value={selfEditForm.businessName}
                    onChangeText={(v) => setSelfEditForm((f) => ({ ...f, businessName: v }))}
                  />

                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Years of Experience</Text>
                  <TextInput
                    style={[styles.fieldInput, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]}
                    placeholder="0"
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType="numeric"
                    value={selfEditForm.experience}
                    onChangeText={(v) => setSelfEditForm((f) => ({ ...f, experience: v.replace(/[^0-9]/g, '') }))}
                  />
                </>
              )}
              <View style={{ height: 16 }} />
            </ScrollView>

            <View style={[styles.userModalFooter, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.userModalCancelBtn, { borderColor: colors.border }]}
                onPress={() => setShowSelfEditModal(false)}
              >
                <Text style={[styles.userModalCancelText, { color: colors.mutedForeground }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.userModalSaveBtn, { backgroundColor: colors.warning }]}
                onPress={saveSelfEdit}
              >
                <Feather name="save" size={14} color="#fff" />
                <Text style={[styles.userModalSaveText, { color: '#fff' }]}>Save Profile</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── User Add / Edit Modal ── */}
      <Modal visible={showUserModal} animationType="slide" transparent onRequestClose={() => setShowUserModal(false)}>
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setShowUserModal(false)} />
          <View style={[styles.userModalSheet, { backgroundColor: colors.card }]}>
            {/* Header */}
            <View style={[styles.userModalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.userModalTitle, { color: colors.foreground }]}>
                {editingUserId ? 'Edit User' : 'Add New User'}
              </Text>
              <TouchableOpacity onPress={() => setShowUserModal(false)}>
                <Feather name="x" size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.userModalBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Full Name */}
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Full Name *</Text>
              <TextInput
                style={[styles.fieldInput, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]}
                placeholder="e.g. Ade Bello"
                placeholderTextColor={colors.mutedForeground}
                value={userForm.name}
                onChangeText={(v) => setUserForm((f) => ({ ...f, name: v }))}
              />

              {/* Email */}
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Email Address * {editingUserId ? '(cannot change)' : ''}</Text>
              <TextInput
                style={[styles.fieldInput, { backgroundColor: editingUserId ? colors.muted + '88' : colors.muted, borderColor: colors.border, color: editingUserId ? colors.mutedForeground : colors.foreground }]}
                placeholder="user@example.com"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!editingUserId}
                value={userForm.email}
                onChangeText={(v) => setUserForm((f) => ({ ...f, email: v }))}
              />

              {/* Role */}
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Role *</Text>
              <View style={styles.rolePicker}>
                {(['Car Owner', 'Service Provider', 'Admin'] as UserRole[]).map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[
                      styles.roleOption,
                      { borderColor: userForm.role === r ? colors.primary : colors.border, backgroundColor: userForm.role === r ? colors.primary + '18' : colors.muted },
                    ]}
                    onPress={() => setUserForm((f) => ({ ...f, role: r }))}
                  >
                    <Text style={[styles.roleOptionText, { color: userForm.role === r ? colors.primary : colors.mutedForeground }]}>{r}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Phone */}
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Phone Number</Text>
              <TextInput
                style={[styles.fieldInput, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]}
                placeholder="+2348001234567"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="phone-pad"
                value={userForm.phone}
                onChangeText={(v) => setUserForm((f) => ({ ...f, phone: v }))}
              />

              {/* Location */}
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Location / Workspace Coordinates</Text>
              <TextInput
                style={[styles.fieldInput, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]}
                placeholder="e.g. Victoria Island, Lagos"
                placeholderTextColor={colors.mutedForeground}
                value={userForm.location}
                onChangeText={(v) => setUserForm((f) => ({ ...f, location: v }))}
              />

              {/* Service Provider fields */}
              {userForm.role === 'Service Provider' && (
                <>
                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Specialization</Text>
                  <View style={styles.tagGrid}>
                    {(cmsConfig.specializationTags ?? []).map((tag) => {
                      const selected = userForm.specialization.includes(tag);
                      return (
                        <TouchableOpacity
                          key={tag}
                          style={[styles.tagChip, { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primary + '18' : colors.muted }]}
                          onPress={() => setUserForm((f) => ({
                            ...f,
                            specialization: selected
                              ? f.specialization.filter((t) => t !== tag)
                              : [...f.specialization, tag],
                          }))}
                        >
                          {selected && <Feather name="check" size={11} color={colors.primary} />}
                          <Text style={[styles.tagChipText, { color: selected ? colors.primary : colors.mutedForeground }]}>{tag}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Business Name</Text>
                  <TextInput
                    style={[styles.fieldInput, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]}
                    placeholder="e.g. BelloAuto Garage"
                    placeholderTextColor={colors.mutedForeground}
                    value={userForm.businessName}
                    onChangeText={(v) => setUserForm((f) => ({ ...f, businessName: v }))}
                  />

                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Years of Experience</Text>
                  <TextInput
                    style={[styles.fieldInput, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]}
                    placeholder="0"
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType="numeric"
                    value={userForm.experience}
                    onChangeText={(v) => setUserForm((f) => ({ ...f, experience: v.replace(/[^0-9]/g, '') }))}
                  />

                  <View style={styles.verifiedToggleRow}>
                    <View>
                      <Text style={[styles.fieldLabel, { color: colors.mutedForeground, marginBottom: 2 }]}>Verified Provider</Text>
                      <Text style={[styles.verifiedToggleSub, { color: colors.mutedForeground }]}>Shows verified badge on their profile</Text>
                    </View>
                    <Switch
                      value={userForm.verified}
                      onValueChange={(v) => setUserForm((f) => ({ ...f, verified: v }))}
                      trackColor={{ false: colors.muted, true: colors.success + '88' }}
                      thumbColor={userForm.verified ? colors.success : colors.mutedForeground}
                    />
                  </View>
                </>
              )}

              <View style={{ height: 16 }} />
            </ScrollView>

            {/* Footer buttons */}
            <View style={[styles.userModalFooter, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.userModalCancelBtn, { borderColor: colors.border }]}
                onPress={() => setShowUserModal(false)}
              >
                <Text style={[styles.userModalCancelText, { color: colors.mutedForeground }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.userModalSaveBtn, { backgroundColor: colors.primary }]}
                onPress={saveUserForm}
              >
                <Feather name={editingUserId ? 'save' : 'user-plus'} size={14} color={colors.primaryForeground} />
                <Text style={[styles.userModalSaveText, { color: colors.primaryForeground }]}>
                  {editingUserId ? 'Save Changes' : 'Create User'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
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
  cmsCard: { borderRadius: 10, borderWidth: 1, padding: 14, gap: 10, marginBottom: 10 },
  logoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingTop: 12, borderTopWidth: 1 },
  logoPreviewWrap: { width: 56, height: 56, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  logoPreviewDefault: { width: 34, height: 34, borderRadius: 6 },
  logoPreviewEmoji: { fontSize: 26 },
  logoPreviewImg: { width: 56, height: 56, borderRadius: 10 },
  logoRowBody: { flex: 1, gap: 4 },
  logoRowLabel: { fontSize: 13, fontWeight: '600' },
  logoRowDesc: { fontSize: 11, lineHeight: 15 },
  logoBtnRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  logoBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 7, paddingVertical: 6, paddingHorizontal: 10 },
  logoBtnText: { fontSize: 12, fontWeight: '600' },
  cmsToggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cmsLabel: { fontSize: 14, fontWeight: '600' },
  cmsTagsSubtitle: { fontSize: 12, marginTop: -4 },
  cmsInput: { borderRadius: 8, borderWidth: 1, padding: 10, fontSize: 13, minHeight: 70 },
  cmsBtn: { borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  cmsBtnText: { fontSize: 13, fontWeight: '700' },
  cmsTagPill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  cmsTagPillText: { fontSize: 13, fontWeight: '500' },
  cmsTagAddRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cmsTagAddInput: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13 },
  cmsTagAddBtn: { borderRadius: 8, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  tagGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagChip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  tagChipText: { fontSize: 13, fontWeight: '500' },
  editProfileBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 12 },
  editProfileBtnTitle: { fontSize: 14, fontWeight: '700' },
  editProfileBtnSub: { fontSize: 11, marginTop: 1 },
  editProfileUsed: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12 },
  editProfileUsedText: { fontSize: 13, fontWeight: '500' },
  oneTimeWarning: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderWidth: 1, marginHorizontal: 20, marginTop: 14, borderRadius: 10, padding: 12 },
  oneTimeWarningText: { flex: 1, fontSize: 13, lineHeight: 18, fontWeight: '500' },
  addUserBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 11, marginBottom: 10 },
  addUserBtnText: { fontSize: 14, fontWeight: '700' },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end' },
  userModalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' },
  userModalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  userModalTitle: { fontSize: 18, fontWeight: '700' },
  userModalBody: { paddingHorizontal: 20, paddingTop: 16 },
  fieldLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, marginBottom: 6, marginTop: 12 },
  fieldInput: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14 },
  rolePicker: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  roleOption: { borderRadius: 8, borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 8, flexShrink: 1 },
  roleOptionText: { fontSize: 13, fontWeight: '600' },
  verifiedToggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 },
  verifiedToggleSub: { fontSize: 12 },
  userModalFooter: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1 },
  userModalCancelBtn: { flex: 1, borderRadius: 10, borderWidth: 1, alignItems: 'center', paddingVertical: 12 },
  userModalCancelText: { fontSize: 14, fontWeight: '600' },
  userModalSaveBtn: { flex: 2, flexDirection: 'row', borderRadius: 10, alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12 },
  userModalSaveText: { fontSize: 14, fontWeight: '700' },
  exportSection: { gap: 10 },
  exportHeading: { fontSize: 12, lineHeight: 17, marginBottom: 4 },
  dashboard: { gap: 10, marginBottom: 8 },
  dashboardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  dashboardTitle: { fontSize: 17, fontWeight: '700' },
  dashboardSubtitle: { fontSize: 11, lineHeight: 16, marginTop: 2 },
  livePill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingHorizontal: 9, paddingVertical: 5 },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  livePillText: { fontSize: 11, fontWeight: '700' },
  periodPicker: { flexDirection: 'row', borderWidth: 1, borderRadius: 9, padding: 3, gap: 2 },
  periodOption: { flex: 1, alignItems: 'center', borderRadius: 7, paddingVertical: 7 },
  periodOptionText: { fontSize: 11, fontWeight: '700' },
  dashboardMetricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dashboardMetric: { width: '48%', borderRadius: 11, borderWidth: 1, padding: 11 },
  metricIcon: { width: 27, height: 27, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 7 },
  dashboardMetricValue: { fontSize: 21, fontWeight: '700' },
  dashboardMetricLabel: { fontSize: 11, marginTop: 2 },
  dashboardCard: { borderRadius: 11, borderWidth: 1, padding: 13, gap: 10 },
  cardHeadingRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  cardHeading: { fontSize: 14, fontWeight: '700' },
  cardCaption: { fontSize: 11, marginTop: 2 },
  pageRow: { gap: 5 },
  pageRowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  pageName: { flex: 1, fontSize: 12, fontWeight: '600' },
  pageVisits: { fontSize: 12, fontWeight: '600' },
  pageTrack: { height: 6, borderRadius: 4, overflow: 'hidden' },
  pageFill: { height: '100%', borderRadius: 4 },
  emptyAnalytics: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  emptyAnalyticsText: { flex: 1, fontSize: 12 },
  healthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  healthItem: { width: '31.8%', borderWidth: 1, borderRadius: 8, padding: 8 },
  healthValue: { fontSize: 16, fontWeight: '700' },
  healthLabel: { fontSize: 10, marginTop: 3 },
  splitAnalyticsRow: { flexDirection: 'row', gap: 8 },
  splitCard: { flex: 1 },
  breakdownRow: { gap: 5 },
  breakdownLabelRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
  breakdownLabel: { flex: 1, fontSize: 11 },
  breakdownValue: { fontSize: 11, fontWeight: '700' },
  signalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  signalValue: { fontSize: 13, fontWeight: '700' },
  snapshotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  snapshotItem: { width: '47%' },
  snapshotValue: { fontSize: 16, fontWeight: '700' },
  snapshotLabel: { fontSize: 10, lineHeight: 14, marginTop: 2 },
  contributorRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rankBubble: { width: 23, height: 23, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rankText: { fontSize: 11, fontWeight: '700' },
  contributorName: { flex: 1, fontSize: 12, fontWeight: '600' },
  contributorScore: { fontSize: 11 },
  exportCard: { flexDirection: 'row', gap: 12, borderRadius: 12, borderWidth: 1, padding: 14 },
  exportIconWrap: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  exportCardBody: { flex: 1, gap: 6 },
  exportCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  exportCardTitle: { fontSize: 14, fontWeight: '700', flex: 1 },
  exportBadge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  exportBadgeText: { fontSize: 11, fontWeight: '600' },
  exportCardDesc: { fontSize: 12, lineHeight: 17 },
  exportBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 8, paddingVertical: 9, marginTop: 2 },
  exportBtnText: { fontSize: 13, fontWeight: '700' },
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
