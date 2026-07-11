import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { payments, subscriptionPlans, subscriptions } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { getOwnerSubscription } from "@/lib/subscription";
import { SubscriptionStatusChip } from "@/components/status-chip";
import { SubscriptionCheckout } from "@/components/dashboard/subscription-checkout";
import { formatDate, formatIDR } from "@/lib/format";
import { TRIAL_DAYS } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function SubscriptionPage() {
  const user = await requireUser("venue_owner");
  const [subscription, plans, paymentRows] = await Promise.all([
    getOwnerSubscription(user.id),
    db.query.subscriptionPlans.findMany({
      where: eq(subscriptionPlans.isActive, true),
      orderBy: asc(subscriptionPlans.monthlyPrice),
    }),
    db
      .select({ payment: payments })
      .from(payments)
      .innerJoin(subscriptions, eq(payments.subscriptionId, subscriptions.id))
      .where(eq(subscriptions.ownerId, user.id))
      .orderBy(desc(payments.createdAt))
      .limit(6),
  ]);

  const paymentHistory = paymentRows.map((r) => r.payment);

  return (
    <>
      <h2 className="font-display text-xl font-extrabold">Langganan</h2>

      <div className="reveal card p-6">
        {subscription ? (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-display text-2xl font-extrabold">
                Paket {subscription.plan.name}
              </span>
              <SubscriptionStatusChip status={subscription.status} />
            </div>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {formatIDR(subscription.plan.monthlyPrice)}/bulan · maksimal{" "}
              {subscription.plan.maxVenues} venue ·{" "}
              {subscription.status === "trial"
                ? `trial ${TRIAL_DAYS} hari berakhir ${formatDate(subscription.currentPeriodEnd)}`
                : `periode berjalan s.d. ${formatDate(subscription.currentPeriodEnd)}`}
            </p>
          </>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Belum ada paket langganan tersedia. Hubungi admin.
          </p>
        )}
      </div>

      <SubscriptionCheckout
        currentPlanId={subscription?.planId ?? null}
        plans={plans.map((p) => ({
          id: p.id,
          name: p.name,
          maxVenues: p.maxVenues,
          monthlyPrice: p.monthlyPrice,
        }))}
      />

      <div className="reveal card overflow-hidden">
        <div className="border-b border-gray-100 p-5 dark:border-white/10">
          <h3 className="font-bold">Riwayat Pembayaran</h3>
          <p className="text-xs text-gray-400">
            v1 memakai payment link bulanan manual (bukan auto-debit) — bayar tiap siklus dari sini.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Jumlah</th>
                <th>Metode</th>
                <th>Status</th>
                <th>Dibayar</th>
              </tr>
            </thead>
            <tbody>
              {paymentHistory.map((p) => (
                <tr key={p.id}>
                  <td className="font-mono text-xs">{p.midtransOrderId}</td>
                  <td className="font-semibold">{formatIDR(p.amount)}</td>
                  <td>{p.paymentMethod ?? "—"}</td>
                  <td>
                    <span
                      className={`chip ${
                        p.status === "success"
                          ? "chip-green"
                          : p.status === "pending"
                            ? "chip-amber"
                            : "chip-red"
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td>{p.paidAt ? formatDate(p.paidAt) : "—"}</td>
                </tr>
              ))}
              {paymentHistory.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400">
                    Belum ada pembayaran.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
