import { and, count, eq, gt, inArray, lt } from "drizzle-orm";
import { db } from "@/db";
import {
  bookings,
  courts,
  type Booking,
  type Court,
  type PeakRule,
  type Venue,
} from "@/db/schema";
import { FREE_CANCEL_HOURS, HOLD_MINUTES } from "@/lib/env";
import { jakartaHour, wibSlotStart } from "@/lib/format";

export type { PeakRule };

/** Carries the HTTP status the route should answer with. */
export class CancelNotAllowedError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/** Who is asking to cancel, relative to the booking. A user can be more than one of these. */
export type CancelActor = { isPlayer: boolean; isOwner: boolean; isAdmin: boolean };

/**
 * Cancellation policy (PRD §10 decision): a player cancels free up to 2 hours before the
 * slot starts. The venue owner and super_admin are not bound by that window — they cancel
 * for maintenance or to issue a refund, which must stay possible right up to the slot.
 */
export function assertCancellable(
  booking: Pick<Booking, "status" | "startTime">,
  actor: CancelActor,
  now: Date = new Date(),
): void {
  if (!actor.isPlayer && !actor.isOwner && !actor.isAdmin) {
    throw new CancelNotAllowedError("Bukan booking kamu.", 403);
  }

  if (booking.status === "cancelled" || booking.status === "expired") {
    throw new CancelNotAllowedError("Booking ini sudah tidak aktif.", 409);
  }

  const playerOnly = actor.isPlayer && !actor.isOwner && !actor.isAdmin;
  if (!playerOnly) return;

  const hoursLeft = (booking.startTime.getTime() - now.getTime()) / 3_600_000;
  if (hoursLeft < FREE_CANCEL_HOURS) {
    throw new CancelNotAllowedError(
      `Pembatalan gratis hanya sampai ${FREE_CANCEL_HOURS} jam sebelum jadwal main. Hubungi venue lewat WhatsApp untuk pembatalan darurat.`,
      403,
    );
  }
}

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
 * The bookable hour range for a venue. A slot is one whole hour, so a venue that opens at
 * 06:30 has its first slot at 06:00 and one that closes at 22:30 has its last at 22:00.
 */
export function openCloseHours(venue: Pick<Venue, "openTime" | "closeTime">): {
  openHour: number;
  closeHour: number;
} {
  return {
    openHour: Math.floor(toMinutes(venue.openTime) / 60),
    closeHour: Math.ceil(toMinutes(venue.closeTime) / 60),
  };
}

export class InvalidSlotError extends Error {}

/**
 * A slot is only bookable if it starts exactly on the hour and falls inside the venue's
 * operating hours. Nothing upstream enforces this — the API takes a raw ISO timestamp — so
 * without this check a crafted request could book 03:17 on a venue that opens at 06:00, and
 * the resulting booking would never line up with the hourly grid the calendar renders.
 */
export function assertBookableSlot(
  venue: Pick<Venue, "openTime" | "closeTime">,
  start: Date,
): void {
  if (Number.isNaN(start.getTime())) {
    throw new InvalidSlotError("Waktu mulai tidak valid.");
  }
  // WIB is a whole-hour offset from UTC, so an exact WIB hour is an exact UTC hour too.
  if (start.getUTCMinutes() !== 0 || start.getUTCSeconds() !== 0 || start.getUTCMilliseconds() !== 0) {
    throw new InvalidSlotError("Booking hanya bisa pas di awal jam (mis. 19:00).");
  }

  const { openHour, closeHour } = openCloseHours(venue);
  const hour = jakartaHour(start);
  if (hour < openHour || hour >= closeHour) {
    throw new InvalidSlotError(
      `Venue hanya buka ${venue.openTime}–${venue.closeTime}. Pilih slot di dalam jam operasional.`,
    );
  }
}

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

  const { openHour, closeHour } = openCloseHours(court.venue);

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

/**
 * Court and Venue both cascade-delete their bookings, so deleting one silently destroys
 * paid future reservations — the players would just show up to nothing. Callers use this to
 * refuse the delete until those bookings are cancelled (and refunded) explicitly.
 */
export async function countFutureConfirmedBookings(
  target: { courtId: string } | { venueId: string },
): Promise<number> {
  const scope =
    "courtId" in target
      ? eq(bookings.courtId, target.courtId)
      : inArray(
          bookings.courtId,
          db.select({ id: courts.id }).from(courts).where(eq(courts.venueId, target.venueId)),
        );

  const [row] = await db
    .select({ total: count() })
    .from(bookings)
    .where(and(scope, eq(bookings.status, "confirmed"), gt(bookings.startTime, new Date())));

  return row?.total ?? 0;
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

  const court = await db.query.courts.findFirst({
    where: eq(courts.id, input.courtId),
    with: { venue: { with: { owner: { columns: { ownerStatus: true } } } } },
  });
  if (!court || !court.isActive) throw new InvalidSlotError("Court tidak ditemukan atau tidak aktif.");

  const source = input.source ?? "online";

  // The venue list already hides unapproved owners, but the booking endpoint takes a court id
  // directly, so a player could otherwise book a venue that never passed admin review.
  if (source === "online" && court.venue.owner.ownerStatus !== "approved") {
    throw new InvalidSlotError("Venue ini belum aktif untuk booking online.");
  }

  assertBookableSlot(court.venue, input.start);

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
        source,
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
