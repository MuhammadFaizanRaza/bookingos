# SalonOS — Claude Code Reference

Multi-tenant salon/spa management SaaS (global). Turborepo + pnpm monorepo.

## Workspace layout

```
apps/api/          NestJS 11, port 4000, prefix /api/v1, Swagger at /docs
apps/web/          Next.js 15 App Router, port 3000
packages/database/ Prisma 6 client + forTenant() isolation layer
docs/              ARCHITECTURE.md, FEATURES.md, ROADMAP.md, API.md, SETUP.md
docker-compose.yml Postgres 16 + Redis 7
```

## Common commands

```bash
pnpm dev            # start api + web in watch mode
pnpm setup          # one-shot: docker:up + migrate + seed
pnpm docker:up      # Postgres + Redis containers
pnpm db:migrate     # run pending migrations
pnpm db:seed        # seed Lumière demo salon
pnpm db:studio      # Prisma Studio GUI
pnpm build          # build all packages via Turborepo
pnpm lint           # lint all workspaces
```

## Environment (.env.example at root)

Key vars (copy to .env):
```
DATABASE_URL=postgresql://salonos:salonos@localhost:5432/salonos?schema=public
REDIS_URL=redis://localhost:6379
API_PORT=4000  WEB_PORT=3000
JWT_ACCESS_SECRET=...  JWT_REFRESH_SECRET=...
STRIPE_SECRET_KEY=sk_test_xxx  STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRICE_STARTER=price_xxx  STRIPE_PRICE_PRO=price_xxx  STRIPE_PRICE_BUSINESS=price_xxx
NEXT_PUBLIC_API_URL=http://localhost:4000
ROOT_DOMAIN=salonos.local
```

> **Known limitation:** Docker daemon not accessible to this user (not in `docker` group). Run `sudo usermod -aG docker $USER` or point `DATABASE_URL` at an existing Postgres instance.

## Multi-tenancy

- Tenant resolved from `x-tenant-slug` header → subdomain → query param
- `forTenant(tenantId)` Prisma `$extends` auto-injects `tenantId` on all reads/writes
- Every tenant-scoped model has `tenantId` as first field + composite indexes
- Demo tenant: slug `lumiere`, owner login `owner@lumiere.demo` / `Passw0rd!`

## API modules (apps/api/src/modules/)

| Module | Routes |
|--------|--------|
| auth | POST /auth/register, /login, /refresh, /logout, GET /auth/me |
| tenants | GET/PATCH /tenant |
| locations | CRUD /locations |
| staff | CRUD /staff, working hours, time-off |
| services | CRUD /services, categories |
| clients | CRUD /clients (CRM, search, tags, loyalty) |
| bookings | GET/POST /bookings, PATCH /bookings/:id/reschedule |
| products | CRUD /products (inventory, SKU, stock) |
| sales | POST /sales (line items, discounts, tips, tax) |
| payments | POST /payments/intent, /payments/cash, refunds |
| billing | GET /billing/subscription, POST /billing/checkout, /billing/portal |
| reports | KPIs, revenue, utilization, staff, low stock, ratings |
| reviews | CRUD /reviews |
| public | GET /public/site, /services, /staff, /availability; POST /public/bookings (no auth) |
| webhooks | POST /webhooks/stripe (signature-verified, idempotent) |
| messaging | Email/SMS/WhatsApp/push (scaffolded, not fully wired) |

Auth: JWT access token (15m) + rotating refresh (30d). `@Public()` skips auth guard. `@Roles()` enforces role metadata.

Roles: `SUPER_ADMIN | OWNER | MANAGER | STAFF | RECEPTIONIST | CLIENT`

## Prisma data models (packages/database/prisma/schema.prisma)

28 models. Key ones:

