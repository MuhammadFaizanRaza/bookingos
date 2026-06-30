<div align="center">

# 📅 BookingOS

### The multi-tenant, multi-vertical, multi-model booking platform

**One codebase that runs salons, clinics, gyms, hotels, rentals, restaurants, events and field-service businesses — each white-labeled, multilingual, and billed as SaaS.**

![Stack](https://img.shields.io/badge/monorepo-pnpm%20%2B%20Turborepo-blue)
![API](https://img.shields.io/badge/API-NestJS%2011-e0234e)
![Web](https://img.shields.io/badge/Web-Next.js%2015%20%2F%20React%2019-black)
![DB](https://img.shields.io/badge/DB-PostgreSQL%2016%20%2F%20Prisma%206-3982CE)
![i18n](https://img.shields.io/badge/i18n-EN%20%C2%B7%20UR%20%C2%B7%20AR%20(RTL)-7C3AED)
![License](https://img.shields.io/badge/license-proprietary-lightgrey)

</div>

---

BookingOS is a production-grade booking/appointment SaaS built on a single shared data model and booking engine that **adapts to any industry**. A tenant picks a **vertical** at signup; the platform then relabels the UI with industry-appropriate terminology (a "service" becomes a *treatment*, *class*, *room type* or *event*; a "staff member" becomes a *practitioner*, *trainer*, *room* or *table*) and defaults each offering to the right **booking model**. The schema, availability engines, payments, POS, CRM and analytics stay the same underneath.

Every tenant gets its own white-labeled booking site, dashboard, currency, timezone and language, while all data lives in one shared database with strict per-tenant isolation. It ships with a polished marketing site, a guest-friendly multi-step booking flow, a full owner/staff dashboard, Stripe-powered client payments and SaaS subscription billing, and fully-seeded demo tenants you can show to a prospect in under a minute.

---

## 🏭 Supported industries (verticals)

A tenant's `vertical` drives terminology (term-packs) and the default booking mode. The underlying engine is identical across all of them.

| Vertical | Industries | Resource → Offering → Customer → Booking | Default mode |
| --- | --- | --- | --- |
| **SALON** | Hair, beauty, nails, barber, spa | Staff → Service → Client → Appointment | TIME_SLOT |
| **CLINIC** | Medical, dental, therapy, wellness | Practitioner → Treatment → Patient → Appointment | TIME_SLOT |
| **FITNESS** | Gym, PT, yoga, pilates, studios | Trainer → Class → Member → Session | TIME_SLOT / CAPACITY |
| **HOTEL** | Rooms & accommodation | Room → Room Type → Guest → Reservation | DATE_RANGE |
| **RENTAL** | Equipment, vehicles, spaces | Unit → Rental Item → Customer → Rental | DATE_RANGE |
| **RESTAURANT** | Table reservations | Table → Experience → Guest → Reservation | CAPACITY |
| **EVENTS** | Workshops, classes, ticketed events | Host → Event → Attendee → Ticket | CAPACITY |
| **SERVICES** | Plumber, electrician, cleaning, repair | Technician → Service → Customer → Job | TIME_SLOT |
| **GENERAL** | Neutral terminology for any business | Resource → Service → Customer → Booking | TIME_SLOT |

The per-vertical labels live in [`apps/web/src/lib/verticals.ts`](apps/web/src/lib/verticals.ts) and are applied throughout the dashboard via the `useTerms()` hook.

---

## 🧩 The three booking models

Each **offering** (`Service`) declares a `bookingMode`, which selects one of three availability engines and one of three booking-creation paths. A single tenant can mix all three.

| Mode | How it books | Who uses it | Availability engine |
| --- | --- | --- | --- |
| **TIME_SLOT** | A provider + duration on a given day, respecting working hours, time-off, buffers and existing bookings | Salon, clinic, gym 1:1, field services | Per-staff free-slot computation (timezone-correct) |
| **DATE_RANGE** | Check-in → check-out across nights/days, drawn from a finite `inventory` of identical units | Hotel rooms, equipment/vehicle rentals | Inventory count of overlapping bookings vs. `Service.inventory` |
| **CAPACITY** | A fixed-time session/event with limited seats (`quantity` per booking) | Classes, events, restaurant covers | Seats taken vs. `Service.capacity` for that session start |

At booking time, `BookingsService.create()` dispatches per line item on `Service.bookingMode` — checking staff availability, remaining inventory, or remaining seats accordingly, and storing `AppointmentItem.quantity` / `Appointment.partySize` where relevant. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for details.

---

## ✨ Feature highlights

| Area | What you get |
| --- | --- |
| 🏭 **Multi-vertical** | 9 industry term-packs; pick a vertical at signup, UI relabels automatically |
| 🧩 **Multi-model booking** | TIME_SLOT, DATE_RANGE and CAPACITY engines on one schema |
| 🗓️ **Online booking** | Branded, locale-aware public booking site with a mode-aware reserve flow (slot / date-range / seats), live availability and optional Stripe deposit |
| 📅 **Calendar & scheduling** | Reschedule, cancel, full status lifecycle (pending → completed / no-show), booking source tracking |
| 👩‍🔧 **Resources & availability** | Profiles, working hours, time-off, per-offering eligibility, commission; resource types HUMAN / ROOM / TABLE / EQUIPMENT / UNIT |
| 🛍️ **Offerings & catalogue** | Categorised offerings with duration, buffers, pricing, deposits, booking mode, capacity/inventory and online-bookable flags |
| 🧑‍🤝‍🧑 **Customers / CRM** | Searchable records, history, tags, loyalty points, marketing opt-in |
| 🛒 **POS & sales** | Sell services + products, discounts, tips, tax; create a sale from a booking or ad-hoc |
| 💳 **Payments & payouts** | Stripe PaymentIntents, cash recording, and **Stripe Connect** so each tenant gets paid directly |
| 📦 **Inventory** | Products, SKUs, stock levels, low-stock alerts, inventory movements |
| 📊 **Reports & analytics** | Revenue over time, by offering/resource, utilization, top customers, ratings, low stock |
| ⭐ **Marketing** | Discount codes, loyalty points, published reviews |
| 🏢 **Multi-location** | Multiple locations per tenant, each with its own address & timezone |
| 🌍 **Multi-language / RTL** | English, Urdu and Arabic — with full right-to-left layouts |
| 🎨 **White-label branding** | Per-tenant logo, primary color, tagline, currency, timezone, custom domain |
| 🧾 **SaaS billing** | Starter / Pro / Business plans via Stripe Checkout + Customer Portal + webhooks |

See [docs/FEATURES.md](docs/FEATURES.md) for the full catalogue (Done vs Partial).

---

## 🧱 Tech stack

- **Monorepo** — pnpm workspaces + [Turborepo](https://turbo.build)
- **API** — `@bookingos/api`: [NestJS 11](https://nestjs.com), Prisma 6, JWT auth, Stripe, Swagger at `/docs`, served under `/api/v1` on port **4000**
- **Web** — `@bookingos/web`: [Next.js 15](https://nextjs.org) App Router, React 19, Tailwind CSS + shadcn/ui, next-intl, TanStack Query, Recharts, Stripe.js, on port **3000**
- **Database package** — `@bookingos/database`: Prisma client, a tenant-scoped `forTenant()` extension, and the demo seed
- **Data store** — PostgreSQL 16 · **Cache/queues** — Redis 7 (both via Docker Compose)
- **Payments** — Stripe (PaymentIntents, Connect, Checkout, Customer Portal, webhooks)

---

## 🚀 Quick start

> **Prerequisites:** Node 20+, pnpm 11, and either Docker (recommended) or a local PostgreSQL 16 + Redis 7.

### 1. Clone, configure and bootstrap (Docker path — recommended)

```bash
git clone <your-repo-url> BookingOS && cd BookingOS
cp .env.example .env          # defaults already work with Docker

pnpm setup                    # install + docker:up + build db + migrate + seed
pnpm dev                      # api → :4000   web → :3000
```

`pnpm setup` brings up PostgreSQL + Redis containers, generates the Prisma client, runs migrations, and seeds the demo tenants in one shot.

### 2. Using an existing PostgreSQL (no Docker)

```bash
cp .env.example .env
# Edit .env → point DATABASE_URL at your Postgres and set REDIS_URL.
# Create the role/db first, e.g.:
#   createuser bookingos --pwprompt
#   createdb bookingos -O bookingos

pnpm install
pnpm db:build && pnpm db:migrate && pnpm db:seed
pnpm dev
```

> 💡 The Docker daemon may not be accessible to your user. If so, run `sudo usermod -aG docker $USER` (then re-login) or point `DATABASE_URL` at an existing Postgres instance.

Then open:

- 🖥️ **Web app** → http://localhost:3000
- 🔌 **API + Swagger docs** → http://localhost:4000/docs
- 🧰 **Prisma Studio** → `pnpm db:studio`

> Full instructions (Stripe, email/SMS, production deploy) are in **[docs/SETUP.md](docs/SETUP.md)**.

---

## 🔑 Demo credentials

`pnpm db:seed` creates **nine** fully-populated demo tenants — one (or two) per industry vertical — so you can demo any business type instantly. Every login uses the password **`Passw0rd!`**.

| Tenant | Slug | Vertical | Booking model | Owner login |
| --- | --- | --- | --- | --- |
| **Lumière Beauty Lounge** | `lumiere` | SALON | TIME_SLOT | `owner@lumiere.demo` |
| **Bloom & Glow Studio** | `bloom` | SALON | TIME_SLOT | `owner@bloom.demo` |
| **MediCare Family Clinic** | `medicare` | CLINIC | TIME_SLOT | `owner@medicare.demo` |
| **Pulse Fitness Studio** | `pulse` | FITNESS | CAPACITY (classes) | `owner@pulse.demo` |
| **Azure Bay Hotel** | `azure` | HOTEL | DATE_RANGE (rooms) | `owner@azure.demo` |
| **GearUp Outdoor Rentals** | `gearup` | RENTAL | DATE_RANGE (per-day) | `owner@gearup.demo` |
| **Tavola Trattoria** | `tavola` | RESTAURANT | CAPACITY (covers) | `owner@tavola.demo` |
| **Summit Events & Workshops** | `summit` | EVENTS | CAPACITY (tickets) | `owner@summit.demo` |
| **FixIt Home Services** | `fixit` | SERVICES | TIME_SLOT (field jobs) | `owner@fixit.demo` |

- **Booking site (per tenant):** `http://localhost:3000/en/<slug>` (e.g. `/en/azure`, `/en/pulse`)
- Each staff/resource is also a login (e.g. `dr.patel@medicare.demo`), password `Passw0rd!`.

Every tenant comes pre-loaded with resources, offerings (in the correct booking mode), customers, past + upcoming bookings, sales, payments and reviews — and the salon tenants include retail products with a low-stock item for reports. Reset anytime with `pnpm db:seed`. See **[docs/DEMO.md](docs/DEMO.md)** for a guided, sales-ready walkthrough.

---

## 📁 Project structure

```
BookingOS/
├── apps/
│   ├── api/                      # @bookingos/api — NestJS REST API
│   │   └── src/
│   │       ├── auth/             # JWT auth, guards, roles, strategies
│   │       ├── tenant/           # tenant resolution middleware + decorator
│   │       ├── database/         # Prisma + tenant-scoped client providers
│   │       ├── stripe/           # Stripe SDK wrapper
│   │       ├── messaging/        # mail + notification services (scaffolded)
│   │       ├── common/           # filters, money helpers, shared types
│   │       └── modules/          # tenants, locations, staff, services,
│   │                             #   clients, bookings, products, sales,
│   │                             #   payments, billing, reports, reviews,
│   │                             #   public, webhooks
│   └── web/                      # @bookingos/web — Next.js front-end
│       └── src/
│           ├── app/[locale]/     # marketing, auth, /book, /dashboard/*
│           ├── components/       # marketing, dashboard, booking, ui (shadcn)
│           ├── i18n/             # locale config + routing
│           ├── messages/         # en.json, ur.json, ar.json
│           ├── lib/              # api client, mock data, plans, verticals, types
│           ├── hooks/            # use-salon-data, use-terms (vertical labels)
│           └── middleware.ts     # locale + subdomain → x-tenant-slug
├── packages/
│   └── database/                 # @bookingos/database
│       ├── prisma/
│       │   ├── schema.prisma     # full multi-tenant, multi-vertical data model
│       │   └── seed.ts           # demo tenants seed
│       └── src/
│           ├── index.ts          # Prisma singleton + re-exports (plans, enums)
│           └── tenant.ts         # forTenant() row-level isolation
├── docs/                         # 📚 documentation (see below)
├── docker-compose.yml            # Postgres + Redis for local dev
├── turbo.json · pnpm-workspace.yaml · .env.example
```

---

## 📚 Documentation

| Doc | Description |
| --- | --- |
| **[docs/SETUP.md](docs/SETUP.md)** | Local setup, env vars, Stripe, email/SMS, and production deployment |
| **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** | System overview, request lifecycle, verticals + booking-mode strategy, key decisions |
| **[docs/MULTI-TENANCY.md](docs/MULTI-TENANCY.md)** | The tenancy model, `forTenant()`, resolution order, trade-offs |
| **[docs/FEATURES.md](docs/FEATURES.md)** | Full feature catalogue + plan comparison |
| **[docs/API.md](docs/API.md)** | REST reference for every endpoint, roles and examples |
| **[docs/DEMO.md](docs/DEMO.md)** | Sales-ready demo walkthrough script |
| **[docs/ROADMAP.md](docs/ROADMAP.md)** | Honest status: what's built, what's partial, what's next |

---

## 🛠️ Common commands

```bash
pnpm setup        # one-shot bootstrap (install + docker + db + seed)
pnpm dev          # build db, then run api + web in watch mode
pnpm build        # build all apps via Turborepo
pnpm db:migrate   # run Prisma migrations (dev)
pnpm db:seed      # (re)seed the demo tenants
pnpm db:studio    # open Prisma Studio
pnpm docker:up    # start Postgres + Redis
pnpm docker:down  # stop them
```

---

## 📄 License

Proprietary — © BookingOS. All rights reserved. Internal/commercial use only unless a separate license is agreed in writing.
</content>
</invoke>
