# Demo Walkthrough

A step-by-step script for demoing BookingOS to a salon or spa prospect. It uses the pre-seeded **"Lumière Beauty Lounge"** demo. Total run time: ~8–10 minutes. Talking points are marked 💬.

> **Goal:** show that one tool runs the salon's whole day — booking, calendar, payments, clients, reports — and that it looks like *their* brand, in *their* language.

---

## 0. Before the meeting — start it up

```bash
pnpm setup     # first time only: install + docker + db + seed
pnpm dev       # api → :4000, web → :3000
```

Open two browser tabs:

- **Marketing site:** http://localhost:3000/en
- **Booking site:** http://localhost:3000/en/book

Demo facts to keep handy:

| | |
| --- | --- |
| Salon | Lumière Beauty Lounge (`lumiere`, USD, New York) |
| Owner login | `owner@lumiere.demo` / `Passw0rd!` |
| Discount code | `WELCOME10` (10% off) |

---

## 1. Open on the landing page

Show the marketing site: hero, feature sections, **how it works**, pricing (Starter / Pro / Business), testimonials, FAQ, and the call-to-action.

💬 *"This is the public marketing site that comes with the platform — it's already conversion-ready, with three pricing tiers and a 14-day free trial."*

---

## 2. Flip the language to Urdu / Arabic (the wow moment)

Use the language switcher (top of the page) to switch to **اردو (Urdu)** or **العربية (Arabic)**.

💬 *"Watch this — the entire interface switches to Urdu and flips to a full right-to-left layout, instantly. Same for Arabic. Your clients book in their own language."*

Switch back to English before continuing.

---

## 3. Walk the public booking flow

Go to the booking site (`/en/book`). Step through it as if you were a client:

1. **Pick a service** — e.g. *Women's Haircut & Style* (the catalogue, durations and prices are the salon's own).
2. **Choose a staff member** — only staff who perform that service appear.
3. **Pick a date & time** — the calendar shows only *genuinely free* slots, computed from each stylist's working hours minus time-off minus existing bookings.
4. **Enter your details** — name, email, phone (a client record is created or matched automatically).
5. **Deposit step** — if the service requires a deposit, a card step appears.

💬 *"No back-and-forth phone tag. The availability is real — it never double-books a stylist, and it respects buffers between appointments. If you charge a deposit to cut no-shows, it's taken right here."*

> If live Stripe keys aren't configured, the payment step uses a simulated card form so the flow still completes end-to-end (see [ROADMAP.md](ROADMAP.md)).

---

## 4. Log in as the owner

Open `/en/login`, sign in with **`owner@lumiere.demo` / `Passw0rd!`**. You land on the dashboard.

💬 *"Now I'm the salon owner. Everything I'm about to show is scoped to just this salon — the platform runs hundreds of salons side by side, but each one only ever sees its own data."*

---

## 5. Tour the dashboard

### Overview
Point out the KPI cards (revenue, appointments, etc.) and the revenue chart.

💬 *"Real-time revenue analytics on day one — no spreadsheets."*

### Calendar (`/dashboard/calendar`)
Show today's appointments by staff and the status colours. Mention reschedule / cancel / check-in.

💬 *"This is the front desk's home screen — drag-free day view, with the full lifecycle from booked to checked-in to completed."*

### Clients (`/dashboard/clients`)
Search a client, show tags, loyalty points and visit history.

💬 *"A built-in CRM — every client's history, loyalty points and notes, searchable instantly."*

### Services (`/dashboard/services`)
Show categories, durations, prices, deposits.

💬 *"You control your menu — pricing, duration, buffers and which services are bookable online."*

### POS (`/dashboard/pos`)
Build a sale: add a service/product, apply the **WELCOME10** discount, add a tip, then take payment (card or cash).

💬 *"Check-out is part of the same system — services, retail products, discounts, tips and tax in one ticket. Card or cash, and the sale closes itself once it's paid."*

### Reports (`/dashboard/reports`)
Show revenue over time, revenue by service and by staff, utilization, top clients, ratings.

💬 *"This is where owners live — see your best services, your top performers, and your busiest hours, then staff and price accordingly."*

### Settings (`/dashboard/settings`)
Show branding (logo, primary colour, tagline), locale, currency, timezone, and locations.

💬 *"And it's fully white-labeled — your logo, your colours, your domain. Clients see your brand, not ours."*

---

## 6. Payments & subscription billing

- **Salon payments:** explain that with Stripe Connect, money from client payments lands directly in the salon's own Stripe account; the platform never holds their funds.
- **SaaS billing:** in Settings, show the plan/subscription. Mention upgrade via Stripe Checkout and self-serve management via the Stripe Customer Portal.

💬 *"You get paid directly — we don't sit on your money. And your own subscription is self-serve: upgrade, downgrade or update your card anytime."*

---

## Close

💬 *"So that's your whole day — bookings, calendar, check-out, clients and analytics — in one place, in your brand and your language, with a 14-day free trial and no card required. Want me to spin up your salon right now?"*

---

## Resetting the demo

To restore the demo to its original, clean state (e.g. after a messy demo):

```bash
pnpm db:seed
```

This wipes and re-creates the Lumière demo salon, staff, services, clients, appointments, sales, reviews, products and the `WELCOME10` discount.
