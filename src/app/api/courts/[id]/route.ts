import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { courts } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { requireActiveSubscription } from "@/lib/subscription";
import { apiError } from "@/lib/utils";

type Ctx = { params: Promise<{ id: string }> };

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  pricePerHour: z.number().int().positive().optional(),
  peakPriceOverride: z
    .array(
      z.object({
        start: z.string().regex(/^\d{2}:\d{2}$/),
        end: z.string().regex(/^\d{2}:\d{2}$/),
        price: z.number().int().positive(),
      }),
    )
    .optional(),
  isActive: z.boolean().optional(),
});

async function assertCourtOwner(courtId: string) {
  const user = await requireUser("venue_owner");
  await requireActiveSubscription(user.id);

  const court = await db.query.courts.findFirst({
    where: eq(courts.id, courtId),
    with: { venue: true },
  });
  if (!court) {
    return { error: NextResponse.json({ error: "Court tidak ditemukan." }, { status: 404 }) };
  }
  if (court.venue.ownerId !== user.id) {
    return { error: NextResponse.json({ error: "Bukan court kamu." }, { status: 403 }) };
  }
  return { court };
}

/** PUT /api/courts/{id} — update name, base price, or peak/off-peak overrides. */
export async function PUT(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const check = await assertCourtOwner(id);
    if (check.error) return check.error;

    const data = updateSchema.parse(await req.json());
    const [court] = await db.update(courts).set(data).where(eq(courts.id, id)).returning();
    return NextResponse.json({ court });
  } catch (err) {
    return apiError(err);
  }
}

/** DELETE /api/courts/{id} */
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const check = await assertCourtOwner(id);
    if (check.error) return check.error;

    await db.delete(courts).where(eq(courts.id, id));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiError(err);
  }
}
