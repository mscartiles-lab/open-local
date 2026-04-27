# Open Local

Open source centralized marketplace for local vendors and producers — farms, bakeries, apiaries, dairies, makers, brewers, butchers, and florists. A directory people actually want to wander through.

## Architecture

Pnpm monorepo with three artifacts:

- `artifacts/open-local` — React + Vite + Tailwind frontend at `/` (port 25681). Wouter for routing, TanStack Query, framer-motion, react-hook-form + zod, lucide-react icons.
- `artifacts/api-server` — Express 5 REST API at `/api`. Drizzle ORM, Zod validation.
- `artifacts/mockup-sandbox` — design preview server (scaffolding).

Shared workspace packages:

- `lib/api-spec` — OpenAPI spec at `lib/api-spec/openapi.yaml`. Source of truth.
- `lib/api-client-react` — Orval-generated React Query hooks (`useListVendors`, etc.).
- `lib/db` — Drizzle schema + Postgres client. Run `pnpm --filter @workspace/db run push` after schema changes.

## Domain model

Two entities, no auth (this is a public directory).

- **Vendors** — `id, name, slug (unique), tagline, description, category, location, region, contactEmail, websiteUrl, imageUrl, established, featured, createdAt`.
- **Products** — `id, vendorId (FK cascade), name, description, priceCents, unit, category, imageUrl, inStock, featured, createdAt`. Prices stored in cents.

## Pages

- `/` — Hero, marketplace stats, featured vendors, featured products, browse by category/location.
- `/vendors`, `/vendors/:id` — Directory + profile (with that vendor's products).
- `/products`, `/products/:id` — Browse + detail (with vendor attribution + sibling products).
- `/submit` — Public form to add a vendor (react-hook-form + zod).
- `/admin` — Toggle featured / in-stock, delete, add product.

## API

- `GET/POST/PATCH/DELETE /api/vendors`, `/api/vendors/:id`, `/api/vendors/featured`, `/api/vendors/:id/products`
- `GET/POST/PATCH/DELETE /api/products`, `/api/products/:id`, `/api/products/featured`
- `GET /api/stats`, `/api/locations`, `/api/categories`

## Workflows

- `artifacts/api-server: API Server` — serves `/api`.
- `artifacts/open-local: web` — serves `/`.
- `artifacts/mockup-sandbox: Component Preview Server`.

## Database

Postgres (DATABASE_URL). Seeded with 8 vendors and 21 products spanning farm, bakery, apiary, dairy, ceramics, brewery, florist, butcher.

To re-push schema: `pnpm --filter @workspace/db run push`.
