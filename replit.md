# Open Local

National marketplace for local producers — bakers, farms, apiaries, ceramicists, brewers, butchers, florists, makers. Tagline: **Shop Local Wherever You Are**. Launching in Florida markets first, with a roadmap to expand state by state across the US. Build decisions should avoid hardcoding Florida-specific logic; use region/state filtering instead so new markets can be added without code changes.

## Rewards (vendor-confirmed visits)

Shoppers earn DiceBear avatar unlocks by visiting vendors. The vendor confirms each visit from their dashboard.

- Tables: `vendor_visits` (userId, vendorId, status: 'pending'|'approved'|'rejected', requestedAt, decidedAt) and `avatar_unlocks` (userId, unlockKey, unique). New `equipped_unlocks` jsonb column on `users`.
- Catalog: `artifacts/api-server/src/lib/avatarCatalog.ts` (server) mirrored in `artifacts/open-local/src/lib/unlockCatalog.ts` (web). Thresholds: 1/2/3/5/8/12/20/35 unique approved vendors.
- API:
  - `GET /api/rewards/catalog`
  - `GET /api/rewards/me` → `{ uniqueVendorCount, unlocks[], equipped[], pending[] }`
  - `POST /api/rewards/request-visit` `{ vendorId }` — shopper requests credit (no GPS); rejects duplicate pending/approved
  - `GET /api/rewards/vendor/:vendorId/pending` — vendor lists pending requests (auth: user.email matches vendor.contactEmail OR role=admin)
  - `POST /api/rewards/visits/:id/decide` `{ action: 'approve'|'reject' }` — awards unlocks on approve
  - `PATCH /api/rewards/equipped`
- UI: `CheckInButton` ("Request visit credit") on `/vendors/:id`, `VisitRequestsPanel` at top of vendor `/dashboard/:slug`, `/rewards` page (link in user dropdown). Avatar URL helper in `UserContext.avatarUrl(seed, style, equipped?)` appends DiceBear params from equipped items.

## Admin

- Promote: `UPDATE users SET role='admin' WHERE email='…'` OR add to `ADMIN_EMAILS` env var (comma-separated). `mscartiles@gmail.com` is pre-listed.
- `/admin` page tabs: Producers · Products · **Businesses** (approve/reject/delete establishments) · **Users** (change role, delete).
- Admin API: `GET/PATCH/DELETE /api/admin/users[/:id]`, `GET/DELETE /api/admin/establishments[/:id]`, plus existing `PATCH /api/establishments/:id`. All gated by `requireAdmin` (Bearer token from `ol_session`).

## Architecture

Pnpm monorepo with three artifacts:

- `artifacts/open-local` — React + Vite + Tailwind frontend at `/` (port 25681). Wouter for routing, TanStack Query, framer-motion, react-hook-form + zod, lucide-react icons.
- `artifacts/api-server` — Express 5 REST API at `/api`. Drizzle ORM, Zod validation.
- `artifacts/mockup-sandbox` — design preview server (scaffolding).

Shared workspace packages:

- `lib/api-spec` — OpenAPI spec at `lib/api-spec/openapi.yaml`. Source of truth.
- `lib/api-client-react` — Orval-generated React Query hooks (`useListVendors`, `useGetLocalNowFeed`, etc.).
- `lib/db` — Drizzle schema + Postgres client. Run `pnpm --filter @workspace/db run push` after schema changes.

## Domain model

- **Vendors** — `id, name, slug (unique), tagline, description, category, location, region, contactEmail, websiteUrl, imageUrl, established, featured, phone?, instagramHandle?, facebookUrl?, marketsText?, latitude?, longitude?, createdAt`.
- **Products** — `id, vendorId (FK cascade), name, description, priceCents, unit, category, imageUrl, inStock, featured, listingType, originalPriceCents?, availableUntil?, pickupNote?, createdAt`. Prices in cents.
- **EmailVerifications** — `id, email, code, vendorPayload (jsonb), expiresAt, attempts, consumed, createdAt`. For vendor onboarding only.
- **Users** — `id, email (unique), username (unique), avatarSeed, avatarStyle, role ('vendor'|'shopper'), city?, state, createdAt`. App user accounts.
- **Sessions** — `id, userId (FK→users, cascade), token (unique UUID pair), expiresAt, createdAt`. 30-day rolling sessions. Token stored in `localStorage` as `ol_session`.
- **SignupVerifications** — `id, email, code, payload (jsonb), expiresAt, attempts, consumed, createdAt`. Short-lived (10 min) email verification for user signup. Payload holds the full user profile until code is confirmed.

`listingType` is one of: `regular`, `batch_drop` (small fresh release just out), `surplus` (market-leftover discount with `originalPriceCents`), `pre_order` (reserve for upcoming market pickup with `availableUntil` and `pickupNote`).

## Pages

