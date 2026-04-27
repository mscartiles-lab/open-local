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

Two entities, no auth (this is a public directory).

- **Vendors** — `id, name, slug (unique), tagline, description, category, location, region, contactEmail, websiteUrl, imageUrl, established, featured, phone?, instagramHandle?, facebookUrl?, marketsText?, latitude?, longitude?, createdAt`.
- **Products** — `id, vendorId (FK cascade), name, description, priceCents, unit, category, imageUrl, inStock, featured, listingType, originalPriceCents?, availableUntil?, pickupNote?, createdAt`. Prices in cents.

`listingType` is one of: `regular`, `batch_drop` (small fresh release just out), `surplus` (market-leftover discount with `originalPriceCents`), `pre_order` (reserve for upcoming market pickup with `availableUntil` and `pickupNote`).

## Pages

- `/` — Hero, marketplace stats, **Local Near Me Now** (Fresh Batches Today / Market Surplus / Reserve for Market Pickup), featured vendors, featured products, browse by category/location.
- `/vendors`, `/vendors/:id` — Directory + profile (markets, phone, Instagram, Facebook, vendor's products).
- `/products`, `/products/:id` — Browse + detail. Filter chips for listing type, syncing with `?listingType=` URL.
- `/favorites` — localStorage-backed saved producers + saved goods (key: `open-local:favorites`).
- `/submit` — Public form to add a vendor with optional contact/social fields.
- `/admin` — Toggle featured / in-stock, delete, add product (full listing-type fields).

## API

- `GET/POST/PATCH/DELETE /api/vendors`, `/api/vendors/:id`, `/api/vendors/featured`, `/api/vendors/:id/products`
- `GET/POST/PATCH/DELETE /api/products`, `/api/products/:id`, `/api/products/featured`. List supports `?listingType=` filter.
- `GET /api/feed/local-now` → `{ batchDrops, surplus, preOrders }` (each ProductWithVendor[]). Filters out expired `availableUntil` and out-of-stock items.
- `GET /api/stats`, `/api/locations`, `/api/categories`

## Workflows

- `artifacts/api-server: API Server` — serves `/api`.
- `artifacts/open-local: web` — serves `/`.
- `artifacts/mockup-sandbox: Component Preview Server`.

## Database

Postgres (DATABASE_URL). Seeded with 12 Florida vendors and 30 products spanning Miami, Tampa, Homestead, Gainesville, Lake Wales, St. Petersburg, Key West, St. Augustine, Ocala, Orlando, and Sarasota.

To re-push schema: `pnpm --filter @workspace/db run push`.

## PRD scope notes

The project's full PRD calls for vendor + consumer auth with 2FA, Stripe-Connect-based escrow payments, in-app messaging, boosted listings, ad placements, and vendor subscriptions. Those require paid integrations (Clerk/Stripe) and a substantial migration; they are deferred. The current build delivers everything that ships without them: Florida focus, batch drops, spoilage rescue, pre-orders for market pickup, the Local Near Me Now feed, vendor market schedules + social links, and favorites.
