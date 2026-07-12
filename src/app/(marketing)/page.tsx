import Link from "next/link";
import {
  BarChart3,
  BellRing,
  Bolt,
  Building2,
  CalendarPlus,
  Globe,
  Mail,
  MessageCircle,
  QrCode,
  Search,
  ShieldCheck,
  Star,
  User as UserIcon,
} from "lucide-react";
import { count, eq } from "drizzle-orm";
import { db } from "@/db";
import { bookings, users, venues } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { RevealOnScroll } from "@/components/reveal";
import { CountUp } from "@/components/count-up";
import { ThemeSwitch } from "@/components/theme-switch";
import { Logo } from "@/components/site-header";
import { HeroCard } from "@/components/marketing/hero-card";
import { Pricing } from "@/components/marketing/pricing";
import { Faq } from "@/components/marketing/faq";
import { JsonLd } from "@/components/json-ld";
import { faqItems } from "@/lib/faq";
import { site } from "@/lib/site";

export const dynamic = "force-dynamic";

const features = [
  {
    icon: Bolt,
    tone: "from-brand-500 to-brand-600",
    title: "Booking Real-time",
    body: "Slot langsung terkunci saat ada yang pilih. Anti tabrakan jadwal.",
  },
  {
    icon: QrCode,
    tone: "from-blue-500 to-blue-600",
    title: "Bayar QRIS & E-wallet",
    body: "Satu scan langsung lunas. GoPay, OVO, VA, kartu kredit — semua di Midtrans Snap.",
  },
  {
    icon: BarChart3,
    tone: "from-purple-500 to-purple-600",
    title: "Dashboard Owner",
    body: "Pantau omzet harian/mingguan/bulanan dengan grafik interaktif & export laporan.",
  },
  {
    icon: CalendarPlus,
    tone: "from-teal-500 to-teal-600",
    title: "Atur Jadwal & Harga",
    body: "Set harga peak/off-peak per jam, blokir slot maintenance, atau catat walk-in.",
  },
  {
    icon: BellRing,
    tone: "from-pink-500 to-rose-600",
    title: "Reminder & Konfirmasi",
    body: "Email + deep-link WhatsApp otomatis ke pemain & owner setelah booking lunas.",
  },
  {
    icon: ShieldCheck,
    tone: "from-amber-500 to-orange-600",
    title: "Aman & Terpercaya",
    body: "Auth Supabase, pembayaran terenkripsi, dan webhook tanda tangan terverifikasi.",
  },
];

const testimonials = [
  {
    quote:
      "Dulu harus chat WA ke 3 lapangan. Sekarang tinggal buka app, pilih jam, bayar QRIS — beres dalam 1 menit.",
    name: "Rina A.",
    role: "Pemain · Jakarta",
  },
  {
    quote:
      "Dashboard omzetnya bikin aku tahu hari apa paling ramai. Booking walk-in juga gampang dicatat.",
    name: "Budi S.",
    role: "Owner · Bandung",
  },
  {
    quote:
      "Zero double booking sejak pakai ini. Pelanggan senang, aku tenang. Trial 14 hari langsung convert.",
    name: "Dewi L.",
    role: "Owner · Surabaya",
  },
];

const venueNames = [
  "Padel Central",
  "Court 88",
  "Smash Arena",
  "Gloria Padel",
  "Net & Wall",
  "Bandung Padel Club",
];

