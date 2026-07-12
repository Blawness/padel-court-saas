# PRD: Padel Court Booking SaaS

**Version:** 1.0
**Date:** 2026-07-12
**Author:** Yudha
**Status:** v1 implemented — see README for what still needs credentials

---

## 1. Overview

### 1.1 Product Summary
A multi-tenant SaaS platform that lets local padel court owners in Indonesia digitize their booking operations, replacing manual WhatsApp/spreadsheet scheduling with a real-time booking calendar, online payments, and a self-service management dashboard. Players discover venues, book available slots in real time, and pay online. Venue owners manage multiple courts/venues, set pricing, and track revenue — paying a monthly subscription to access the platform.

### 1.2 Goals
- Let players book a padel court in under 2 minutes with real-time slot availability (no double-booking)
- Give venue owners a self-service dashboard to manage courts, pricing, and schedule without manual intervention
- Generate recurring MRR via monthly subscription per venue owner (target: first 10 paying venues within 3 months of launch)

### 1.3 Non-Goals (Out of Scope for v1)
- Native mobile app (responsive web only for v1)
- Player-to-player matchmaking / partner finding
- Tournament bracket or ranking system
- Multi-currency / international support (IDR + Indonesia-only payment rails only)
- In-app chat between player and venue owner
- Automated payout of owner earnings to bank account

---

## 2. Users & Roles

| Role | Description | Permissions |
|------|-------------|-------------|
| `Player` | End user booking padel courts | Browse venues, book/cancel slots, pay online, view booking history |
| `VenueOwner` | Manages one or more padel venues (multi-venue support) | CRUD own venues/courts, set pricing & availability, view bookings & revenue reports, manage own subscription |
| `SuperAdmin` | Platform operator (internal) | Approve/manage venue owner accounts, manage subscription plans, view platform-wide analytics, manually flag/refund bookings |

---

## 3. Core Features (MVP)

### Feature 1: Real-Time Court Booking & Calendar

**Description:**
Players browse venues by city/area, select a court, and see a real-time availability calendar. Selecting a slot places a temporary hold (`pending_payment`) so two players can't book the same slot simultaneously.

**Acceptance Criteria:**
- [x] Player can filter venues by city/area and see venue list with courts, price range, and photos
- [x] Calendar shows slots in configurable increments (default 60 min) per court, per day
- [x] Selecting a slot creates a `Booking` with `status: pending_payment` and holds it for 10 minutes
- [x] Other players' calendars reflect the held slot within ~10s (availability endpoint polled by TanStack Query); correctness never depends on this — the database rejects any overlapping booking outright
- [x] Slot auto-releases back to available if payment isn't completed within the hold window

**Out of Scope:**
Recurring/repeating bookings, waitlist for fully booked slots, cross-court group booking in a single transaction.

---

### Feature 2: Online Payment (Midtrans)

**Description:**
Player pays for a held booking via Midtrans Snap, supporting QRIS, e-wallet, virtual account, and credit card. A webhook confirms payment and finalizes the booking.

**Acceptance Criteria:**
- [x] Midtrans Snap checkout triggers immediately after slot selection
- [x] Webhook endpoint (`/api/webhooks/midtrans`) verifies signature and updates `Booking.status` to `confirmed` on success
- [x] Player sees real-time payment status and an in-app confirmation with booking details
- [x] Failed or expired payment automatically reverts the slot to `available`

**Out of Scope:**
Automated refunds (v1: manual refund trigger by SuperAdmin/VenueOwner only), split payment among multiple players, saved/stored payment methods.

---

### Feature 3: Venue Owner Dashboard

**Description:**
Dashboard for venue owners to manage all their venues and courts, configure pricing, and monitor bookings and revenue.

**Acceptance Criteria:**
- [x] Owner can create/edit/delete `Venue` records and nested `Court` records under each venue
- [x] Owner can set price per hour per court, with optional peak/off-peak price override by time range
- [x] Owner can view a filterable bookings table (by venue, court, date range, status) and a revenue summary chart (daily/weekly/monthly)
- [x] Owner can manually block a slot (maintenance) or mark a slot as booked for an offline/walk-in customer

**Out of Scope:**
Staff/sub-account roles per venue, automated bank payouts, equipment/inventory rental management.

---

### Feature 4: Player Profile & Booking History

**Description:**
Players have an account with basic profile info and a view of upcoming and past bookings.

