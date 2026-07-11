import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { payments } from "@/db/schema";
import { isMidtransConfigured } from "@/lib/env";
import { formatIDR, formatSlot } from "@/lib/format";
import { MockPaymentActions } from "@/components/booking/mock-payment-actions";
import { RevealOnScroll } from "@/components/reveal";

export const dynamic = "force-dynamic";

/**
 * Stand-in for the Midtrans Snap popup while no Midtrans keys are configured.
 * "Bayar" and "Gagalkan" post the same notification shape to /api/webhooks/midtrans
 * that the real gateway sends, so the webhook path is exercised for real in dev.
 */
export default async function MockPaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ order_id?: string }>;
}) {
  if (isMidtransConfigured) redirect("/venues");

  const { order_id: orderId } = await searchParams;
  if (!orderId) notFound();

  const payment = await db.query.payments.findFirst({
    where: eq(payments.midtransOrderId, orderId),
    with: {
      booking: { with: { court: { with: { venue: true } } } },
      subscription: { with: { plan: true } },
    },
  });
  if (!payment) notFound();

  const isBooking = Boolean(payment.booking);
  const title = payment.booking
    ? `${payment.booking.court.venue.name} · ${payment.booking.court.name}`
    : `Langganan ${payment.subscription?.plan.name ?? ""}`;
  const subtitle = payment.booking
    ? formatSlot(payment.booking.startTime, payment.booking.endTime)
    : "1 bulan";

  return (
    <>
      <RevealOnScroll />
      <main className="grid min-h-screen place-items-center px-6 py-16">
        <div className="reveal card glow-border w-full max-w-md p-7">
          <span className="chip chip-amber">Mode simulasi — Midtrans belum dikonfigurasi</span>

          <h1 className="font-display mt-4 text-xl font-extrabold">Pembayaran</h1>

          <div className="mt-5 rounded-2xl bg-gray-50 p-4 dark:bg-white/5">
            <div className="flex justify-between gap-3 text-sm">
              <span className="text-gray-500 dark:text-gray-400">{title}</span>
              <span className="text-right font-semibold">{subtitle}</span>
            </div>
            <div className="mt-3 flex items-end justify-between">
              <span className="text-xs text-gray-500 dark:text-gray-400">Total bayar</span>
              <span className="font-display text-brand-600 dark:text-brand-400 text-2xl font-extrabold">
                {formatIDR(payment.amount)}
              </span>
            </div>
          </div>

          <MockPaymentActions
            orderId={orderId}
            amount={payment.amount}
            redirectTo={isBooking ? "/profile" : "/owner/subscription"}
          />

          <p className="mt-4 text-center text-xs text-gray-400">
            Tombol ini memanggil <code>/api/webhooks/midtrans</code> dengan payload yang sama
            seperti Midtrans asli.
          </p>
        </div>
      </main>
    </>
  );
}
