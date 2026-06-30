# Multi-Tenancy

SalonOS is multi-tenant: one deployment serves many independent salons ("tenants"), each with its own users, data, branding, locale, currency and timezone. This document explains the model in depth.

---

## 1. The model: shared database, row-level isolation

All tenants share **one PostgreSQL database and one schema**. Every tenant-owned table carries a `tenantId` column, and all access to those tables flows through a tenant-scoped Prisma client that filters and stamps `tenantId` automatically.

The `Tenant` model is the root (`packages/database/prisma/schema.prisma`):

```prisma
model Tenant {
  id           String       @id @default(cuid())
  name         String
  slug         String       @unique   // subdomain: <slug>.salonos.app
  customDomain String?      @unique
  status       TenantStatus @default(TRIAL)
  plan         Plan         @default(STARTER)
  locale       String       @default("en")    // en | ur | ar | …
  currency     String       @default("USD")   // ISO 4217
  timezone     String       @default("UTC")   // IANA tz
  logoUrl      String?
  primaryColor String       @default("#7C3AED")
  tagline      String?
  stripeCustomerId String? @unique   // billed for the SaaS subscription
  stripeAccountId  String? @unique   // Stripe Connect (receives client payments)
  // … relations to every tenant-owned model
}
```

Tenant-owned models each have a `tenantId` foreign key with `onDelete: Cascade`, so deleting a tenant removes all of its data. Most also have `@@index([tenantId])` (and composite indexes like `@@index([tenantId, startsAt])` on appointments, `@@unique([tenantId, email])` on users) so per-tenant queries stay fast.

---

## 2. The `forTenant()` extension

`packages/database/src/tenant.ts` exports `forTenant(tenantId)`, a Prisma `$extends` client that intercepts **every** operation on tenant-owned models:

```ts
const db = forTenant(tenantId);
const services = await db.service.findMany();   // only THIS tenant's rows
await db.client.create({ data: { name: 'Emma' } }); // tenantId stamped for you
```

What it guards (the `TENANT_MODELS` set):

> `Location, User, StaffProfile, ServiceCategory, Service, Product, Client, Appointment, Sale, Payment, Discount, Review, Notification, AuditLog`

How it enforces isolation per operation:

| Operation(s) | Behaviour |
| --- | --- |
| `findMany`, `findFirst`, `findUnique`, `count`, `aggregate`, `*OrThrow` | injects `where.tenantId` |
| `update`, `delete`, `updateMany`, `deleteMany` | injects `where.tenantId` (so a single-id update can't touch another tenant's row) |
| `create` | forces `data.tenantId` |
| `createMany` | forces `tenantId` on every row |
| `upsert` | injects `where.tenantId` and forces `create.tenantId` |

**Child tables are intentionally excluded** (`AppointmentItem`, `SaleItem`, `WorkingHours`, `TimeOff`, `InventoryMovement`, `RefreshToken`). They have no `tenantId` of their own and are only reachable through a tenant-scoped parent (e.g. `appointmentItem.where.appointment.status` joins are still safe because the parent is scoped, and the availability service queries them by a `staffId` that already belongs to the tenant).

**Cross-tenant / platform data** (`Tenant`, `RefreshToken`, `WebhookEvent`, `Subscription`) is accessed through the raw `PrismaService.client`, never `forTenant()`.

This is **defence-in-depth**: the RBAC guards (`JwtAuthGuard` + `RolesGuard`) are the first line, and `forTenant()` is the data-layer backstop — a forgotten `where` clause can never leak another salon's data.

---

## 3. Tenant resolution order

`TenantMiddleware` (`apps/api/src/tenant/tenant.middleware.ts`) resolves the active tenant for every request, in this order:

1. **`x-tenant-slug` header** — used by the web/admin app and API clients.
2. **`<slug>.ROOT_DOMAIN` subdomain** — used by white-label booking sites (skips `RESERVED_SUBDOMAINS` like `www`, `app`, `api`, `admin`, `book`, `assets`).
3. **`?tenant=` query param** — developer convenience.

The resolved `Tenant` + `tenantId` are attached to the request. An unknown slug → `404`. No slug at all → the request still proceeds (auth and webhook routes don't need a tenant); any route that *does* need one calls `@CurrentTenant()`, which throws `400` when absent.

On the web side, `apps/web/src/middleware.ts` maps the request subdomain to the `x-tenant-slug` header, and `lib/api.ts` attaches it to every API call.

---

## 4. Trade-offs vs. other tenancy models

| Model | Isolation | Ops complexity | Cross-tenant queries | Cost / tenant | SalonOS |
| --- | --- | --- | --- | --- | --- |
| **Shared DB, row-level `tenantId`** | Logical (app + extension) | Low (one schema, one migration) | Trivial | Lowest | ✅ chosen |
| **Schema-per-tenant** | Stronger (Postgres schemas) | Medium (N schemas to migrate) | Harder | Medium | upgrade path |
| **Database-per-tenant** | Strongest (physical) | High (N databases, N pools) | Hardest | Highest | for large/enterprise |

**Why shared-DB wins here:** simplest to operate, cheapest per tenant, instant onboarding (signup just inserts a `Tenant` row in one transaction), and effortless platform analytics. The cost is that isolation is logical, not physical — which is why it is enforced in two independent layers.

---

## 5. Custom domains & subdomains

- **Subdomain:** every tenant is reachable at `<slug>.ROOT_DOMAIN` (e.g. `lumiere.salonos.app`). Requires a wildcard DNS record + wildcard TLS cert (see [SETUP.md](SETUP.md) → production).
- **Custom domain:** `Tenant.customDomain` is a unique field for salons that want to serve their booking site on their own domain; point that domain at the web app and resolve the tenant by host.

---

## 6. Per-tenant branding, locale, currency, timezone

Each tenant carries its own presentation settings, surfaced to the public booking site via `GET /api/v1/public/site` and editable by owners via `PATCH /api/v1/tenant`:

- **Branding** — `logoUrl`, `primaryColor` (default `#7C3AED`), `tagline` drive white-label theming of the booking site and emails.
- **Locale** — `locale` (`en` / `ur` / `ar`); the web app renders Urdu and Arabic **right-to-left**.
- **Currency** — `currency` (ISO 4217); sales and payments store their own `currency` too.
- **Timezone** — `timezone` (IANA); each `Location` can override it. Times are stored in UTC and rendered in the salon's timezone.

Signup creates the tenant, an `OWNER` user, and a `TRIAL` subscription in a single transaction (`AuthService.register`).

---

## 7. Upgrade path to stronger isolation

When a tenant (or compliance requirement) demands physical isolation, the design leaves clear paths:

1. **PostgreSQL Row-Level Security (RLS):** add RLS policies keyed on a `current_setting('app.tenant_id')` session var, set per request/transaction. `forTenant()` already centralises the `tenantId` flow, so adding `SET LOCAL app.tenant_id` per connection is incremental — and RLS becomes a true database-enforced backstop.
2. **Schema-per-tenant:** Prisma can target a schema via the connection string; route each tenant to its own schema (a "premium isolation" tier) while keeping the same code path.
3. **Database-per-tenant:** for the largest/enterprise customers, provision a dedicated database and select the connection by tenant.

See [ROADMAP.md](ROADMAP.md) for the prioritisation of RLS hardening.
