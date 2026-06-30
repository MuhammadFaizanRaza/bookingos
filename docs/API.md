# API Reference

> **Live source of truth:** the API self-documents with Swagger at **http://localhost:4000/docs**. This page is a concise human reference; when in doubt, the Swagger UI reflects the running code exactly.

---

## Base URL & conventions

- **Base URL:** `http://localhost:4000` (configurable via `API_PORT` / `API_PUBLIC_URL`)
- **Global prefix:** every route is under **`/api/v1`**
- **Content type:** `application/json` (except the Stripe webhook, which is raw)
- **Validation:** global `ValidationPipe` (`whitelist: true`, `transform: true`) — unknown fields are stripped
- **Errors:** normalised by a global exception filter; typical body `{ "statusCode", "message", "error" }`

### Authentication header

Authenticated routes require a Bearer access token:

```
Authorization: Bearer <accessToken>
```

Access tokens last **15 minutes**; refresh tokens (rotating, hashed, stored) last **30 days**. Use `POST /auth/refresh` to rotate.

### Tenant header

Tenant-scoped routes need a tenant. Provide it via (in resolution order):

1. **`x-tenant-slug: <slug>`** header (e.g. `lumiere`)
2. a tenant subdomain `<slug>.ROOT_DOMAIN`
3. `?tenant=<slug>` query param

```
x-tenant-slug: lumiere
```

Routes that need a tenant return `400` if none is resolved; an unknown slug returns `404`.

### Roles

`SUPER_ADMIN` · `OWNER` · `MANAGER` · `STAFF` · `RECEPTIONIST` · `CLIENT`. Where a route lists roles, those are enforced by `@Roles(...)`. Routes with **no role restriction** are open to any authenticated user; **Public** routes need no auth.

---

## Auth — `/auth`

| Method | Path | Description | Access |
| --- | --- | --- | --- |
| POST | `/auth/register` | Salon signup — creates Tenant + OWNER + TRIAL subscription | Public |
| POST | `/auth/login` | Log in, returns access + refresh tokens | Public |
| POST | `/auth/refresh` | Rotate refresh token, get a new pair | Public |
| POST | `/auth/logout` | Revoke a refresh token | Public |
| GET | `/auth/me` | Current authenticated user (+ tenant) | Authenticated |

## Health — `/health`

| Method | Path | Description | Access |
| --- | --- | --- | --- |
| GET | `/health` | Liveness check | Public |

## Tenant — `/tenant`

| Method | Path | Description | Access |
| --- | --- | --- | --- |
| GET | `/tenant` | Current tenant (branding, locale, currency, …) | Authenticated |
| PATCH | `/tenant` | Update tenant settings/branding | OWNER, MANAGER |

## Locations — `/locations`

| Method | Path | Description | Access |
| --- | --- | --- | --- |
| GET | `/locations` | List locations | Authenticated |
| GET | `/locations/:id` | Get a location | Authenticated |
| POST | `/locations` | Create a location | OWNER, MANAGER |
| PATCH | `/locations/:id` | Update a location | OWNER, MANAGER |
| DELETE | `/locations/:id` | Delete a location | OWNER, MANAGER |

## Staff — `/staff`

| Method | Path | Description | Access |
| --- | --- | --- | --- |
| GET | `/staff` | List staff | Authenticated |
| GET | `/staff/:id` | Get a staff member | Authenticated |
| POST | `/staff` | Create a staff member | OWNER, MANAGER |
| PATCH | `/staff/:id` | Update a staff member | OWNER, MANAGER |
| DELETE | `/staff/:id` | Delete a staff member | OWNER, MANAGER |
| PUT | `/staff/:id/working-hours` | Replace working hours | OWNER, MANAGER |
| POST | `/staff/:id/time-off` | Add time-off | OWNER, MANAGER, STAFF |
| DELETE | `/staff/:id/time-off/:timeOffId` | Remove time-off | OWNER, MANAGER, STAFF |

## Services — `/services`

| Method | Path | Description | Access |
| --- | --- | --- | --- |
| GET | `/services` | List services (filter `categoryId`, `activeOnly`) | Authenticated |
| GET | `/services/:id` | Get a service | Authenticated |
| POST | `/services` | Create a service | OWNER, MANAGER |
| PATCH | `/services/:id` | Update a service | OWNER, MANAGER |
| DELETE | `/services/:id` | Delete a service | OWNER, MANAGER |

