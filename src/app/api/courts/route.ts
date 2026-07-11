import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { courts, venues } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { requireActiveSubscription } from "@/lib/subscription";
import { apiError } from "@/lib/utils";

const peakRule = z.object({
  start: z.string().regex(/^\d{2}:\d{2}$/),
  end: z.string().regex(/^\d{2}:\d{2}$/),
  price: z.number().int().positive(),
});

const createCourtSchema = z.object({
  venueId: z.string().uuid(),
  name: z.string().min(1),
  pricePerHour: z.number().int().positive(),
  peakPriceOverride: z.array(peakRule).default([]),
});

/** POST /api/courts — venue_owner adds a court to one of their venues. */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser("venue_owner");
    await requireActiveSubscription(user.id);

    const data = createCourtSchema.parse(await req.json());
    const venue = await db.query.venues.findFirst({ where: eq(venues.id, data.venueId) });
    if (!venue || venue.ownerId !== user.id) {
      return NextResponse.json({ error: "Bukan venue kamu." }, { status: 403 });
    }

    const [court] = await db.insert(courts).values(data).returning();
    return NextResponse.json({ court }, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
