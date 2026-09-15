import AsyncStorage from '@react-native-async-storage/async-storage';
import { emitNotificationEvent } from '@/utils/notificationEvents';
import {
  createQuestion, deleteQuestion as deleteQuestionApi, upvoteQuestion as upvoteQuestionApi, createAnswer, deleteAnswer,
  upvoteAnswer as upvoteAnswerApi, acceptQuestionAnswer, createDiscussion as createDiscussionApi, deleteDiscussion as deleteDiscussionApi,
  upvoteDiscussion as upvoteDiscussionApi, createListing as createListingApi, deleteListing as deleteListingApi, setListingApproval,
  setListingFeatured, createQuestionComment, createAnswerComment,
  createDiscussionComment, requestUploadUrl, getContentBootstrap
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type UserRole = 'Car Owner' | 'Service Provider' | 'Admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  verified: boolean;
  phone: string;
  specialization: string[];
  businessName: string;
  experience: number;
  location: string;
  isBanned: boolean;
  hasEditedProfile?: boolean;
  whatsappEnabled?: boolean;
}

export interface Message {
  id: number;
  conversationId: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: number;
  read: boolean;
}

export interface Conversation {
  id: string;
  participantIds: [string, string];
  participantNames: [string, string];
  lastMessage: string;
  lastTimestamp: number;
  unreadBy: string[];
}

export interface Question {
  id: number;
  title: string;
  description: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  userSpecialization: string;
  userVerified: boolean;
  tags: string;
  timestamp: number;
  isPrivateEcosystem: boolean;
  upvotes: number;
  upvotedBy: string[];
  acceptedAnswerId: number;
  yrModel: string;
  vehicleType: string;
  seeConcern: boolean;
  hearConcern: boolean;
  smellConcern: boolean;
  feelConcern: boolean;
  notStarting: boolean;
  performanceConcern: boolean;
  dashboardWarningLights: boolean;
}

export interface Answer {
  id: number;
  questionId: number;
  userId: string;
  userName: string;
  userRole: UserRole;
  userSpecialization: string;
  userVerified: boolean;
  content: string;
  timestamp: number;
  upvotes: number;
  upvotedBy: string[];
  isAccepted: boolean;
}

export interface Comment {
  id: number;
  questionOrAnswerId: number;
  isAnswer: boolean;
  userId: string;
  userName: string;
  content: string;
  timestamp: number;
}

/** A General Discussion post — experiences, tips, knowledge sharing */
export interface DiscussionPost {
  id: number;
  title?: string;
  content: string;
  tags: string;
  mediaUris?: string[];
  /** true = visible only in Pro Circle; false/undefined = public forum */
  isProCircle?: boolean;
  userId: string;
  userName: string;
  userRole: UserRole;
  userSpecialization: string;
  userVerified: boolean;
  timestamp: number;
  upvotes: number;
  upvotedBy: string[];
}

/** Comment on a DiscussionPost */
export interface DiscussionComment {
  id: number;
  postId: number;
  userId: string;
  userName: string;
  content: string;
  timestamp: number;
}

export interface MarketplaceListing {
  id: number;
  title: string;
  description: string;
  price: number;
  userId: string;
  userName: string;
  userRole: UserRole;
  userPhone: string;
  category: 'Parts' | 'Services' | 'Car Sales';
  location: string;
  isApproved: boolean;
  partsGrade: string;
  application: string;
  partBrand: string;
  partNumber?: string;
  imageUris?: string[];
  isFeaturedBottom: boolean;
  timestamp: number;
  // Car Sales specific
  carMake?: string;
  carModel?: string;
  carYear?: number;
  carTrim?: string;
  carBodyType?: string;
  carExteriorColor?: string;
  carInteriorColor?: string;
  carEngineType?: string;
  carTransmission?: string;
  carFuelType?: string;
  carMileage?: number;
  carDriveType?: string;
  carCondition?: string;
  carAccidentHistory?: string;
  carServiceHistory?: string;
  carPreviousOwners?: number;
  carRegistrationStatus?: string;
  carCustomsPapers?: string;
  carVin?: string;
  carPlateNumber?: string;
}

