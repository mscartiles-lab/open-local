# Open Local

National marketplace for local producers — bakers, farms, apiaries, ceramicists, brewers, butchers, florists, makers. Tagline: **Local Sourcing and Experiences**. Launching in Florida markets first, with a roadmap to expand state by state across the US. Build decisions should avoid hardcoding Florida-specific logic; use region/state filtering instead so new markets can be added without code changes.

## Rewards (vendor-confirmed visits)

Shoppers earn DiceBear avatar unlocks by visiting vendors. The vendor confirms each visit from their dashboard.

- Tables: `vendor_visits` (userId, vendorId, status: 'pending'|'approved'|'rejected', requestedAt, decidedAt) and `avatar_unlocks` (userId, unlockKey, unique). New `equipped_unlocks` jsonb column on `users`.
- Catalog: `artifacts/api-server/src/lib/avatarCatalog.ts` (server) mirrored in `artifacts/open-local/src/lib/unlockCatalog.ts` (web). 14 unlocks at thresholds 1/2/3/4/5/6/8/10/12/15/18/20/25/35 approved vendors.
- Wardrobe art: transparent PNG overlays in `artifacts/open-local/public/wardrobe/` (sunglasses, tote, cool-cap, fresh-hair, coffee-cup, apron, bandana, floral-crown, tropical-shirt, cozy-scarf, galaxy-hair). The web `unlockCatalog` adds `asset` + `zone` ('head-top'|'hair'|'eyes'|'neck'|'corner-bl'|'corner-br') for each equippable item; badges (first-visit, explorer, patron) stay emoji-only.
- `<Avatar seed style equipped size>` (`components/Avatar.tsx`) is the canonical avatar renderer everywhere — it draws the DiceBear base then absolutely-positions overlays per `zoneStyle()`. `avatarUrl()` in `UserContext` returns just the plain DiceBear URL.
- API:
  - `GET /api/rewards/catalog`
  - `GET /api/rewards/me` → `{ uniqueVendorCount, unlocks[], equipped[], pending[] }`
  - `POST /api/rewards/request-visit` `{ vendorId }` — shopper requests credit (no GPS); rejects duplicate pending/approved
  - `GET /api/rewards/vendor/:vendorId/pending` — vendor lists pending requests (auth: user.email matches vendor.contactEmail OR role=admin)
  - `POST /api/rewards/visits/:id/decide` `{ action: 'approve'|'reject' }` — awards unlocks on approve
  - `PATCH /api/rewards/equipped`
- UI: `CheckInButton` ("Request visit credit") on `/vendors/:id`, `VisitRequestsPanel` at top of vendor `/dashboard/:slug`, `/rewards` page (link in user dropdown). Avatar URL helper in `UserContext.avatarUrl(seed, style, equipped?)` appends DiceBear params from equipped items.

## Vendor trial reminders + auto-pause

Replit owns the trial-lifecycle automation for vendor accounts (User rows with `role='vendor'` that opened a Stripe subscription with a trial). Reminders are anchored to `users.trial_ends_at`, so the existing 60-day (early cohort) and 30-day (standard) trials share the same code without any constant tweaks.

