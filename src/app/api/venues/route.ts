import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { and, asc, eq, ilike, count } from "drizzle-orm";
import { db } from "@/db";
import { courts, venues } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { requireActiveSubscription } from "@/lib/subscription";
import { apiError } from "@/lib/utils";

/** GET /api/venues — public. Filterable by city and free-text search. */
export async function GET(req: NextRequest) {
  try {
    const city = req.nextUrl.searchParams.get("city");
    const q = req.nextUrl.searchParams.get("q");

    const rows = await db.query.venues.findMany({
      where: and(
        city && city !== "all" ? eq(venues.city, city) : undefined,
        q ? ilike(venues.name, `%${q}%`) : undefined,
      ),
      with: {
        courts: { where: eq(courts.isActive, true) },
        owner: { columns: { ownerStatus: true } },
      },
      orderBy: asc(venues.createdAt),
    });

    // Only approved owners' venues are visible to players (PRD §10 decision).
    const visible = rows.filter((v) => v.owner.ownerStatus === "approved");

    return NextResponse.json({
      venues: visible.map((v) => ({
        id: v.id,
        name: v.name,
        city: v.city,
        address: v.address,
        photos: v.photos,
        openTime: v.openTime,
        closeTime: v.closeTime,
        courtCount: v.courts.length,
        minPrice: v.courts.length ? Math.min(...v.courts.map((c) => c.pricePerHour)) : 0,
        maxPrice: v.courts.length ? Math.max(...v.courts.map((c) => c.pricePerHour)) : 0,
      })),
    });
  } catch (err) {
    return apiError(err);
  }
}

const createVenueSchema = z.object({
  name: z.string().min(2),
  city: z.string().min(2),
  address: z.string().min(4),
  openTime: z.string().regex(/^\d{2}:\d{2}$/),
  closeTime: z.string().regex(/^\d{2}:\d{2}$/),
  photos: z.array(z.string().url()).default([]),
});

/** POST /api/venues — venue_owner only, gated on an active subscription and the plan's venue quota. */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser("venue_owner");
    const sub = await requireActiveSubscription(user.id);

    const [{ owned }] = await db
      .select({ owned: count() })
      .from(venues)
      .where(eq(venues.ownerId, user.id));

    if (owned >= sub.plan.maxVenues) {
      return NextResponse.json(
        {
          error: `Paket ${sub.plan.name} maksimal ${sub.plan.maxVenues} venue. Upgrade paket untuk menambah venue.`,
        },
        { status: 403 },
      );
    }

    const data = createVenueSchema.parse(await req.json());
    const [venue] = await db
      .insert(venues)
      .values({ ...data, ownerId: user.id })
      .returning();

    return NextResponse.json({ venue }, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
