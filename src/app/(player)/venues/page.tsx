import type { Metadata } from "next";
import Link from "next/link";
import { Calendar, Clock, MapPin, Search, Star } from "lucide-react";
import { and, asc, eq, ilike } from "drizzle-orm";
import { db } from "@/db";
import { courts, venues as venuesTable } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { SiteHeader } from "@/components/site-header";
import { RevealOnScroll } from "@/components/reveal";
import { formatIDRShort, toDateKey } from "@/lib/format";
import { site } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Cari Venue Padel",
  description:
    "Jelajahi venue padel di Jakarta dan sekitarnya. Bandingkan harga per jam, lihat jam operasional, dan cek slot kosong secara real-time sebelum booking.",
  alternates: { canonical: "/venues" },
  openGraph: {
    title: `Cari Venue Padel — ${site.name}`,
    description:
      "Jelajahi venue padel, bandingkan harga per jam, dan cek slot kosong secara real-time.",
    url: "/venues",
  },
  twitter: {
    title: `Cari Venue Padel — ${site.name}`,
    description:
      "Jelajahi venue padel, bandingkan harga per jam, dan cek slot kosong secara real-time.",
  },
};

type SearchParams = Promise<{ city?: string; q?: string; sort?: string; time?: string }>;

/**
 * Rating and distance aren't in the data model (PRD puts reviews out of scope for v1),
 * so the cards show a static placeholder to match the mockup's layout.
 */
const PLACEHOLDER_RATING = "4.9";

