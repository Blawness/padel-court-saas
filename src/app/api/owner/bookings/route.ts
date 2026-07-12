import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { and, desc, eq, gte, lte, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { bookings, courts, users, venues, type BookingStatus } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { requireActiveSubscription } from "@/lib/subscription";
import { createBooking, releaseExpiredHolds, priceForSlot } from "@/lib/booking";
import { apiError } from "@/lib/utils";

/** GET /api/owner/bookings — filterable by venue, court, date range, status. */
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser("venue_owner");
    await releaseExpiredHolds();

    const sp = req.nextUrl.searchParams;
    const venueId = sp.get("venueId");
    const courtId = sp.get("courtId");
    const status = sp.get("status");
    const from = sp.get("from");
    const to = sp.get("to");

    // Joining is clearer than a nested `where` here: every filter lives on one table.
    const filters: (SQL | undefined)[] = [
      eq(venues.ownerId, user.id),
      venueId ? eq(venues.id, venueId) : undefined,
      courtId ? eq(courts.id, courtId) : undefined,
      status && status !== "all" ? eq(bookings.status, status as BookingStatus) : undefined,
      from ? gte(bookings.startTime, new Date(`${from}T00:00:00+07:00`)) : undefined,
      to ? lte(bookings.startTime, new Date(`${to}T23:59:59+07:00`)) : undefined,
    ];

    const rows = await db
      .select({
        booking: bookings,
        courtName: courts.name,
        venueName: venues.name,
        playerName: users.fullName,
        playerPhone: users.phone,
      })
      .from(bookings)
      .innerJoin(courts, eq(bookings.courtId, courts.id))
      .innerJoin(venues, eq(courts.venueId, venues.id))
      .leftJoin(users, eq(bookings.playerId, users.id))
      .where(and(...filters))
      .orderBy(desc(bookings.startTime))
      .limit(200);

    return NextResponse.json({
      bookings: rows.map((r) => ({
        ...r.booking,
        player: r.playerName ? { fullName: r.playerName, phone: r.playerPhone } : null,
        court: { name: r.courtName, venue: { name: r.venueName } },
      })),
    });
  } catch (err) {
    return apiError(err);
  }
}

const manualSchema = z.object({
  courtId: z.string().uuid(),
  startTime: z.string().datetime(),
  /** `walk_in` = offline customer (counts as revenue); `blocked` = maintenance (no revenue). */
  kind: z.enum(["walk_in", "blocked"]),
  guestName: z.string().optional(),
  guestPhone: z.string().optional(),
  note: z.string().optional(),
});

/**
 * POST /api/owner/bookings — owner blocks a slot for maintenance or records a walk-in.
 * Both go through the same no-overlap constraint, so they can't collide with a player booking.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser("venue_owner");
    await requireActiveSubscription(user.id);

    const body = manualSchema.parse(await req.json());
    const court = await db.query.courts.findFirst({
      where: eq(courts.id, body.courtId),
      with: { venue: true },
    });
    if (!court || court.venue.ownerId !== user.id) {
      return NextResponse.json({ error: "Bukan court kamu." }, { status: 403 });
    }

    const start = new Date(body.startTime);
    const end = new Date(start.getTime() + 60 * 60 * 1000);

    const booking = await createBooking({
      courtId: body.courtId,
      playerId: null,
      start,
      end,
      status: "confirmed",
      source: body.kind,
      totalPrice: body.kind === "walk_in" ? priceForSlot(court, start) : 0,
      guestName: body.kind === "walk_in" ? (body.guestName ?? "Walk-in") : null,
      guestPhone: body.guestPhone ?? null,
      note: body.note ?? null,
    });

    return NextResponse.json({ booking }, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
