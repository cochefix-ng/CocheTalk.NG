import AsyncStorage from '@react-native-async-storage/async-storage';
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

export interface CmsConfig {
  announcementText: string;
  announcementActive: boolean;
  featuredPartsLabel: string;
  featuredServicesLabel: string;
  specializationTags: string[];
}

interface AppState {
  users: User[];
  questions: Question[];
  answers: Answer[];
  comments: Comment[];
  listings: MarketplaceListing[];
  ratings: ProviderRating[];
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
  unreadCount: number;
}

const STORAGE_KEY = 'cochetalk_state_v3';

export function makeConvId(a: string, b: string): string {
  return [a, b].sort().join('__');
}

function createSeedState(): AppState {
  const now = Date.now();
  const DAY = 86400000;

  const users: User[] = [
    {
      id: 'bisi@cochefix.com',
      name: 'Bisi Alao',
      email: 'bisi@cochefix.com',
      role: 'Car Owner',
      verified: false,
      phone: '+2348031234567',
      specialization: [],
      businessName: '',
      experience: 0,
      location: 'Lagos Island',
      isBanned: false,
    },
    {
      id: 'jose@cochefix.com',
      name: 'Jose Ramirez',
      email: 'jose@cochefix.com',
      role: 'Service Provider',
      verified: true,
      phone: '+2348101234567',
      specialization: ['Engine', 'Transmission'],
      businessName: 'MechFix Auto',
      experience: 8,
      location: 'Victoria Island, Lagos',
      isBanned: false,
      whatsappEnabled: true,
    },
    {
      id: 'samson@cochefix.com',
      name: 'Samson Okafor',
      email: 'samson@cochefix.com',
      role: 'Service Provider',
      verified: false,
      phone: '+2348029876543',
      specialization: ['Electrical Systems'],
      businessName: 'OkaforAuto',
      experience: 5,
      location: 'Surulere, Lagos',
      isBanned: false,
      whatsappEnabled: false,
    },
    {
      id: 'admin@cochetalk.com',
      name: 'Chief Admin',
      email: 'admin@cochetalk.com',
      role: 'Admin',
      verified: true,
      phone: '+2348099999999',
      specialization: [],
      businessName: '',
      experience: 0,
      location: 'Lagos',
      isBanned: false,
    },
  ];

  const questions: Question[] = [
    {
      id: 1,
      title: 'Honda Civic 2017 makes a clunking noise when turning at low speed',
      description:
        'Every time I turn the steering wheel at slow speeds, especially when parking, I hear a loud clunking or clicking sound from the front. Does not happen at highway speed. Already checked tyre pressure — all fine.',
      userId: 'bisi@cochefix.com',
      userName: 'Bisi Alao',
      userRole: 'Car Owner',
      userSpecialization: '',
      userVerified: false,
      tags: 'Honda,Suspension,Noise',
      timestamp: now - DAY * 3,
      isPrivateEcosystem: false,
      upvotes: 7,
      upvotedBy: ['jose@cochefix.com', 'samson@cochefix.com'],
      acceptedAnswerId: 1,
      yrModel: '2017 Honda Civic',
      vehicleType: 'Sedan',
      seeConcern: false,
      hearConcern: true,
      smellConcern: false,
      feelConcern: false,
      notStarting: false,
      performanceConcern: false,
      dashboardWarningLights: false,
    },
    {
      id: 2,
      title: 'Toyota Camry 2019 overheating — coolant level looks fine',
      description:
        'Temperature gauge shoots up after 20-30 minutes of driving. Checked the coolant reservoir — looks fine. No visible leaks on the ground. Could this be the thermostat or water pump?',
      userId: 'bisi@cochefix.com',
      userName: 'Bisi Alao',
      userRole: 'Car Owner',
      userSpecialization: '',
      userVerified: false,
      tags: 'Toyota,Cooling,Overheating',
      timestamp: now - DAY,
      isPrivateEcosystem: false,
      upvotes: 4,
      upvotedBy: ['jose@cochefix.com'],
      acceptedAnswerId: -1,
      yrModel: '2019 Toyota Camry',
      vehicleType: 'Sedan',
      seeConcern: false,
      hearConcern: false,
      smellConcern: false,
      feelConcern: true,
      notStarting: false,
      performanceConcern: true,
      dashboardWarningLights: true,
    },
    {
      id: 3,
      title: 'Diagnosing faulty ABS sensor on VW Golf Mk7 — torque specs?',
      description:
        'ABS warning light came on last week. Confirmed rear left wheel speed sensor via OBD-II scan. What is the correct torque spec for the sensor bolt, and is brake bleed required after?',
      userId: 'jose@cochefix.com',
      userName: 'Jose Ramirez',
      userRole: 'Service Provider',
      userSpecialization: 'Engine / Transmission',
      userVerified: true,
      tags: 'Volkswagen,ABS,Brakes',
      timestamp: now - DAY * 2,
      isPrivateEcosystem: true,
      upvotes: 12,
      upvotedBy: ['samson@cochefix.com'],
      acceptedAnswerId: -1,
      yrModel: '2017 VW Golf Mk7',
      vehicleType: 'Hatchback',
      seeConcern: false,
      hearConcern: false,
      smellConcern: false,
      feelConcern: false,
      notStarting: false,
      performanceConcern: false,
      dashboardWarningLights: true,
    },
    {
      id: 4,
      title: 'Intermittent electrical short causing multiple fuses to blow — 2015 Toyota Highlander',
      description:
        'Dashboard fuses for audio and AC blow randomly, usually when going over bumps. Replaced fuses three times already. Suspect loose earth wire somewhere in the harness.',
      userId: 'samson@cochefix.com',
      userName: 'Samson Okafor',
      userRole: 'Service Provider',
      userSpecialization: 'Electrical Systems',
      userVerified: false,
      tags: 'Toyota,Electrical,Fuse',
      timestamp: now - DAY * 4,
      isPrivateEcosystem: true,
      upvotes: 8,
      upvotedBy: ['jose@cochefix.com'],
      acceptedAnswerId: -1,
      yrModel: '2015 Toyota Highlander',
      vehicleType: 'SUV',
      seeConcern: false,
      hearConcern: false,
      smellConcern: false,
      feelConcern: false,
      notStarting: false,
      performanceConcern: false,
      dashboardWarningLights: false,
    },
  ];

  const answers: Answer[] = [
    {
      id: 1,
      questionId: 1,
      userId: 'jose@cochefix.com',
      userName: 'Jose Ramirez',
      userRole: 'Service Provider',
      userSpecialization: 'Engine / Transmission',
      userVerified: true,
      content:
        'That clunking sound when turning at low speed is a classic sign of worn CV (Constant Velocity) joints or a worn ball joint. CV joints allow the axle to transmit power to the front wheels while the steering turns. When the rubber boot cracks, grease escapes and the joint deteriorates rapidly.\n\nIf the noise specifically occurs during slow tight turns (reversing into a parking spot), CV joint failure is almost certain. Have a mechanic lift the car and inspect the CV boots for cracks or grease splatter. Replacement cost in Lagos is typically ₦15,000–₦35,000 for the joint plus labour.',
      timestamp: now - DAY * 2,
      upvotes: 9,
      upvotedBy: ['bisi@cochefix.com'],
      isAccepted: true,
    },
    {
      id: 2,
      questionId: 2,
      userId: 'samson@cochefix.com',
      userName: 'Samson Okafor',
      userRole: 'Service Provider',
      userSpecialization: 'Electrical Systems',
      userVerified: false,
      content:
        'Overheating despite normal coolant levels often points to a stuck thermostat or failing water pump. The thermostat may be stuck closed, preventing coolant circulation. A quick test: start the car cold and feel the upper radiator hose. When the engine reaches operating temperature, the hose should get firm as coolant flows through. If it stays cold, the thermostat is stuck.\n\nIf the water pump impeller is damaged, the pump spins but pushes no coolant — requires pump replacement. Start with the thermostat (₦3,500–₦6,000 for a quality Stant or Gates unit) before touching the water pump.',
      timestamp: now - DAY / 2,
      upvotes: 3,
      upvotedBy: [],
      isAccepted: false,
    },
  ];

  const comments: Comment[] = [
    {
      id: 1,
      questionOrAnswerId: 1,
      isAnswer: false,
      userId: 'bisi@cochefix.com',
      userName: 'Bisi Alao',
      content: 'Thank you! I will check the CV boot this weekend.',
      timestamp: now - DAY * 1.5,
    },
  ];

  const listings: MarketplaceListing[] = [
    {
      id: 1,
      title: 'Premium Engine Oil Filter — Honda & Toyota Universal Fit',
      description:
        'High-quality OEM-spec oil filter compatible with most Honda and Toyota engines. Prevents contaminants from reaching engine internals. Pack of 2.',
      price: 3500,
      userId: 'jose@cochefix.com',
      userName: 'Jose Ramirez',
      userRole: 'Service Provider',
      userPhone: '+2348101234567',
      category: 'Parts',
      location: 'Victoria Island, Lagos',
      isApproved: true,
      partsGrade: 'OEM Equivalent',
      application: 'Honda Civic/Accord, Toyota Camry/Corolla 2012-2022',
      partBrand: 'Denso',
      isFeaturedBottom: true,
      timestamp: now - DAY * 5,
    },
    {
      id: 2,
      title: 'Full Diagnostics & Engine Tune-Up Service',
      description:
        'Complete OBD-II scan, engine timing check, spark plug replacement, air/fuel filter swap, and road test. Certified mechanics. Doorstep service available on Victoria Island.',
      price: 25000,
      userId: 'jose@cochefix.com',
      userName: 'Jose Ramirez',
      userRole: 'Service Provider',
      userPhone: '+2348101234567',
      category: 'Services',
      location: 'Victoria Island, Lagos',
      isApproved: true,
      partsGrade: '',
      application: '',
      partBrand: '',
      isFeaturedBottom: false,
      timestamp: now - DAY * 4,
    },
    {
      id: 3,
      title: 'OBD-II Bluetooth Adapter & Diagnostic Software',
      description:
        'Turn your phone into a powerful diagnostic tool. Reads real-time ECU parameters, logs sensor data, and clears trouble codes instantly. Compatible with all OBD-II vehicles from 1996.',
      price: 35000,
      userId: 'samson@cochefix.com',
      userName: 'Samson Okafor',
      userRole: 'Service Provider',
      userPhone: '+2348029876543',
      category: 'Parts',
      location: 'Surulere, Lagos',
      isApproved: false,
      partsGrade: '',
      application: 'Universal — All OBD-II vehicles 1996+',
      partBrand: 'Launch Tech',
      isFeaturedBottom: false,
      timestamp: now - DAY * 2,
    },
    {
      id: 4,
      title: 'Toyota Land Cruiser Front Brake Disc Set (Genuine OEM)',
      description:
        'Genuine Toyota OEM front brake discs for Land Cruiser 200 Series (2007-2021). Both discs included. Direct fit, no machining required.',
      price: 85000,
      userId: 'jose@cochefix.com',
      userName: 'Jose Ramirez',
      userRole: 'Service Provider',
      userPhone: '+2348101234567',
      category: 'Parts',
      location: 'Victoria Island, Lagos',
      isApproved: true,
      partsGrade: 'Genuine OEM',
      application: 'Toyota Land Cruiser 200 Series 2007-2021',
      partBrand: 'Toyota Genuine',
      isFeaturedBottom: true,
      timestamp: now - DAY * 3,
    },
  ];

  const ratings: ProviderRating[] = [
    {
      id: 1,
      providerId: 'jose@cochefix.com',
      raterId: 'bisi@cochefix.com',
      raterName: 'Bisi Alao',
      ratingValue: 5,
      feedback:
        'Excellent service! Jose diagnosed my CV joint issue accurately and fixed it same day. Very professional and fair pricing.',
      timestamp: now - DAY,
    },
  ];

  const cmsConfig: CmsConfig = {
    announcementText: "Welcome to CocheTalk.NG — Nigeria's trusted vehicle aftersales platform!",
    announcementActive: true,
    featuredPartsLabel: 'Top Rated Parts',
    featuredServicesLabel: 'Verified Mechanic Services',
    specializationTags: [
      'Engine', 'Transmission', 'Electrical Systems', 'Brakes',
      'Tyres & Suspension', 'Body & Paint', 'Air Conditioning',
      'Welding', 'Diagnostics', 'General Repairs',
    ],
  };

  const convId = makeConvId('bisi@cochefix.com', 'jose@cochefix.com');
  const messages: Message[] = [
    {
      id: 1,
      conversationId: convId,
      senderId: 'bisi@cochefix.com',
      senderName: 'Bisi Alao',
      content: 'Hi Jose, I saw your listing for engine oil filter. Is it compatible with a 2019 Toyota Camry 2.5L?',
      timestamp: now - DAY - 3600000,
      read: true,
    },
    {
      id: 2,
      conversationId: convId,
      senderId: 'jose@cochefix.com',
      senderName: 'Jose Ramirez',
      content: 'Yes! That filter fits the 2019 Camry 2.5L perfectly. I also have the drain plug washer if you need it. Come by MechFix Auto anytime.',
      timestamp: now - DAY - 1800000,
      read: true,
    },
    {
      id: 3,
      conversationId: convId,
      senderId: 'bisi@cochefix.com',
      senderName: 'Bisi Alao',
      content: 'Great! How much for both the filter and the washer?',
      timestamp: now - 7200000,
      read: false,
    },
  ];

  const conversations: Conversation[] = [
    {
      id: convId,
      participantIds: ['bisi@cochefix.com', 'jose@cochefix.com'],
      participantNames: ['Bisi Alao', 'Jose Ramirez'],
      lastMessage: 'Great! How much for both the filter and the washer?',
      lastTimestamp: now - 7200000,
      unreadBy: ['jose@cochefix.com'],
    },
  ];

  return {
    users,
    questions,
    answers,
    comments,
    listings,
    ratings,
    cmsConfig,
    currentUserId: 'bisi@cochefix.com',
    messages,
    conversations,
  };
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          setState(JSON.parse(raw) as AppState);
        } catch {
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
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
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
    save({ ...state, currentUserId: null });
  }, [state, save]);

  const register = useCallback(
    (data: Omit<User, 'isBanned' | 'verified'>) => {
      if (!state) return;
      const newUser: User = { ...data, verified: false, isBanned: false };
      save({ ...state, users: [...state.users, newUser], currentUserId: newUser.id });
    },
    [state, save],
  );

  const askQuestion = useCallback(
    (
      data: Omit<
        Question,
        | 'id'
        | 'userId'
        | 'userName'
        | 'userRole'
        | 'userSpecialization'
        | 'userVerified'
        | 'timestamp'
        | 'upvotes'
        | 'upvotedBy'
        | 'acceptedAnswerId'
      >,
    ) => {
      if (!state || !currentUser) return;
      const newQ: Question = {
        ...data,
        id: Date.now(),
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        userSpecialization: currentUser.specialization.join(', '),
        userVerified: currentUser.verified,
        timestamp: Date.now(),
        upvotes: 0,
        upvotedBy: [],
        acceptedAnswerId: -1,
      };
      save({ ...state, questions: [newQ, ...state.questions] });
    },
    [state, currentUser, save],
  );

  const deleteQuestion = useCallback(
    (id: number) => {
      if (!state) return;
      save({
        ...state,
        questions: state.questions.filter((q) => q.id !== id),
        answers: state.answers.filter((a) => a.questionId !== id),
      });
    },
    [state, save],
  );

  const upvoteQuestion = useCallback(
    (id: number) => {
      if (!state || !currentUser) return;
      save({
        ...state,
        questions: state.questions.map((q) => {
          if (q.id !== id) return q;
          const voted = q.upvotedBy.includes(currentUser.id);
          return voted
            ? { ...q, upvotes: q.upvotes - 1, upvotedBy: q.upvotedBy.filter((uid) => uid !== currentUser.id) }
            : { ...q, upvotes: q.upvotes + 1, upvotedBy: [...q.upvotedBy, currentUser.id] };
        }),
      });
    },
    [state, currentUser, save],
  );

  const answerQuestion = useCallback(
    (questionId: number, content: string) => {
      if (!state || !currentUser) return;
      const newAnswer: Answer = {
        id: Date.now(),
        questionId,
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        userSpecialization: currentUser.specialization.join(', '),
        userVerified: currentUser.verified,
        content,
        timestamp: Date.now(),
        upvotes: 0,
        upvotedBy: [],
        isAccepted: false,
      };
      save({ ...state, answers: [...state.answers, newAnswer] });
    },
    [state, currentUser, save],
  );

  const upvoteAnswer = useCallback(
    (id: number) => {
      if (!state || !currentUser) return;
      save({
        ...state,
        answers: state.answers.map((a) => {
          if (a.id !== id) return a;
          const voted = a.upvotedBy.includes(currentUser.id);
          return voted
            ? { ...a, upvotes: a.upvotes - 1, upvotedBy: a.upvotedBy.filter((uid) => uid !== currentUser.id) }
            : { ...a, upvotes: a.upvotes + 1, upvotedBy: [...a.upvotedBy, currentUser.id] };
        }),
      });
    },
    [state, currentUser, save],
  );

  const acceptAnswer = useCallback(
    (questionId: number, answerId: number) => {
      if (!state) return;
      save({
        ...state,
        questions: state.questions.map((q) =>
          q.id === questionId ? { ...q, acceptedAnswerId: answerId } : q,
        ),
        answers: state.answers.map((a) => ({
          ...a,
          isAccepted: a.questionId === questionId ? a.id === answerId : a.isAccepted,
        })),
      });
    },
    [state, save],
  );

  const addComment = useCallback(
    (parentId: number, isAnswer: boolean, content: string) => {
      if (!state || !currentUser) return;
      const newComment: Comment = {
        id: Date.now(),
        questionOrAnswerId: parentId,
        isAnswer,
        userId: currentUser.id,
        userName: currentUser.name,
        content,
        timestamp: Date.now(),
      };
      save({ ...state, comments: [...state.comments, newComment] });
    },
    [state, currentUser, save],
  );

  const createListing = useCallback(
    (
      data: Omit<
        MarketplaceListing,
        'id' | 'userId' | 'userName' | 'userRole' | 'userPhone' | 'isApproved' | 'isFeaturedBottom' | 'timestamp'
      >,
    ) => {
      if (!state || !currentUser) return;
      const newListing: MarketplaceListing = {
        ...data,
        id: Date.now(),
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        userPhone: currentUser.phone,
        isApproved: currentUser.role === 'Admin',
        isFeaturedBottom: false,
        timestamp: Date.now(),
      };
      save({ ...state, listings: [newListing, ...state.listings] });
    },
    [state, currentUser, save],
  );

  const deleteListing = useCallback(
    (id: number) => {
      if (!state) return;
      save({ ...state, listings: state.listings.filter((l) => l.id !== id) });
    },
    [state, save],
  );

  const approveListing = useCallback(
    (id: number, approved: boolean) => {
      if (!state) return;
      save({
        ...state,
        listings: state.listings.map((l) => (l.id === id ? { ...l, isApproved: approved } : l)),
      });
    },
    [state, save],
  );

  const featureListing = useCallback(
    (id: number, featured: boolean) => {
      if (!state) return;
      save({
        ...state,
        listings: state.listings.map((l) => (l.id === id ? { ...l, isFeaturedBottom: featured } : l)),
      });
    },
    [state, save],
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
      if (!state) return;
      save({
        ...state,
        users: state.users.map((u) => (u.id === userId ? { ...u, verified } : u)),
      });
    },
    [state, save],
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
