---
name: Expo notification web guard
description: Native Expo notification response APIs are not implemented by the web shim.
---

Guard native-only Expo notification response APIs with a platform check before registering listeners or reading the last response. The web app should still render notification settings and the in-app center.

**Why:** The web preview throws when `getLastNotificationResponseAsync` is called, even though the same API is valid on native builds.

**How to apply:** Keep push registration and response listeners native-only, while leaving shared notification UI available on web.