## Service Categories — `/service-categories`

| Method | Path | Description | Access |
| --- | --- | --- | --- |
| GET | `/service-categories` | List categories | Authenticated |
| POST | `/service-categories` | Create a category | OWNER, MANAGER |
| PATCH | `/service-categories/:id` | Update a category | OWNER, MANAGER |
| DELETE | `/service-categories/:id` | Delete a category | OWNER, MANAGER |

## Clients — `/clients`

| Method | Path | Description | Access |
| --- | --- | --- | --- |
| GET | `/clients` | List/search clients (`q`, `page`, `pageSize`) | Authenticated |
| GET | `/clients/:id` | Get a client with history | Authenticated |
| POST | `/clients` | Create a client | Authenticated |
| PATCH | `/clients/:id` | Update a client | Authenticated |
| DELETE | `/clients/:id` | Delete a client | OWNER, MANAGER |

## Bookings — `/bookings`

| Method | Path | Description | Access |
| --- | --- | --- | --- |
| GET | `/bookings/availability` | Free slots for a service on a date (per staff) | Authenticated |
| GET | `/bookings` | List appointments (`from`, `to`, `staffId`, `status`) | Authenticated |
| GET | `/bookings/:id` | Get an appointment | Authenticated |
| POST | `/bookings` | Create an appointment with items | Authenticated |
| PATCH | `/bookings/:id/reschedule` | Reschedule | Authenticated |
| PATCH | `/bookings/:id/cancel` | Cancel | Authenticated |
| PATCH | `/bookings/:id/status` | Transition status | Authenticated |

## Products — `/products`

| Method | Path | Description | Access |
| --- | --- | --- | --- |
| GET | `/products` | List products (supports low-stock query) | Authenticated |
| GET | `/products/:id` | Get a product | Authenticated |
| POST | `/products` | Create a product | OWNER, MANAGER |
| PATCH | `/products/:id` | Update a product | OWNER, MANAGER |
| DELETE | `/products/:id` | Delete a product | OWNER, MANAGER |
| POST | `/products/:id/movements` | Record an inventory movement | OWNER, MANAGER |

## Sales / POS — `/sales`

| Method | Path | Description | Access |
| --- | --- | --- | --- |
| GET | `/sales` | List sales (filter `status`) | Authenticated |
| GET | `/sales/:id` | Get a sale | Authenticated |
| POST | `/sales` | Create a sale (from appointment or ad-hoc) | Authenticated |
| POST | `/sales/:id/items` | Add a line item | Authenticated |
| DELETE | `/sales/:id/items/:itemId` | Remove a line item | Authenticated |
| POST | `/sales/:id/discount` | Apply a discount | Authenticated |
| PATCH | `/sales/:id/tip-tax` | Set tip / tax | Authenticated |
| PATCH | `/sales/:id/void` | Void the sale | OWNER, MANAGER |

## Payments — `/payments`

| Method | Path | Description | Access |
| --- | --- | --- | --- |
| POST | `/payments/intent` | Create a Stripe PaymentIntent for a sale | Authenticated |
| POST | `/payments/cash` | Record a cash payment | Authenticated |
| GET | `/payments` | List payments (filter `saleId`) | Authenticated |

## Billing — `/billing`

| Method | Path | Description | Access |
| --- | --- | --- | --- |
| GET | `/billing/subscription` | Current subscription & billing status | Authenticated |
| POST | `/billing/checkout` | Create a Stripe Checkout session for a plan | OWNER |
| POST | `/billing/portal` | Create a Stripe Customer Portal link | OWNER |

## Reports — `/reports`  *(OWNER, MANAGER)*

| Method | Path | Description |
| --- | --- | --- |
| GET | `/reports/summary` | KPI summary |
| GET | `/reports/revenue` | Revenue over time (`bucket=day\|week\|month`, `from`, `to`) |
| GET | `/reports/revenue-by-service` | Revenue grouped by service |
| GET | `/reports/revenue-by-staff` | Revenue grouped by staff |
| GET | `/reports/appointments-by-status` | Appointment counts by status |
| GET | `/reports/top-clients` | Highest-value clients |
| GET | `/reports/utilization` | Staff utilization |
| GET | `/reports/low-stock` | Products below threshold |
| GET | `/reports/average-rating` | Average review rating |