**Acceptance Criteria:**
- [x] Player signs up/logs in via email+password or Google OAuth (Better Auth)
- [x] Player sees upcoming bookings with a cancel option, subject to cancellation policy (default: free cancel if >2h before slot start)
- [x] Player sees past booking history: venue, court, date/time, amount paid, status

**Out of Scope:**
Loyalty points/rewards program, favorites list, venue reviews/ratings (candidate for v1.1).

---

### Feature 5: Venue Owner Subscription & Billing

**Description:**
Venue owners must maintain an active subscription to access dashboard write-actions. SuperAdmin defines the available plans.

**Acceptance Criteria:**
- [x] SuperAdmin can create/edit `SubscriptionPlan` records (e.g. Basic: 1 venue; Pro: up to 5 venues), each with a monthly IDR price
- [x] New venue owners get a 14-day free trial on signup, tracked via `Subscription.status: trial`
- [x] Owner subscribes/pays monthly via Midtrans (recurring charge if available, otherwise a generated payment link owner pays manually each cycle in v1)
- [x] Dashboard write-actions (create venue/court, edit pricing) are blocked when `Subscription.status` is `expired`; read access and existing bookings remain visible

**Out of Scope:**
Automated dunning/retry logic, plan upgrade/downgrade proration, annual billing discount.

---

## 4. Tech Stack

> **Note for AI agents:** Use exactly these technologies unless explicitly overridden.

| Layer | Technology | Notes |
|-------|-----------|-------|
| **Runtime** | Node.js 24 (Vercel default) | |
| **Framework** | Next.js 16 (App Router) | |
| **Language** | TypeScript 5 (strict mode) | |
| **Database** | PostgreSQL 16 (via Neon, Singapore region) | |
| **ORM** | Drizzle ORM (schema/migrations) | Raw SQL is first-class — needed for the no-overlap exclusion constraint |
| **Auth** | Better Auth | Email/password + Google OAuth; role stored on `User.role` |
| **Styling** | Tailwind CSS v4 + shadcn/ui | |
| **State Management** | Zustand (client) + TanStack Query (server state) | |
| **API Style** | REST via Next.js Route Handlers | |
| **File Storage** | Vercel Blob | venue/court photos; browser uploads direct via a signed token. Falls back to pasting an image URL when unconfigured |
| **Payments** | Midtrans (Snap for one-off bookings, recurring/invoice link for subscriptions) | Indonesia-first: QRIS, e-wallet, VA, credit card |
| **Realtime** | None — TanStack Query polls availability every 10s | No realtime service. Double-booking is prevented by a Postgres exclusion constraint, not by the UI |
| **Email** | Resend | booking confirmations, payment receipts |
| **Deployment** | Vercel | |
| **Package Manager** | pnpm | |

---

## 5. Data Models

```typescript
// User (base auth record, Better Auth managed)
type User = {
  id: string;              // UUID
  email: string;
  fullName: string;
  role: "player" | "venue_owner" | "super_admin";
  phone?: string;
  createdAt: Date;
  updatedAt: Date;
};

// Venue
type Venue = {
  id: string;
  ownerId: string;          // FK -> User (role: venue_owner)
  name: string;
  city: string;
  address: string;
  photos: string[];         // image URLs (owner-supplied in v1)
  operatingHours: { open: string; close: string }; // e.g. "06:00" - "23:00"
  createdAt: Date;
  updatedAt: Date;
};

// Court
type Court = {
  id: string;
  venueId: string;          // FK -> Venue
  name: string;              // e.g. "Court 1"
  pricePerHour: number;      // IDR, base price
  peakPriceOverride?: { start: string; end: string; price: number }[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

// Booking
type Booking = {
  id: string;
  courtId: string;           // FK -> Court
  playerId: string;          // FK -> User (role: player)
  startTime: Date;
  endTime: Date;
  status: "pending_payment" | "confirmed" | "cancelled" | "expired";
  totalPrice: number;        // IDR
  createdAt: Date;
  updatedAt: Date;
};

// Payment
type Payment = {
  id: string;
  bookingId: string;         // FK -> Booking
  midtransOrderId: string;
  amount: number;            // IDR
  status: "pending" | "success" | "failed" | "refunded";
  paymentMethod?: string;    // e.g. "qris", "gopay", "va_bca"
  paidAt?: Date;
  createdAt: Date;
};

// SubscriptionPlan
type SubscriptionPlan = {
  id: string;
  name: string;               // e.g. "Basic", "Pro"
  maxVenues: number;
  monthlyPrice: number;        // IDR
  isActive: boolean;
};

// Subscription
type Subscription = {
  id: string;
  ownerId: string;            // FK -> User (role: venue_owner)
  planId: string;              // FK -> SubscriptionPlan
  status: "trial" | "active" | "expired" | "cancelled";
  trialEndsAt?: Date;
  currentPeriodEnd: Date;
  createdAt: Date;
  updatedAt: Date;
};
```

