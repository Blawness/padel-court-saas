# Handoff Prompt — Implementasi Padel Booking SaaS

> Prompt ini untuk diberikan ke Claude (atau agent coding lain) agar mengimplementasikan aplikasi nyata berdasarkan PRD + mockup yang sudah jadi. Copy seluruh isi file ini.

---

## 🎯 Brief

Kamu akan mengimplementasikan **Padel Court Booking SaaS** (multi-tenant) sesuai `prd.md`, berbasis mockup HTML statis yang sudah dibuat di folder `mockup/`. Mockup adalah acuan UI/UX final — implementasikan agar visual & alur mirip mockup, tapi dengan backend & state management nyata.

## 📁 Struktur Project (sudah ada)

```
padel-booking/
├── prd.md                      # Spesifikasi lengkap (baca dulu!)
└── mockup/                     # Referensi UI final (HTML statis)
    ├── index.html              # Landing page
    ├── player-venues.html      # Browse & filter venue
    ├── player-booking.html     # Calendar + slot + payment flow (Midtrans Snap)
    ├── player-profile.html     # Profil & riwayat booking
    ├── owner-dashboard.html    # Dashboard owner (KPI, revenue, bookings)
    ├── owner-venues.html       # Kelola venue/court, harga, blokir slot
    ├── admin.html              # SuperAdmin (MRR, verifikasi owner, plan)
    ├── styles.css              # Design system (tokens, dark mode, komponen)
    └── app.js                  # Interaksi shared (theme, reveal, toast)
```

**WAJIB:** Buka & baca `prd.md` dan semua file di `mockup/` sebelum coding. Itu adalah sumber kebenaran desain & requirement.

## 🧱 Tech Stack (dari PRD §4 — JANGAN ubah kecuali diminta)

- **Next.js 15** (App Router) + **TypeScript 5 strict**
- **Tailwind CSS v4** + **shadcn/ui**
- **PostgreSQL 16** via **Supabase** (DB + Auth + Realtime + Storage)
- **Prisma 5** (schema/migrations) + Supabase JS client (realtime/storage/auth)
- **Zustand** (client state) + **TanStack Query** (server state)
- **Midtrans** (Snap one-off + recurring/invoice untuk subscription)
- **Resend** (email: konfirmasi booking, receipt)
- **Vercel** (deploy), **pnpm**

## 👥 Roles (PRD §2)

1. `player` — browse, booking, bayar, riwayat
2. `venue_owner` — CRUD venue/court, harga, booking, revenue, subscription
3. `super_admin` — approve owner, kelola plan, analytics, refund

Role disimpan di `User.role` (Supabase Auth).

## 🗃️ Data Models (PRD §5 — implement persis)

`User, Venue, Court, Booking, Payment, SubscriptionPlan, Subscription`.
Booking punya `status: pending_payment | confirmed | cancelled | expired` dengan **hold 10 menit** lalu auto-release jika tak dibayar.

## 🔌 API Endpoints (PRD §6)

`GET/POST /api/venues`, `GET /api/venues/{id}`, `GET /api/courts/{id}/availability`, `POST /api/bookings`, `DELETE /api/bookings/{id}`, `POST /api/webhooks/midtrans` (verifikasi signature), `GET /api/owner/bookings`, `GET /api/owner/revenue`, `GET /api/subscriptions/me`, `POST /api/subscriptions/checkout`, `GET /api/admin/venues`, `GET /api/admin/plans`.

## 🎨 Design System (dari `mockup/styles.css`)

Gunakan nilai ini agar konsisten dengan mockup:
- **Brand color:** emerald/`#16a34a` (primary), teal `#0d9488` (secondary)
- **Font:** `Plus Jakarta Sans` (body) + `Sora` (display/heading)
- **Dark mode:** wajib didukung (`darkMode: 'class'`), toggle di setiap halaman
- **Komponen kunci:** kartu dengan `lift` hover, `glow-border` (conic), `chip` status (green/blue/amber/gray/red), `slot` grid kalender (free/sel/taken/held), tabel `tbl`, `input`, `toast`
- **Motion:** scroll-reveal (IntersectionObserver), count-up stats, aurora/blob background, shimmer button, pulse dot

## 🚦 MVP Features (PRD §3 — urutan implementasi)

1. **Real-time booking & calendar** — filter kota, slot 60 menit, hold `pending_payment` 10 mnt, broadcast realtime (Supabase Realtime), auto-release.
2. **Payment (Midtrans)** — Snap setelah pilih slot, webhook verifikasi signature → `confirmed`, revert ke `available` kalau gagal/expired.
3. **Owner dashboard** — CRUD venue/court, harga per jam + peak/off-peak, tabel booking filterable, chart revenue (harian/mingguan/bulan), blokir slot & walk-in.
4. **Player profile & history** — Supabase Auth (email/pwd + Google), cancel (gratis >2j sblm main), riwayat.
5. **Owner subscription** — SuperAdmin buat `SubscriptionPlan`, trial 14 hari (`trial`), Midtrans monthly, write-action terblokir saat `expired` (read tetap jalan).

## ✅ Acceptance Criteria (PRD §3)

Implementasikan semua checkbox AC per fitur. Yang paling kritis: **zero double-booking** (slot realtime terkunci saat di-hold).

## 📋 Cara Kerja yang Diminta

1. Inisialisasi project Next.js 15 + TS strict + Tailwind v4 + shadcn/ui di root `padel-booking/`.
2. Setup Prisma schema sesuai PRD §5; generate migration; hubungkan ke Supabase Postgres.
3. Buat design tokens & komponen UI yang mencerminkan `mockup/styles.css` (pakai shadcn sebagai base, override warna/font).
4. Implementasi route mengikuti struktur PRD §7: `(marketing)`, `(player)`, `(owner)`, `(admin)`, `api/`.
5. Auth (Supabase) + role guard.
6. Fitur MVP 1→5 berurutan, tiap fitur selesai & bisa dijalankan lokal.
7. Webhook Midtrans dengan verifikasi signature.
8. Jalankan `pnpm lint` & `pnpm build` — pastikan lolos tanpa error.
9. Jangan commit kecuali diminta.

## ⚠️ Catatan / Open Questions (PRD §10)

Ada 4 open question (WhatsApp confirm, cancellation window, Midtrans recurring reliability, self-serve vs manual approval). **Ambil keputusan wajar & dokumentasikan** di README, jangan biarkan menggantung:
- Cancellation: gratis jika >2j sblm slot (sesuai asumsi PRD).
- Subscription: pakai monthly payment link manual (lebih aman untuk v1) — sesuai rekomendasi PRD.
- Owner signup: self-serve + SuperAdmin bisa approve/suspend dari admin panel.
- WhatsApp: `wa.me` deep link manual di v1.

## 🧪 Verifikasi Akhir

- `pnpm lint` clean, `pnpm build` sukses.
- Booking flow end-to-end < 2 menit (manual QA).
- Tidak ada double-booking (audit `Booking` confirmed yang overlap).
- Semua role bisa login & akses halamannya masing-masing.

## 📦 Deliverable

Aplikasi Next.js 15 fungsional dengan seed data minimal (1 owner + 1 venue + 4 court + beberapa booking) supaya langsung bisa didemo. Sertakan `README.md` berisi cara setup env (`prd.md` §8), migrate, & run.
