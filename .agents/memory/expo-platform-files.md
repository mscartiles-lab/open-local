---
name: Expo platform-specific component files + map-behind-list layout
description: How MiniMap's .native/.web/.tsx split works at runtime vs typecheck, and the full-screen-map-behind-scrolling-list gesture tradeoff in open-local-mobile.
---

# Platform file resolution (.native / .web / shim .tsx)

`components/MiniMap.{native,web}.tsx` plus a tiny `MiniMap.tsx` shim that re-exports
from `./MiniMap.web`. Screens import `@/components/MiniMap`.

- **At runtime**, Metro picks `MiniMap.native.tsx` on iOS/Android and `MiniMap.web.tsx`
  on web via platform extensions — it does NOT use the `.tsx` shim on native.
- **The `.tsx` shim exists only to satisfy TypeScript**, which doesn't understand
  Metro's `.native` resolution and needs a concrete module to type `@/components/MiniMap`.
- **Why this matters:** a code reviewer (or future you) may "notice" the shim re-exports
  the *web* variant and conclude native renders the web placeholder. That's a false
  positive — native maps render fine. Do NOT "fix" the shim. If you add a prop to the
  component, add it to ALL THREE files' prop interfaces or typecheck fails (only the
  web/shim-resolved file is what tsc sees).

# Full-screen map behind a scrolling list panel

The Locals (`app/(tabs)/index.tsx`) and Events (`app/(tabs)/events.tsx`) render a
full-bleed `MiniMap` (height = screen) absolutely behind a transparent `FlatList`.
The list's `ListHeaderComponent` starts with a transparent spacer (`mapPeek`,
`pointerEvents: "none"`) then an opaque rounded panel; each row is wrapped opaque so the
panel background is seamless. `mapPeek` controls how much empty map shows before the panel —
set to ~0.4×screen so the map is visible first but the list peeks in without a big scroll
(user disliked the original 0.6 because the list felt "gone").

**Gesture tradeoff (intentional):** the full-screen FlatList's scroll responder captures
vertical drags everywhere, so dragging anywhere — including over the visible map — scrolls
the list up over the map. This IS the requested "micro scroll to reach the list" gesture.
The cost is you cannot pan the map by dragging. Marker taps and the recenter button still
work because the spacer's `pointerEvents:"none"` lets taps fall through to the map layer.
**Why accept it:** MiniMap is a context/"near me" map, not an exploration map, and the
explicit product ask was scroll-to-reveal-list. If true map panning is ever required,
switch to a real bottom-sheet (e.g. @gorhom/bottom-sheet) so the map area above the sheet
stays interactive.

**RN API note:** use `style={{ pointerEvents: ... }}` (in the StyleSheet object or inline),
not the deprecated `pointerEvents` prop.

# MiniMap: always render the map, never gate on location permission

The map must render even if location permission is not yet granted (or denied). Show
Florida as the initial region, hide the user dot/circle when no permission, and render a
small "Enable location" pill overlay instead. Gating the MapView behind `permission.granted`
caused the map to appear blank on iOS for users who hadn't approved location yet.

# Light-mode-first theme with user toggle

`ThemeContext` (context/ThemeContext.tsx) reads/writes `ol_theme_pref` in AsyncStorage and
defaults to `"light"`. `useColors` pulls from ThemeContext, not `useColorScheme()`. The
settings modal at `app/settings.tsx` is the user-facing toggle. A gear icon in the Vendors
tab floating header opens it as an Expo Router modal (`presentation: "modal"`).
