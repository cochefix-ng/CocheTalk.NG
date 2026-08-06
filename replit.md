# CocheTalk.NG

Nigeria's vehicle aftersales platform — a React Native Expo app where car owners and mechanics connect via Q&A, a mechanics-only Pro Circle, an AI-powered Vehicle Clinic, and a WhatsApp-integrated parts/services marketplace.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/cochetalk run dev` — run the Expo app (port from workflow)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- Required env: `GEMINI_API_KEY` — Gemini 2.0 Flash for AI Vehicle Clinic diagnoses

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Mobile: Expo ~54, expo-router ~6, React Native 0.81.5
- API: Express 5 (port 8080, mounted at `/api`)
- State: React Context + AsyncStorage (no database — all data persisted on-device)
- AI: Google Gemini 2.0 Flash via `GEMINI_API_KEY`
- API codegen: Orval (OpenAPI → React Query hooks + Zod schemas)
- Icons: `@expo/vector-icons` Feather + `expo-symbols` SF Symbols (iOS)

## Where things live

- `artifacts/cochetalk/` — Expo mobile app
  - `app/(tabs)/` — 5 tab screens: `index` (Forum), `pro` (Pro Circle), `marketplace`, `clinic`, `profile`
  - `app/question/[id].tsx` — Question detail with answers + comments
  - `app/seller/[id].tsx` — Seller/mechanic profile with listings + ratings
  - `context/AppContext.tsx` — All state, seed data, CRUD actions, AsyncStorage persistence (v4)
  - `app/discussion/[id].tsx` — Discussion detail with replies, media lightbox, upvote, delete
  - `components/DiscussionCard.tsx` — Reusable discussion list card (thumbnail + type badge)
  - `components/QuestionCard.tsx` — Reusable question list item
  - `components/ListingCard.tsx` — Reusable listing card with WhatsApp CTA
  - `constants/colors.ts` — CocheTalk brand tokens (VibrantTeal #00EBBA, CharcoalDark #121212)
- `artifacts/api-server/src/routes/diagnose.ts` — POST `/api/diagnose` → Gemini AI
- `lib/api-spec/` — OpenAPI spec (source of truth for API contract)
- `lib/api-client-react/` — Generated React Query hooks (`useDiagnoseVehicle`)
- `lib/api-zod/` — Generated Zod schemas (`DiagnoseVehicleBody`, `DiagnoseVehicleResponse`)

## Architecture decisions

- All app data stored in `AsyncStorage` under key `cochetalk_state_v1` — no database needed; the app ships with rich seed data
- Users identified by email address as ID; emails in URLs are passed through `encodeURIComponent`/`decodeURIComponent`
- `useDiagnoseVehicle` mutation takes `{ data: DiagnoseRequest }` (orval wrapping convention)
- Pro Circle questions use `isPrivateEcosystem: true`; Car Owners see a restricted screen
- Tab bar uses `NativeTabs` (iOS 26 Liquid Glass) with `ClassicTabLayout` (BlurView) fallback
- Admin role unlocks an inline admin panel in the Profile tab (no separate route needed)

## Product

- **Q&A Forum** — Ask and answer vehicle questions with tag/concern filtering, upvotes, accepted answers
- **General Discussion** — Share experiences, tips, and knowledge; supports optional title, required content, tags (preset + custom), and up to 4 media attachments (images/videos)
- **Pro Circle** — Mechanics-only private forum for technical trade discussion
- **Marketplace** — Parts, services, and accessories listings with WhatsApp contact CTA
- **AI Vehicle Clinic** — Describe a vehicle problem, get a structured Gemini-powered diagnostic report
- **Profile / Admin** — Account management, account switcher (4 demo accounts), and full admin panel

## Demo Accounts

| Email | Role |
|---|---|
| `bisi@cochefix.com` | Car Owner |
| `jose@cochefix.com` | Verified Service Provider |
| `samson@cochefix.com` | Unverified Service Provider |
| `admin@cochetalk.com` | Admin |

## Gotchas

- `GEMINI_API_KEY` must be set as a secret for the AI Clinic to work
- Run `pnpm --filter @workspace/api-spec run codegen` after any OpenAPI spec changes before editing screens
- Seller profile URLs encode the user's email: `router.push('/seller/' + encodeURIComponent(userId))`
- The AsyncStorage key is `cochetalk_state_v1` — increment the version to reset all data on next launch

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
