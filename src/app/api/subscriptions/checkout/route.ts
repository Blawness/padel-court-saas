import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { payments, subscriptionPlans } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { getOwnerSubscription } from "@/lib/subscription";
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

    // An owner may switch plans at checkout, but the switch is only *recorded* here — the
    // webhook applies it once the money lands. Writing subscription.planId now would hand
    // out the new plan's venue limit to anyone who opens a checkout and walks away.
    let plan = current.plan;
    if (body.planId && body.planId !== current.planId) {
      const picked = await db.query.subscriptionPlans.findFirst({
        where: and(eq(subscriptionPlans.id, body.planId), eq(subscriptionPlans.isActive, true)),
      });
      if (!picked) return NextResponse.json({ error: "Paket tidak ditemukan." }, { status: 404 });
      plan = picked;
    }

    const orderId = `SUB-${current.id.slice(0, 8).toUpperCase()}-${Date.now().toString(36)}`;
    const snap = await createSnapTransaction({
      orderId,
      // Price always comes from the plan row, never from the request body.
      amount: plan.monthlyPrice,
      itemName: `Langganan ${plan.name} — 1 bulan`,
      customer: { name: user.fullName, email: user.email, phone: user.phone },
    });

    await db.insert(payments).values({
      subscriptionId: current.id,
      planId: plan.id,
      midtransOrderId: orderId,
      amount: plan.monthlyPrice,
      status: "pending",
      snapToken: snap.token,
    });

    return NextResponse.json({
      orderId,
      snapToken: snap.token,
      redirectUrl: snap.redirectUrl,
      isMock: snap.isMock,
      amount: plan.monthlyPrice,
      planName: plan.name,
    });
  } catch (err) {
    return apiError(err);
  }
}
