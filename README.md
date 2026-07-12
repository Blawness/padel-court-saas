# Padel Court Booking SaaS

Multi-tenant booking platform for padel venues in Indonesia, built from [`prd.md`](./prd.md) with
[`mockup/`](./mockup) as the UI reference. Players browse venues and book slots in real time;
venue owners manage courts, pricing, and revenue from a dashboard behind a monthly subscription.

## Stack

Next.js 16 (App Router) · TypeScript 5 strict · Tailwind CSS v4 · Drizzle ORM + PostgreSQL (Neon) ·
**Better Auth** (email/password + Google) · Zustand + TanStack Query · Midtrans Snap · Resend · pnpm.

> **Deviations from PRD §4** (all requested during handoff — the PRD has been updated to match):
>
> - **Drizzle instead of Prisma.** Lighter serverless cold starts (no query-engine binary), raw SQL
>   is a first-class citizen (the no-overlap constraint below cannot be expressed in any ORM's
>   schema DSL), and driver errors arrive with structured `code` / `constraint_name` fields instead
>   of having to be string-matched out of a message.
> - **Better Auth instead of Supabase Auth**, on **Neon** Postgres instead of Supabase Postgres.
> - **No Supabase at all.** Live slot updates come from polling the availability endpoint every 10s
>   rather than a realtime socket. This costs nothing in correctness: double-booking is prevented by
>   an exclusion constraint in the database, not by the UI (see "No double-booking" below). The
>   worst case is a player seeing a stale-free slot for a few seconds and losing the race at commit
>   time, which is handled with a clear error.
> - Next 16 instead of 15.

## Quick start

```bash
pnpm install

# 1. Point DATABASE_URL at any Postgres 16 (local, Neon, or anything else) — see .env
createdb padel_booking

# 2. Apply migrations (schema + the no-overlap constraint)
pnpm db:migrate

# 3. Seed a demo tenant: 1 owner, 1 venue, 4 courts, bookings, 2 plans
pnpm db:seed

# 4. Run
pnpm dev
```

The app boots with **no external credentials** beyond a Postgres URL. Midtrans and Resend each
degrade gracefully (see below), so you can click through the whole flow immediately.

### Demo accounts

Every seeded account uses the password **`padel1234`** (demo only — change it before this is
anything real).

| Account | Role | Notes |
|---|---|---|
| `rina@email.com` / `andi@email.com` / `dedi@email.com` | player | book, pay, cancel |
| `budi@padelcentral.id` | venue_owner | Padel Central, 4 courts, Pro plan active |
| `sari@smasharena.id` | venue_owner | **pending** — approve them from the admin panel |
| `admin@padel.id` | super_admin | MRR, owner verification, plans |

## Auth (Better Auth)

Email/password out of the box; the "Masuk dengan Google" button appears once
`GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` are set. Better Auth owns `/api/auth/*`
(`sign-in/email`, `sign-out`, `callback/google`, …) and stores sessions in the `Session` /
`Account` / `Verification` tables.

**Roles can never be self-assigned.** `role` and `ownerStatus` are declared `input: false` in
the Better Auth config, so passing `{"role":"super_admin"}` in a sign-up body is ignored — the
account is created as a plain `player`. Role is set server-side by `POST /api/auth/signup`,
which only accepts `player` or `venue_owner`. A new owner lands in `ownerStatus: pending` and
their venues stay hidden from players until a SuperAdmin approves them.

(The earlier password-less "dev login" is gone entirely — it was a backdoor that let anyone
sign in as `super_admin` by knowing an email address.)

## Environment variables

All are optional in development (`.env` ships with sensible local defaults).

```env
DATABASE_URL=                  # required — Postgres 16 (Neon pooled URL in prod).
                               # Note: no `?schema=public` — that's a Prisma-ism and postgres.js
                               # fails on it.

BETTER_AUTH_SECRET=            # required — openssl rand -hex 32
BETTER_AUTH_URL=http://localhost:3000

GOOGLE_CLIENT_ID=              # blank -> the "Masuk dengan Google" button is hidden
GOOGLE_CLIENT_SECRET=

MIDTRANS_SERVER_KEY=           # blank -> mock Snap page at /payment/mock
MIDTRANS_CLIENT_KEY=
MIDTRANS_IS_PRODUCTION=false

BLOB_READ_WRITE_TOKEN=         # blank -> venue form asks for an image URL instead of a file
RESEND_API_KEY=                # blank -> emails logged to console
NEXT_PUBLIC_APP_URL=http://localhost:3000
CRON_SECRET=                   # optional, protects /api/cron/release-holds
```

### What each missing credential does

