---
name: Managed Clerk social providers
description: Provider availability constraints for the Replit-managed Clerk tenant.
---

Replit-managed Clerk does not currently list Facebook as a supported social sign-in provider. Google, GitHub, Apple, and X are the supported SSO providers documented for this tenant.

**Why:** Adding an `oauth_facebook` button without enabling the provider would create a broken authentication path.

**How to apply:** Use a working managed provider such as Google in the app. If Facebook is required, treat it as a separate provider-configuration task and do not present it as active until the selected Clerk/OAuth setup supports it.