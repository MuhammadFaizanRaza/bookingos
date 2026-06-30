# BookingOS — Claude Code Reference

Multi-tenant, **multi-vertical, multi-model** booking/appointment SaaS (global). One shared schema + booking engine serves any industry (salon, clinic, fitness, hotel, rental, restaurant, events, field services). Turborepo + pnpm monorepo. Packages are `@bookingos/*` (was `@salonos/*` before the rebrand).

## Workspace layout

```
apps/api/          NestJS 11, port 4000, prefix /api/v1, Swagger at /docs   (@bookingos/api)
apps/web/          Next.js 15 App Router, port 3000                          (@bookingos/web)
packages/database/ Prisma 6 client + forTenant() isolation layer            (@bookingos/database)
docs/              ARCHITECTURE.md, FEATURES.md, ROADMAP.md, API.md, SETUP.md, MULTI-TENANCY.md, DEMO.md
docker-compose.yml Postgres 16 + Redis 7
```

## Verticals & term-packs

- A tenant picks a `Vertical` at signup → drives UI terminology and default booking mode. Engine is identical across verticals.
- `Vertical` enum: `SALON | CLINIC | FITNESS | HOTEL | RENTAL | RESTAURANT | EVENTS | SERVICES | GENERAL`
- Term-packs in `apps/web/src/lib/verticals.ts` relabel the canonical concepts **resource / offering / category / customer / booking / bookVerb** (e.g. SALON: Staff/Service/Client/Appointment; HOTEL: Room/Room Type/Guest/Reservation).
- `useTerms()` (`apps/web/src/hooks/use-terms.ts`) resolves the current tenant's term-pack; the dashboard sidebar + screens use it. Falls back to GENERAL.

## Booking modes (multi-model)

Each offering (`Service`) has a `bookingMode`; booking creation + availability dispatch on it.

| Mode         | Booking shape                                  | Industries                        | Availability source                          |
| ------------ | ---------------------------------------------- | --------------------------------- | -------------------------------------------- |
| `TIME_SLOT`  | provider + duration on a day (buffers, hours)  | salon, clinic, gym 1:1, services  | per-staff free slots (`getSlots`)            |
| `DATE_RANGE` | check-in→check-out vs finite `inventory` units | hotel, rental                     | overlapping units vs `Service.inventory` (`checkDateRange`) |
| `CAPACITY`   | fixed session with limited seats (`quantity`)  | class, event, restaurant covers   | seats taken vs `Service.capacity` (`checkCapacity`)         |

All three engines live in `apps/api/src/modules/bookings/availability.service.ts`; `BookingsService.create()` dispatches per line item on `service.bookingMode`.

## Common commands

```bash
pnpm dev            # start api + web in watch mode
pnpm setup          # one-shot: docker:up + migrate + seed
pnpm docker:up      # Postgres + Redis containers
pnpm db:migrate     # run pending migrations
pnpm db:seed        # seed demo tenants (Lumière + Bloom)
pnpm db:studio      # Prisma Studio GUI
pnpm build          # build all packages via Turborepo
pnpm lint           # lint all workspaces
```

## Environment (.env.example at root)

Key vars (copy to .env):

```
DATABASE_URL=postgresql://bookingos:bookingos@localhost:5432/bookingos?schema=public
REDIS_URL=redis://localhost:6379
API_PORT=4000  WEB_PORT=3000
JWT_ACCESS_SECRET=...  JWT_REFRESH_SECRET=...
STRIPE_SECRET_KEY=sk_test_xxx  STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRICE_STARTER=price_xxx  STRIPE_PRICE_PRO=price_xxx  STRIPE_PRICE_BUSINESS=price_xxx
NEXT_PUBLIC_API_URL=http://localhost:4000
ROOT_DOMAIN=bookingos.local
```

> **Known limitation:** Docker daemon not accessible to this user (not in `docker` group). Run `sudo usermod -aG docker $USER` or point `DATABASE_URL` at an existing Postgres instance.

## Multi-tenancy

- Tenant resolved from `x-tenant-slug` header → subdomain → query param
- `forTenant(tenantId)` Prisma `$extends` auto-injects `tenantId` on all reads/writes
- Every tenant-scoped model has `tenantId` as first field + composite indexes
- Demo tenants (one per vertical, password `Passw0rd!`): `lumiere`/`bloom` (SALON), `medicare` (CLINIC), `pulse` (FITNESS/CAPACITY), `azure` (HOTEL/DATE_RANGE), `gearup` (RENTAL/DATE_RANGE), `tavola` (RESTAURANT/CAPACITY), `summit` (EVENTS/CAPACITY), `fixit` (SERVICES). Owner = `owner@<slug>.demo`; each resource is also a login.

