import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { payments, subscriptionPlans, subscriptions } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { getOwnerSubscription, type SubscriptionWithPlan } from "@/lib/subscription";
import { createSnapTransaction } from "@/lib/midtrans";
import { apiError } from "@/lib/utils";

const schema = z.object({ planId: z.string().uuid().optional() });

/**
 * POST /api/subscriptions/checkout — generates a Midtrans payment link for one month.
 *
 * PRD §10 decision: v1 uses a manual monthly payment link, not Midtrans recurring.
 * The webhook flips the subscription to `active` and extends currentPeriodEnd by a month.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser("venue_owner");
    const body = schema.parse(await req.json().catch(() => ({})));

    const current = await getOwnerSubscription(user.id);
    if (!current) {
      return NextResponse.json({ error: "Belum ada paket langganan tersedia." }, { status: 400 });
    }

    // Switching plans at checkout time is allowed; the new plan takes effect on payment.
    let subscription: SubscriptionWithPlan = current;
    if (body.planId && body.planId !== current.planId) {
      const plan = await db.query.subscriptionPlans.findFirst({
        where: eq(subscriptionPlans.id, body.planId),
      });
      if (!plan) return NextResponse.json({ error: "Paket tidak ditemukan." }, { status: 404 });

      const [updated] = await db
        .update(subscriptions)
        .set({ planId: plan.id })
        .where(eq(subscriptions.id, current.id))
        .returning();

      subscription = { ...updated, plan };
    }

    const orderId = `SUB-${subscription.id.slice(0, 8).toUpperCase()}-${Date.now().toString(36)}`;
    const snap = await createSnapTransaction({
      orderId,
      amount: subscription.plan.monthlyPrice,
      itemName: `Langganan ${subscription.plan.name} — 1 bulan`,
      customer: { name: user.fullName, email: user.email, phone: user.phone },
    });

    await db.insert(payments).values({
      subscriptionId: subscription.id,
      midtransOrderId: orderId,
      amount: subscription.plan.monthlyPrice,
      status: "pending",
      snapToken: snap.token,
    });

    return NextResponse.json({
      orderId,
      snapToken: snap.token,
      redirectUrl: snap.redirectUrl,
      isMock: snap.isMock,
      amount: subscription.plan.monthlyPrice,
    });
  } catch (err) {
    return apiError(err);
  }
}
