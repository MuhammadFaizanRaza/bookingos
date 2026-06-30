# Status & Roadmap

An honest account of what's fully implemented, what's scaffolded or partial, and what's planned next.

---

## ✅ Fully implemented

**Platform & data**
- pnpm + Turborepo monorepo; `pnpm install`, `pnpm db:build`, and `pnpm build` (both apps) all succeed.
- Complete Prisma 6 / PostgreSQL 16 data model (`schema.prisma`) covering tenants, users, staff, services, clients, bookings, sales, payments, inventory, discounts, reviews, notifications, audit log, webhook events.
- Multi-tenancy: shared DB + row-level `tenantId`, the `forTenant()` Prisma extension, and tenant resolution (header → subdomain → query). See [MULTI-TENANCY.md](MULTI-TENANCY.md).
- Fully-seeded demo salon (Lumière) for instant demos; `pnpm db:seed` resets it.

**API (NestJS 11)**
- Boots, maps all routes, serves Swagger at `/docs`, global `/api/v1` prefix, helmet + CORS.
- Auth: JWT access (15m) + rotating, hashed refresh tokens (30d); signup creates Tenant + OWNER + TRIAL subscription atomically; global `JwtAuthGuard` + `RolesGuard`.
- All documented modules: tenant, locations, staff (+ working-hours + time-off), services + categories, clients, bookings (incl. the availability slot algorithm), products + inventory movements, sales/POS, payments, billing, reports, reviews, public booking, Stripe webhooks.
- Stripe: PaymentIntents (incl. Connect destination charges), cash recording, subscription Checkout/Portal, and signature-verified, idempotent webhooks (`WebhookEvent` table).

**Web (Next.js 15)**
- Premium marketing landing (hero, features, how-it-works, 3-tier pricing, testimonials, FAQ, CTA).
- Auth pages, multi-step public booking flow, and the full dashboard shell (overview, calendar, clients, services, staff, POS, reports, settings).
- i18n with `en` / `ur` / `ar` and full RTL for Urdu/Arabic; per-tenant slug via subdomain/header.

---

## 🟡 Scaffolded / partial — be aware when demoing or going live

- **Web data fallback to mocks.** The dashboard hooks (`apps/web/src/hooks/use-salon-data.ts`) call the real API but **fall back to realistic mock data** (`lib/mock.ts`) when an endpoint isn't wired or the API is unreachable, so the UI always renders cleanly. Some screens are still mock-backed end-to-end. For a real deployment, confirm each screen is reading live data.
- **Stripe Elements is simulated until configured.** When `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is unset/placeholder (`pk_test_xxx`), the booking payment step renders a **simulated** card form (`lib/stripe.ts`). Wire real keys + the server `POST /payments/intent` `clientSecret` into Stripe Elements to take live cards.
- **Notifications (email / SMS / WhatsApp).** Models, channels and `MailService` / `NotificationService` exist and config slots are present (SMTP, Twilio), but appointment-reminder scheduling/sending is not fully wired.
- **Redis.** Provisioned via Docker for cache/queues but not yet driving background jobs (reminders, async webhook processing).
- **Plan feature-gating.** Staff/location caps are now enforced server-side (403 + upgrade prompt at the plan ceiling). Per-plan *feature* gating (reports/inventory/etc.) is still UI-only and not yet enforced on every API route.
- **File storage (S3).** Env slots exist for logo/image uploads; the upload pipeline is not yet implemented.

---

## 🗺️ Roadmap (prioritised)

1. **Wire all dashboard screens to live endpoints** — remove mock fallbacks once each module's read path is confirmed; add the missing list/detail wiring (sales/payments lists, settings writes).
2. **Live Stripe Elements + deposits** — connect the booking payment step and POS card flow to real PaymentIntents and confirm via webhooks.
3. **Notification wiring** — appointment confirmations + reminders over email and **SMS/WhatsApp (Twilio)**, scheduled via Redis-backed jobs.
4. **Real-time calendar** — WebSocket/SSE updates so the front desk sees new bookings and status changes instantly.
5. **Plan enforcement & metering** — enforce staff/location/feature limits per plan; usage-based upsell prompts.
6. **Advanced reporting** — cohort retention, rebooking rate, no-show analytics, commission/payroll exports.
7. **RLS hardening** — add PostgreSQL Row-Level Security as a database-enforced backstop on top of `forTenant()` (see [MULTI-TENANCY.md](MULTI-TENANCY.md) §7), with an optional schema-per-tenant tier.
8. **Multi-currency payouts** — per-location currency and Connect payouts across currencies.
9. **File uploads** — S3/R2 pipeline for logos, service images and client photos.
10. **Mobile app** — client booking + staff "today" app (React Native), reusing the same API.
11. **Marketplace** — a discovery directory of salons on the platform, driving inbound bookings.

> This file is the canonical "what's real vs. aspirational" reference — keep it updated as features land.
