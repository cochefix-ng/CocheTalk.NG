---
name: Animated tab visibility
description: Platform decision for scroll-driven bottom navigation behavior.
---

Scroll-driven hide/show behavior is implemented through the classic React Navigation bottom bar rather than the platform-native tab-bar path.

**Why:** The native tab-bar implementation does not expose the same animated transform surface needed for consistent 280 ms slide transitions, while the classic bar preserves the existing visual styling and supports animated visibility.

**How to apply:** Keep scroll visibility state shared above the tabs, attach handlers only to each screen's primary vertical scroller, and leave tab selection/navigation state owned by React Navigation.