- New columns on `users`: `trial_started_at`, `trial_ends_at`, `trial_reminders_sent` (jsonb string[]), `paused` (bool).
- Trial start is recorded on Stripe `checkout.session.completed` via `fireTrialStart()` in `artifacts/api-server/src/lib/trialReminders.ts`, which reads `trial_end` from the `stripe.subscriptions` mirror table. A fallback path on `customer.subscription.created` / `.updated` re-runs `fireTrialStart()` directly off `sub.trial_end` if the mirror wasn't synced yet (idempotent — skips when `trial_started_at` is already set).
- Daily sweep `runTrialReminderSweep()` is invoked from the same `POST /api/admin/onboarding/run-daily` endpoint as the vendor-onboarding sweep — one Scheduled Deployment covers both.
- Strict priority per user per sweep: `expired_paused > final_warning > payment_prompt`.
  - **T-8 days** → `vendor.trial.payment_prompt` (fires when 7 < days_remaining ≤ 8)
  - **T-1 day** → `vendor.trial.final_warning` (fires in the last 24h)
  - **T+1 day** → `vendor.trial.expired_paused` (fires ≥24h after `trial_ends_at` when there's no active paid Stripe subscription). Same atomic UPDATE that records the dedupe marker also sets `paused = true`, so the pause and webhook are linked.
- Rollout gate: only users with `trial_started_at IS NOT NULL` are eligible. Legacy vendors aren't backfilled. Paying vendors (active Stripe sub) are never auto-paused — the day-of-expiry branch reads the stripe.subscriptions mirror first and skips them.
- Payload: `{ user_id, email, username, role, trial_started_at, trial_ends_at, days_remaining, email_type, has_payment_method, stripe_customer_id, stripe_subscription_id }`; `expired_paused` adds `reactivation_url` pointing at `/billing?reactivate=1`.
- Storefront visibility: `notPausedVendorCondition()` (exported from `routes/vendors.ts`) is applied via `NOT EXISTS` correlated subquery on `users.email = vendors.contact_email AND users.paused = true` across `/api/vendors`, `/api/vendors/featured`, `/api/vendors/:id`, `/api/vendors/by-slug/:slug`, `/api/products`, `/api/products/featured`, `/api/products/:id`, and `/api/feed/local-now`. The `by-slug` route adds an owner/admin bypass: if the anonymous lookup misses and the caller's Bearer session resolves to a user whose email matches the vendor's `contactEmail` (or is admin), the route returns the row anyway so the paused vendor's own `/dashboard/:slug` keeps working. The vendor-scoped products subroute (`/api/vendors/:id/products`) is left unfiltered so the dashboard's product list still loads.
- Reactivation: the `/billing` page shows an amber "Your free trial has ended" banner when either `?reactivate=1` is in the URL or `/api/auth/me` reports `paused: true`. The Stripe `checkout.session.completed` handler atomically sets `users.paused = false` alongside `stripe_subscription_id` so a successful re-subscribe immediately restores storefront visibility.
- Three new n8n subscriptions (rows #16–#18 in `webhook_subscriptions`) point at `…/webhook/vendor-trial-payment-prompt`, `…/vendor-trial-final-warning`, `…/vendor-trial-expired-paused`. Reproducible provisioning lives in `pnpm --filter @workspace/scripts run seed-webhook-subscriptions`, which idempotently upserts the full set of n8n subscriptions (including these three) — safe to re-run on any environment.

## Support ticket automations

Replit owns the ticket lifecycle (creation, unique reference, 48h staleness sweep, resolution); n8n owns the email send via three outbound webhook events.

- Table `support_tickets` (`id, reference (unique), userId FK→users cascade, subject, body, status, webhooksSent jsonb, flaggedStale bool, createdAt, resolvedAt`). Status one of `open | in_progress | resolved`. `webhooksSent` values: `submitted | unresolved_48h | resolved`.
- Reference numbers: `SUP-XXXXXX` over a Crockford-base32-ish alphabet (`23456789ABCDEFGHJKMNPQRSTVWXYZ` — no I, L, O, U). DB-level unique index; `createSupportTicket()` retries on collision.
- Exactly-once per ticket per event: every state transition is a single atomic `UPDATE … SET webhooks_sent = sent || '["<type>"]'::jsonb … WHERE NOT (sent ? '<type>')` returning the row, then `emitEvent()`. Same pattern as the onboarding and trial sweeps. The `submitted` marker is written inside the INSERT, so a ticket can never exist without it.
- 48h staleness sweep `runSupportTicketSweep()` is invoked from the existing `POST /api/admin/onboarding/run-daily` endpoint alongside onboarding + trial sweeps (one Scheduled Deployment covers all three). The sweep's UPDATE also re-checks `status != 'resolved' AND created_at <= NOW() - 48h` so a ticket resolved between the candidate scan and the UPDATE can't be flagged.
- Resolution: setting status to `resolved` via `PATCH /api/admin/support/tickets/:id` flips status + `resolvedAt` + the `resolved` marker in the same UPDATE, then emits the webhook. Flipping back to open and re-resolving won't re-fire because the marker survives.
- Outbound payload: `{ ticket_id, reference, status, user_id, email, username, role, subject, body, created_at, resolved_at, hours_open, event_type }`. `submitted` adds `response_time_hours: 24`; `resolved` adds `feedback_url` pointing at `https://{REPLIT_DOMAINS[0]}/support/{reference}/feedback`.
- API:
  - `POST /api/support/tickets` (requireAuth) `{ subject, body }` → creates ticket, fires `submitted`.
  - `GET /api/support/tickets/:reference` — public, non-sensitive fields only (reference/subject/status/timestamps).
  - `GET /api/admin/support/tickets` and `PATCH /api/admin/support/tickets/:id { status }` (requireAdmin).
- UI:
  - Vendor dashboard `/dashboard/:slug` has a "Get support" form (`components/SupportRequestForm.tsx`) that shows the generated reference + "we'll get back to you within 24 hours" on success.
  - Admin **Support** tab (`components/admin/SupportAdminTab.tsx`) lists tickets with status dropdown, stale badge, expandable body, and a "Mark resolved" shortcut.
- Three new n8n subscriptions (rows #19–#21 in `webhook_subscriptions`) point at `…/webhook/support-ticket-submitted`, `…/support-ticket-unresolved-48h`, `…/support-ticket-resolved`. Provisioned by re-running `pnpm --filter @workspace/scripts run seed-webhook-subscriptions`.

## Webhooks (outbound automation)

Admin-managed outbound HTTP webhooks for Zapier/Make/n8n/custom endpoints. Tables `webhook_subscriptions` and `webhook_deliveries`. Signed POST with header `X-OpenLocal-Signature: sha256=<hmac>` over `${timestamp}.${rawBody}` using the per-subscription secret. One automatic retry after 1s on failure. Events emitted via `emitEvent()` from `artifacts/api-server/src/lib/webhooks.ts`:

- `user.signed_up` — auth signup verify
- `vendor.created` — vendor onboarding email verify + POST /api/vendors
- `vendor.onboarding.welcome` — fired immediately on vendor creation
- `vendor.onboarding.day2_profile_incomplete` — 2+ days old, profile missing bio/photo/location
- `vendor.onboarding.day3_no_products` — 3+ days old, zero products
- `vendor.onboarding.day5_no_products_howto` — 5+ days old, zero products (`include_howto_tip: true`)
- `vendor.onboarding.day7_inactive` — 7+ days old, zero products; also sets `flagged_for_followup` on the vendor row
- `vendor.onboarding.no_photo_day3` — 3+ days old, vendor still has no real cover photo (default Unsplash marker doesn't count)
- `vendor.onboarding.no_bio_day3` — 3+ days old, `description` still empty
- `vendor.onboarding.products_no_storefront` — at least one product listed but the cover photo is still the default placeholder; fires whenever the daily sweep first detects this, regardless of vendor age
- `vendor.visit_requested|approved|rejected` — rewards flow
- `vendor.trial.payment_prompt|final_warning|expired_paused` — trial-reminder lifecycle (see "Vendor trial reminders + auto-pause" above)
- `support.ticket.submitted|unresolved_48h|resolved` — vendor/shopper support tickets (see "Support ticket automations" above)
- `business.submitted` — establishment submit
- `business.status_changed` — admin status update (use `status: 'active'` to detect approvals)
- `product.created` and `offer.created` (for non-regular listing types)
- Reserved (no trigger yet): `purchase.completed`, `reminder.sent`, `recommendation.generated`

Admin endpoints: `GET/POST/PATCH/DELETE /api/admin/webhooks`, `GET /api/admin/webhooks/events`, `GET /api/admin/webhooks/:id/deliveries`. Managed in the admin **Webhooks** tab with delivery audit log.

## Vendor onboarding emails

Replit owns timing + duplicate-protection + payload. n8n (or any subscriber) owns the actual email send via the `vendor.onboarding.*` webhook events above.

- Vendor row has `onboardingEmailsSent` (jsonb string[]) and `flaggedForFollowup` (bool). The `welcome` send is fired right after vendor creation by `fireWelcome()` in `artifacts/api-server/src/lib/onboarding.ts`.
- Daily runner: `POST /api/admin/onboarding/run-daily` (requires admin bearer token). Wire a Replit Scheduled Deployment to it, or run `pnpm --filter @workspace/scripts run onboarding-cron` locally with `API_BASE_URL` + `ONBOARDING_CRON_TOKEN` env vars set. The runner is idempotent: every record-and-emit is a single atomic `UPDATE … WHERE NOT (sent ? type)`, so two concurrent sweeps still send at most one email per vendor per type.
- Profile-complete check: description non-empty, `imageUrl` is not the auto-picked Unsplash default cover, and `location` is set.
- Rollout gate: only vendors that received the `welcome` event (after this feature shipped) are eligible for day2/3/5/7 nudges. Legacy vendors aren't backfilled.
- Outbound payload shape: `{ vendor_id, email, name, days_since_signup, email_type, product_count, profile_complete }`; day5 adds `include_howto_tip: true`, day7 adds `flag_for_followup: true`.
- Profile-completeness nudges (`no_photo_day3`, `no_bio_day3`, `products_no_storefront`) run as an INDEPENDENT track in the same sweep — they don't compete with the no-products strict-priority chain, so e.g. a day-3 vendor with no photo, no bio, and one listed product gets all three events queued in one pass. Each is still at-most-once per vendor (same atomic `onboardingEmailsSent` marker as the rest of the chain). Granular checks live in `hasRealPhoto()` and `hasBio()` in `lib/onboarding.ts`.
- Admin UI: "Run onboarding sweep" button in the Webhooks tab triggers the runner on demand; flagged vendors show a "Needs follow-up" badge in the Producers tab.

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
- **Users** — `id, email (unique), username (unique), avatarSeed, avatarStyle, role ('vendor'|'shopper'), city?, state, tier, stripeCustomerId?, stripeSubscriptionId?, trialStartedAt?, trialEndsAt?, trialRemindersSent (jsonb string[]), paused (bool), equippedUnlocks (jsonb string[]), createdAt`. App user accounts.
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

- **Four tabs:** The Locals (vendors + establishments with embedded mini-map and All/Vendors/Businesses segmented filter), Browse (vendor search/list), Events (upcoming events from `/api/events` with embedded mini-map), Saved (AsyncStorage-backed favorites, with mini-map of saved vendor locations).
- **Embedded map header:** `components/MiniMap.tsx` is split into `MiniMap.native.tsx` (real `react-native-maps` MapView with location permission prompt, geofence circle, custom pins) and `MiniMap.web.tsx` (placeholder card — `react-native-maps` can't bundle on web). Metro picks the right one per platform via the `.native` / `.web` extension. Used at the top of The Locals, Events, and Saved.
- **Vendor detail screen:** `/vendor/[slug]` — shows vendor info, products list, links; tap heart to save/unsave.
- **Design:** DM Sans font, Open Local brand palette (olive green primary #3c4a26), dark mode supported.
- **API:** Uses `@workspace/api-client-react` generated hooks. `setBaseUrl` from `EXPO_PUBLIC_DOMAIN` env var.
- **Fonts:** `@expo-google-fonts/dm-sans` — loaded as `DMSans_400Regular`, `DMSans_500Medium`, `DMSans_600SemiBold`, `DMSans_700Bold`.
- **NativeTabs:** Liquid glass on iOS 26+, classic BlurView tabs on older iOS/Android.
- **Favorites:** `AsyncStorage` key `open_local_favorites`, utils in `app/(tabs)/favorites.tsx`.
- **Events tab:** `app/(tabs)/events.tsx` — `useListEvents({ upcoming: true })` rendered as date-block cards (month/day chip + venue/city/category badges). Tap an event card with a `ticketUrl` opens the link via `Linking.openURL`. The header MiniMap shows nearby vendor pins as context since the `events` table doesn't currently store lat/lng.
- **The Locals tab:** `app/(tabs)/index.tsx` — pulls `useListVendors()` + `useListEstablishments()` together. Segmented control toggles All / Vendors / Businesses, and the MiniMap above re-renders pins to match (olive shopping-bag pins for vendors, orange home pins for establishments). Tapping a vendor card routes to `/vendor/[slug]`; tapping an establishment opens its `website` if set.

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