## API modules

Feature modules live in `apps/api/src/modules/` (14 folders: tenants, locations, staff, services, clients, bookings, products, sales, payments, billing, reports, reviews, public, webhooks). `auth/`, `messaging/`, and `health/` are siblings at `apps/api/src/` (not under `modules/`).

| Module    | Routes                                                                              |
| --------- | ----------------------------------------------------------------------------------- |
| auth      | POST /auth/register, /login, /refresh, /logout, GET /auth/me                        |
| health    | GET /health (public liveness + DB probe)                                            |
| tenants   | GET/PATCH /tenant                                                                   |
| locations | CRUD /locations                                                                     |
| staff     | CRUD /staff, working hours, time-off                                                |
| services  | CRUD /services (offerings: bookingMode, capacity, inventory), categories            |
| clients   | CRUD /clients (CRM, search, tags, loyalty)                                          |
| bookings  | GET/POST /bookings, /bookings/availability (+ /availability/date-range, /availability/capacity), PATCH /bookings/:id/reschedule, /cancel, /status |
| products  | CRUD /products (inventory, SKU, stock)                                              |
| sales     | POST /sales (line items, discounts, tips, tax)                                      |
| payments  | POST /payments/intent, /payments/cash, refunds                                      |
| billing   | GET /billing/subscription, POST /billing/checkout, /billing/portal                  |
| reports   | KPIs, revenue, utilization, staff, low stock, ratings                               |
| reviews   | CRUD /reviews                                                                       |
| public    | GET /public/site (incl. vertical), /services (incl. bookingMode/capacity/inventory), /staff, /availability (+ /availability/date-range, /availability/capacity), /locations, /reviews; POST /public/bookings (accepts endsAt + quantity per item) — all no-auth |
| webhooks  | POST /webhooks/stripe (signature-verified, idempotent)                              |
| messaging | Email/SMS/WhatsApp/push (scaffolded, not fully wired)                               |

Auth: JWT access token (15m) + rotating refresh (30d). `@Public()` skips auth guard. `@Roles()` enforces role metadata.

Roles: `SUPER_ADMIN | OWNER | MANAGER | STAFF | RECEPTIONIST | CLIENT`

## Prisma data models (packages/database/prisma/schema.prisma)

28 models. **New multi-vertical/multi-model enums:** `Vertical` (SALON/CLINIC/FITNESS/HOTEL/RENTAL/RESTAURANT/EVENTS/SERVICES/GENERAL), `BookingMode` (TIME_SLOT/DATE_RANGE/CAPACITY), `ResourceType` (HUMAN/ROOM/TABLE/EQUIPMENT/UNIT). Key models:

| Model             | Purpose                                                                                    |
| ----------------- | ------------------------------------------------------------------------------------------ |
| Tenant            | Root org — slug, plan, status, stripeCustomerId, **vertical** (term-pack/defaults)         |
| Subscription      | Stripe subscription per tenant                                                             |
| User              | Identity with role + tenantId                                                              |
| StaffProfile      | Bookable resource — details, commission; **resourceType** (HUMAN/ROOM/TABLE/…), **capacity** (room occupancy/table seats) |
| WorkingHours      | Per-staff, dayOfWeek, startMin/endMin (minutes from midnight)                              |
| TimeOff           | Staff vacation blocks                                                                      |
| Location          | Branches with timezone override                                                            |
| ServiceCategory   | Grouping for services/offerings                                                            |
| Service           | Bookable offering (durationMin, buffers, price, deposit); **bookingMode**, **capacity** (CAPACITY seats), **inventory** (DATE_RANGE units) |
| Product           | Retail inventory (SKU, stockQty, lowStockAt)                                               |
| InventoryMovement | Stock tracking                                                                             |
| Client            | CRM contact (tags, loyaltyPoints, marketingOptIn)                                          |
| Appointment       | Booking lifecycle (PENDING→CONFIRMED→CHECKED_IN→IN_PROGRESS→COMPLETED + CANCELLED/NO_SHOW); **partySize** (CAPACITY) |
| AppointmentItem   | Per-offering line within a booking; **quantity** (CAPACITY seats / DATE_RANGE units)        |
| Sale              | POS transaction (OPEN/PAID/PARTIALLY_REFUNDED/REFUNDED/VOID)                               |
| SaleItem          | Sale line (SERVICE or PRODUCT)                                                             |
| Payment           | Payment record with Stripe PaymentIntent link                                              |
| Discount          | Promo codes (PERCENT/FIXED, usage limits)                                                  |
| Review            | Client feedback (1–5 stars, publishable)                                                   |
| Notification      | Queued messages (EMAIL/SMS/WHATSAPP/PUSH)                                                  |
| AuditLog          | Activity trail (action, entity, entityId, meta JSON)                                       |
| RefreshToken      | Session management (hashed)                                                                |
| WebhookEvent      | Stripe idempotency guard                                                                   |

