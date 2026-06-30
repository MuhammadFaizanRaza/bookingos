# Features

A catalogue of what BookingOS does, grouped by area, with backing API endpoints (all under `/api/v1`) and web pages (locale-prefixed `/[locale]/…`). Each item is marked **Done** or **Partial** (scaffolded / not fully wired). See [API.md](API.md) for request details, [ARCHITECTURE.md](ARCHITECTURE.md) for the engine internals, and [ROADMAP.md](ROADMAP.md) for what's next.

> BookingOS is **multi-tenant, multi-vertical and multi-model**. The same schema, booking engine, POS, CRM and analytics power salons, clinics, gyms, hotels, rentals, restaurants, events and field-service businesses. Terminology and the default booking model adapt per tenant.

---

## 🏭 Multi-vertical (term-packs) — Done

- A tenant picks a `Vertical` at signup; 9 verticals are supported: **SALON, CLINIC, FITNESS, HOTEL, RENTAL, RESTAURANT, EVENTS, SERVICES, GENERAL**.
- Each vertical ships a **term-pack** that relabels the canonical concepts — *resource · offering · category · customer · booking · book-verb* — so the UI speaks the industry's language (e.g. Staff/Service/Client/Appointment for salon, Room/Room Type/Guest/Reservation for hotel, Trainer/Class/Member/Session for fitness).
- Labels apply across the dashboard via the `useTerms()` hook; falls back to GENERAL.

**Code:** `apps/web/src/lib/verticals.ts`, `apps/web/src/hooks/use-terms.ts`, signup vertical picker (`components/auth/signup-form.tsx`)
**Data:** `Tenant.vertical`

## 🧩 Multi-model booking — Done

Every offering (`Service`) declares a `bookingMode`; availability and booking creation dispatch on it. A single tenant can mix all three.

| Mode | Booking shape | Example industries | Engine |
| --- | --- | --- | --- |
| **TIME_SLOT** | Provider + duration on a day, honouring working hours, time-off and buffers | Salon, clinic, gym 1:1, field services | `getSlots()` per-staff free-slot computation |
| **DATE_RANGE** | Check-in → check-out vs a finite `inventory` of identical units | Hotel, rental | `checkDateRange()` overlap count vs `Service.inventory` |
| **CAPACITY** | Fixed-time session with limited seats (`quantity` per booking) | Class, event, restaurant covers | `checkCapacity()` seats taken vs `Service.capacity` |

**API:** `GET /bookings/availability` (TIME_SLOT), `GET /bookings/availability/date-range`, `GET /bookings/availability/capacity`, `POST /bookings`
**Data:** `Service.bookingMode/capacity/inventory`, `StaffProfile.resourceType/capacity`, `Appointment.partySize`, `AppointmentItem.quantity`
**Code:** `apps/api/src/modules/bookings/availability.service.ts`, `bookings.service.ts`

---

## 🗓️ Online Booking — Done (TIME_SLOT) / Partial (other modes)

- Branded, locale-aware public booking site per tenant — no login required for guests.
- Multi-step flow: pick offering → resource → date/time → details → (optional) deposit.
- Guests are matched to or created as a `Client` automatically on booking.
- **Done (API):** the public site exposes all three availability engines — `GET /public/availability` (TIME_SLOT), `/public/availability/date-range`, `/public/availability/capacity` — and `POST /public/bookings` accepts `endsAt` + `quantity`.
- **Partial (web):** the reserve-flow UI currently renders the TIME_SLOT slot picker; the DATE_RANGE date-range picker and CAPACITY ticket/party-size selector are pending. The **admin** services manager already configures all three modes.

**API:** `GET /public/site`, `/public/services`, `/public/staff`, `/public/availability`, `/public/availability/date-range`, `/public/availability/capacity`, `/public/locations`, `/public/reviews`, `POST /public/bookings`
**Web:** `/book`

## 📅 Calendar & Scheduling — Done

- Create, list (by date range / resource / status), reschedule, and cancel bookings.
- Full status lifecycle: `PENDING → CONFIRMED → CHECKED_IN → IN_PROGRESS → COMPLETED`, plus `CANCELLED` / `NO_SHOW`.
- Booking source tracked (`ONLINE`, `WALK_IN`, `PHONE`, `ADMIN`).
- Timezone-correct slot math uses the tenant's configured timezone.

**API:** `GET /bookings`, `GET /bookings/:id`, `POST /bookings`, `PATCH /bookings/:id/reschedule`, `PATCH /bookings/:id/cancel`, `PATCH /bookings/:id/status`
**Web:** `/dashboard/calendar`