---

## 6. API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/venues` | public | List venues, filterable by city |
| `GET` | `/api/venues/{id}` | public | Venue detail with courts |
| `POST` | `/api/venues` | required (venue_owner) | Create a venue |
| `PUT` | `/api/venues/{id}` | required (owner of venue) | Update venue |
| `GET` | `/api/courts/{id}/availability` | public | Get slot availability for a date range |
| `POST` | `/api/bookings` | required (player) | Create a booking (status `pending_payment`) |
| `DELETE` | `/api/bookings/{id}` | required (owner of booking) | Cancel a booking (subject to policy) |
| `POST` | `/api/webhooks/midtrans` | signature-verified | Handle Midtrans payment notification |
| `GET` | `/api/owner/bookings` | required (venue_owner) | List bookings across owner's venues, filterable |
| `GET` | `/api/owner/revenue` | required (venue_owner) | Revenue summary by venue/date range |
| `GET` | `/api/subscriptions/me` | required (venue_owner) | Current subscription status |
| `POST` | `/api/subscriptions/checkout` | required (venue_owner) | Generate Midtrans payment link for subscription |
| `GET` | `/api/admin/venues` | required (super_admin) | Manage all venues |
| `GET` | `/api/admin/plans` | required (super_admin) | Manage subscription plans |

---

## 7. Project Structure

```
padel-court-saas/
├── app/
│   ├── (marketing)/            # Public landing page
│   ├── (player)/                # Player-facing routes (browse, book, profile)
│   ├── (owner)/                  # Venue owner dashboard routes
│   ├── (admin)/                   # SuperAdmin routes
│   └── api/
│       ├── venues/
│       ├── courts/
│       ├── bookings/
│       ├── webhooks/midtrans/
│       ├── owner/
│       ├── subscriptions/
│       └── admin/
├── components/
│   ├── ui/                       # shadcn/ui primitives
│   ├── booking/                  # Calendar, slot picker
│   └── dashboard/                # Owner/admin dashboard widgets
├── lib/
│   ├── midtrans.ts               # Midtrans SDK wrapper
│   └── auth.ts                   # Auth helpers, role guards
├── db/
│   ├── index.ts                  # Drizzle client
│   ├── schema.ts                 # Drizzle schema
│   └── seed.ts
├── stores/                        # Zustand stores
└── drizzle/                       # SQL migrations
```

---

## 8. Environment Variables

```env
# Database (Drizzle, points to Neon Postgres)
DATABASE_URL=

# Auth (Better Auth)
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Midtrans
MIDTRANS_SERVER_KEY=
MIDTRANS_CLIENT_KEY=
MIDTRANS_IS_PRODUCTION=false

# Email
RESEND_API_KEY=

# App
NEXT_PUBLIC_APP_URL=
```

---

## 9. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Player completes a booking + payment | < 2 minutes end-to-end | Manual QA / analytics event timing |
| Zero double-bookings | 0 incidents in first 3 months | Manual audit of `Booking` table for overlapping confirmed slots |
| Venue owner onboarding | 10 paying venue owners in 3 months post-launch | Subscription table count where `status: active` |
| Subscription trial-to-paid conversion | > 30% | `Subscription` records converting from `trial` to `active` |

---

## 10. Open Questions

- [x] WhatsApp booking confirmation: manual `wa.me` deep link (v1) vs official WhatsApp Business API (Fonnte/Twilio) later?
- [x] Exact cancellation policy window (currently assumed: free cancel if >2h before slot) — validate with real venue owners before launch
- [x] Does Midtrans recurring billing (subscription) work reliably for this use case, or is a manual monthly invoice + payment link safer for v1?
- [x] Self-serve venue owner signup vs SuperAdmin manually vets/approves each new venue before it goes live?

---

*Generated by prd-generator skill — optimized for AI agentic coding tools.*