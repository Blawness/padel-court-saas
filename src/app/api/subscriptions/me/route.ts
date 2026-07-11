import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { subscriptionPlans } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { getOwnerSubscription, isSubscriptionActive } from "@/lib/subscription";
import { apiError } from "@/lib/utils";

/** GET /api/subscriptions/me — current subscription + the plans available to switch to. */
export async function GET() {
  try {
    const user = await requireUser("venue_owner");
    const subscription = await getOwnerSubscription(user.id);

    const plans = await db.query.subscriptionPlans.findMany({
      where: eq(subscriptionPlans.isActive, true),
      orderBy: asc(subscriptionPlans.monthlyPrice),
    });

    return NextResponse.json({
      subscription,
      plans,
      canWrite: isSubscriptionActive(subscription),
    });
  } catch (err) {
    return apiError(err);
  }
}
