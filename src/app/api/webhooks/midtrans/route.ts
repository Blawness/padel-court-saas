import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { bookings, payments, subscriptions } from "@/db/schema";
import { mapTransactionStatus, verifySignature, type MidtransNotification } from "@/lib/midtrans";
import { sendBookingConfirmation } from "@/lib/email";
import { TRIAL_DAYS } from "@/lib/env";

/**
 * POST /api/webhooks/midtrans — payment notification.
 * Verifies sha512(order_id + status_code + gross_amount + server_key) before touching anything.
 * Handles both booking payments and subscription payments (same Payment table).
 */
export async function POST(req: NextRequest) {
  let notification: MidtransNotification;
  try {
    notification = (await req.json()) as MidtransNotification;
  } catch {
    return NextResponse.json({ error: "Body bukan JSON valid." }, { status: 400 });
  }

  if (!notification.order_id) {
    return NextResponse.json({ error: "order_id wajib ada." }, { status: 400 });
  }

  if (!verifySignature(notification)) {
    console.warn(`[midtrans] signature tidak valid untuk order ${notification.order_id}`);
    return NextResponse.json({ error: "Signature tidak valid." }, { status: 403 });
  }

  const payment = await db.query.payments.findFirst({
    where: eq(payments.midtransOrderId, notification.order_id),
    with: {
      booking: { with: { court: { with: { venue: true } }, player: true } },
      subscription: true,
    },
  });
  if (!payment) {
    return NextResponse.json({ error: "Pembayaran tidak ditemukan." }, { status: 404 });
  }

  const result = mapTransactionStatus(notification);

  // Midtrans may retry a notification, and it also sends late `expire`/`cancel` notices for
  // an order that already settled. Once a payment is success, no later notification may
  // downgrade it — that would strip `paidAt` off a booking the player actually paid for.
  // A refund is the one legitimate transition, and in v1 it's recorded by the owner, not here.
  if (payment.status === "success") {
    if (result !== "success") {
      console.warn(
        `[midtrans] notifikasi ${notification.transaction_status} untuk order ${notification.order_id} yang sudah lunas — diabaikan.`,
      );
    }
    return NextResponse.json({ ok: true, duplicate: true });
  }

  await db
    .update(payments)
    .set({
      status: result,
      paymentMethod: notification.payment_type ?? payment.paymentMethod,
      paidAt: result === "success" ? new Date() : payment.paidAt,
    })
    .where(eq(payments.id, payment.id));

  // --- Booking payment ---
  if (payment.booking) {
    const booking = payment.booking;

    if (result === "success") {
      // Only a still-held booking can be confirmed; if the hold already expired the
      // slot may belong to someone else now, so we leave it and flag for manual refund.
      if (booking.status === "pending_payment") {
        await db
          .update(bookings)
          .set({ status: "confirmed", holdExpiresAt: null })
          .where(eq(bookings.id, booking.id));

        if (booking.player) {
          await sendBookingConfirmation({
            to: booking.player.email,
            playerName: booking.player.fullName,
            venueName: booking.court.venue.name,
            courtName: booking.court.name,
            start: booking.startTime,
            end: booking.endTime,
            amount: booking.totalPrice,
          });
        }
      } else {
        console.warn(
          `[midtrans] pembayaran sukses untuk booking ${booking.id} berstatus ${booking.status} — perlu refund manual.`,
        );
      }
    } else if (result === "failed" && booking.status === "pending_payment") {
      // Failed / cancelled / expired payment releases the slot back to available.
      await db.update(bookings).set({ status: "expired" }).where(eq(bookings.id, booking.id));
    }
  }

  // --- Subscription payment: apply the purchased plan and extend by one month ---
  if (payment.subscription && result === "success") {
    // Extend from whatever is left of the current period, not from today — an owner who
    // renews a week early would otherwise pay to lose that week.
    const current = payment.subscription.currentPeriodEnd;
    const base = current > new Date() ? new Date(current) : new Date();
    const nextPeriodEnd = new Date(base);
    nextPeriodEnd.setMonth(nextPeriodEnd.getMonth() + 1);

    await db
      .update(subscriptions)
      .set({
        status: "active",
        currentPeriodEnd: nextPeriodEnd,
        trialEndsAt: null,
        // The plan switch happens here, not at checkout: this is the first moment we know
        // the owner actually paid for it.
        ...(payment.planId ? { planId: payment.planId } : {}),
      })
      .where(eq(subscriptions.id, payment.subscription.id));

    console.info(
      `[midtrans] langganan ${payment.subscription.id} aktif s.d. ${nextPeriodEnd.toISOString()} (trial ${TRIAL_DAYS} hari selesai).`,
    );
  }

  return NextResponse.json({ ok: true });
}