| Model | Purpose |
|-------|---------|
| Tenant | Root org — slug, plan, status, stripeCustomerId |
| Subscription | Stripe subscription per tenant |
| User | Identity with role + tenantId |
| StaffProfile | Staff details, commission, schedule link |
| WorkingHours | Per-staff, dayOfWeek, startMin/endMin (minutes from midnight) |
| TimeOff | Staff vacation blocks |
| Location | Salon branches with timezone override |
| ServiceCategory | Grouping for services |
| Service | Bookable service (durationMin, buffers, price, deposit) |
| Product | Retail inventory (SKU, stockQty, lowStockAt) |
| InventoryMovement | Stock tracking |
| Client | CRM contact (tags, loyaltyPoints, marketingOptIn) |
| Appointment | Booking lifecycle (PENDING→CONFIRMED→CHECKED_IN→IN_PROGRESS→COMPLETED + CANCELLED/NO_SHOW) |
| AppointmentItem | Per-service line within an appointment |
| Sale | POS transaction (OPEN/PAID/PARTIALLY_REFUNDED/REFUNDED/VOID) |
| SaleItem | Sale line (SERVICE or PRODUCT) |
| Payment | Payment record with Stripe PaymentIntent link |
| Discount | Promo codes (PERCENT/FIXED, usage limits) |
| Review | Client feedback (1–5 stars, publishable) |
| Notification | Queued messages (EMAIL/SMS/WHATSAPP/PUSH) |
| AuditLog | Activity trail (action, entity, entityId, meta JSON) |
| RefreshToken | Session management (hashed) |
| WebhookEvent | Stripe idempotency guard |

Plans: `STARTER | PRO | BUSINESS` — defined in `packages/database/src/index.ts` and `apps/web/src/lib/plans.ts`

## Web app (apps/web/src/)

App Router with locale prefix `/[locale]/`:

| Route | Purpose |
|-------|---------|
| / | Marketing landing (hero, pricing, FAQ) |
| /login, /signup | Auth |
| /book | Public multi-step booking (service→staff→slot→details→deposit) |
| /dashboard/calendar | Appointments calendar |
| /dashboard/clients | CRM |
| /dashboard/services | Service + category management |
| /dashboard/staff | Staff, hours, time-off |
| /dashboard/pos | POS — sales, line items, payment |
| /dashboard/reports | Analytics (KPIs, revenue, utilization) |
| /dashboard/settings | Tenant config, billing portal |

Key files:
- `src/lib/api.ts` — Fetch client (injects JWT + x-tenant-slug)
- `src/lib/mock.ts` — Mock data (fallback when API unreachable)
- `src/hooks/use-salon-data.ts` — TanStack Query hooks with mock fallback
- `src/lib/plans.ts` — Plan tier definitions + feature gates
- `src/middleware.ts` — next-intl locale routing + subdomain→x-tenant-slug

i18n: **en / ur / ar** (ur + ar are RTL). Translations at `src/messages/{en,ur,ar}.json`.

## Feature status

**Done:** All 16 API modules, Stripe (PaymentIntents, Connect, Checkout, Portal, webhooks), marketing landing, auth, public booking, dashboard shell, i18n, availability algorithm, POS, inventory, reports, CRM.

**Partial / scaffolded:**
- Web dashboard falls back to mock data where API is not wired
- Stripe Elements simulated until real keys configured
- Notifications (email/SMS/push) — models exist, sending not wired
- Redis provisioned, not used for jobs yet
- Plan feature-gating — plans sold but per-plan caps not enforced
- File uploads — S3 env vars exist, pipeline not built

**Roadmap (priority order):**
1. Wire all dashboard screens to live API endpoints
2. Live Stripe Elements + deposits
3. Email/SMS appointment reminders (Twilio)
4. Real-time calendar (WebSocket/SSE)
5. Plan enforcement + usage metering
6. Advanced analytics (cohort, rebooking, no-show)
7. PostgreSQL RLS hardening
8. Multi-currency payouts
9. File uploads (S3/R2)
10. Mobile app (React Native)
