# CocheTalk.NG

Nigeria's vehicle aftersales platform — a React Native/Expo mobile app with an Express API backend, built as a pnpm monorepo.

## Project Structure

```
├── apps/
│   ├── api/              Express API server (Clerk auth, Gemini AI diagnostics)
│   └── mobile/           Expo/React Native mobile app
├── packages/
│   ├── api-client-react/  Generated React Query hooks (Orval)
│   ├── api-spec/          OpenAPI specification + codegen config
│   ├── api-zod/           Generated Zod validation schemas
│   └── db/                Drizzle ORM schema (PostgreSQL)
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── tsconfig.json
```

## Prerequisites

- **Node.js** ≥ 20
- **pnpm** ≥ 9 (`npm install -g pnpm`)
- **Expo Go** on your mobile device (for testing the app)

## Getting Started

### 1. Install dependencies

```bash
pnpm install
```

### 2. Set up environment variables

```bash
cp .env.example .env
# Fill in the required values (see .env.example for details)
```

### 3. Start the API server

```bash
pnpm dev:api
```

The API server starts on `http://localhost:8080` by default.

### 4. Start the mobile app

```bash
pnpm dev:app
```

This launches Expo — scan the QR code with Expo Go on your device.

## Available Scripts

| Script | Description |
|---|---|
| `pnpm dev:api` | Build & start the API server in development mode |
| `pnpm dev:app` | Start the Expo development server |
| `pnpm build` | Typecheck all packages and build everything |
| `pnpm typecheck` | Run TypeScript type checking across the workspace |
| `pnpm typecheck:libs` | Typecheck shared packages only |

## Key Features

- **Q&A Forum** — Vehicle troubleshooting with concern tags (see/hear/smell/feel)
- **Pro Circle** — Private forum for verified mechanics
- **Marketplace** — Parts, services, and car sales listings
- **AI Vehicle Clinic** — Gemini 2.0 Flash-powered diagnostics
- **In-App Messaging** — Direct conversations with WhatsApp deep links
- **Admin Dashboard** — User management, content moderation, CMS

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile | Expo 57, React Native 0.86, expo-router |
| API | Express 5, Pino logger |
| Auth | Clerk |
| AI | Google Gemini 2.0 Flash |
| Database | Drizzle ORM + PostgreSQL (schema scaffolded) |
| API Contract | OpenAPI → Orval → React Query hooks + Zod schemas |

## Environment Variables

See [`.env.example`](.env.example) for the full list. Key variables:

- `CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` — Clerk authentication
- `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` — Clerk key for mobile app
- `GEMINI_API_KEY` — Google Gemini API for AI diagnostics
- `DATABASE_URL` — PostgreSQL connection string
- `PORT` — API server port (defaults to 8080)

## License

MIT
