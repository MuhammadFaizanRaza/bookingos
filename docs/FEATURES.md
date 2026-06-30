# Features

A catalogue of what BookingOS does, grouped by area, with the backing API endpoints (all under `/api/v1`) and web pages (all locale-prefixed `/[locale]/…`). See [API.md](API.md) for full request details and [DEMO.md](DEMO.md) for a guided tour.

---

## 🗓️ Online Booking

- Branded, locale-aware public booking site per salon — no login required for guests.
- Multi-step flow: pick service → staff → date/time → details → (optional) deposit.
- Guests are matched to or created as a `Client` automatically on booking.

**API:** `GET /public/site`, `GET /public/services`, `GET /public/staff`, `GET /public/availability`, `GET /public/reviews`, `POST /public/bookings`
**Web:** `/book`

## 📅 Calendar & Scheduling

- Create, list (by date range / staff / status), reschedule, and cancel appointments.
- Full status lifecycle: `PENDING → CONFIRMED → CHECKED_IN → IN_PROGRESS → COMPLETED`, plus `CANCELLED` / `NO_SHOW`.
- Booking source tracked (`ONLINE`, `WALK_IN`, `PHONE`, `ADMIN`).

**API:** `GET /bookings`, `GET /bookings/:id`, `POST /bookings`, `PATCH /bookings/:id/reschedule`, `PATCH /bookings/:id/cancel`, `PATCH /bookings/:id/status`
**Web:** `/dashboard/calendar`

## 👩‍🎨 Staff & Availability

- Staff profiles with title, bio, calendar colour, commission rate, bookable flag.
- Per-day **working hours** and **time-off**; staff are linked to the services they can perform.
- A slot-availability engine computes free slots per staff member from working hours minus time-off minus existing bookings, honouring service duration + before/after buffers.

**API:** `GET/POST/PATCH/DELETE /staff`, `PUT /staff/:id/working-hours`, `POST /staff/:id/time-off`, `DELETE /staff/:id/time-off/:timeOffId`, `GET /bookings/availability`
**Web:** `/dashboard/staff`

## 💅 Services & Catalogue

- Services grouped into ordered categories, with duration, before/after buffers, price, colour, image, deposit settings, and an online-bookable flag.
- Service categories are fully manageable (CRUD + sort order).

**API:** `GET/POST/PATCH/DELETE /services` (filter `categoryId`, `activeOnly`), `GET/POST/PATCH/DELETE /service-categories`
**Web:** `/dashboard/services`

## 🧑‍🤝‍🧑 Clients / CRM

- Searchable client directory (by name, email, phone) with pagination.
- Rich records: tags, loyalty points, marketing opt-in, notes, date of birth, plus appointment/sale history.

**API:** `GET /clients` (search + paginate), `GET /clients/:id`, `POST /clients`, `PATCH /clients/:id`, `DELETE /clients/:id`
**Web:** `/dashboard/clients`

## 🛒 POS & Sales

- Build a sale from an appointment or ad-hoc; add service/product line items.
- Apply discounts, tips and tax; subtotal/total computed with `Decimal` precision.
- Void sales (owner/manager); sale numbers auto-increment.

**API:** `POST /sales`, `GET /sales` (filter `status`), `GET /sales/:id`, `POST /sales/:id/items`, `DELETE /sales/:id/items/:itemId`, `POST /sales/:id/discount`, `PATCH /sales/:id/tip-tax`, `PATCH /sales/:id/void`
**Web:** `/dashboard/pos`

## 💳 Payments & Payouts

- **Card** via Stripe PaymentIntents; **cash** recorded directly; sales auto-settle to `PAID` when fully covered.
- **Stripe Connect** destination charges route money to each salon's own account when it has a `stripeAccountId`; otherwise a direct charge is made.
- Refunds reflected automatically from Stripe webhooks (`charge.refunded`).

**API:** `POST /payments/intent`, `POST /payments/cash`, `GET /payments`, `POST /webhooks/stripe`
**Web:** booking deposit step + `/dashboard/pos`

## 📦 Inventory

- Products with SKU, price, cost, stock quantity and a low-stock threshold.
- Record inventory movements (`PURCHASE`, `SALE`, `ADJUSTMENT`, `RETURN`) and surface low-stock items.

