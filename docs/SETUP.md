# Setup & Deployment

This guide covers local development setup, environment configuration, Stripe, optional email/SMS, and production deployment.

---

## 1. Prerequisites

| Tool | Version | Notes |
| --- | --- | --- |
| **Node.js** | ≥ 20 | enforced via `engines` in the root `package.json` |
| **pnpm** | 11 (`pnpm@11.7.0`) | `corepack enable` then `corepack prepare pnpm@11.7.0 --activate` |
| **Docker + Docker Compose v2** | recent | recommended for Postgres + Redis; `docker compose` (v2 syntax) is required |
| **PostgreSQL** | 16 | only if you are **not** using Docker |
| **Redis** | 7 | only if you are **not** using Docker |

> The repo pins build-script approvals in `pnpm-workspace.yaml` (`allowBuilds` for `@prisma/client`, `prisma`, `esbuild`, `sharp`, etc.) so native/postinstall builds run without an interactive prompt.

---

## 2. Environment variables

Copy the template and edit values:

```bash
cp .env.example .env
```

Everything reads from the **monorepo-root `.env`**:

- The API's `ConfigModule` loads `../../.env` (relative to `apps/api`).
- All DB scripts (`db:migrate`, `db:seed`, `db:studio`) load the root `.env` via `dotenv-cli`.
- Turborepo declares `.env` as a global dependency.

### Variable reference

