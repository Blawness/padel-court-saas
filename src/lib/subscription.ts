import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  subscriptionPlans,
  subscriptions,
  type Subscription,
  type SubscriptionPlan,
} from "@/db/schema";
import { AuthError } from "@/lib/auth";
import { TRIAL_DAYS } from "@/lib/env";

export type SubscriptionWithPlan = Subscription & { plan: SubscriptionPlan };

/**
 * Owner's current subscription. Lazily flips `trial`/`active` to `expired` once the
 * period has lapsed, and starts a 14-day trial for an owner who doesn't have one yet.
 */
export async function getOwnerSubscription(ownerId: string): Promise<SubscriptionWithPlan | null> {
  let sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.ownerId, ownerId),
    orderBy: desc(subscriptions.createdAt),
    with: { plan: true },
  });

  if (!sub) {
    const plan = await db.query.subscriptionPlans.findFirst({
      where: eq(subscriptionPlans.isActive, true),
      orderBy: asc(subscriptionPlans.monthlyPrice),
    });
    if (!plan) return null;

    const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
    const [created] = await db
      .insert(subscriptions)
      .values({
        ownerId,
        planId: plan.id,
        status: "trial",
        trialEndsAt,
        currentPeriodEnd: trialEndsAt,
      })
      .returning();

    sub = { ...created, plan };
  }

  const lapsed =
    (sub.status === "trial" || sub.status === "active") && sub.currentPeriodEnd < new Date();
  if (lapsed) {
    const [updated] = await db
      .update(subscriptions)
      .set({ status: "expired" })
      .where(eq(subscriptions.id, sub.id))
      .returning();
    sub = { ...updated, plan: sub.plan };
  }

  return sub;
}

export function isSubscriptionActive(sub: SubscriptionWithPlan | null): boolean {
  return sub?.status === "trial" || sub?.status === "active";
}

/**
 * Gate for owner write-actions (PRD §3, Feature 5): blocked when the subscription
 * is expired/cancelled. Read access stays open, so this is only called on writes.
 */
export async function requireActiveSubscription(ownerId: string): Promise<SubscriptionWithPlan> {
  const sub = await getOwnerSubscription(ownerId);
  if (!isSubscriptionActive(sub)) {
    throw new AuthError(
      "Langganan kamu tidak aktif. Perpanjang untuk bisa mengubah venue, court, atau harga.",
      403,
    );
  }
  return sub!;
}