export default async function VenuesPage({ searchParams }: { searchParams: SearchParams }) {
  const { city, q, sort } = await searchParams;
  const user = await getCurrentUser();

  const rows = await db.query.venues.findMany({
    where: and(
      city && city !== "all" ? eq(venuesTable.city, city) : undefined,
      q ? ilike(venuesTable.name, `%${q}%`) : undefined,
    ),
    with: {
      courts: { where: eq(courts.isActive, true) },
      owner: { columns: { ownerStatus: true } },
    },
    orderBy: asc(venuesTable.createdAt),
  });

  // Only approved owners' venues are visible to players.
  const approved = rows.filter((v) => v.owner.ownerStatus === "approved");
  const cities = [...new Set(approved.map((v) => v.city))].sort();

  const priceOf = (v: (typeof approved)[number]) =>
    v.courts.length ? Math.min(...v.courts.map((c) => c.pricePerHour)) : 0;

  const venues =
    sort === "price"
      ? [...approved].sort((a, b) => priceOf(a) - priceOf(b))
      : approved;

  return (
    <>
      <RevealOnScroll />
      <SiteHeader user={user} />

      {/* HERO SEARCH */}
      <section className="relative overflow-hidden">
        <div className="from-brand-50/80 dark:from-brand-900/20 dark:to-teal-900/10 dark:via-ink absolute inset-0 bg-gradient-to-br via-white to-teal-50/40" />
        <div className="bg-brand-300/25 dark:bg-brand-600/15 blob absolute -top-24 -right-24 h-80 w-80 rounded-full blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-6 py-12 lg:px-8">
          <div className="reveal max-w-2xl">
            <h1 className="font-display text-4xl font-extrabold lg:text-5xl">Cari Lapangan Padel</h1>
            <p className="mt-3 text-lg text-gray-600 dark:text-gray-300">
              Temukan venue terdekat dengan slot tersedia real-time.
            </p>
          </div>

          <form
            action="/venues"
            className="reveal d1 card mt-8 grid grid-cols-1 items-center gap-3 rounded-2xl p-4 shadow-xl md:grid-cols-12"
          >
            <label className="flex items-center gap-2 border-b border-gray-100 pb-3 md:col-span-4 md:border-r md:border-b-0 md:pr-3 md:pb-0 dark:border-white/10">
              <MapPin className="text-brand-600 h-4 w-4 shrink-0" />
              <select
                name="city"
                defaultValue={city ?? "all"}
                className="input border-0 bg-transparent p-0 focus:shadow-none"
              >
                <option value="all">Semua kota</option>
                {cities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-2 border-b border-gray-100 pb-3 md:col-span-3 md:border-r md:border-b-0 md:pr-3 md:pb-0 dark:border-white/10">
              <Calendar className="text-brand-600 h-4 w-4 shrink-0" />
              <input
                type="date"
                name="date"
                defaultValue={toDateKey(new Date())}
                className="input border-0 bg-transparent p-0 focus:shadow-none"
              />
            </label>

            <label className="flex items-center gap-2 border-b border-gray-100 pb-3 md:col-span-3 md:border-r md:border-b-0 md:pr-3 md:pb-0 dark:border-white/10">
              <Clock className="text-brand-600 h-4 w-4 shrink-0" />
              <select name="time" className="input border-0 bg-transparent p-0 focus:shadow-none">
                <option value="all">Semua jam</option>
                <option value="pagi">Pagi (06–12)</option>
                <option value="siang">Siang (12–17)</option>
                <option value="sore">Sore (17–22)</option>
              </select>
            </label>

            <input type="hidden" name="q" value={q ?? ""} />

            <button
              type="submit"
              className="btn-primary shimmer flex items-center justify-center gap-2 py-3 md:col-span-2"
            >
              <Search className="h-4 w-4" /> Cari
            </button>
          </form>
        </div>
      </section>

      {/* RESULTS */}
      <section className="mx-auto max-w-7xl px-6 py-8 pb-20 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            <b className="text-gray-900 dark:text-white">{venues.length} venue</b> ditemukan
            {city && city !== "all" ? (
              <>
                {" "}
                di <b className="text-gray-900 dark:text-white">{city}</b>
              </>
            ) : null}
          </div>

          <form action="/venues" className="flex items-center gap-2 text-sm">
            {city ? <input type="hidden" name="city" value={city} /> : null}
            {q ? <input type="hidden" name="q" value={q} /> : null}
            <span className="text-gray-500 dark:text-gray-400">Urutkan:</span>
            <select name="sort" defaultValue={sort ?? "relevan"} className="input w-auto py-2">
              <option value="relevan">Relevan</option>
              <option value="price">Harga termurah</option>
            </select>
            <button type="submit" className="btn-ghost py-2">
              Terapkan
            </button>
          </form>
        </div>

        {venues.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="font-semibold">Belum ada venue yang cocok.</p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Coba ubah kota atau kata kunci pencarian.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {venues.map((v, i) => (
              <Link
                key={v.id}
                href={`/venues/${v.id}`}
                className={`reveal d${i % 3} lift card group block overflow-hidden rounded-3xl`}
              >
                <div className="from-brand-500 relative h-44 overflow-hidden bg-gradient-to-br to-teal-600">
                  {v.photos[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={v.photos[0]}
                      alt={v.name}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
                    />
                  ) : (
                    <div className="dots h-full w-full" />
                  )}
                  <span className="chip chip-green absolute top-3 left-3">
                    <span className="pdot h-1.5 w-1.5 rounded-full bg-green-500" />
                    {v.courts.length} court tersedia
                  </span>
                  <span className="chip chip-gray absolute top-3 right-3">
                    <Star className="h-3 w-3 fill-current" /> {PLACEHOLDER_RATING}
                  </span>
                </div>

                <div className="p-5">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-lg font-bold">{v.name}</h3>
                    <span className="text-brand-600 dark:text-brand-400 shrink-0 font-extrabold">
                      {priceOf(v) ? `${formatIDRShort(priceOf(v))}/jam` : "—"}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                    <MapPin className="h-3.5 w-3.5" /> {v.city}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="chip chip-blue">QRIS</span>
                    <span className="chip chip-gray">{v.courts.length} Court</span>
                    <span className="chip chip-amber">
                      Buka {v.openTime}–{v.closeTime}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