export interface ProviderRating {
  id: number;
  providerId: string;
  raterId: string;
  raterName: string;
  ratingValue: number;
  feedback: string;
  timestamp: number;
}

export interface AnalyticsEvent {
  id: number;
  type: 'page_view' | 'session_start';
  page: string;
  timestamp: number;
  userId: string | null;
}

export interface AnalyticsState {
  pageVisits: Record<string, number>;
  events: AnalyticsEvent[];
  sessionCount: number;
  firstTrackedAt: number;
  lastVisitAt: number;
}

export function getAnalyticsPageName(path: string): string {
  const normalized = path.replace(/^\/+/, '');
  if (!normalized || normalized === '(tabs)' || normalized === '(tabs)/') return 'Forum';
  if (normalized.includes('(auth)') || normalized.startsWith('sign-in') || normalized.startsWith('sign-up')) {
    return normalized.includes('sign-up') ? 'Sign up' : 'Sign in';
  }
  if (normalized.includes('question/')) return 'Question detail';
  if (normalized.includes('discussion/')) return 'Discussion detail';
  if (normalized.includes('listing/')) return 'Listing detail';
  if (normalized.includes('seller/')) return 'Provider profile';
  if (normalized.includes('conversation/')) return 'Conversation';

  const lastSegment = normalized.split('/').filter(Boolean).pop();
  switch (lastSegment) {
    case 'pro':
      return 'Pro Circle';
    case 'marketplace':
      return 'Marketplace';
    case 'messages':
      return 'Messages';
    case 'clinic':
      return 'AI Clinic';
    case 'profile':
      return 'Profile';
    default:
      return lastSegment ? lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1) : 'Forum';
  }
}

export interface CmsConfig {
  announcementText: string;
  announcementActive: boolean;
  featuredPartsLabel: string;
  featuredServicesLabel: string;
  specializationTags: string[];
  forumLogoUri?: string;
  loaderLogoUri?: string;
  marketplaceVisible: boolean;
  clinicVisible: boolean;
}

interface AppState {
  users: User[];
  questions: Question[];
  answers: Answer[];
  comments: Comment[];
  discussions: DiscussionPost[];
  discussionComments: DiscussionComment[];
  listings: MarketplaceListing[];
  ratings: ProviderRating[];
  analytics: AnalyticsState;
  cmsConfig: CmsConfig;
  currentUserId: string | null;
  messages: Message[];
  conversations: Conversation[];
}

export interface AppContextType extends AppState {
  currentUser: User | null;
  isLoading: boolean;
  login: (userId: string) => void;
  logout: () => void;
  register: (data: Omit<User, 'isBanned' | 'verified'>) => void;
  askQuestion: (data: Omit<Question, 'id' | 'userId' | 'userName' | 'userRole' | 'userSpecialization' | 'userVerified' | 'timestamp' | 'upvotes' | 'upvotedBy' | 'acceptedAnswerId'>) => void;
  deleteQuestion: (id: number) => void;
  upvoteQuestion: (id: number) => void;
  answerQuestion: (questionId: number, content: string) => void;
  upvoteAnswer: (id: number) => void;
  acceptAnswer: (questionId: number, answerId: number) => void;
  addComment: (parentId: number, isAnswer: boolean, content: string) => void;
  createDiscussion: (data: Pick<DiscussionPost, 'title' | 'content' | 'tags' | 'mediaUris' | 'isProCircle'>) => void;
  deleteDiscussion: (id: number) => void;
  upvoteDiscussion: (id: number) => void;
  addDiscussionComment: (postId: number, content: string) => void;
  createListing: (data: Omit<MarketplaceListing, 'id' | 'userId' | 'userName' | 'userRole' | 'userPhone' | 'isApproved' | 'isFeaturedBottom' | 'timestamp'>) => void;
  deleteListing: (id: number) => void;
  approveListing: (id: number, approved: boolean) => void;
  featureListing: (id: number, featured: boolean) => void;
  addRating: (providerId: string, ratingValue: number, feedback: string) => void;
  toggleVerified: (userId: string, verified: boolean) => void;
  banUser: (userId: string, banned: boolean) => void;
  updateCmsConfig: (config: Partial<CmsConfig>) => void;
  adminAddUser: (data: Omit<User, 'isBanned' | 'verified'>) => void;
  adminUpdateUser: (userId: string, data: Partial<Omit<User, 'id'>>) => void;
  adminDeleteUser: (userId: string) => void;
  editProfile: (data: Pick<User, 'name' | 'phone' | 'location' | 'specialization' | 'businessName' | 'experience'>) => void;
  sendMessage: (toUserId: string, toUserName: string, content: string) => void;
  markConversationRead: (conversationId: string) => void;
  adminToggleWhatsApp: (userId: string, enabled: boolean) => void;
  trackPageView: (page: string, startsSession?: boolean) => void;
  unreadCount: number;
}

