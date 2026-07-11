import { and, eq, gt, inArray, lt } from "drizzle-orm";
import { db } from "@/db";
import { bookings, courts, type Booking, type Court, type PeakRule } from "@/db/schema";
import { HOLD_MINUTES } from "@/lib/env";
import { jakartaHour, wibSlotStart } from "@/lib/format";

export type { PeakRule };

/** Court.peakPriceOverride is jsonb; parse it defensively. */
export function parsePeakRules(value: unknown): PeakRule[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (r): r is PeakRule =>
      !!r &&
      typeof r === "object" &&
      typeof (r as PeakRule).start === "string" &&
      typeof (r as PeakRule).end === "string" &&
      typeof (r as PeakRule).price === "number",
  );
}

const toMinutes = (hhmm: string): number => {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

/**
 * Price for a 1-hour slot starting at `start`. A peak rule wins if the slot's start
 * falls inside [rule.start, rule.end); otherwise the court's base price applies.
 * Peak windows are venue wall-clock (WIB), not server-local.
 */
export function priceForSlot(
  court: Pick<Court, "pricePerHour" | "peakPriceOverride">,
  start: Date,
): number {
  const minutes = jakartaHour(start) * 60;
  for (const rule of parsePeakRules(court.peakPriceOverride)) {
    const from = toMinutes(rule.start);
    const to = toMinutes(rule.end);
    if (minutes >= from && minutes < to) return rule.price;
  }
  return court.pricePerHour;
}

export type SlotState = "free" | "taken" | "held" | "past";

export type Slot = {
  start: string; // ISO
  end: string; // ISO
  label: string; // "07:00"
  price: number;
  state: SlotState;
};

/**
 * Flips every `pending_payment` booking whose hold window has lapsed to `expired`,
 * which releases the slot (the DB exclusion constraint only covers live statuses).
 * Called before any availability read or booking write, so a stale hold never blocks.
 */
export async function releaseExpiredHolds(): Promise<number> {
  const released = await db
    .update(bookings)
    .set({ status: "expired" })
    .where(
      and(eq(bookings.status, "pending_payment"), lt(bookings.holdExpiresAt, new Date())),
    )
    .returning({ id: bookings.id });

  return released.length;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Builds the 60-minute slot grid for one court on one day, using the venue's operating hours. */
export async function buildSlots(courtId: string, dateISO: string): Promise<Slot[]> {
  await releaseExpiredHolds();

  const court = await db.query.courts.findFirst({
    where: eq(courts.id, courtId),
    with: { venue: true },
  });
  if (!court) return [];

  const openHour = Math.floor(toMinutes(court.venue.openTime) / 60);
  const closeHour = Math.ceil(toMinutes(court.venue.closeTime) / 60);

  const dayStart = wibSlotStart(dateISO, openHour);
  const dayEnd = wibSlotStart(dateISO, closeHour);

  const live = await db
    .select({
      startTime: bookings.startTime,
      endTime: bookings.endTime,
      status: bookings.status,
    })
    .from(bookings)
    .where(
      and(
        eq(bookings.courtId, courtId),
        inArray(bookings.status, ["pending_payment", "confirmed"]),
        lt(bookings.startTime, dayEnd),
        gt(bookings.endTime, dayStart),
      ),
    );

  const now = new Date();
  const slots: Slot[] = [];

  for (let h = openHour; h < closeHour; h++) {
    const start = wibSlotStart(dateISO, h);
    const end = new Date(start.getTime() + 60 * 60 * 1000);

    const hit = live.find((b) => b.startTime < end && b.endTime > start);
    let state: SlotState = "free";
    if (hit) state = hit.status === "confirmed" ? "taken" : "held";
    else if (start <= now) state = "past";

    slots.push({
      start: start.toISOString(),
      end: end.toISOString(),
      label: `${pad(h)}:00`,
      price: priceForSlot(court, start),
      state,
    });
  }

  return slots;
}

export class SlotTakenError extends Error {
  constructor() {
    super("Slot ini baru saja diambil orang lain. Pilih slot lain ya.");
  }
}

/**
 * Postgres raises SQLSTATE 23P01 (exclusion_violation) when `booking_no_overlap` rejects
 * an insert. Drizzle wraps the driver error, so the PostgresError — with its structured
 * `code` and `constraint_name` — sits on `cause`.
 */
type PgError = { code?: string; constraint_name?: string };

function isOverlapViolation(err: unknown): boolean {
  const pg = ((err as { cause?: PgError })?.cause ?? err) as PgError;
  return pg?.code === "23P01" && pg?.constraint_name === "booking_no_overlap";
}

type CreateBookingInput = {
  courtId: string;
  playerId: string | null;
  start: Date;
  end: Date;
  status?: "pending_payment" | "confirmed";
  source?: "online" | "walk_in" | "blocked";
  totalPrice?: number;
  guestName?: string | null;
  guestPhone?: string | null;
  note?: string | null;
};

/**
 * Creates a booking. Concurrency safety does not rely on a read-then-write check:
 * the `booking_no_overlap` exclusion constraint is the single source of truth, so two
 * simultaneous requests for the same slot can never both succeed.
 */
export async function createBooking(input: CreateBookingInput): Promise<Booking> {
  await releaseExpiredHolds();

  const court = await db.query.courts.findFirst({ where: eq(courts.id, input.courtId) });
  if (!court || !court.isActive) throw new Error("Court tidak ditemukan atau tidak aktif.");

  const status = input.status ?? "pending_payment";

  try {
    const [booking] = await db
      .insert(bookings)
      .values({
        courtId: input.courtId,
        playerId: input.playerId,
        startTime: input.start,
        endTime: input.end,
        status,
        source: input.source ?? "online",
        totalPrice: input.totalPrice ?? priceForSlot(court, input.start),
        holdExpiresAt:
          status === "pending_payment"
            ? new Date(Date.now() + HOLD_MINUTES * 60 * 1000)
            : null,
        guestName: input.guestName ?? null,
        guestPhone: input.guestPhone ?? null,
        note: input.note ?? null,
      })
      .returning();

    return booking;
  } catch (err) {
    if (isOverlapViolation(err)) throw new SlotTakenError();
    throw err;
  }
}