## Reviews — `/reviews`

| Method | Path | Description | Access |
| --- | --- | --- | --- |
| GET | `/reviews` | List reviews | Authenticated |
| POST | `/reviews` | Create a review | Authenticated |
| PATCH | `/reviews/:id` | Update a review | OWNER, MANAGER |
| DELETE | `/reviews/:id` | Delete a review | OWNER, MANAGER |

## Public (no auth, slug-scoped) — `/public`

| Method | Path | Description |
| --- | --- | --- |
| GET | `/public/site` | Booking-site branding, locale & locations |
| GET | `/public/services` | Online-bookable services |
| GET | `/public/staff` | Bookable staff (optional `serviceId`) |
| GET | `/public/availability` | Free slots for a service on a date |
| GET | `/public/reviews` | Published reviews |
| POST | `/public/bookings` | Create a guest booking (find-or-create client) |

> All `/public/*` routes still require a resolved tenant (`x-tenant-slug` header or subdomain) — they just don't require a logged-in user.

## Webhooks — `/webhooks`

| Method | Path | Description | Access |
| --- | --- | --- | --- |
| POST | `/webhooks/stripe` | Stripe events (signature-verified, idempotent) | Public (signed) |

---

## Examples

### Register a salon

```bash
curl -X POST http://localhost:4000/api/v1/auth/register \
  -H 'Content-Type: application/json' \
  -d '{
    "salonName": "Lumière Beauty Lounge",
    "slug": "lumiere",
    "ownerName": "Sofia Marchetti",
    "email": "owner@lumiere.demo",
    "password": "Passw0rd!"
  }'
# → { tenant, user, accessToken, refreshToken }
```

### Log in

```bash
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -H 'x-tenant-slug: lumiere' \
  -d '{ "email": "owner@lumiere.demo", "password": "Passw0rd!" }'
# → { user, accessToken, refreshToken }
```

### Get availability

```bash
curl 'http://localhost:4000/api/v1/bookings/availability?serviceId=SVC_ID&date=2026-06-20&stepMin=15' \
  -H 'x-tenant-slug: lumiere' \
  -H 'Authorization: Bearer ACCESS_TOKEN'
# → [ { "start": "...Z", "end": "...Z", "staffId": "..." }, ... ]
```

### Create a booking (admin)

```bash
curl -X POST http://localhost:4000/api/v1/bookings \
  -H 'Content-Type: application/json' \
  -H 'x-tenant-slug: lumiere' \
  -H 'Authorization: Bearer ACCESS_TOKEN' \
  -d '{
    "clientId": "CLIENT_ID",
    "source": "ADMIN",
    "items": [
      { "serviceId": "SVC_ID", "staffId": "STAFF_ID", "startsAt": "2026-06-20T13:00:00.000Z" }
    ]
  }'
```

### Create a guest booking (public, no auth)

```bash
curl -X POST http://localhost:4000/api/v1/public/bookings \
  -H 'Content-Type: application/json' \
  -H 'x-tenant-slug: lumiere' \
  -d '{
    "name": "Emma Wilson",
    "email": "emma@example.com",
    "phone": "+1 212 555 1001",
    "items": [
      { "serviceId": "SVC_ID", "staffId": "STAFF_ID", "startsAt": "2026-06-20T13:00:00.000Z" }
    ]
  }'
```

### Create a payment intent for a sale

```bash
curl -X POST http://localhost:4000/api/v1/payments/intent \
  -H 'Content-Type: application/json' \
  -H 'x-tenant-slug: lumiere' \
  -H 'Authorization: Bearer ACCESS_TOKEN' \
  -d '{ "saleId": "SALE_ID" }'
# → { paymentId, paymentIntentId, clientSecret, amount, currency }
```

Use the returned `clientSecret` with Stripe.js on the client to confirm the card payment. On `payment_intent.succeeded`, the webhook marks the payment succeeded and settles the sale.
