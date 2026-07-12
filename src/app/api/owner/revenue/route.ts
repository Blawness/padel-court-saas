import { NextResponse, type NextRequest } from "next/server";
import { and, asc, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import { bookings, courts, venues } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { apiError } from "@/lib/utils";
import { toDateKey, wibSlotStart } from "@/lib/format";

type Granularity = "daily" | "weekly" | "monthly";

const fmt = (opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("id-ID", { ...opts, timeZone: "Asia/Jakarta" });

/**
 * Bucket key + human label for a booking's start time, per granularity.
 * All bucketing is done on the Jakarta calendar so a UTC server doesn't split
 * an evening booking into the previous day.
 */
function bucketOf(date: Date, granularity: Granularity): { key: string; label: string } {
  const dayKey = toDateKey(date); // YYYY-MM-DD in Jakarta

  if (granularity === "monthly") {
    return { key: dayKey.slice(0, 7), label: fmt({ month: "short" }).format(date) };
  }

  if (granularity === "weekly") {
    // Monday-anchored week, computed on the Jakarta calendar date.
    const [y, m, d] = dayKey.split("-").map(Number);
    const noonUtc = new Date(Date.UTC(y, m - 1, d, 12));
    noonUtc.setUTCDate(noonUtc.getUTCDate() - ((noonUtc.getUTCDay() + 6) % 7));
    return {
      key: toDateKey(noonUtc),
      label: fmt({ day: "numeric", month: "short" }).format(noonUtc),
    };
  }

  return { key: dayKey, label: fmt({ weekday: "short" }).format(date) };
}

/**
 * GET /api/owner/revenue?granularity=daily|weekly|monthly&days=30&venueId=…
 * Revenue counts confirmed bookings only (online + walk-in); blocked slots are 0-priced.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser("venue_owner");

    const sp = req.nextUrl.searchParams;
    const granularity = (sp.get("granularity") ?? "daily") as Granularity;
    // Clamped both ways: a non-positive `days` would produce an empty series and a negative
    // utilisation capacity.
    const days = Math.min(Math.max(Math.floor(Number(sp.get("days")) || 7), 1), 365);
    const venueId = sp.get("venueId");

    // Start of the window = midnight WIB, `days-1` days ago.
    const sinceKey = toDateKey(new Date(Date.now() - (days - 1) * 24 * 60 * 60 * 1000));
    const since = wibSlotStart(sinceKey, 0);

    const rows = await db
      .select({
        startTime: bookings.startTime,
        totalPrice: bookings.totalPrice,
        playerId: bookings.playerId,
        courtId: bookings.courtId,
      })
      .from(bookings)
      .innerJoin(courts, eq(bookings.courtId, courts.id))
      .innerJoin(venues, eq(courts.venueId, venues.id))
      .where(
        and(
          eq(bookings.status, "confirmed"),
          gte(bookings.startTime, since),
          eq(venues.ownerId, user.id),
          venueId ? eq(venues.id, venueId) : undefined,
        ),
      );

    // --- revenue series ---
    const buckets = new Map<string, { label: string; revenue: number; bookings: number }>();
    for (let i = 0; i < days; i++) {
      const d = new Date(since.getTime() + i * 24 * 60 * 60 * 1000);
      const { key, label } = bucketOf(d, granularity);
      if (!buckets.has(key)) buckets.set(key, { label, revenue: 0, bookings: 0 });
    }
    for (const b of rows) {
      const { key, label } = bucketOf(b.startTime, granularity);
      const bucket = buckets.get(key) ?? { label, revenue: 0, bookings: 0 };
      bucket.revenue += b.totalPrice;
      bucket.bookings += 1;
      buckets.set(key, bucket);
    }
    const series = [...buckets.entries()].map(([key, v]) => ({ key, ...v }));

    // --- court utilisation over the window ---
    const courtRows = await db
      .select({
        id: courts.id,
        name: courts.name,
        openTime: venues.openTime,
        closeTime: venues.closeTime,
      })
      .from(courts)
      .innerJoin(venues, eq(courts.venueId, venues.id))
      .where(
        and(
          eq(venues.ownerId, user.id),
          eq(courts.isActive, true),
          venueId ? eq(venues.id, venueId) : undefined,
        ),
      )
      .orderBy(asc(courts.name));

    const utilisation = courtRows.map((c) => {
      const openHour = Number(c.openTime.split(":")[0]);
      const closeHour = Number(c.closeTime.split(":")[0]);
      const capacity = Math.max(closeHour - openHour, 1) * days;
      const booked = rows.filter((b) => b.courtId === c.id).length;
      return {
        courtId: c.id,
        name: c.name,
        percent: Math.min(Math.round((booked / capacity) * 100), 100),
      };
    });

    const totalRevenue = rows.reduce((sum, b) => sum + b.totalPrice, 0);
    const uniquePlayers = new Set(rows.map((b) => b.playerId).filter(Boolean)).size;

    return NextResponse.json({
      granularity,
      days,
      totalRevenue,
      totalBookings: rows.length,
      uniquePlayers,
      series,
      utilisation,
    });
  } catch (err) {
    return apiError(err);
  }
}
