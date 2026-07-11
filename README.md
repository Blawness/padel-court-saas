# Padel Court Booking SaaS

Multi-tenant booking platform for padel venues in Indonesia, built from [`prd.md`](./prd.md) with
[`mockup/`](./mockup) as the UI reference. Players browse venues and book slots in real time;
venue owners manage courts, pricing, and revenue from a dashboard behind a monthly subscription.

## Stack

Next.js 16 (App Router) · TypeScript 5 strict · Tailwind CSS v4 · Drizzle ORM + PostgreSQL 16 ·
Supabase (Auth / Realtime / Storage) · Zustand + TanStack Query · Midtrans Snap · Resend · pnpm.

> **Deviations from PRD §4:** Next 16 instead of 15, and **Drizzle instead of Prisma** — both
> requested during handoff. Rationale for Drizzle: lighter serverless cold starts (no query-engine
> binary), raw SQL is a first-class citizen (the no-overlap constraint below cannot be expressed in
> any ORM's schema DSL), and driver errors arrive with structured `code` / `constraint_name` fields
> instead of having to be string-matched out of a message. Everything else matches the PRD.

## Quick start

```bash
pnpm install

# 1. Point DATABASE_URL at any Postgres 16 (local or Supabase) — see .env
createdb padel_booking

# 2. Apply migrations (schema + the no-overlap constraint)
pnpm db:migrate

# 3. Seed a demo tenant: 1 owner, 1 venue, 4 courts, bookings, 2 plans
pnpm db:seed

# 4. Run
pnpm dev
```

The app boots with **no external credentials**. Supabase, Midtrans, and Resend each degrade
gracefully (see below), so you can click through the whole flow immediately.

### Demo accounts (dev login)

With Supabase unconfigured there are no passwords — `/login` lists the seeded accounts as
one-click logins:

| Account | Role | Notes |
|---|---|---|
| `rina@email.com` / `andi@email.com` / `dedi@email.com` | player | book, pay, cancel |
| `budi@padelcentral.id` | venue_owner | Padel Central, 4 courts, Pro plan active |
| `sari@smasharena.id` | venue_owner | **pending** — approve them from the admin panel |
| `admin@padel.id` | super_admin | MRR, owner verification, plans |

## Environment variables

All are optional in development (`.env` ships with sensible local defaults).

```env
DATABASE_URL=                  # required — Postgres 16 (Supabase pooled URL in prod).
                               # Note: no `?schema=public` — that's a Prisma-ism and postgres.js
                               # fails on it.

NEXT_PUBLIC_SUPABASE_URL=      # blank -> dev-login fallback, no realtime
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

MIDTRANS_SERVER_KEY=           # blank -> mock Snap page at /payment/mock
MIDTRANS_CLIENT_KEY=
MIDTRANS_IS_PRODUCTION=false

RESEND_API_KEY=                # blank -> emails logged to console
NEXT_PUBLIC_APP_URL=http://localhost:3000
DEV_AUTH_SECRET=               # signs the dev-login cookie
CRON_SECRET=                   # optional, protects /api/cron/release-holds
```

### What each missing credential does

- **No Supabase** — auth falls back to a signed, HTTP-only dev cookie (`/api/auth/dev-login`,
  which *refuses to run* once Supabase is configured, so it can't become a production backdoor).
  Realtime broadcasts become no-ops and the calendar relies on TanStack Query polling instead;
  correctness is unaffected because double-booking is prevented in the database, not the UI.
- **No Midtrans** — `createSnapTransaction` returns a mock token and the player is routed to
  `/payment/mock`, which posts the *same notification payload* to `/api/webhooks/midtrans` that
  the real gateway sends. The webhook, its signature check, and the confirm/release logic are the
  production code paths, exercised for real.
- **No Resend** — booking confirmation emails are logged to the console.

## How zero double-booking is guaranteed

The critical requirement (PRD §9) is not enforced by application checks, which always race.
It's a **Postgres exclusion constraint** (`drizzle/0001_no_overlap_constraint.sql`, a custom
migration — Drizzle's schema DSL can't express `EXCLUDE`):

```sql
ALTER TABLE "Booking" ADD CONSTRAINT booking_no_overlap
  EXCLUDE USING gist ("courtId" WITH =, tsrange("startTime","endTime",'[)') WITH &&)
  WHERE (status IN ('pending_payment','confirmed'));
```

Two simultaneous requests for the same slot therefore *cannot* both succeed: one commits, the
other raises SQLSTATE `23P01`, which `createBooking()` maps to a `409` ("slot baru saja diambil
orang lain"). Drizzle wraps the driver error, so the `PostgresError` — carrying `code` and
`constraint_name` — is on `err.cause`. Verified by firing both bookings concurrently: one `201`,
one `409`, one row in the table.

Cancelled/expired bookings are excluded from the constraint, so a released slot is instantly
bookable again. A `pending_payment` hold lasts **10 minutes**; lapsed holds are swept to
`expired` before every availability read and every booking write, with
`/api/cron/release-holds` (Vercel Cron, every 5 min — see `vercel.json`) as a safety net for
slots nobody is currently viewing.

## Timezone

The product is Indonesia-only, so venue wall-clock time is always **WIB (UTC+7)**. Slot times,
prices, revenue buckets, and day boundaries are computed against that offset explicitly rather
than the server's local zone — otherwise the same code produces different slots on a local
machine and on a UTC Vercel function. See `wibSlotStart` / `toDateKey` in `src/lib/format.ts`.

## Decisions on the PRD's open questions (§10)

| Question | Decision |
|---|---|
| **Cancellation window** | Free cancellation up to **2 hours** before slot start. Inside that window the player is refused and pointed at WhatsApp; the venue owner and super_admin can still cancel any booking (refunds are manual in v1, and cancelling a paid booking marks its payment `refunded`). |
| **Midtrans recurring** | **Manual monthly payment link**, not auto-debit — safer for v1 per the PRD's own recommendation. The owner renews from `/owner/subscription`; the webhook flips the subscription to `active` and extends `currentPeriodEnd` by one month. |
| **Owner signup** | **Self-serve**, but a new owner lands in `ownerStatus: pending` and their venues stay hidden from players until a SuperAdmin approves them. Admin can also suspend. |
| **WhatsApp confirmation** | Manual `wa.me` deep link from the player's booking card in v1. No Business API. |

Also decided: new owners get a **14-day trial** on first dashboard visit. When a subscription is
`expired`, dashboard **writes** (create/edit venue, court, pricing, block slot, walk-in) return
`403` while **reads** — bookings, revenue, existing data — stay fully available.

## Project layout

```
src/
├── app/
│   ├── (marketing)/          # landing
│   ├── (auth)/               # login, signup
│   ├── (player)/             # /venues, /venues/[id] (calendar+pay), /profile
│   ├── (owner)/owner/        # dashboard, venues, bookings, subscription
│   ├── (admin)/admin/        # MRR, owner verification, plans
│   ├── payment/mock/         # stand-in for Snap when Midtrans is unconfigured
│   └── api/                  # venues, courts, bookings, webhooks, owner, subscriptions, admin, cron
├── components/               # booking/, dashboard/, shared UI
├── db/                       # drizzle schema, client, seed
├── lib/                      # auth, booking (slots+holds), midtrans, realtime, format
├── hooks/                    # use-slot-realtime
└── stores/                   # zustand (toast)
drizzle/                      # generated migrations + the custom EXCLUDE constraint
```

The design system from `mockup/styles.css` (brand emerald `#16a34a`, Plus Jakarta Sans + Sora,
chips, slot grid, `lift`/`glow-border`/shimmer, class-based dark mode) is ported into
`src/app/globals.css` as Tailwind v4 `@theme` tokens plus component classes.

## Scripts

```bash
pnpm dev          # dev server
pnpm build        # production build
pnpm lint         # eslint
pnpm db:generate  # generate a migration from src/db/schema.ts
pnpm db:migrate   # apply pending migrations
pnpm db:seed      # reset + seed demo data
pnpm db:studio    # drizzle studio
```

## Deploying to Vercel

1. Set every env var above (Supabase pooled `DATABASE_URL`, real Midtrans + Resend keys).
2. Point the Midtrans dashboard's **Payment Notification URL** at
   `https://<your-app>/api/webhooks/midtrans`.
3. Add `https://<your-app>/auth/callback` as a Supabase redirect URL for Google OAuth.
4. `vercel.json` already registers the hold-release cron; set `CRON_SECRET` to protect it.