- `/` — Hero, marketplace stats, **Local Near Me Now** (Fresh Batches Today / Market Surplus / Reserve for Market Pickup), featured vendors, featured products, browse by category/location.
- `/vendors`, `/vendors/:id` — Directory + profile (markets, phone, Instagram, Facebook, vendor's products).
- `/products`, `/products/:id` — Browse + detail. Filter chips for listing type, syncing with `?listingType=` URL.
- `/favorites` — localStorage-backed saved producers + saved goods (key: `open-local:favorites`).
- `/submit` — 4-step onboarding wizard: (1) tap a category card, (2) name/tagline/story/city with FL city chips, (3) email + optional cover/socials/markets, (4) **email verification** — enter a 6-digit code we email; only then is the vendor created. Auto-generates slug, picks a category-themed default cover when no image URL is given, defaults region to Florida.
- `/admin` — Toggle featured / in-stock, delete, add product (full listing-type fields).

## API

- `GET/POST/PATCH/DELETE /api/vendors`, `/api/vendors/:id`, `/api/vendors/featured`, `/api/vendors/:id/products`
- `GET/POST/PATCH/DELETE /api/products`, `/api/products/:id`, `/api/products/featured`. List supports `?listingType=` filter.
- `GET /api/feed/local-now` → `{ batchDrops, surplus, preOrders }` (each ProductWithVendor[]). Filters out expired `availableUntil` and out-of-stock items.
- `GET /api/stats`, `/api/locations`, `/api/categories`
- `POST /api/auth/email/start` — body `{ email, vendorPayload }`. Generates a 6-digit code, sends via Resend if `RESEND_API_KEY` is set, otherwise returns `{ devFallback: true, devCode }` so the wizard can show it in a "demo mode" banner.
- `POST /api/auth/email/resend` — `{ verificationId }` → new code + 10-min TTL.
- `POST /api/auth/email/verify` — `{ verificationId, code }` → on success, creates the vendor from the stored payload and returns it.

**User auth (signup/session):**
- `GET /api/auth/check-username?username=` → `{ available: boolean }`.
- `POST /api/auth/signup/start` — `{ email, username, role, city?, state, avatarSeed, avatarStyle }`. Creates a SignupVerification row and emails a 6-digit code (dev mode: returns `devCode`).
- `POST /api/auth/signup/resend` — `{ verificationId }` → new code.
- `POST /api/auth/signup/verify` — `{ verificationId, code }` → creates user + session; returns `{ user, sessionToken, sessionExpiresAt }`.
- `GET /api/auth/me` — `Authorization: Bearer <token>` → `{ user }` or 401.
- `POST /api/auth/logout` — `Authorization: Bearer <token>` → deletes session.

## Email

`artifacts/api-server/src/lib/email.ts` calls Resend's REST API directly via `fetch` using `RESEND_API_KEY` and optional `MAIL_FROM` (defaults to `Open Local <onboarding@resend.dev>`). Without the key, the verification flow still works in a demo-mode fallback that shows the code on screen.

## Mobile App

`artifacts/open-local-mobile` — Expo/React Native app using the shared API.

- **Four tabs:** Feed (Local Near Me Now — batch drops, surplus, pre-orders via `/feed/local-now`), Browse (vendor search/list), Nearby (map with geofence), Saved (AsyncStorage-backed favorites).
- **Vendor detail screen:** `/vendor/[slug]` — shows vendor info, products list, links; tap heart to save/unsave.
- **Design:** DM Sans font, Open Local brand palette (olive green primary #3c4a26), dark mode supported.
- **API:** Uses `@workspace/api-client-react` generated hooks. `setBaseUrl` from `EXPO_PUBLIC_DOMAIN` env var.
- **Fonts:** `@expo-google-fonts/dm-sans` — loaded as `DMSans_400Regular`, `DMSans_500Medium`, `DMSans_600SemiBold`, `DMSans_700Bold`.
- **NativeTabs:** Liquid glass on iOS 26+, classic BlurView tabs on older iOS/Android.
- **Favorites:** `AsyncStorage` key `open_local_favorites`, utils in `app/(tabs)/favorites.tsx`.
- **Nearby/Map tab:** `app/(tabs)/map.tsx` — `expo-location` foreground permission → `react-native-maps` MapView with `showsUserLocation`, `Circle` geofence overlay (olive green, 18% opacity fill), vendor `Marker` pins filtered by radius. Radius chips: 5/10/25/50 mi. Tap a pin → bottom panel with distance + "View" button. Haversine distance in `utils/distance.ts`. Web fallback shows sorted vendor list.

## Workflows

- `artifacts/api-server: API Server` — serves `/api`.
- `artifacts/open-local: web` — serves `/`.
- `artifacts/open-local-mobile: expo` — Expo dev server; primary access via QR code in Expo Go.
- `artifacts/mockup-sandbox: Component Preview Server`.

## Database

Postgres (DATABASE_URL). Seeded with 12 Florida vendors and 30 products spanning Miami, Tampa, Homestead, Gainesville, Lake Wales, St. Petersburg, Key West, St. Augustine, Ocala, Orlando, and Sarasota.

To re-push schema: `pnpm --filter @workspace/db run push`.

## PRD scope notes

The project's full PRD calls for vendor + consumer auth with 2FA, Stripe-Connect-based escrow payments, in-app messaging, boosted listings, ad placements, and vendor subscriptions. Those require paid integrations (Clerk/Stripe) and a substantial migration; they are deferred. The current build delivers everything that ships without them: Florida focus, batch drops, spoilage rescue, pre-orders for market pickup, the Local Near Me Now feed, vendor market schedules + social links, and favorites.