// Bump version to reset stored state and include discussions
const STORAGE_KEY = 'cochetalk_state_v5';

export function makeConvId(a: string, b: string): string {
  return [a, b].sort().join('__');
}

function createSeedState(): AppState {
  const users = [
    {
      id: 'admin@cochetalk.com',
      name: 'Chief Admin',
      email: 'admin@cochetalk.com',
      role: 'Admin' as UserRole,
      verified: true,
      phone: '+2348099999999',
      specialization: [],
      businessName: '',
      experience: 0,
      location: 'Lagos',
      isBanned: false,
    }
  ];
  return {
    users,
    questions: [],
    answers: [],
    comments: [],
    discussions: [],
    discussionComments: [],
    listings: [],
    ratings: [],
    analytics: createSeedAnalytics(),
    cmsConfig: {
      announcementText: "Welcome to CocheTalk.NG — Nigeria's trusted vehicle aftersales platform!",
      announcementActive: true,
      featuredPartsLabel: 'Top Rated Parts',
      featuredServicesLabel: 'Verified Mechanic Services',
      specializationTags: [
        'Engine', 'Transmission', 'Electrical Systems', 'Brakes',
        'Tyres & Suspension', 'Body & Paint', 'Air Conditioning',
        'Welding', 'Diagnostics', 'General Repairs',
      ],
      marketplaceVisible: true,
      clinicVisible: true,
    },
    currentUserId: null,
    messages: [],
    conversations: [],
  };
}

function createSeedAnalytics(): AnalyticsState {
  return {
    pageVisits: {},
    events: [],
    sessionCount: 0,
    firstTrackedAt: 0,
    lastVisitAt: 0,
  };
}

const AppContext = createContext<AppContextType | null>(null);