## 👩‍🔧 Resources & Availability — Done

- Resource profiles (`StaffProfile`) with title, bio, calendar colour, commission rate, bookable flag.
- **Resource types** — `HUMAN` (staff/practitioner/trainer/technician), `ROOM`, `TABLE`, `EQUIPMENT`, `UNIT` — with an optional `capacity` (room occupancy / table seats).
- Per-day **working hours** and **time-off**; resources are linked to the offerings they can deliver.
- The availability engine computes free slots per resource from working hours minus time-off minus existing bookings, honouring offering duration + before/after buffers.

**API:** `GET/POST/PATCH/DELETE /staff`, `PUT /staff/:id/working-hours`, `POST /staff/:id/time-off`, `DELETE /staff/:id/time-off/:timeOffId`, `GET /bookings/availability`
**Web:** `/dashboard/staff`

## 🛍️ Offerings & Catalogue — Done

- Offerings (`Service`) grouped into ordered categories, with duration, before/after buffers, price, colour, image, deposit settings, and an online-bookable flag.
- **Booking-mode controls:** set `bookingMode`, plus `capacity` (CAPACITY seats) or `inventory` (DATE_RANGE units) per offering.
- Categories are fully manageable (CRUD + sort order).

**API:** `GET/POST/PATCH/DELETE /services` (filter `categoryId`, `activeOnly`), `GET/POST/PATCH/DELETE /service-categories`
**Web:** `/dashboard/services`

## 🧑‍🤝‍🧑 Customers / CRM — Done

- Searchable customer directory (by name, email, phone) with pagination.
- Rich records: tags, loyalty points, marketing opt-in, notes, date of birth, plus booking/sale history.

**API:** `GET /clients` (search + paginate), `GET /clients/:id`, `POST /clients`, `PATCH /clients/:id`, `DELETE /clients/:id`
**Web:** `/dashboard/clients`

## 🛒 POS & Sales — Done

- Build a sale from a booking or ad-hoc; add service/product line items.
- Apply discounts, tips and tax; subtotal/total computed with `Decimal` precision.
- Void sales (owner/manager); sale numbers auto-increment.

**API:** `POST /sales`, `GET /sales` (filter `status`), `GET /sales/:id`, `POST /sales/:id/items`, `DELETE /sales/:id/items/:itemId`, `POST /sales/:id/discount`, `PATCH /sales/:id/tip-tax`, `PATCH /sales/:id/void`
**Web:** `/dashboard/pos`

## 💳 Payments & Payouts — Done (live keys: Partial)

- **Card** via Stripe PaymentIntents; **cash** recorded directly; sales auto-settle to `PAID` when fully covered.
- **Stripe Connect** destination charges route money to each tenant's own account when it has a `stripeAccountId`; otherwise a direct charge is made.
- Refunds reflected automatically from Stripe webhooks (`charge.refunded`).
- **Partial:** Stripe Elements are simulated until real keys are configured.

**API:** `POST /payments/intent`, `POST /payments/cash`, `GET /payments`, `POST /webhooks/stripe`
**Web:** booking deposit step + `/dashboard/pos`

## 📦 Inventory — Done

- Products with SKU, price, cost, stock quantity and a low-stock threshold.
- Record inventory movements (`PURCHASE`, `SALE`, `ADJUSTMENT`, `RETURN`) and surface low-stock items.

**API:** `GET/POST/PATCH/DELETE /products`, `GET /products?lowStock=…`, `POST /products/:id/movements`, `GET /reports/low-stock`
**Web:** `/dashboard/services` (catalogue) · reports

## 📊 Reports & Analytics — Done

- Dashboard summary KPIs and revenue over time (day/week/month buckets).
- Revenue by offering and by resource, bookings by status, top customers, resource utilization, low stock, and average rating.

**API:** `GET /reports/summary`, `/reports/revenue`, `/reports/revenue-by-service`, `/reports/revenue-by-staff`, `/reports/appointments-by-status`, `/reports/top-clients`, `/reports/utilization`, `/reports/low-stock`, `/reports/average-rating`
**Web:** `/dashboard` (KPIs + charts), `/dashboard/reports`

## ⭐ Marketing — Discounts, Loyalty & Reviews — Done

- **Discount codes** — percent or fixed, with validity window, usage limit and usage count (e.g. seeded `WELCOME10`).
- **Loyalty points** tracked per customer.
- **Reviews** — 1–5 stars with comments, publishable; shown on the public site.

