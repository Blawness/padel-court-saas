import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { asc, inArray } from "drizzle-orm";
import { db } from "@/db";
import { subscriptionPlans, subscriptions } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { apiError } from "@/lib/utils";

/** GET /api/admin/plans — all plans with subscriber counts (drives the MRR tile). */
export async function GET() {
  try {
    await requireUser("super_admin");

    const plans = await db.query.subscriptionPlans.findMany({
      with: {
        subscriptions: {
          where: inArray(subscriptions.status, ["active", "trial"]),
          columns: { status: true },
        },
      },
      orderBy: asc(subscriptionPlans.monthlyPrice),
    });

    const result = plans.map((p) => {
      const active = p.subscriptions.filter((s) => s.status === "active").length;
      const trial = p.subscriptions.filter((s) => s.status === "trial").length;
      return {
        id: p.id,
        name: p.name,
        maxVenues: p.maxVenues,
        monthlyPrice: p.monthlyPrice,
        isActive: p.isActive,
        activeSubscribers: active,
        trialSubscribers: trial,
        mrr: active * p.monthlyPrice,
      };
    });

    return NextResponse.json({
      plans: result,
      mrr: result.reduce((sum, p) => sum + p.mrr, 0),
    });
  } catch (err) {
    return apiError(err);
  }
}

const planSchema = z.object({
  name: z.string().min(2),
  maxVenues: z.number().int().positive(),
  monthlyPrice: z.number().int().nonnegative(),
  isActive: z.boolean().default(true),
});

/** POST /api/admin/plans — create a plan. */
export async function POST(req: NextRequest) {
  try {
    await requireUser("super_admin");
    const data = planSchema.parse(await req.json());
    const [plan] = await db.insert(subscriptionPlans).values(data).returning();
    return NextResponse.json({ plan }, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
