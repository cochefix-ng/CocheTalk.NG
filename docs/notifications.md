# CocheTalk.NG notifications

## What is included

- Per-user notification preferences with all seven categories enabled by default.
- Server-side precedence: notification category must exist, the global category must be enabled, the recipient preference must be enabled, and push delivery must have an active valid Expo token.
- Multiple active devices per user, token upsert/de-duplication, logout deactivation, and deactivation of tokens reported by Expo as `DeviceNotRegistered`.
- Persisted in-app notifications with unread state, mark-one-read, mark-all-read, and navigation payloads.
- Expo foreground presentation plus native notification-response handling, including cold-start response handling.
- Admin global category controls, confirmation before disabling, and an audit log endpoint.
- Event adapters for answers, comments/replies, messages, marketplace approval changes, and provider verification.

## Server configuration

The API server must be configured with a trusted admin strategy. It does not trust the app's locally stored `Admin` role by itself.

Use one or both of these server environment variables:

- `CLERK_ADMIN_USER_IDS`: comma-separated Clerk user IDs.
- `CLERK_ADMIN_EMAILS`: comma-separated email addresses from signed Clerk session claims.

Alternatively, set signed Clerk session metadata with `role: "Admin"`. The `/api/notifications/admin/*` routes check these server-side before changing global settings or sending announcements.

The Expo push service is called directly by the API server. No Expo access token is required for the standard Expo push endpoint.

## Database

The notification tables are part of the workspace Drizzle schema. Apply development schema changes with:

```bash
pnpm --filter @workspace/db run push
```

The schema includes preferences, global settings, device tokens, notification records, and global-setting audit entries. Personal preferences are never overwritten when an administrator pauses a category.

## Native release setup

The Expo app now includes the `expo-notifications` plugin and stable native identifiers:

- Android package: `ng.cochetalk.app`
- iOS bundle identifier: `ng.cochetalk.app`

Before production push testing:

1. Link the app to an Expo/EAS project and set `EXPO_PUBLIC_EAS_PROJECT_ID` in the Expo build environment, or add the linked project ID to `expo.extra.eas.projectId`.
2. Configure Android FCM credentials in EAS and the iOS APNs credentials if iOS delivery is required.
3. Build and install a release/development build. Expo Go is not a substitute for validating production credentials and native identifiers.
4. Sign in on at least two physical Android devices, verify both tokens are registered, and test foreground, background, closed-app tap, permission denial, token re-registration, and logout.

The web preview intentionally skips native push registration and native notification-response APIs. It still renders the notification center and preferences screens without crashing.

## API surface

Authenticated user routes:

- `GET/PATCH /api/notifications/preferences`
- `POST/DELETE /api/notifications/push-tokens`
- `GET /api/notifications`
- `POST /api/notifications/:id/read`
- `POST /api/notifications/read-all`
- `POST /api/notifications/events`

Trusted admin routes:

- `GET /api/notifications/admin/global`
- `PATCH /api/notifications/admin/global/:type`
- `GET /api/notifications/admin/audit`
- `POST /api/notifications/admin/announcements`

The OpenAPI source is `lib/api-spec/openapi.yaml`; regenerate clients with `pnpm --filter @workspace/api-spec run codegen`.
