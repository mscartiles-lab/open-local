---
name: Mobile-web feature parity
description: Standing rule — any workflow or feature added to the mobile app must also be reflected in the web app, and vice versa.
---

**Rule:** When implementing a feature in the mobile app (`artifacts/open-local-mobile`), always check whether the equivalent web page (`artifacts/open-local`) needs the same update, and apply it in the same task.

**Why:** User explicitly requested this so both platforms stay in sync without requiring a separate follow-up task each time.

**How to apply:**
- After updating a mobile tab, check the matching web page (see map below) and update it to match the same workflow.
- Key shared workflows to keep in sync: proximity/radius filter (½ mi, 1 mi, 2 mi, 5 mi), "Beyond X mi" divider in lists, listing-type filter chips, search, sort options.

**Mobile → Web page map:**
- `app/(tabs)/index.tsx` (The Locals) → `pages/vendors.tsx` + `components/HeroMap.tsx`
- `app/(tabs)/goods.tsx` → `pages/products.tsx`
- `app/(tabs)/sale.tsx` → `pages/surplus.tsx`
- `app/(tabs)/final-sale.tsx` → `pages/surplus.tsx`
- `app/(tabs)/events.tsx` → `pages/events.tsx`
- `app/(tabs)/listings.tsx` → `pages/listings.tsx`
- `app/(tabs)/browse.tsx` → `pages/vendors.tsx`

**Shared proximity utilities:**
- Web: `artifacts/open-local/src/hooks/use-proximity.ts` — `useProximity()` hook + `haversineMiles()`, `PROXIMITY_PICKS`, `PROXIMITY_LABELS`
- Mobile: `utils/distance.ts` + `components/MiniMap.native.tsx` radius controls

**Quick picks (same on both platforms):** `[0.5, 1, 2, 5]` → labels `½ mi, 1 mi, 2 mi, 5 mi`. Default radius: 1 mi.