**API:** `POST /sales/:id/discount`, `GET/POST/PATCH/DELETE /reviews`, `GET /public/reviews`
**Web:** `/dashboard/clients`, `/dashboard/settings`, public booking site

## 🔔 Notifications — Partial

- `Notification` model + channels (`EMAIL`, `SMS`, `WHATSAPP`, `PUSH`) with queued/sent/failed status.
- **Partial:** mail + notification services are scaffolded (`apps/api/src/messaging/`); actual sending (SMTP/Twilio) and reminder scheduling are not wired. See [ROADMAP.md](ROADMAP.md).

**API:** internal (`messaging/` services)

## 🏢 Multi-location — Done

- A tenant can run multiple locations, each with its own address, phone/email, geo coordinates, active flag, and optional timezone override.
- Bookings and sales can be attributed to a location.

**API:** `GET/POST/PATCH/DELETE /locations`
**Web:** `/dashboard/settings`

## 🌍 Multi-language / RTL — Done

- UI available in **English (en)**, **Urdu (ur)** and **Arabic (ar)**; Urdu and Arabic render **right-to-left**.
- Locale is part of the URL (`/[locale]/…`); a language switcher flips the whole app instantly.

**Web:** all routes; `src/messages/{en,ur,ar}.json`, `src/i18n/`

## 🎨 White-label Branding — Done

- Per-tenant logo, primary colour and tagline theme the booking site and emails.
- Per-tenant currency, timezone and locale; custom-domain support.

**API:** `GET /tenant`, `PATCH /tenant`, `GET /public/site`
**Web:** `/dashboard/settings`

## 🧾 SaaS Billing & Plans — Done (enforcement: Partial)

- Three plans — **Starter / Pro / Business** — sold via Stripe Checkout, managed via the Stripe Customer Portal.
- Signup creates a TRIAL subscription; subscription state stays in sync via webhooks.
- **Done:** per-plan **staff & location caps are enforced server-side** — `StaffService.create` and `LocationsService.create` reject (403) when the tenant is at its `PLAN_LIMITS` ceiling and prompt to upgrade.
- **Partial:** per-plan *feature* gating (e.g. reports/inventory on higher tiers) is enforced in the web UI (`plans.ts`) but not yet on every API route.

**API:** `GET /billing/subscription`, `POST /billing/checkout`, `POST /billing/portal`, `POST /webhooks/stripe`
**Web:** landing `/#pricing`, `/dashboard/settings`

## 🔐 Multi-tenancy & Auth — Done

- Tenant resolved from `x-tenant-slug` header → subdomain → query param.
- `forTenant(tenantId)` Prisma `$extends` auto-filters and auto-stamps `tenantId` on every tenant-owned model.
- JWT access tokens (15m) + rotating refresh (30d); `@Public()` skips the guard, `@Roles()` enforces role metadata.
- Roles: `SUPER_ADMIN | OWNER | MANAGER | STAFF | RECEPTIONIST | CLIENT`.

**API:** `POST /auth/register`, `/login`, `/refresh`, `/logout`, `GET /auth/me`
**Docs:** [MULTI-TENANCY.md](MULTI-TENANCY.md)

---

## Plan comparison

> Pricing shown is the marketing landing default (monthly; free trial, yearly discount). Defined in `apps/web/src/lib/plans.ts`.

| | **Starter** — $29/mo | **Pro** — $69/mo | **Business** — $149/mo |
| --- | --- | --- | --- |
| Best for | Solo pros & new businesses | Growing teams | Multi-location groups |
| Locations | 1 | Up to 3 | Unlimited |
| Staff / resources | Up to 3 | Up to 15 | Unlimited |
| Online booking page | ✅ | ✅ | ✅ |
| Calendar | ✅ | ✅ | ✅ |
| POS & sales | ✅ | ✅ | ✅ |
| Reminders | — | ✅ | ✅ |
| Advanced analytics | — | ✅ | ✅ |
| Inventory | — | ✅ | ✅ |
| Marketing (discounts/loyalty) | — | ✅ | ✅ |
| Custom branding | — | ✅ | ✅ |
| Multi-location | — | — | ✅ |
| API access | — | — | ✅ |

_(`Plan` enum: `STARTER`, `PRO`, `BUSINESS`. Feature flags + limits are defined in `apps/web/src/lib/plans.ts`; enforcement granularity is a roadmap item.)_
</content>
