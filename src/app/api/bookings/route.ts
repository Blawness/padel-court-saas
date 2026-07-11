import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { courts, payments } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { createBooking } from "@/lib/booking";
import { createSnapTransaction } from "@/lib/midtrans";
import { broadcastSlotChange } from "@/lib/realtime";
import { apiError } from "@/lib/utils";

const schema = z.object({
  courtId: z.string().uuid(),
  startTime: z.string().datetime(),
});

/**
 * POST /api/bookings — player holds a slot (`pending_payment`, 10 min) and gets a Snap token.
 * The slot is broadcast as unavailable the instant the hold lands.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser("player");
    const { courtId, startTime } = schema.parse(await req.json());

    const start = new Date(startTime);
    if (start.getTime() <= Date.now()) {
      return NextResponse.json({ error: "Slot sudah lewat." }, { status: 400 });
    }
    const end = new Date(start.getTime() + 60 * 60 * 1000);

    const booking = await createBooking({
      courtId,
      playerId: user.id,
      start,
      end,
      status: "pending_payment",
      source: "online",
    });

    const court = await db.query.courts.findFirst({
      where: eq(courts.id, courtId),
      with: { venue: true },
    });
    if (!court) return NextResponse.json({ error: "Court tidak ditemukan." }, { status: 404 });

    const orderId = `PB-${booking.id.slice(0, 8).toUpperCase()}-${Date.now().toString(36)}`;
    const snap = await createSnapTransaction({
      orderId,
      amount: booking.totalPrice,
      itemName: `${court.venue.name} - ${court.name}`,
      customer: { name: user.fullName, email: user.email, phone: user.phone },
    });

    await db.insert(payments).values({
      bookingId: booking.id,
      midtransOrderId: orderId,
      amount: booking.totalPrice,
      status: "pending",
      snapToken: snap.token,
    });

    await broadcastSlotChange({
      courtId,
      startTime: booking.startTime.toISOString(),
      state: "held",
    });

    return NextResponse.json(
      {
        booking,
        payment: {
          orderId,
          snapToken: snap.token,
          redirectUrl: snap.redirectUrl,
          isMock: snap.isMock,
        },
      },
      { status: 201 },
    );
  } catch (err) {
    return apiError(err);
  }
}
