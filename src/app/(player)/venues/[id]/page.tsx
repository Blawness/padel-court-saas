import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MapPin } from "lucide-react";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { courts, venues } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { ThemeSwitch } from "@/components/theme-switch";
import { RevealOnScroll } from "@/components/reveal";
import { BookingClient } from "@/components/booking/booking-client";
import { parsePeakRules } from "@/lib/booking";

export const dynamic = "force-dynamic";

export default async function VenueBookingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [venue, user] = await Promise.all([
    db.query.venues.findFirst({
      where: eq(venues.id, id),
      with: { courts: { where: eq(courts.isActive, true), orderBy: asc(courts.name) } },
    }),
    getCurrentUser(),
  ]);

  if (!venue) notFound();

  return (
    <>
      <RevealOnScroll />

      <header className="dark:bg-ink/80 sticky top-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur-xl dark:border-white/10">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/venues"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 transition hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <span className="font-bold">Booking Lapangan</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/profile" className="btn-ghost py-2 text-sm">
              Booking saya
            </Link>
            <ThemeSwitch />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {/* venue header */}
        <div className="reveal card overflow-hidden">
          <div className="from-brand-500 relative h-40 bg-gradient-to-br to-teal-600">
            {venue.photos[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={venue.photos[0]} alt={venue.name} className="h-full w-full object-cover" />
            ) : (
              <div className="dots h-full w-full" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            <div className="absolute bottom-4 left-5 text-white">
              <h1 className="font-display text-2xl font-extrabold drop-shadow">{venue.name}</h1>
              <div className="mt-1 flex items-center gap-1 text-sm drop-shadow">
                <MapPin className="h-4 w-4" /> {venue.city}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 p-5 text-sm">
            <span className="chip chip-green">
              <span className="pdot h-1.5 w-1.5 rounded-full bg-green-500" />
              Buka {venue.openTime}–{venue.closeTime}
            </span>
            <span className="chip chip-blue">QRIS</span>
            <span className="chip chip-blue">GoPay</span>
            <span className="chip chip-gray">{venue.courts.length} Court</span>
            <span className="ml-auto text-xs text-gray-400">{venue.address}</span>
          </div>
        </div>

        <BookingClient
          venue={{ id: venue.id, name: venue.name }}
          courts={venue.courts.map((c) => ({
            id: c.id,
            name: c.name,
            pricePerHour: c.pricePerHour,
            peak: parsePeakRules(c.peakPriceOverride),
          }))}
          isLoggedIn={Boolean(user && user.role === "player")}
        />
      </main>
    </>
  );
}