export function AppProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();

  const [state, setState] = useState<AppState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as Partial<AppState>;
          setState({
            ...parsed,
            questions: parsed.questions ?? [],
            answers: parsed.answers ?? [],
            comments: parsed.comments ?? [],
            discussions: parsed.discussions ?? [],
            discussionComments: parsed.discussionComments ?? [],
            listings: parsed.listings ?? [],
            analytics: {
              ...createSeedAnalytics(),
              ...(parsed.analytics ?? {}),
              pageVisits: parsed.analytics?.pageVisits ?? {},
              events: parsed.analytics?.events ?? [],
            },
          } as AppState);
        } catch (err) {

          console.error('[AppContext] Failed to parse persisted state — resetting to seed data.', err);
          setState(createSeedState());
        }
      } else {
        setState(createSeedState());
      }
      setIsLoading(false);
    });
  }, []);

  const save = useCallback((next: AppState) => {
    setState(next);
    const { questions, answers, comments, discussions, discussionComments, listings, ...localData } = next;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(localData)).catch((err) => {
      console.error('[AppContext] Failed to persist state to AsyncStorage.', err);
    });
  }, []);

  const currentUser = useMemo(
    () => state?.users.find((u) => u.id === state.currentUserId) ?? null,
    [state],
  );

  const login = useCallback(
    (userId: string) => {
      if (!state) return;
      save({ ...state, currentUserId: userId });
    },
    [state, save],
  );

  const logout = useCallback(() => {
    if (!state) return;
    queryClient.clear(); // Clear React Query cache
    save({
      ...state,
      currentUserId: null,
      questions: [],
      answers: [],
      comments: [],
      discussions: [],
      discussionComments: [],
      listings: []
    });
  }, [state, save, queryClient]);

  const syncBackend = useCallback(async () => {
    try {
      const bootstrap = await getContentBootstrap();
      const questions = bootstrap.questions as Question[];
      const discussions = bootstrap.discussions as DiscussionPost[];
      const listings = bootstrap.listings as MarketplaceListing[];
      const answersArr = bootstrap.answers as Answer[];
      const commentsArr = bootstrap.comments as Comment[];
      const discussionCommentsArr = bootstrap.discussionComments as DiscussionComment[];

      setState(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          questions,
          discussions,
          listings,
          answers: answersArr,
          comments: commentsArr,
          discussionComments: discussionCommentsArr,
        };
      });
    } catch (e) {
      console.error('Failed to sync backend:', e);
      Alert.alert('Connection Error', 'Could not sync latest content from the server.');
    }
  }, []);

  useEffect(() => {
    if (state && state.currentUserId) {
      syncBackend();
    }
  }, [state?.currentUserId, syncBackend]);

  const trackPageView = useCallback(
    (page: string, startsSession = false) => {
      if (!state || !page) return;
      const now = Date.now();
      const previous = state.analytics ?? createSeedAnalytics();
      const pageVisits = {
        ...previous.pageVisits,
        [page]: (previous.pageVisits[page] ?? 0) + 1,
      };
      const pageEvent: AnalyticsEvent = {
        id: now,
        type: 'page_view',
        page,
        timestamp: now,
        userId: state.currentUserId,
      };
      const sessionEvent: AnalyticsEvent | null = startsSession
        ? {
            id: now + 1,
            type: 'session_start',
            page,
            timestamp: now,
            userId: state.currentUserId,
          }
        : null;
      const events = [...previous.events, pageEvent, ...(sessionEvent ? [sessionEvent] : [])].slice(-1000);

      save({
        ...state,
        analytics: {
          ...previous,
          pageVisits,
          events,
          sessionCount: previous.sessionCount + (startsSession ? 1 : 0),
          firstTrackedAt: previous.firstTrackedAt || now,
          lastVisitAt: now,
        },
      });
    },
    [state, save],
  );

  const register = useCallback(
    (data: Omit<User, 'isBanned' | 'verified'>) => {
      if (!state) return;
      const newUser: User = { ...data, verified: false, isBanned: false };
      save({ ...state, users: [...state.users, newUser], currentUserId: newUser.id });
    },
    [state, save],
  );

  const askQuestion = useCallback(
    async (data: any) => {
      if (!state || !currentUser) return;
      try {
        await createQuestion({
          ...data,
          userName: currentUser.name,
          userRole: currentUser.role,
          userSpecialization: currentUser.specialization.join(', '),
          userVerified: currentUser.verified,
        });
        syncBackend();
      } catch (e) {
        console.error(e);
        Alert.alert('Action Failed', 'Could not save your changes. Please try again.');
      }
    },
    [state, currentUser, syncBackend]
  );

  const deleteQuestion = useCallback(
    async (id: number) => {
      if (!state) return;
      try {
        await deleteQuestionApi(id);
        syncBackend();
      } catch (e) {
        console.error(e);
        Alert.alert('Action Failed', 'Could not save your changes. Please try again.');
      }
    },
    [state, syncBackend]
  );

  const upvoteQuestion = useCallback(
    async (id: number) => {
      if (!state || !currentUser) return;

      // Optimistic
      save({
        ...state,
        questions: state.questions.map((q) => {
          if (q.id !== id) return q;
          const isUpvoted = q.upvotedBy.includes(currentUser.id);
          return {
            ...q,
            upvotes: isUpvoted ? q.upvotes - 1 : q.upvotes + 1,
            upvotedBy: isUpvoted
              ? q.upvotedBy.filter((uid) => uid !== currentUser.id)
              : [...q.upvotedBy, currentUser.id],
          };
        }),
      });

      try {
        await upvoteQuestionApi(id);
        syncBackend();
      } catch (e) {
        console.error(e);
        Alert.alert('Action Failed', 'Could not save your changes. Please try again.');
      }
    },
    [state, currentUser, save, syncBackend]
  );

  const answerQuestion = useCallback(
    async (questionId: number, content: string) => {
      if (!state || !currentUser) return;
      try {
        await createAnswer(questionId, {
          content,
          userName: currentUser.name,
          userRole: currentUser.role,
          userSpecialization: currentUser.specialization.join(', '),
          userVerified: currentUser.verified,
        });
        syncBackend();
      } catch (e) {
        console.error(e);
        Alert.alert('Action Failed', 'Could not save your changes. Please try again.');
      }
    },
    [state, currentUser, syncBackend]
  );

  const upvoteAnswer = useCallback(
    async (id: number) => {
      if (!state || !currentUser) return;

      // Optimistic
      save({
        ...state,
        answers: state.answers.map((a) => {
          if (a.id !== id) return a;
          const isUpvoted = a.upvotedBy.includes(currentUser.id);
          return {
            ...a,
            upvotes: isUpvoted ? a.upvotes - 1 : a.upvotes + 1,
            upvotedBy: isUpvoted
              ? a.upvotedBy.filter((uid) => uid !== currentUser.id)
              : [...a.upvotedBy, currentUser.id],
          };
        }),
      });

      try {
        await upvoteAnswerApi(id);
        syncBackend();
      } catch (e) {
        console.error(e);
        Alert.alert('Action Failed', 'Could not save your changes. Please try again.');
      }
    },
    [state, currentUser, save, syncBackend]
  );

  const acceptAnswer = useCallback(
    async (questionId: number, answerId: number) => {
      if (!state) return;
      try {
        await acceptQuestionAnswer(questionId, answerId);
        syncBackend();
      } catch (e) {
        console.error(e);
        Alert.alert('Action Failed', 'Could not save your changes. Please try again.');
      }
    },
    [state, syncBackend]
  );

  const addComment = useCallback(
    async (parentId: number, isAnswer: boolean, content: string) => {
      if (!state || !currentUser) return;
      try {
        if (isAnswer) {
          await createAnswerComment(parentId, { content, userName: currentUser.name });
        } else {
          await createQuestionComment(parentId, { content, userName: currentUser.name });
        }
        syncBackend();
      } catch (e) {
        console.error(e);
        Alert.alert('Action Failed', 'Could not save your changes. Please try again.');
      }
    },
    [state, currentUser, syncBackend]
  );

  // ── Discussion CRUD ──────────────────────────────────────────────────

  const createDiscussion = useCallback(
    async (data: Pick<DiscussionPost, 'title' | 'content' | 'tags' | 'mediaUris' | 'isProCircle'>) => {
      if (!state || !currentUser) return;
      try {
        await createDiscussionApi({
          ...data,
          userName: currentUser.name,
          userRole: currentUser.role,
          userSpecialization: currentUser.specialization.join(', '),
          userVerified: currentUser.verified,
        });
        syncBackend();
      } catch (e) {
        console.error(e);
        Alert.alert('Action Failed', 'Could not save your changes. Please try again.');
      }
    },
    [state, currentUser, syncBackend]
  );

  const deleteDiscussion = useCallback(
    async (id: number) => {
      if (!state) return;
      try {
        await deleteDiscussionApi(id);
        syncBackend();
      } catch (e) {
        console.error(e);
        Alert.alert('Action Failed', 'Could not save your changes. Please try again.');
      }
    },
    [state, syncBackend]
  );

  const upvoteDiscussion = useCallback(
    async (id: number) => {
      if (!state || !currentUser) return;

      // Optimistic
      save({
        ...state,
        discussions: state.discussions.map((d) => {
          if (d.id !== id) return d;
          const isUpvoted = d.upvotedBy.includes(currentUser.id);
          return {
            ...d,
            upvotes: isUpvoted ? d.upvotes - 1 : d.upvotes + 1,
            upvotedBy: isUpvoted
              ? d.upvotedBy.filter((uid) => uid !== currentUser.id)
              : [...d.upvotedBy, currentUser.id],
          };
        }),
      });

      try {
        await upvoteDiscussionApi(id);
        syncBackend();
      } catch (e) {
        console.error(e);
        Alert.alert('Action Failed', 'Could not save your changes. Please try again.');
      }
    },
    [state, currentUser, save, syncBackend]
  );

  const addDiscussionComment = useCallback(
    async (postId: number, content: string) => {
      if (!state || !currentUser) return;
      try {
        await createDiscussionComment(postId, { content, userName: currentUser.name });
        syncBackend();
      } catch (e) {
        console.error(e);
        Alert.alert('Action Failed', 'Could not save your changes. Please try again.');
      }
    },
    [state, currentUser, syncBackend]
  );

  // ── Marketplace ──────────────────────────────────────────────────────

  const createListing = useCallback(
    async (data: any) => {
      if (!state || !currentUser) return;
      try {
        const localImages = Array.isArray(data.imageUris) ? data.imageUris.filter((uri: string) => uri.startsWith('file://') || uri.startsWith('content://')) : [];
        const uploadedImages = await Promise.all(localImages.map(async (uri: string) => {
          const response = await fetch(uri);
          const blob = await response.blob();
          const contentType = blob.type === 'image/png' ? 'image/png' : blob.type === 'image/webp' ? 'image/webp' : 'image/jpeg';
          const upload = await requestUploadUrl({ name: `listing-${Date.now()}.jpg`, size: blob.size, contentType });
          const put = await fetch(upload.uploadURL, { method: 'PUT', headers: { 'Content-Type': contentType }, body: blob });
          if (!put.ok) throw new Error('Image upload failed');
          const origin = process.env.EXPO_PUBLIC_DOMAIN ? `https://${process.env.EXPO_PUBLIC_DOMAIN}` : '';
          return `${origin}/api/storage/objects/${upload.objectPath.replace(/^\/objects\//, '')}`;
        }));
        const imageUris = [
          ...(Array.isArray(data.imageUris) ? data.imageUris.filter((uri: string) => !uri.startsWith('file://') && !uri.startsWith('content://')) : []),
          ...uploadedImages,
        ];
        await createListingApi({
          ...data,
          imageUris,
          userName: currentUser.name,
          userRole: currentUser.role,
          userPhone: currentUser.phone,
        });
        syncBackend();
      } catch (e) {
        console.error(e);
        Alert.alert('Action Failed', 'Could not save your changes. Please try again.');
      }
    },
    [state, currentUser, syncBackend]
  );

  const deleteListing = useCallback(
    async (id: number) => {
      if (!state) return;
      try {
        await deleteListingApi(id);
        syncBackend();
      } catch (e) {
        console.error(e);
        Alert.alert('Action Failed', 'Could not save your changes. Please try again.');
      }
    },
    [state, syncBackend]
  );

  const approveListing = useCallback(
    async (id: number, approved: boolean) => {
      if (!state) return;
      try {
        await setListingApproval(id, { approved });
        syncBackend();
      } catch (e) {
        console.error(e);
        // Explicitly surface failure instead of pretending success
        Alert.alert("Failed to approve listing (Admin authority error 403).");
      }
    },
    [state, syncBackend]
  );

  const featureListing = useCallback(
    async (id: number, featured: boolean) => {
      if (!state) return;
      try {
        await setListingFeatured(id, { featured });
        syncBackend();
      } catch (e) {
        console.error(e);
        // Explicitly surface failure instead of pretending success
        Alert.alert("Failed to feature listing (Admin authority error 403).");
      }
    },
    [state, syncBackend]
  );

  const addRating = useCallback(
    (providerId: string, ratingValue: number, feedback: string) => {
      if (!state || !currentUser) return;
      const existing = state.ratings.find(
        (r) => r.providerId === providerId && r.raterId === currentUser.id,
      );
      if (existing) {
        save({
          ...state,
          ratings: state.ratings.map((r) =>
            r.id === existing.id ? { ...r, ratingValue, feedback, timestamp: Date.now() } : r,
          ),
        });
      } else {
        const newRating: ProviderRating = {
          id: Date.now(),
          providerId,
          raterId: currentUser.id,
          raterName: currentUser.name,
          ratingValue,
          feedback,
          timestamp: Date.now(),
        };
        save({ ...state, ratings: [...state.ratings, newRating] });
      }
    },
    [state, currentUser, save],
  );

  const toggleVerified = useCallback(
    (userId: string, verified: boolean) => {
      if (!state || !currentUser) return;
      save({
        ...state,
        users: state.users.map((u) => (u.id === userId ? { ...u, verified } : u)),
      });
      if (userId !== currentUser.id) {
        emitNotificationEvent({
          recipientId: userId,
          notificationType: 'provider_updates',
          title: verified ? 'Provider profile verified' : 'Provider verification updated',
          body: verified
            ? 'Your CocheTalk service provider profile is now verified.'
            : 'Your service provider verification status has been updated.',
          data: { screen: 'profile' },
          dedupeKey: `provider-verification:${userId}:${verified}`,
        });
      }
    },
    [state, currentUser, save],
  );

  const banUser = useCallback(
    (userId: string, banned: boolean) => {
      if (!state) return;
      save({
        ...state,
        users: state.users.map((u) => (u.id === userId ? { ...u, isBanned: banned } : u)),
      });
    },
    [state, save],
  );

  const updateCmsConfig = useCallback(
    (config: Partial<CmsConfig>) => {
      if (!state) return;
      save({ ...state, cmsConfig: { ...state.cmsConfig, ...config } });
    },
    [state, save],
  );

  const adminAddUser = useCallback(
    (data: Omit<User, 'isBanned' | 'verified'>) => {
      if (!state) return;
      const newUser: User = { ...data, verified: false, isBanned: false };
      save({ ...state, users: [...state.users, newUser] });
    },
    [state, save],
  );

  const adminUpdateUser = useCallback(
    (userId: string, data: Partial<Omit<User, 'id'>>) => {
      if (!state) return;
      save({
        ...state,
        users: state.users.map((u) => (u.id === userId ? { ...u, ...data } : u)),
      });
    },
    [state, save],
  );

  const sendMessage = useCallback(
    (toUserId: string, toUserName: string, content: string) => {
      if (!state || !currentUser) return;
      const cid = makeConvId(currentUser.id, toUserId);
      const newMsg: Message = {
        id: Date.now(),
        conversationId: cid,
        senderId: currentUser.id,
        senderName: currentUser.name,
        content,
        timestamp: Date.now(),
        read: false,
      };
      const existingConv = state.conversations.find((c) => c.id === cid);
      const updatedConv: Conversation = existingConv
        ? { ...existingConv, lastMessage: content, lastTimestamp: Date.now(), unreadBy: [toUserId] }
        : {
            id: cid,
            participantIds: [currentUser.id, toUserId] as [string, string],
            participantNames: [currentUser.name, toUserName] as [string, string],
            lastMessage: content,
            lastTimestamp: Date.now(),
            unreadBy: [toUserId],
          };
      save({
        ...state,
        messages: [...state.messages, newMsg],
        conversations: existingConv
          ? state.conversations.map((c) => (c.id === cid ? updatedConv : c))
          : [...state.conversations, updatedConv],
      });
      emitNotificationEvent({
        recipientId: toUserId,
        notificationType: 'new_messages',
        title: `New message from ${currentUser.name}`,
        body: content,
        data: { conversationId: cid },
        dedupeKey: `message:${newMsg.id}`,
      });
    },
    [state, currentUser, save],
  );

  const markConversationRead = useCallback(
    (conversationId: string) => {
      if (!state || !currentUser) return;
      save({
        ...state,
        messages: state.messages.map((m) =>
          m.conversationId === conversationId && m.senderId !== currentUser.id ? { ...m, read: true } : m,
        ),
        conversations: state.conversations.map((c) =>
          c.id === conversationId ? { ...c, unreadBy: c.unreadBy.filter((uid) => uid !== currentUser.id) } : c,
        ),
      });
    },
    [state, currentUser, save],
  );

  const adminToggleWhatsApp = useCallback(
    (userId: string, enabled: boolean) => {
      if (!state) return;
      save({ ...state, users: state.users.map((u) => (u.id === userId ? { ...u, whatsappEnabled: enabled } : u)) });
    },
    [state, save],
  );

  const editProfile = useCallback(
    (data: Pick<User, 'name' | 'phone' | 'location' | 'specialization' | 'businessName' | 'experience'>) => {
      if (!state || !currentUser) return;
      save({
        ...state,
        users: state.users.map((u) =>
          u.id === currentUser.id ? { ...u, ...data, hasEditedProfile: true } : u,
        ),
      });
    },
    [state, currentUser, save],
  );

  const adminDeleteUser = useCallback(
    (userId: string) => {
      if (!state) return;
      save({
        ...state,
        users: state.users.filter((u) => u.id !== userId),
        questions: state.questions.filter((q) => q.userId !== userId),
        answers: state.answers.filter((a) => a.userId !== userId),
        listings: state.listings.filter((l) => l.userId !== userId),
        ratings: state.ratings.filter((r) => r.providerId !== userId && r.raterId !== userId),
        discussions: (state.discussions ?? []).filter((d) => d.userId !== userId),
        discussionComments: (state.discussionComments ?? []).filter((c) => c.userId !== userId),
        currentUserId: state.currentUserId === userId ? 'admin@cochetalk.com' : state.currentUserId,
      });
    },
    [state, save],
  );

  const unreadCount = useMemo(() => {
    if (!currentUser || !state) return 0;
    return (state.conversations ?? []).filter((c) => c.unreadBy.includes(currentUser.id)).length;
  }, [state, currentUser]);

  const value = useMemo<AppContextType>(
    () => ({
      ...(state ?? createSeedState()),
      currentUser,
      isLoading,
      login,
      logout,
      register,
      askQuestion,
      deleteQuestion,
      upvoteQuestion,
      answerQuestion,
      upvoteAnswer,
      acceptAnswer,
      addComment,
      createDiscussion,
      deleteDiscussion,
      upvoteDiscussion,
      addDiscussionComment,
      createListing,
      deleteListing,
      approveListing,
      featureListing,
      addRating,
      toggleVerified,
      banUser,
      updateCmsConfig,
      adminAddUser,
      adminUpdateUser,
      adminDeleteUser,
      editProfile,
      sendMessage,
      markConversationRead,
      adminToggleWhatsApp,
      trackPageView,
      unreadCount,
    }),
    [
      state,
      currentUser,
      isLoading,
      login,
      logout,
      register,
      askQuestion,
      deleteQuestion,
      upvoteQuestion,
      answerQuestion,
      upvoteAnswer,
      acceptAnswer,
      addComment,
      createDiscussion,
      deleteDiscussion,
      upvoteDiscussion,
      addDiscussionComment,
      createListing,
      deleteListing,
      approveListing,
      featureListing,
      addRating,
      toggleVerified,
      banUser,
      updateCmsConfig,
      adminAddUser,
      adminUpdateUser,
      adminDeleteUser,
      editProfile,
      sendMessage,
      markConversationRead,
      adminToggleWhatsApp,
      trackPageView,
      unreadCount,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextType {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