Plans: `STARTER | PRO | BUSINESS` — `Plan` enum from Prisma (re-exported via `packages/database/src/index.ts`). Prices + feature flags + limits live in `apps/web/src/lib/plans.ts`; the server-enforced staff/location caps are `PLAN_LIMITS` in `apps/api/src/modules/billing/billing.service.ts` (STARTER 3 staff/1 location, PRO 15/3, BUSINESS unlimited).

## Web app (apps/web/src/)

App Router with locale prefix `/[locale]/`:

| Route               | Purpose                                                        |
| ------------------- | -------------------------------------------------------------- |
| /                   | Marketing landing (hero, pricing, FAQ)                         |
| /login, /signup     | Auth (login has a workspace/slug field — scopes to a tenant)    |
| /[slug]             | Tenant's public booking-site landing                           |
| /[slug]/reserve     | Public multi-step booking, mode-aware (slot / date-range / seats → details → deposit) |
| /book               | Legacy redirect → /[locale]/lumiere                            |
| /dashboard/calendar | Appointments calendar                                          |
| /dashboard/clients  | CRM                                                            |
| /dashboard/services | Service + category management                                  |
| /dashboard/staff    | Staff, hours, time-off                                         |
| /dashboard/pos      | POS — sales, line items, payment                               |
| /dashboard/reports  | Analytics (KPIs, revenue, utilization)                         |
| /dashboard/settings | Tenant config, billing portal                                  |

Key files:

- `src/lib/api.ts` — Fetch client (injects JWT + x-tenant-slug)
- `src/lib/mock.ts` — Mock data (fallback when API unreachable)
- `src/hooks/use-salon-data.ts` — TanStack Query hooks with mock fallback
- `src/lib/plans.ts` — Plan tier definitions + feature gates
- `src/middleware.ts` — next-intl locale routing + subdomain→x-tenant-slug

i18n: **en / ur / ar** (ur + ar are RTL). Translations at `src/messages/{en,ur,ar}.json`.

## Feature status

**Done:** All API modules, Stripe (PaymentIntents, Connect, Checkout, Portal, webhooks), marketing landing, auth, dashboard shell, i18n, three availability engines (TIME_SLOT/DATE_RANGE/CAPACITY) on **both** the authenticated `/bookings/*` and public `/public/*` routes, mode-aware public reserve flow (`/[slug]/reserve` renders slot / date-range / seats pickers), vertical term-packs + signup picker, POS, inventory, reports, CRM, server-enforced plan staff/location caps.

**Partial / scaffolded:**

- Web dashboard falls back to mock data where API is not wired
- Stripe Elements simulated until real keys configured
- Notifications (email/SMS/push) — models exist, sending not wired
- Redis provisioned, not used for jobs yet
- Plan feature-gating — staff & location caps **are** enforced server-side (403 at the ceiling); per-plan *feature* gating (reports/inventory/etc.) is still UI-only
- File uploads — S3 env vars exist, pipeline not built

**Roadmap (priority order):**

1. Wire all dashboard screens to live API endpoints
2. Live Stripe Elements + deposits
3. Email/SMS appointment reminders (Twilio)
4. Real-time calendar (WebSocket/SSE)
5. Per-plan *feature* gating + usage metering (staff/location caps already enforced)
6. Advanced analytics (cohort, rebooking, no-show)
7. PostgreSQL RLS hardening
8. Multi-currency payouts
9. File uploads (S3/R2)
10. Mobile app (React Native)