| Variable | Purpose |
| --- | --- |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Credentials Docker Compose uses to create the Postgres container |
| `DATABASE_URL` | Prisma connection string. Default: `postgresql://bookingos:bookingos@localhost:5432/bookingos?schema=public` |
| `REDIS_URL` | Redis connection (`redis://localhost:6379`) |
| `API_PORT` | API port (default `4000`) |
| `NODE_ENV` | `development` / `production` |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | **Generate strong secrets in prod:** `openssl rand -hex 32` |
| `JWT_ACCESS_TTL` / `JWT_REFRESH_TTL` | Token lifetimes (default `15m` / `30d`) |
| `API_PUBLIC_URL` | Public base URL of the API (used in emails/webhooks) |
| `ROOT_DOMAIN` | Root domain for subdomain-based tenant resolution (e.g. `bookingos.app`) |
| `RESERVED_SUBDOMAINS` | Comma-separated subdomains that can never be a tenant (`www,app,api,admin,book,assets`) |
| `STRIPE_SECRET_KEY` / `STRIPE_PUBLISHABLE_KEY` | Stripe API keys |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret (`whsec_…`) |
| `STRIPE_CONNECT_CLIENT_ID` | Stripe Connect client id (salon payouts) |
| `STRIPE_PRICE_STARTER` / `_PRO` / `_BUSINESS` | Price IDs of the SaaS plans you sell to salons |
| `SMTP_*` / `MAIL_FROM` | Transactional email (optional) |
| `TWILIO_*` | SMS / WhatsApp reminders (optional) |
| `S3_*` | S3-compatible file storage for uploads (optional) |
| `WEB_PORT` | Web port (default `3000`) |
| `NEXT_PUBLIC_API_URL` | API base URL the browser calls (`http://localhost:4000`) |
| `NEXT_PUBLIC_APP_URL` | Public URL of the web app (also the API's CORS origin) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key exposed to the browser |
| `NEXT_PUBLIC_DEFAULT_LOCALE` | Default UI locale (`en`) |

> ⚠️ Variables prefixed `NEXT_PUBLIC_` are bundled into the browser build — never put secrets there.

---

## 3. Local setup

### Option A — Docker (recommended)

The fastest path. `docker-compose.yml` starts **PostgreSQL 16** and **Redis 7** with healthchecks and named volumes.

```bash
pnpm setup    # install + docker:up + db build + db:migrate + db:seed
pnpm dev      # api on :4000, web on :3000
```

`pnpm setup` expands to:

```
pnpm install
pnpm docker:up                                  # docker compose up -d
pnpm --filter @bookingos/database build           # prisma generate + tsc
pnpm db:migrate                                  # prisma migrate dev
pnpm db:seed                                     # demo salon
```

> If Docker complains about permissions, add your user to the `docker` group (`sudo usermod -aG docker $USER`, then re-login) or run the compose commands with `sudo`.

### Option B — Existing PostgreSQL / Redis (no Docker)

1. Create the role and database (defaults expect `bookingos`/`bookingos` on `localhost:5432`):

   ```bash
   createuser bookingos --pwprompt        # set password: bookingos
   createdb bookingos -O bookingos
   ```

   …or point `DATABASE_URL` and `REDIS_URL` in `.env` at your own instances.

2. Build, migrate, seed, and run:

   ```bash
   pnpm install
   pnpm db:build      # prisma generate + compile @bookingos/database
   pnpm db:migrate    # apply migrations
   pnpm db:seed       # demo salon
   pnpm dev
   ```

### Verify it's working

| Check | URL / command |
| --- | --- |
| API health | `curl http://localhost:4000/api/v1/health` |
| Swagger UI (live API reference) | http://localhost:4000/docs |
| Web app | http://localhost:3000 |
| Booking site (demo) | http://localhost:3000/en/book |
| Prisma Studio | `pnpm db:studio` |

> The API connects to PostgreSQL on startup (`$connect()` in `onModuleInit`), so the database must be reachable before `pnpm dev`.

---

## 4. Stripe setup

BookingOS uses Stripe for **two distinct things**:

1. **Salon sales** — clients pay the salon for services/products (PaymentIntents; via **Stripe Connect** destination charges when the tenant has a connected account).
2. **SaaS subscription billing** — salons pay *you* for their plan (Checkout + Customer Portal + webhooks).

### a) Test keys

Grab test keys from the [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys) and set:

```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

> Until a real publishable key is set (i.e. it's not `pk_test_xxx`), the booking app's payment step falls back to a **simulated** card form so the flow still completes — see `apps/web/src/lib/stripe.ts` and [ROADMAP.md](ROADMAP.md).

### b) Subscription plan price IDs

Create three recurring Products/Prices in Stripe (Starter, Pro, Business) and set:

```bash
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_BUSINESS=price_...
```

The API maps `Plan` enum → price id in `stripe.service.ts` (`priceIdForPlan` / `planForPriceId`).

### c) Webhooks (local)

The webhook endpoint is **`POST /api/v1/webhooks/stripe`** — signature-verified using the raw request body, and idempotent via the `WebhookEvent` table.

Forward events locally with the Stripe CLI:

```bash
stripe login
stripe listen --forward-to localhost:4000/api/v1/webhooks/stripe
# copy the printed whsec_... into STRIPE_WEBHOOK_SECRET, then restart the API
```

Handled events (`webhooks.service.ts`):

- `payment_intent.succeeded` → marks the Payment succeeded, settles the Sale
- `charge.refunded` → records refund, flips Payment/Sale to (partially) refunded
- `customer.subscription.updated` / `customer.subscription.deleted` → upserts the tenant's Subscription and Tenant status/plan

### d) Stripe Connect (salon payouts)

Set `STRIPE_CONNECT_CLIENT_ID` and onboard each salon to a connected account. When a tenant has a `stripeAccountId`, `PaymentsService.createPaymentIntent` issues a **destination charge** (`on_behalf_of` + `transfer_data.destination`) so funds settle into the salon's balance; otherwise a direct charge is made.

---

## 5. Email & SMS (optional)

- **Email** — set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM`. Wired via `apps/api/src/messaging/mail.service.ts`.
- **SMS / WhatsApp** — set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` for appointment reminders. (Notification records use the `Notification` model and `NotificationChannel` enum.)

Both are optional; the app runs without them. See [ROADMAP.md](ROADMAP.md) for wiring status.

---

## 6. Production deployment

### Build

```bash
pnpm install --frozen-lockfile
pnpm db:build          # generate Prisma client + compile @bookingos/database
pnpm build             # turbo builds both api (dist/) and web (.next/)
```

### Database migrations

Use **`migrate deploy`** (never `migrate dev`) in production:

```bash
pnpm --filter @bookingos/database migrate:deploy
```

### Run

```bash
# API
node apps/api/dist/main          # or: pnpm --filter @bookingos/api start
# Web
pnpm --filter @bookingos/web start # next start -p 3000
```

### Production environment

- `NODE_ENV=production`
- Strong, unique `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET`
- Live `STRIPE_*` keys + a production `STRIPE_WEBHOOK_SECRET` (register the webhook endpoint in the Stripe Dashboard)
- `ROOT_DOMAIN` = your real apex domain; `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_APP_URL` = your public URLs
- Managed PostgreSQL 16 + Redis 7

### Reverse proxy

Put the web (`:3000`) and API (`:4000`) behind a reverse proxy (Nginx / Caddy / a PaaS router) terminating TLS. The API enables `helmet()` and CORS restricted to `NEXT_PUBLIC_APP_URL`, and the global prefix is `/api/v1`. Route `*.yourdomain → web` and `api.yourdomain → API` (or proxy `/api` to the API).

> **Webhook body:** the API needs the **raw** body for `POST /api/v1/webhooks/stripe`. Don't let a proxy rewrite/recompress that route's body; it's already handled in `main.ts` with `express.raw()`.

### Wildcard subdomain DNS (for tenants)

Tenants are reachable at `<slug>.ROOT_DOMAIN` (e.g. `lumiere.bookingos.app`). Create a **wildcard DNS record** `*.yourdomain → web app` and a **wildcard TLS certificate** (e.g. via Let's Encrypt DNS-01 or your platform's managed certs). The web middleware extracts the subdomain → `x-tenant-slug`, and the API resolves the tenant from it. Custom domains map to `Tenant.customDomain`.

### Container / PaaS suggestions

- **Containers** — build separate images for `apps/api` and `apps/web`; run Postgres/Redis as managed services. The included `docker-compose.yml` is for **local dev only** (a production compose can extend it with app services + secrets).
- **PaaS** — Web deploys cleanly to Vercel (Next.js 15); the API to Render / Railway / Fly.io / a container platform. Run `migrate deploy` as a release/pre-deploy step.
