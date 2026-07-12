# CocheTalk.NG — Developer Reference

> Nigeria's vehicle aftersales platform. React Native / Expo mobile app with an Express API backend.
> Last updated: July 2026

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Architecture Overview](#architecture-overview)
3. [Folder Structure](#folder-structure)
4. [Dependencies](#dependencies)
5. [Data Model](#data-model)
6. [Feature Map](#feature-map)
7. [Known Issues & Technical Debt](#known-issues--technical-debt)
8. [Demo Accounts](#demo-accounts)
9. [Environment Variables](#environment-variables)
10. [Deployment Notes](#deployment-notes)

---

## Quick Start

```bash
# Install dependencies (from repo root)
pnpm install

# Run the API server (port 8080)
pnpm --filter @workspace/api-server run dev

# Run the Expo app
pnpm --filter @workspace/cochetalk run dev

# Full typecheck across all packages
pnpm run typecheck

# Regenerate API hooks and Zod schemas after OpenAPI spec changes
pnpm --filter @workspace/api-spec run codegen
```

---

## Architecture Overview

```
┌──────────────────────────────────────────────────┐
│  Expo Mobile App  (artifacts/cochetalk)           │
│  - expo-router (file-based routing)               │
│  - React Context + AsyncStorage (all state)       │
│  - React Query (API calls via generated hooks)    │
└──────────────────┬───────────────────────────────┘
                   │  HTTP  /api/*
┌──────────────────▼───────────────────────────────┐
│  Express API Server  (artifacts/api-server)       │
│  - POST /api/diagnose  → Gemini 2.0 Flash         │
│  - GET  /api/health                               │
└──────────────────────────────────────────────────┘
```

**State persistence:** The entire app state (users, questions, answers, listings, messages, CMS config) is stored in a single `AsyncStorage` key — `cochetalk_state_v3`. There is no external database. The app ships with rich seed data loaded on first launch.

**API contract:** Defined in `lib/api-spec/openapi.yaml`. Run `codegen` after any spec change to regenerate the React Query hooks (`lib/api-client-react`) and Zod schemas (`lib/api-zod`).

---

## Folder Structure

```
artifacts/
├── cochetalk/                    Mobile app (Expo)
│   ├── app/
│   │   ├── (tabs)/               Tab screens (bottom navigation)
│   │   │   ├── _layout.tsx       Tab bar configuration, visibility control
│   │   │   ├── index.tsx         Forum (Q&A feed + filters)
│   │   │   ├── pro.tsx           Pro Circle (mechanics-only private forum)
│   │   │   ├── marketplace.tsx   Listings browser + creation form
│   │   │   ├── messages.tsx      Inbox (conversation list)
│   │   │   ├── clinic.tsx        AI Vehicle Clinic (Gemini-powered)
│   │   │   └── profile.tsx       User profile + Admin dashboard
│   │   ├── conversation/[id].tsx  1-on-1 message thread
│   │   ├── listing/[id].tsx       Full listing detail view
│   │   ├── question/[id].tsx      Question thread with answers + comments
│   │   ├── seller/[id].tsx        Seller / mechanic public profile
│   │   ├── +not-found.tsx         404 fallback screen
│   │   └── _layout.tsx            Root layout (fonts, providers, Stack config)
│   ├── components/
│   │   ├── CommunityLoader.tsx    Animated splash screen (shown once on launch)
│   │   ├── ErrorBoundary.tsx      React class-based error boundary
│   │   ├── ErrorFallback.tsx      UI shown when ErrorBoundary catches an error
│   │   ├── KeyboardAwareScrollViewCompat.tsx  Web/native keyboard scroll shim
│   │   ├── ListingCard.tsx        Marketplace listing card (used in list + admin)
│   │   └── QuestionCard.tsx       Forum question card (used in index + pro)
│   ├── constants/
│   │   └── colors.ts              Brand design tokens (light palette + radius)
│   ├── context/
│   │   └── AppContext.tsx         All state, seed data, and CRUD actions
│   ├── hooks/
│   │   └── useColors.ts           Returns design tokens for the current scheme
│   ├── utils/
│   │   └── exportUtils.ts         CSV export helpers (users, listings, analytics)
│   ├── scripts/
│   │   └── build.js               Web build automation (Expo export + asset copy)
│   └── server/
│       └── serve.js               Static file server for the exported web bundle
│
├── api-server/                   Express backend
│   └── src/
│       ├── app.ts                 Express app factory
│       ├── index.ts               Server entry point
│       ├── lib/logger.ts          Pino logger singleton
│       └── routes/
│           ├── index.ts           Route registration
│           ├── diagnose.ts        POST /api/diagnose (Gemini AI)
│           └── health.ts          GET /api/health
│
lib/
├── api-spec/openapi.yaml          OpenAPI spec (source of truth for the API)
├── api-client-react/              Generated React Query hooks (useDiagnoseVehicle)
├── api-zod/                       Generated Zod schemas for request/response validation
└── db/                            Drizzle ORM config (PostgreSQL — not yet used)
```

---

## Dependencies

### Mobile App (`artifacts/cochetalk`)

| Package | Version | Purpose |
|---|---|---|
| `expo` | ~54 | Core Expo SDK — managed workflow runtime |
| `expo-router` | ~6 | File-based navigation (Stack + Tabs) |
| `react-native` | 0.81.5 | Core React Native runtime |
| `react` | catalog | UI framework |
| `@react-native-async-storage/async-storage` | 2.2.0 | On-device persistence for all app state |
| `@tanstack/react-query` | catalog | Server state management for API calls |
| `@workspace/api-client-react` | workspace | Generated hooks (`useDiagnoseVehicle`) |
| `expo-blur` | ~15 | BlurView for iOS tab bar background |
| `expo-constants` | ~18 | Access to app config and environment |
| `expo-file-system` | ^56 | File I/O for CSV export (native only) |
| `expo-font` | ~14 | Custom font loading |
| `expo-glass-effect` | ~0.1 | Liquid Glass tab bar (iOS 26+) |
| `expo-haptics` | ~15 | Tactile feedback on interactions |
| `expo-image` | ~3 | Performant image component |
| `expo-image-picker` | ~17 | Camera roll access for logo uploads (CMS) |
| `expo-linear-gradient` | ~15 | Gradient backgrounds |
| `expo-linking` | ~8 | Deep links and external URL handling |
| `expo-location` | ~19 | Device GPS (not yet wired to features) |
| `expo-sharing` | ^56 | Share CSV exports via native share sheet |
| `expo-splash-screen` | ~31 | Controls the native splash screen |
| `expo-symbols` | ~1.0 | SF Symbols on iOS |
| `expo-system-ui` | ~6 | System UI chrome customization |
| `expo-web-browser` | ~15 | In-app browser for external links |
| `react-native-gesture-handler` | ~2.28 | Gesture detection (swipe, drag) |
| `react-native-keyboard-controller` | 1.18.5 | Advanced keyboard inset handling |
| `react-native-reanimated` | ~4.1 | Smooth JS-driven animations |
| `react-native-safe-area-context` | ~5.6 | Safe area insets (notch, home bar) |
| `react-native-screens` | ~4.16 | Native navigation screens |
| `react-native-svg` | 15.12.1 | SVG rendering |
| `react-native-web` | ^0.21 | Web support for the Expo app |
| `react-native-worklets` | 0.5.1 | Background JS threads for reanimated |
| `zod` | catalog | Schema validation |
| `@expo-google-fonts/inter` | ^0.4 | Inter font family |
| `@expo/vector-icons` | ^15 | Icon set (Feather icons used throughout) |
| `babel-plugin-react-compiler` | beta | Experimental React Compiler for perf |

### API Server (`artifacts/api-server`)

| Package | Purpose |
|---|---|
| `express` | HTTP server |
| `@google/genai` | Gemini 2.0 Flash AI (vehicle diagnostics) |
| `pino` / `pino-http` | Structured JSON logging |
| `zod` | Request/response validation via generated schemas |

### Shared Libraries (`lib/`)

| Package | Purpose |
|---|---|
| `lib/api-spec` | OpenAPI YAML — single source of truth for the API contract |
| `lib/api-client-react` | Orval-generated React Query hooks for the mobile app |
| `lib/api-zod` | Orval-generated Zod schemas for server-side validation |
| `lib/db` | Drizzle ORM + PostgreSQL schema (configured but not yet used in production) |

---

## Data Model

All data lives in `context/AppContext.tsx`. Key types:

| Type | Description |
|---|---|
| `User` | Platform user (Car Owner / Service Provider / Admin). `id` is the user's email address. |
| `Question` | Forum post. `isPrivateEcosystem: true` means it belongs to the Pro Circle. |
| `Answer` | Reply to a Question. `acceptedAnswerId` on the Question marks the best answer. |
| `Comment` | Reply to either a Question or an Answer. |
| `MarketplaceListing` | Parts / Services / Car Sales listing. `isFeaturedBottom: true` promotes it to the Forum banner. |
| `ProviderRating` | 1–5 star rating left by a user on a Service Provider. |
| `Message` | Individual chat message within a Conversation. |
| `Conversation` | Thread between exactly two users. ID is `makeConvId(userA, userB)` — sorted, `__`-joined emails. |
| `CmsConfig` | Admin-controlled platform settings (announcements, tags, logo URIs, page visibility). |

**Storage key:** `cochetalk_state_v3`
> Increment to `v4` when making a breaking schema change. This clears all persisted data on next launch and reloads seed data.

---

## Feature Map

| Feature | Status | Notes |
|---|---|---|
| Q&A Forum | ✅ Complete | Filtering, upvotes, accepted answers, comments |
| Pro Circle | ✅ Complete | Mechanics-only, hidden from Car Owners |
| Marketplace | ✅ Complete | Parts, Services, Car Sales with full detail view |
| AI Vehicle Clinic | ✅ Complete | Requires `GEMINI_API_KEY` secret |
| In-App Messaging | ✅ Complete | Real-time-style 1-on-1 conversations |
| WhatsApp Integration | ✅ Complete | Seller-opt-in; opens wa.me deep link |
| Admin Dashboard | ✅ Complete | User management, listing moderation, export |
| Admin CMS | ✅ Complete | Announcements, tags, logos, page visibility |
| CSV Export | ✅ Complete | Users, listings, activities, analytics reports |
| Dark Mode | ⚠️ Partial | `useColors` hook supports it; dark token palette not yet defined in `constants/colors.ts` |
| GPS / Location Features | ⚠️ Not wired | `expo-location` is installed but not used in any screen |
| Real-time Updates | ⚠️ Not applicable | State is local-only (AsyncStorage); no WebSocket / push layer |
| Database Backend | ⚠️ Not active | `lib/db` (Drizzle + PostgreSQL) is scaffolded but not connected to any route |
| Push Notifications | ❌ Not implemented | No push token registration or notification service |
| User Registration | ⚠️ Admin-only | Only admins can create new accounts via the admin panel |

---

## Known Issues & Technical Debt

### 1. Single AsyncStorage blob
All app state is serialised into one JSON blob under `cochetalk_state_v3`. This is fine for a demo/MVP but will cause performance issues at scale. A future migration should split state across multiple keys (or move to SQLite via `expo-sqlite`).

### 2. `expo-file-system/legacy` import in `exportUtils.ts`
The CSV export utility uses the `/legacy` sub-path of `expo-file-system`. This is intentional — the main `expo-file-system` v56 export uses a different async API, and the legacy path is the stable compatibility shim for `writeAsStringAsync` / `EncodingType`. **Do not change this without testing the export feature on a real device.**

### 3. Pre-existing TypeScript error in `hooks/useColors.ts`
```
hooks/useColors.ts(21,10): error TS2339: Property 'radius' does not exist on type …
```
This is a scaffold-generated type mismatch in `constants/colors.ts`. The `radius` key is present at runtime but TypeScript cannot see it because the `colors` object is typed as `{ light: … }` without the `radius` top-level key. Fix: add `radius` to the top-level type in `constants/colors.ts`.

### 4. No user self-registration flow
New users can only be created by an Admin through the admin panel. There is no public sign-up screen. To add one, create `app/register.tsx` and add a `register` action to `AppContext` (the action already exists — it just has no public UI).

### 5. `profile.tsx` complexity
The Profile tab file is 1,200+ lines and handles three distinct concerns: self-profile editing, account switching, and the full admin dashboard. For long-term maintainability, consider extracting:
- `components/admin/UserManagementPanel.tsx`
- `components/admin/ListingModerationPanel.tsx`
- `components/admin/CmsPanel.tsx`

### 6. `expo-location` is installed but unused
The package is in `devDependencies`. Either wire it to a location-based feature (e.g. nearby mechanics) or remove it to keep the dependency list clean.

### 7. `lib/db` is scaffolded but inactive
`lib/db/src/schema/index.ts` contains only commented-out boilerplate. The API server does not use a database — all data lives on-device. If a shared backend database is needed in the future, uncomment and define the Drizzle schema here.

---

## Demo Accounts

| Email | Role | Notes |
|---|---|---|
| `bisi@cochefix.com` | Car Owner | Cannot see Pro Circle |
| `jose@cochefix.com` | Service Provider (Verified) | WhatsApp enabled |
| `samson@cochefix.com` | Service Provider (Unverified) | No WhatsApp |
| `admin@cochetalk.com` | Admin | Full admin panel + CMS access |

Switch accounts in **Profile → Switch Account** (no password required in demo mode).

---

## Environment Variables

| Variable | Required | Used By | Description |
|---|---|---|---|
| `GEMINI_API_KEY` | Yes (for Clinic) | `api-server` | Google Gemini 2.0 Flash API key |
| `SESSION_SECRET` | Yes | `api-server` | Express session signing secret |
| `PORT` | Auto (workflow) | Both | Service port, injected by Replit workflow |
| `REPLIT_DEV_DOMAIN` | Auto | Mobile app | Dev domain for API base URL |
| `EXPO_PUBLIC_DOMAIN` | Auto | Mobile app | Sets the API base URL in the Expo bundle |

Set secrets via the Replit Secrets panel — never commit them to source control.

---

## Deployment Notes

- The app is a pnpm monorepo. Each artifact is an independent deployable unit managed by a Replit workflow.
- The mobile app can be published as a **web app** via `pnpm --filter @workspace/cochetalk run build` + `serve`.
- The API server must be running for the AI Vehicle Clinic to function.
- All other features work fully offline (no network required) since they use local AsyncStorage.
- When deploying to production, bump `STORAGE_KEY` in `AppContext.tsx` if the schema changed, to prevent old stored data from crashing the app.
