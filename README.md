<div align="center">

# 💇 SalonOS

### The all-in-one, multi-tenant platform for salons & spas

**Online booking · Calendar · POS · Payments · CRM · Inventory · Analytics — white-labeled and multilingual.**

![Stack](https://img.shields.io/badge/monorepo-pnpm%20%2B%20Turborepo-blue)
![API](https://img.shields.io/badge/API-NestJS%2011-e0234e)
![Web](https://img.shields.io/badge/Web-Next.js%2015%20%2F%20React%2019-black)
![DB](https://img.shields.io/badge/DB-PostgreSQL%2016%20%2F%20Prisma%206-3982CE)
![i18n](https://img.shields.io/badge/i18n-EN%20%C2%B7%20UR%20%C2%B7%20AR%20(RTL)-7C3AED)
![License](https://img.shields.io/badge/license-proprietary-lightgrey)

</div>

---

SalonOS is a production-grade SaaS that lets a salon or spa run its entire operation from one place — and lets **you** run many salons from one codebase. Each salon gets its own white-labeled booking site, dashboard, currency, timezone, and language, while everything lives in a single shared database with strict per-tenant isolation.

It ships with a polished marketing site, a guest-friendly multi-step booking flow, a full owner/staff dashboard, Stripe-powered client payments and SaaS subscription billing, and a fully-seeded demo salon you can show to a prospect in under a minute.

---

## ✨ Feature highlights

| Area | What you get |
| --- | --- |
| 🗓️ **Online booking** | Branded, locale-aware booking site with a smart slot-availability engine and optional Stripe deposit |
| 📅 **Calendar & scheduling** | Day/staff views, reschedule, cancel, full status lifecycle (pending → completed / no-show) |
| 👩‍🎨 **Staff & availability** | Profiles, working hours, time-off, per-service eligibility, commission rates |
| 💅 **Services & catalogue** | Categorised services with duration, buffers, pricing, deposits and online-bookable flags |
| 🧑‍🤝‍🧑 **Clients / CRM** | Searchable client records, history, tags, loyalty points, marketing opt-in |
| 🛒 **POS & sales** | Sell services + products, discounts, tips, tax; create a sale from an appointment or ad-hoc |
| 💳 **Payments & payouts** | Stripe PaymentIntents, cash recording, and **Stripe Connect** so each salon gets paid directly |
| 📦 **Inventory** | Products, SKUs, stock levels, low-stock alerts, inventory movements |
| 📊 **Reports & analytics** | Revenue over time, by service/staff, utilization, top clients, ratings, low stock |
| ⭐ **Marketing** | Discount codes, loyalty points, published reviews |
| 🏢 **Multi-location** | Multiple locations per salon, each with its own address & timezone |
| 🌍 **Multi-language / RTL** | English, Urdu and Arabic — with full right-to-left layouts |
| 🎨 **White-label branding** | Per-tenant logo, primary color, tagline, and custom domain support |
| 🧾 **SaaS billing** | Starter / Pro / Business plans via Stripe Checkout + Customer Portal + webhooks |

---

## 📸 Screenshots

> _Add screenshots / a short demo GIF here._

| Marketing landing | Owner dashboard | Booking flow |
| --- | --- | --- |
| `docs/img/landing.png` | `docs/img/dashboard.png` | `docs/img/booking.png` |

See **[docs/DEMO.md](docs/DEMO.md)** for a guided, sales-ready walkthrough.

---

## 🧱 Tech stack

- **Monorepo** — pnpm workspaces + [Turborepo](https://turbo.build)
- **API** — `@salonos/api`: [NestJS 11](https://nestjs.com), Prisma 6, JWT auth, Stripe, Swagger at `/docs`, served under `/api/v1` on port **4000**
- **Web** — `@salonos/web`: [Next.js 15](https://nextjs.org) App Router, React 19, Tailwind CSS + shadcn/ui, next-intl, TanStack Query, Recharts, Stripe.js, on port **3000**
- **Database package** — `@salonos/database`: Prisma client, a tenant-scoped `forTenant()` extension, and the demo seed
- **Data store** — PostgreSQL 16 · **Cache/queues** — Redis 7 (both via Docker Compose)
- **Payments** — Stripe (PaymentIntents, Connect, Checkout, Customer Portal, webhooks)

---

## 🚀 Quick start

> **Prerequisites:** Node 20+, pnpm 11, and either Docker (recommended) or a local PostgreSQL 16 + Redis 7.

### 1. Clone, configure and bootstrap (Docker path — recommended)

```bash
git clone <your-repo-url> SalonOS && cd SalonOS
cp .env.example .env          # defaults already work with Docker

pnpm setup                    # install + docker:up + build db + migrate + seed
pnpm dev                      # api → :4000   web → :3000
```

`pnpm setup` brings up PostgreSQL + Redis containers, generates the Prisma client, runs migrations, and seeds the demo salon in one shot.

### 2. Using an existing PostgreSQL (no Docker)

```bash
cp .env.example .env
# Edit .env → point DATABASE_URL at your Postgres and set REDIS_URL.
# Create the role/db first, e.g.:
#   createuser salonos --pwprompt
#   createdb salonos -O salonos

pnpm install
pnpm db:build && pnpm db:migrate && pnpm db:seed
pnpm dev
```

Then open:

- 🖥️ **Web app** → http://localhost:3000
- 🔌 **API + Swagger docs** → http://localhost:4000/docs
- 🧰 **Prisma Studio** → `pnpm db:studio`

> 💡 Full instructions (Stripe, email/SMS, production deploy) are in **[docs/SETUP.md](docs/SETUP.md)**.

---

## 🔑 Demo credentials

After seeding, a complete demo salon **"Lumière Beauty Lounge"** is ready:

| | |
| --- | --- |
| **Tenant slug** | `lumiere` (USD · America/New_York) |
| **Owner login** | `owner@lumiere.demo` / `Passw0rd!` |
| **Booking site** | http://localhost:3000/en/book (or `?tenant=lumiere`) |
| **Discount code** | `WELCOME10` (10% off) |

Comes pre-loaded with 3 staff, 6 services across Hair/Color/Nails, 4 clients, sample appointments, sales, payments, reviews and products. Reset anytime with `pnpm db:seed`.

---

## 📁 Project structure

```
SalonOS/
├── apps/
│   ├── api/                      # @salonos/api — NestJS REST API
│   │   └── src/
│   │       ├── auth/             # JWT auth, guards, roles, strategies
│   │       ├── tenant/           # tenant resolution middleware + decorator
│   │       ├── database/         # Prisma + tenant-scoped client providers
│   │       ├── stripe/           # Stripe SDK wrapper
│   │       ├── messaging/        # mail + notification services
│   │       ├── common/           # filters, money helpers, shared types
│   │       └── modules/          # tenants, locations, staff, services,
│   │                             #   clients, bookings, products, sales,
│   │                             #   payments, billing, reports, reviews,
│   │                             #   public, webhooks
│   └── web/                      # @salonos/web — Next.js front-end
│       └── src/
│           ├── app/[locale]/     # marketing, auth, /book, /dashboard/*
│           ├── components/       # marketing, dashboard, booking, ui (shadcn)
│           ├── i18n/             # locale config + routing
│           ├── messages/         # en.json, ur.json, ar.json
│           ├── lib/              # api client, mock data, stripe, types
│           └── middleware.ts     # locale + subdomain → x-tenant-slug
├── packages/
│   └── database/                 # @salonos/database
│       ├── prisma/
│       │   ├── schema.prisma     # full multi-tenant data model
│       │   └── seed.ts           # demo salon seed
│       └── src/
│           ├── index.ts          # Prisma singleton + re-exports
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
| **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** | System overview, request lifecycle, monorepo layout, key decisions |
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
pnpm db:seed      # (re)seed the demo salon
pnpm db:studio    # open Prisma Studio
pnpm docker:up    # start Postgres + Redis
pnpm docker:down  # stop them
```

---

## 📄 License

Proprietary — © SalonOS. All rights reserved. Internal/commercial use only unless a separate license is agreed in writing.
