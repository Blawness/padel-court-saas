import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { subscriptionPlans } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { apiError } from "@/lib/utils";

type Ctx = { params: Promise<{ id: string }> };

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  maxVenues: z.number().int().positive().optional(),
  monthlyPrice: z.number().int().nonnegative().optional(),
  isActive: z.boolean().optional(),
});

/** PUT /api/admin/plans/{id} — edit a plan. */
export async function PUT(req: NextRequest, { params }: Ctx) {
  try {
    await requireUser("super_admin");
    const { id } = await params;
    const data = updateSchema.parse(await req.json());

    const [plan] = await db
      .update(subscriptionPlans)
      .set(data)
      .where(eq(subscriptionPlans.id, id))
      .returning();

    return NextResponse.json({ plan });
  } catch (err) {
    return apiError(err);
  }
}
