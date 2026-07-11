import Link from "next/link";
import { CalendarDays, PieChart, Users, Wallet } from "lucide-react";
import { and, count, desc, eq, gte, lt } from "drizzle-orm";
import { db } from "@/db";
import { bookings, courts, users, venues } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { releaseExpiredHolds } from "@/lib/booking";
import { formatIDRShort, formatSlot, toDateKey, wibSlotStart } from "@/lib/format";
import { BookingStatusChip } from "@/components/status-chip";
import { RevenueChart } from "@/components/dashboard/revenue-chart";

export const dynamic = "force-dynamic";

export default async function OwnerDashboard() {
  const user = await requireUser("venue_owner");
  await releaseExpiredHolds();

  // Day/month boundaries are venue wall-clock (WIB), not the server's zone.
  const todayKey = toDateKey(new Date());
  const startOfToday = wibSlotStart(todayKey, 0);
  const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);
  const startOfMonth = wibSlotStart(`${todayKey.slice(0, 7)}-01`, 0);
  const daysElapsed = Number(todayKey.slice(8, 10));

  const ownedBy = eq(venues.ownerId, user.id);

  const [monthBookings, [todayCount], [pendingCount], courtRows, recent] = await Promise.all([
    db
      .select({ totalPrice: bookings.totalPrice, playerId: bookings.playerId })
      .from(bookings)
      .innerJoin(courts, eq(bookings.courtId, courts.id))
      .innerJoin(venues, eq(courts.venueId, venues.id))
      .where(and(ownedBy, eq(bookings.status, "confirmed"), gte(bookings.startTime, startOfMonth))),

    db
      .select({ n: count() })
      .from(bookings)
      .innerJoin(courts, eq(bookings.courtId, courts.id))
      .innerJoin(venues, eq(courts.venueId, venues.id))
      .where(
        and(ownedBy, gte(bookings.startTime, startOfToday), lt(bookings.startTime, endOfToday)),
      ),

    db
      .select({ n: count() })
      .from(bookings)
      .innerJoin(courts, eq(bookings.courtId, courts.id))
      .innerJoin(venues, eq(courts.venueId, venues.id))
      .where(
        and(
          ownedBy,
          eq(bookings.status, "pending_payment"),
          gte(bookings.startTime, startOfToday),
          lt(bookings.startTime, endOfToday),
        ),
      ),

    db
      .select({ openTime: venues.openTime, closeTime: venues.closeTime })
      .from(courts)
      .innerJoin(venues, eq(courts.venueId, venues.id))
      .where(and(ownedBy, eq(courts.isActive, true))),

    db
      .select({
        booking: bookings,
        courtName: courts.name,
        playerName: users.fullName,
      })
      .from(bookings)
      .innerJoin(courts, eq(bookings.courtId, courts.id))
      .innerJoin(venues, eq(courts.venueId, venues.id))
      .leftJoin(users, eq(bookings.playerId, users.id))
      .where(ownedBy)
      .orderBy(desc(bookings.createdAt))
      .limit(6),
  ]);

  const monthRevenue = monthBookings.reduce((sum, b) => sum + b.totalPrice, 0);
  const uniquePlayers = new Set(monthBookings.map((b) => b.playerId).filter(Boolean)).size;

  // Occupancy this month = confirmed bookings / total sellable court-hours so far.
  const capacity = courtRows.reduce((sum, c) => {
    const hours = Number(c.closeTime.split(":")[0]) - Number(c.openTime.split(":")[0]);
    return sum + Math.max(hours, 0) * daysElapsed;
  }, 0);
  const occupancy = capacity ? Math.round((monthBookings.length / capacity) * 100) : 0;

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          icon={Wallet}
          tone="brand"
          label="Omzet Bulan Ini"
          value={formatIDRShort(monthRevenue)}
          hint={`${monthBookings.length} booking lunas`}
        />
        <Kpi
          icon={CalendarDays}
          tone="blue"
          label="Booking Hari Ini"
          value={String(todayCount.n)}
          hint={`${pendingCount.n} menunggu bayar`}
        />
        <Kpi
          icon={PieChart}
          tone="purple"
          label="Okupansi"
          value={`${occupancy}%`}
          hint="Bulan berjalan"
        />
        <Kpi
          icon={Users}
          tone="amber"
          label="Pemain Unik"
          value={String(uniquePlayers)}
          hint="Bulan ini"
        />
      </div>

      <RevenueChart />

      <div className="reveal card overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-100 p-5 dark:border-white/10">
          <h2 className="font-bold">Booking Terbaru</h2>
          <Link href="/owner/bookings" className="text-brand-600 text-sm font-semibold">
            Lihat Semua
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="tbl">
            <thead>
              <tr>
                <th>Pemain</th>
                <th>Court</th>
                <th>Waktu</th>
                <th>Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((r) => (
                <tr key={r.booking.id}>
                  <td className="font-semibold">
                    {r.playerName ?? r.booking.guestName ?? "—"}
                  </td>
                  <td>{r.courtName}</td>
                  <td>{formatSlot(r.booking.startTime, r.booking.endTime)}</td>
                  <td className="font-semibold">{formatIDRShort(r.booking.totalPrice)}</td>
                  <td>
                    <BookingStatusChip status={r.booking.status} source={r.booking.source} />
                  </td>
                </tr>
              ))}
              {recent.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-gray-400">
                    Belum ada booking.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

const tones = {
  brand: "bg-brand-100 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400",
  blue: "bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400",
  purple: "bg-purple-100 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400",
  amber: "bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400",
} as const;

function Kpi({
  icon: Icon,
  tone,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tone: keyof typeof tones;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="reveal lift card rounded-2xl p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
        <span className={`grid h-9 w-9 place-items-center rounded-lg ${tones[tone]}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="font-display mt-2 text-2xl font-extrabold">{value}</div>
      <div className="mt-1 text-xs text-gray-400">{hint}</div>
    </div>
  );
}