export default async function LandingPage() {
  const [user, [venueCount], [playerCount], [confirmedCount]] = await Promise.all([
    getCurrentUser(),
    db.select({ n: count() }).from(venues),
    db.select({ n: count() }).from(users).where(eq(users.role, "player")),
    db.select({ n: count() }).from(bookings).where(eq(bookings.status, "confirmed")),
  ]);

  /**
   * Three graphs on the home page: who we are, a sitelinks search box pointing at the venue
   * search, and the FAQ (drawn from the same source as the accordion below, so the answers
   * Google shows are the answers on the page).
   */
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${site.url}/#organization`,
        name: site.name,
        url: site.url,
        description: site.description,
        logo: `${site.url}/apple-icon`,
        areaServed: { "@type": "Country", name: "Indonesia" },
      },
      {
        "@type": "WebSite",
        "@id": `${site.url}/#website`,
        name: site.name,
        url: site.url,
        inLanguage: "id-ID",
        publisher: { "@id": `${site.url}/#organization` },
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${site.url}/venues?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "FAQPage",
        "@id": `${site.url}/#faq`,
        mainEntity: faqItems.map((item) => ({
          "@type": "Question",
          name: item.q,
          acceptedAnswer: { "@type": "Answer", text: item.a },
        })),
      },
    ],
  };

  return (
    <div className="dark:bg-ink bg-white">
      <JsonLd data={jsonLd} />
      <RevealOnScroll />

      {/* NAV */}
      <header className="dark:bg-ink/70 fixed inset-x-0 top-0 z-50 border-b border-gray-100 bg-white/70 backdrop-blur-xl transition-colors dark:border-white/10">
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-8">
          <Logo />

          <div className="hidden items-center gap-8 text-sm font-semibold text-gray-600 md:flex dark:text-gray-300">
            <a href="#features" className="hover:text-brand-600 transition">
              Fitur
            </a>
            <a href="#product" className="hover:text-brand-600 transition">
              Produk
            </a>
            <a href="#pricing" className="hover:text-brand-600 transition">
              Harga
            </a>
            <a href="#faq" className="hover:text-brand-600 transition">
              FAQ
            </a>
          </div>

          <div className="flex items-center gap-3">
            <ThemeSwitch />
            {user ? (
              <Link
                href={
                  user.role === "venue_owner"
                    ? "/owner"
                    : user.role === "super_admin"
                      ? "/admin"
                      : "/profile"
                }
                className="btn-primary"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-brand-700 dark:text-brand-300 hover:bg-brand-50 rounded-lg px-4 py-2 font-semibold transition dark:hover:bg-white/5"
                >
                  Masuk
                </Link>
                <Link href="/signup" className="btn-primary px-5 py-2.5">
                  Daftar
                </Link>
              </>
            )}
          </div>
        </nav>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden pt-28 pb-20">
        <div className="from-brand-50/80 dark:from-brand-900/20 dark:via-ink dark:to-teal-900/10 absolute inset-0 bg-gradient-to-br via-white to-teal-50/50" />
        <div className="bg-brand-300/30 dark:bg-brand-600/20 blob absolute -top-32 -left-24 h-[28rem] w-[28rem] rounded-full blur-3xl" />
        <div className="blob2 absolute -right-24 -bottom-40 h-[30rem] w-[30rem] rounded-full bg-teal-300/30 blur-3xl dark:bg-teal-600/20" />

        <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid items-center gap-14 lg:grid-cols-2">
            <div className="reveal">
              <span className="border-brand-100 text-brand-700 dark:text-brand-300 inline-flex items-center gap-2 rounded-full border bg-white px-4 py-2 text-sm font-semibold shadow-sm dark:border-white/10 dark:bg-white/5">
                <span className="bg-brand-500 pdot h-2 w-2 rounded-full" /> Booking real-time · zero
                double booking
              </span>

              <h1 className="font-display mt-6 text-5xl leading-[1.02] font-extrabold tracking-tight lg:text-7xl">
                Main Padel <br />
                <span className="gtext">Tanpa Ribet.</span>
              </h1>

              <p className="mt-6 max-w-xl text-xl leading-relaxed text-gray-600 dark:text-gray-300">
                Temukan, pesan & bayar lapangan padel dalam hitungan menit. Buat owner, kelola venue
                & pantau omzet dari satu dashboard.
              </p>

              <div className="mt-9 flex flex-col gap-4 sm:flex-row">
                <Link
                  href="/venues"
                  className="btn-primary shimmer flex items-center justify-center gap-2 px-8 py-4 text-lg"
                >
                  <Search className="h-5 w-5" /> Cari Lapangan
                </Link>
                <Link
                  href="/signup?role=venue_owner"
                  className="border-brand-200 text-brand-700 dark:text-brand-300 hover:border-brand-300 flex items-center justify-center gap-2 rounded-xl border-2 bg-white px-8 py-4 text-lg font-semibold transition dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                >
                  <Building2 className="h-5 w-5" /> Jadi Venue Owner
                </Link>
              </div>

              <div className="mt-8 flex items-center gap-5 text-sm text-gray-500 dark:text-gray-400">
                <div className="flex -space-x-2">
                  {["A", "B", "C", "D"].map((initial, i) => (
                    <span
                      key={initial}
                      className={`dark:border-ink grid h-8 w-8 place-items-center rounded-full border-2 border-white text-xs font-bold text-white ${
                        ["bg-brand-500", "bg-teal-500", "bg-amber-500", "bg-purple-500"][i]
                      }`}
                    >
                      {initial}
                    </span>
                  ))}
                </div>
                <span>
                  <b className="text-gray-900 dark:text-white">10rb+</b> pemain mempercayai kami
                </span>
              </div>
            </div>

            <HeroCard />
          </div>
        </div>
      </section>

      {/* MARQUEE */}
      <section className="border-y border-gray-100 bg-gray-50/50 py-10 dark:border-white/10 dark:bg-white/5">
        <div className="mx-auto max-w-7xl px-6">
          <p className="mb-6 text-center text-sm font-semibold tracking-wide text-gray-400">
            DIPERCAYA OLEH VENUE DI SELURUH INDONESIA
          </p>
          <div className="marquee-wrap overflow-hidden">
            <div className="marq font-display items-center gap-12 text-lg font-bold whitespace-nowrap text-gray-400 dark:text-gray-500">
              {[...venueNames, ...venueNames].map((name, i) => (
                <span key={`${name}-${i}`} className="flex items-center gap-12">
                  {name} <span>•</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="py-16">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-6 text-center md:grid-cols-4 lg:px-8">
          <Stat value={venueCount.n} label="Venue Terdaftar" />
          <Stat value={playerCount.n} label="Pemain Aktif" />
          <Stat value={confirmedCount.n} label="Booking Selesai" />
          <div className="reveal">
            <div className="font-display text-brand-600 dark:text-brand-400 text-5xl font-extrabold">
              4.9
            </div>
            <div className="mt-1 text-gray-500 dark:text-gray-400">Rating Pengguna</div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section
        id="features"
        className="bg-gray-50/60 py-24 transition-colors dark:bg-white/5"
      >
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="reveal mx-auto mb-16 max-w-2xl text-center">
            <span className="text-brand-600 dark:text-brand-400 font-semibold tracking-wide">
              KENAPA PADEL BOOKING
            </span>
            <h2 className="font-display mt-3 text-4xl font-extrabold lg:text-5xl">
              Fitur yang Bikin Betah
            </h2>
            <p className="mt-4 text-xl text-gray-600 dark:text-gray-300">
              Dibangun khusus untuk ekosistem padel Indonesia.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {features.map((f, i) => (
              <div
                key={f.title}
                className={`reveal d${i % 3} lift card rounded-3xl p-8 ${i === 0 ? "glow-border" : ""}`}
              >
                <div
                  className={`mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${f.tone}`}
                >
                  <f.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="mb-2 text-xl font-bold">{f.title}</h3>
                <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRODUCT */}
      <section id="product" className="py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="reveal mb-14 max-w-2xl">
            <span className="text-brand-600 dark:text-brand-400 font-semibold tracking-wide">
              LIHAT PRODUKNYA
            </span>
            <h2 className="font-display mt-3 text-4xl font-extrabold lg:text-5xl">
              Dua Sisi, Satu Platform
            </h2>
            <p className="mt-4 text-xl text-gray-600 dark:text-gray-300">
              Alur mulus untuk pemain, kontrol penuh untuk owner.
            </p>
          </div>

          <div className="grid gap-10 lg:grid-cols-2">
            <Link href="/venues" className="reveal lift card block rounded-3xl p-8 shadow-sm">
              <div className="mb-6 flex items-center gap-3">
                <span className="bg-brand-100 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400 flex h-10 w-10 items-center justify-center rounded-xl">
                  <UserIcon className="h-5 w-5" />
                </span>
                <h3 className="text-2xl font-bold">Untuk Pemain</h3>
              </div>

              <div className="space-y-4">
                {[
                  ["Pilih venue & lihat kalender", "Filter kota, lihat foto & slot kosong real-time."],
                  ["Kunci slot 10 menit", "Slot otomatis hold agar tak diambil orang lain."],
                  ["Bayar & dapat e-ticket", "Konfirmasi instan + riwayat booking di profil."],
                ].map(([title, body], i) => (
                  <div key={title} className="flex items-start gap-4">
                    <div className="bg-brand-600 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white">
                      {i + 1}
                    </div>
                    <div>
                      <div className="font-semibold">{title}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{body}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="slot slot-free">08:00</div>
                <div className="slot slot-sel">09:00 ✓</div>
                <div className="slot slot-free">10:00</div>
              </div>
            </Link>

            <Link href="/owner" className="reveal d2 lift card block rounded-3xl p-8 shadow-sm">
              <div className="mb-6 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 text-teal-600 dark:bg-teal-500/15 dark:text-teal-400">
                  <Building2 className="h-5 w-5" />
                </span>
                <h3 className="text-2xl font-bold">Untuk Owner</h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="from-brand-500 rounded-2xl bg-gradient-to-br to-teal-500 p-5 text-white">
                  <div className="text-sm opacity-90">Omzet Bulan Ini</div>
                  <div className="font-display text-3xl font-extrabold">Rp 24,8jt</div>
                  <div className="mt-1 text-xs opacity-90">▲ 18% vs bulan lalu</div>
                </div>
                <div className="rounded-2xl bg-gray-50 p-5 dark:bg-white/5">
                  <div className="text-sm text-gray-500 dark:text-gray-400">Booking Aktif</div>
                  <div className="font-display text-3xl font-extrabold">142</div>
                  <div className="text-brand-600 dark:text-brand-400 mt-1 text-xs">
                    12 menunggu bayar
                  </div>
                </div>
              </div>

              <div className="mt-5 flex h-28 items-end gap-2">
                {[
                  ["40%", "bg-brand-200 dark:bg-brand-500/30"],
                  ["65%", "bg-brand-300 dark:bg-brand-500/50"],
                  ["50%", "bg-brand-400 dark:bg-brand-500/70"],
                  ["85%", "bg-brand-500"],
                  ["100%", "bg-brand-600"],
                  ["72%", "bg-teal-500"],
                  ["60%", "bg-teal-600"],
                ].map(([h, cls], i) => (
                  <div key={i} className={`bar flex-1 ${cls}`} style={{ height: h }} />
                ))}
              </div>

              <div className="mt-4 flex gap-2">
                <div className="bg-brand-600 flex-1 rounded-lg py-2.5 text-center text-sm font-semibold text-white">
                  + Venue Baru
                </div>
                <div className="flex-1 rounded-lg bg-gray-100 py-2.5 text-center text-sm font-semibold dark:bg-white/5">
                  Laporan
                </div>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="bg-gray-50/60 py-24 transition-colors dark:bg-white/5">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="reveal mx-auto mb-14 max-w-2xl text-center">
            <h2 className="font-display text-4xl font-extrabold lg:text-5xl">Kata Mereka</h2>
            <p className="mt-4 text-xl text-gray-600 dark:text-gray-300">
              Pemain & owner yang sudah merasakan bedanya.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {testimonials.map((t, i) => (
              <div key={t.name} className={`reveal d${i} lift card rounded-3xl p-7`}>
                <div className="mb-4 flex text-amber-400">
                  {Array.from({ length: 5 }).map((_, s) => (
                    <Star key={s} className="h-4 w-4 fill-amber-400" />
                  ))}
                </div>
                <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="mt-5 flex items-center gap-3">
                  <span className="aurora grid h-10 w-10 place-items-center rounded-full font-bold text-white">
                    {t.name.charAt(0)}
                  </span>
                  <div>
                    <div className="text-sm font-semibold">{t.name}</div>
                    <div className="text-xs text-gray-400">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Pricing />
      <Faq />

      {/* CTA */}
      <section className="relative overflow-hidden py-28">
        <div className="aurora absolute inset-0 opacity-95" />
        <div className="dots absolute inset-0 opacity-50" />
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <h2 className="font-display text-4xl font-extrabold text-white lg:text-6xl">
            Siap Main Padel Hari Ini?
          </h2>
          <p className="mt-5 text-xl text-white/90">
            Gabung ribuan pemain & owner. Trial 14 hari untuk owner — tanpa kartu kredit.
          </p>
          <div className="mt-9 flex flex-col justify-center gap-4 sm:flex-row">
            <Link
              href="/signup"
              className="shimmer text-brand-700 rounded-xl bg-white px-10 py-4 text-lg font-bold shadow-xl transition hover:bg-gray-100"
            >
              Daftar Pemain — Gratis
            </Link>
            <Link
              href="/signup?role=venue_owner"
              className="bg-brand-700 hover:bg-brand-800 rounded-xl border border-white/40 px-10 py-4 text-lg font-bold text-white transition"
            >
              Jadi Venue Owner
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-gray-900 pt-16 pb-8 text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 md:grid-cols-5 lg:px-8">
          <div className="md:col-span-2">
            <div className="mb-4 flex items-center gap-2.5">
              <span className="aurora grid h-10 w-10 place-items-center rounded-xl text-xl font-black text-white">
                P
              </span>
              <span className="font-display text-2xl font-extrabold">Padel Booking</span>
            </div>
            <p className="max-w-xs text-sm leading-relaxed text-gray-400">
              Platform booking lapangan padel terpercaya untuk pemain & owner di seluruh Indonesia.
            </p>
            <div className="mt-5 flex items-center gap-3 text-gray-400">
              {[Globe, Mail, MessageCircle].map((Icon, i) => (
                <span
                  key={i}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 transition hover:bg-white/10"
                >
                  <Icon className="h-4 w-4" />
                </span>
              ))}
            </div>
          </div>

          <FooterCol
            title="Pemain"
            links={[
              ["Cari Venue", "/venues"],
              ["Profil", "/profile"],
            ]}
          />
          <FooterCol
            title="Owner"
            links={[
              ["Dashboard", "/owner"],
              ["Kelola Venue", "/owner/venues"],
              ["Harga", "#pricing"],
            ]}
          />
          <FooterCol
            title="Bantuan"
            links={[
              ["FAQ", "#faq"],
              ["Masuk", "/login"],
            ]}
          />
        </div>

        <div className="mx-auto mt-12 flex max-w-7xl flex-col items-center justify-between border-t border-white/10 px-6 pt-8 text-sm text-gray-500 md:flex-row lg:px-8">
          <span>© {new Date().getFullYear()} Padel Booking. All rights reserved.</span>
          <span>Dibuat dengan 💚 untuk komunitas padel Indonesia</span>
        </div>
      </footer>
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="reveal">
      <div className="font-display text-brand-600 dark:text-brand-400 text-5xl font-extrabold">
        <CountUp target={value} />
      </div>
      <div className="mt-1 text-gray-500 dark:text-gray-400">{label}</div>
    </div>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <h4 className="mb-4 font-semibold">{title}</h4>
      <ul className="space-y-2.5 text-sm text-gray-400">
        {links.map(([label, href]) => (
          <li key={label}>
            <Link href={href} className="transition hover:text-white">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
