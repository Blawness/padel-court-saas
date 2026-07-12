import { NextResponse, type NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { bookings, payments } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { FREE_CANCEL_HOURS } from "@/lib/env";
import { apiError } from "@/lib/utils";

type Ctx = { params: Promise<{ id: string }> };

/**
 * DELETE /api/bookings/{id} — cancel.
 * Policy (PRD §10 decision): free cancellation only up to 2 hours before the slot starts.
 * The venue owner and super_admin can cancel at any time (e.g. maintenance, refund).
 */
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const user = await requireUser();

    const booking = await db.query.bookings.findFirst({
      where: eq(bookings.id, id),
      with: { court: { with: { venue: true } } },
    });
    if (!booking) return NextResponse.json({ error: "Booking tidak ditemukan." }, { status: 404 });

    const isPlayer = booking.playerId === user.id;
    const isOwner = booking.court.venue.ownerId === user.id;
    const isAdmin = user.role === "super_admin";
    if (!isPlayer && !isOwner && !isAdmin) {
      return NextResponse.json({ error: "Bukan booking kamu." }, { status: 403 });
    }

    if (booking.status === "cancelled" || booking.status === "expired") {
      return NextResponse.json({ error: "Booking ini sudah tidak aktif." }, { status: 409 });
    }

    if (isPlayer && !isOwner && !isAdmin) {
      const hoursLeft = (booking.startTime.getTime() - Date.now()) / 3_600_000;
      if (hoursLeft < FREE_CANCEL_HOURS) {
        return NextResponse.json(
          {
            error: `Pembatalan gratis hanya sampai ${FREE_CANCEL_HOURS} jam sebelum jadwal main. Hubungi venue lewat WhatsApp untuk pembatalan darurat.`,
          },
          { status: 403 },
        );
      }
    }

    const [cancelled] = await db
      .update(bookings)
      .set({ status: "cancelled" })
      .where(eq(bookings.id, id))
      .returning();

    // A paid booking that gets cancelled is refunded manually by the owner/admin in v1.
    if (booking.status === "confirmed") {
      await db
        .update(payments)
        .set({ status: "refunded" })
        .where(and(eq(payments.bookingId, id), eq(payments.status, "success")));
    }

    return NextResponse.json({ booking: cancelled });
  } catch (err) {
    return apiError(err);
  }
}