- **No Google OAuth** — email/password sign-in still works; the Google button is simply hidden.
- **No Vercel Blob** — the venue form takes a pasted image URL instead of a file. With a token,
  the browser uploads straight to Blob using a short-lived token minted by `/api/upload`, so the
  bytes never cross a function and the 4.5 MB body limit doesn't apply. The token is only issued
  to a logged-in `venue_owner` with a live subscription, and is scoped to images ≤5 MB.
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

## Dev server: use `localhost`

`next dev` only trusts the `localhost` origin by default. Reaching it on another origin
(`127.0.0.1`, or the WSL host IP from a Windows browser) makes it reject the HMR websocket
upgrade, which silently aborts the client bootstrap — the page renders fine but **never
hydrates**, so nothing is clickable and scroll-reveal never fires. `next.config.ts` now sets
`allowedDevOrigins` so both `localhost` and `127.0.0.1` work. Production builds are unaffected.

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

## Deployment

Live: **https://padel-court-saas.vercel.app** — Vercel + Neon Postgres (`aws-ap-southeast-1`,
Singapore, closest region to Indonesian users).

### Connection string: use the pooled endpoint

Serverless functions open many short-lived connections, so `DATABASE_URL` in production points
at Neon's **pooled** endpoint (`...-pooler...`). That endpoint is PgBouncer in transaction mode,
which cannot keep a session-scoped prepared statement alive between queries — and postgres.js
uses prepared statements by default, which would cause random *"prepared statement does not
exist"* failures. `src/db/index.ts` detects a pooled URL and sets `prepare: false`.

Run **migrations and the seed against the direct (non-pooled) endpoint** — DDL and advisory
locks are not safe through PgBouncer:

```bash
DATABASE_URL="<direct-url>" pnpm db:migrate
DATABASE_URL="<direct-url>" pnpm db:seed
```

### Auth in production

Real passwords, hashed by Better Auth. Set `BETTER_AUTH_SECRET` (`openssl rand -hex 32`) and
`BETTER_AUTH_URL` (the deployed origin). The seeded demo accounts all share one password, so
rotate or delete them before treating this as anything but a demo.

### Cron

Vercel's Hobby plan only allows **daily** cron jobs, so `/api/cron/release-holds` runs once a
day rather than every 5 minutes. Correctness does not depend on it: every path that can
*observe* a lapsed hold sweeps first — availability reads, booking writes, the owner dashboard
and bookings table, and the player's profile — so a stale `pending_payment` row is never shown
to anyone and never blocks a slot. The cron is a backstop, not the mechanism.

## Security posture

What the app defends, and how:

| Risk | Control |
|---|---|
| Double-booking | Postgres exclusion constraint (`booking_no_overlap`) — not the UI, not a read-then-write check |
| Free bookings via a forged webhook | sha512 signature, compared in constant time. Unsigned notifications are accepted **only outside production**, so a deploy that forgets `MIDTRANS_SERVER_KEY` fails closed instead of accepting anything. The mock payment page 404s in production for the same reason |
| Paying less than the price | Amounts are always read from the `Court` / `SubscriptionPlan` row, never from the request body |
| Getting a paid plan for free | The plan a checkout buys is recorded on the `Payment` row and applied to the subscription **only when the payment settles**. Starting a checkout and walking away changes nothing |
| Self-granting admin | `role` / `ownerStatus` are `input: false` in the Better Auth config, so a sign-up body cannot set them. `/api/auth/signup` only accepts `player` or `venue_owner` |
| Booking an unvetted venue | `createBooking` refuses online bookings when the venue's owner is not `approved`; unapproved and suspended owners' venues 404 everywhere public |
| Password brute force | Better Auth rate limiting (verified: 429 after 3 failed sign-ins in production) |
| Cron endpoint abuse | `CRON_SECRET` required; in production a missing secret means 401, not open access |
| Leaking internals in errors | `apiError` returns a generic 500 in production — SQL fragments and connection strings stay in the log |

**Residual risks, accepted for v1:**

- Better Auth's rate limiter stores counters **in memory**, so the limit is per-instance. An
  attacker spraying across many cold instances gets proportionally more attempts. If this
  matters, move it to database storage or put a Vercel WAF rate-limit rule in front of
  `/api/auth/*`.
- Sign-up reveals whether an email is already registered (409). Standard for consumer apps,
  but it is user enumeration.
- Refunds are manual (PRD §3 decision). A cancelled paid booking is marked `refunded` in our
  DB; moving the money back is a human step in the Midtrans dashboard.

### Still to wire up

1. Midtrans: set `MIDTRANS_SERVER_KEY` / `MIDTRANS_CLIENT_KEY` and point the dashboard's
   **Payment Notification URL** at `https://padel-court-saas.vercel.app/api/webhooks/midtrans`.
   Until then the app uses the mock Snap page.
2. Google sign-in: create an OAuth client, set `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`, and
   add `https://padel-court-saas.vercel.app/api/auth/callback/google` as an authorized redirect
   URI.
