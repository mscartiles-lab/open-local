# Open Local

Florida-focused marketplace for local producers — bakers, farms, apiaries, ceramicists, brewers, butchers, florists, makers. Tagline: **Shop Local Wherever You Are**. A directory people actually want to wander through.

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

Two public entities + one short-lived verification table. No persistent user auth yet.

- **Vendors** — `id, name, slug (unique), tagline, description, category, location, region, contactEmail, websiteUrl, imageUrl, established, featured, phone?, instagramHandle?, facebookUrl?, marketsText?, latitude?, longitude?, createdAt`.
- **Products** — `id, vendorId (FK cascade), name, description, priceCents, unit, category, imageUrl, inStock, featured, listingType, originalPriceCents?, availableUntil?, pickupNote?, createdAt`. Prices in cents.
- **EmailVerifications** — `id, email, code, vendorPayload (jsonb), expiresAt, attempts, consumed, createdAt`. Holds the pending vendor data until the 6-digit code is verified (10-min TTL, 5-attempt cap).

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

## Email

`artifacts/api-server/src/lib/email.ts` calls Resend's REST API directly via `fetch` using `RESEND_API_KEY` and optional `MAIL_FROM` (defaults to `Open Local <onboarding@resend.dev>`). Without the key, the verification flow still works in a demo-mode fallback that shows the code on screen.

## Workflows

- `artifacts/api-server: API Server` — serves `/api`.
- `artifacts/open-local: web` — serves `/`.
- `artifacts/mockup-sandbox: Component Preview Server`.

## Database

Postgres (DATABASE_URL). Seeded with 12 Florida vendors and 30 products spanning Miami, Tampa, Homestead, Gainesville, Lake Wales, St. Petersburg, Key West, St. Augustine, Ocala, Orlando, and Sarasota.

To re-push schema: `pnpm --filter @workspace/db run push`.

## PRD scope notes

The project's full PRD calls for vendor + consumer auth with 2FA, Stripe-Connect-based escrow payments, in-app messaging, boosted listings, ad placements, and vendor subscriptions. Those require paid integrations (Clerk/Stripe) and a substantial migration; they are deferred. The current build delivers everything that ships without them: Florida focus, batch drops, spoilage rescue, pre-orders for market pickup, the Local Near Me Now feed, vendor market schedules + social links, and favorites.