**API:** `GET/POST/PATCH/DELETE /products`, `GET /products?lowStock=…`, `POST /products/:id/movements`, `GET /reports/low-stock`
**Web:** `/dashboard/services` (catalogue) · reports

## 📊 Reports & Analytics

- Dashboard summary KPIs and revenue over time (day/week/month buckets).
- Revenue by service and by staff, appointments by status, top clients, staff utilization, low stock, and average rating.

**API:** `GET /reports/summary`, `/reports/revenue`, `/reports/revenue-by-service`, `/reports/revenue-by-staff`, `/reports/appointments-by-status`, `/reports/top-clients`, `/reports/utilization`, `/reports/low-stock`, `/reports/average-rating`
**Web:** `/dashboard` (KPIs + charts), `/dashboard/reports`

## ⭐ Marketing — Discounts, Loyalty & Reviews

- **Discount codes** — percent or fixed, with validity window, usage limit and usage count (e.g. seeded `WELCOME10`).
- **Loyalty points** tracked per client.
- **Reviews** — 1–5 stars with comments, publishable; shown on the public site.

**API:** `POST /sales/:id/discount`, `GET/POST/PATCH/DELETE /reviews`, `GET /public/reviews`
**Web:** `/dashboard/clients`, `/dashboard/settings`, public booking site

## 🔔 Notifications

- Notification model + channels (`EMAIL`, `SMS`, `WHATSAPP`, `PUSH`) with queued/sent/failed status.
- Email (SMTP) and SMS/WhatsApp (Twilio) integrations are configurable. _(Reminder wiring status: see [ROADMAP.md](ROADMAP.md).)_

**API:** internal (`messaging/` services)

## 🏢 Multi-location

- A salon can run multiple locations, each with its own address, phone/email, geo coordinates, active flag, and optional timezone override.
- Appointments and sales can be attributed to a location.

**API:** `GET/POST/PATCH/DELETE /locations`
**Web:** `/dashboard/settings`

## 🌍 Multi-language / RTL

- UI available in **English (en)**, **Urdu (ur)** and **Arabic (ar)**; Urdu and Arabic render **right-to-left**.
- Locale is part of the URL (`/[locale]/…`); a language switcher flips the whole app instantly.

**Web:** all routes; `src/messages/{en,ur,ar}.json`, `src/i18n/`

## 🎨 White-label Branding

- Per-tenant logo, primary colour and tagline theme the booking site and emails.
- Per-tenant currency, timezone and locale; custom-domain support.

**API:** `GET /tenant`, `PATCH /tenant`, `GET /public/site`
**Web:** `/dashboard/settings`

## 🧾 SaaS Billing & Plans

- Three plans — **Starter / Pro / Business** — sold to salons via Stripe Checkout, managed via the Stripe Customer Portal.
- Signup creates a 14-day TRIAL; subscription state stays in sync via webhooks.

**API:** `GET /billing/subscription`, `POST /billing/checkout`, `POST /billing/portal`, `POST /webhooks/stripe`
**Web:** landing `/#pricing`, `/dashboard/settings`

---

## Plan comparison

> Pricing shown is the marketing landing default (monthly; 14-day free trial, ~20% off yearly).

| | **Starter** — $29/mo | **Pro** — $69/mo | **Business** — $149/mo |
| --- | --- | --- | --- |
| Best for | Solo pros & new salons | Growing teams | Multi-location groups |
| Locations | 1 | 1 | Unlimited |
| Staff | Up to 3 | Up to 15 | Unlimited |
| Online booking page | ✅ | ✅ | ✅ |
| Calendar & reminders | ✅ | ✅ | ✅ |
| Card & cash payments | ✅ | ✅ | ✅ |
| POS, deposits & tips | — | ✅ | ✅ |
| Advanced analytics | — | ✅ | ✅ |
| Client CRM & loyalty | — | ✅ | ✅ |
| Inventory & purchasing | — | — | ✅ |
| Custom domain & branding | — | — | ✅ |
| Support | Standard | Standard | Priority |

_(`Plan` enum: `STARTER`, `PRO`, `BUSINESS`. The plan tiers gate features at the product level; the code models the plans and billing — feature gating granularity is a roadmap item.)_
