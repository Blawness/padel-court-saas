import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { courts, venues } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { countFutureConfirmedBookings } from "@/lib/booking";
import { requireActiveSubscription } from "@/lib/subscription";
import { apiError } from "@/lib/utils";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/venues/{id} — public. Venue detail with its active courts. */
export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const venue = await db.query.venues.findFirst({
      where: eq(venues.id, id),
      with: {
        courts: { where: eq(courts.isActive, true), orderBy: asc(courts.name) },
        owner: { columns: { ownerStatus: true } },
      },
    });

    // The list endpoint hides unapproved owners; this one must too, or a suspended venue
    // stays reachable by direct link. Booking it already fails, but it shouldn't be on show.
    if (!venue || venue.owner.ownerStatus !== "approved") {
      return NextResponse.json({ error: "Venue tidak ditemukan." }, { status: 404 });
    }

    // Listed field by field on purpose: ownerId and the owner row are internal, and a
    // spread would silently re-expose anything later added to the Venue table.
    return NextResponse.json({
      venue: {
        id: venue.id,
        name: venue.name,
        city: venue.city,
        address: venue.address,
        photos: venue.photos,
        openTime: venue.openTime,
        closeTime: venue.closeTime,
        courts: venue.courts,
      },
    });
  } catch (err) {
    return apiError(err);
  }
}

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  city: z.string().min(2).optional(),
  address: z.string().min(4).optional(),
  openTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  closeTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  photos: z.array(z.string().url()).optional(),
});

/** Loads a venue and asserts the caller owns it (super_admin bypasses ownership). */
async function assertOwnership(venueId: string) {
  const user = await requireUser("venue_owner", "super_admin");
  const venue = await db.query.venues.findFirst({ where: eq(venues.id, venueId) });
  if (!venue) {
    return { error: NextResponse.json({ error: "Venue tidak ditemukan." }, { status: 404 }) };
  }
  if (user.role !== "super_admin") {
    if (venue.ownerId !== user.id) {
      return { error: NextResponse.json({ error: "Bukan venue kamu." }, { status: 403 }) };
    }
    await requireActiveSubscription(user.id);
  }
  return { venue };
}

/** PUT /api/venues/{id} — owner of the venue. */
export async function PUT(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const check = await assertOwnership(id);
    if (check.error) return check.error;

    const data = updateSchema.parse(await req.json());
    const [venue] = await db.update(venues).set(data).where(eq(venues.id, id)).returning();
    return NextResponse.json({ venue });
  } catch (err) {
    return apiError(err);
  }
}

/**
 * DELETE /api/venues/{id} — owner of the venue. Cascades to courts and bookings, so it is
 * refused while any court still has a paid booking ahead of it.
 */
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const check = await assertOwnership(id);
    if (check.error) return check.error;

    const upcoming = await countFutureConfirmedBookings({ venueId: id });
    if (upcoming > 0) {
      return NextResponse.json(
        {
          error: `Venue ini masih punya ${upcoming} booking terkonfirmasi ke depan. Batalkan booking tersebut dulu sebelum menghapus venue.`,
        },
        { status: 409 },
      );
    }

    await db.delete(venues).where(eq(venues.id, id));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiError(err);
  }
}
