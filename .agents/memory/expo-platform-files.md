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
The list's `ListHeaderComponent` starts with a transparent spacer (~0.6×screen height,
`pointerEvents: "none"`) then an opaque rounded panel; each row is wrapped opaque so the
panel background is seamless.

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
