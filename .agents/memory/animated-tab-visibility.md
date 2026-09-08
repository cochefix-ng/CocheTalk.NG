---
name: Animated tab visibility
description: Platform decision for scroll-driven bottom navigation behavior.
---

Scroll-driven hide/show behavior uses Expo Router's classic `Tabs` layout rather than the platform-native tab-bar path. Animate the supported `tabBarStyle` directly; do not import React Navigation tab components into route files.

**Why:** The native tab-bar implementation does not expose the same animated transform surface needed for consistent 280 ms slide transitions. Expo Router SDK 56+ also rejects direct React Navigation imports during bundling.

**How to apply:** Keep scroll visibility state shared above the tabs, attach handlers only to each screen's primary vertical scroller, animate the Expo Router tab-bar style, and leave tab selection/navigation state owned by Expo Router.