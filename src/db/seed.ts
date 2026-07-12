import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  accounts,
  bookings,
  courts,
  payments,
  sessions,
  subscriptionPlans,
  subscriptions,
  users,
  venues,
  verifications,
  type OwnerStatus,
  type Role,
} from "@/db/schema";
import { auth } from "@/lib/auth-config";

/** Every seeded account uses this password — demo only. */
const DEMO_PASSWORD = "padel1234";

/**
 * Creates a real Better Auth account (properly hashed password), then applies the role and
 * profile fields that signup is not allowed to set from user input.
 */
async function createUser(input: {
  email: string;
  fullName: string;
  role: Role;
  ownerStatus: OwnerStatus;
  phone?: string;
}) {
  await auth.api.signUpEmail({
    body: { email: input.email, password: DEMO_PASSWORD, name: input.fullName },
  });

  const [user] = await db
    .update(users)
    .set({ role: input.role, ownerStatus: input.ownerStatus, phone: input.phone })
    .where(eq(users.email, input.email))
    .returning();

  return user;
}

const HOUR = 60 * 60 * 1000;

/** `hour`:00 WIB, `dayOffset` days from today — independent of the seeding machine's timezone. */
function slot(dayOffset: number, hour: number): Date {
  const target = new Date(Date.now() + dayOffset * 24 * 60 * 60 * 1000);
  const dateKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(target);
  return new Date(`${dateKey}T${String(hour).padStart(2, "0")}:00:00+07:00`);
}

/**
 * The seed wipes every table before reloading demo data. That is fine against a local
 * database and catastrophic against the real one — and the local .env now points at Neon,
 * so a reflexive `pnpm db:seed` is one keystroke away from deleting production. Refuse
 * unless someone deliberately says otherwise.
 */
function assertSafeTarget(): void {
  const url = process.env.DATABASE_URL ?? "";
  const isLocal = url.includes("localhost") || url.includes("127.0.0.1");
  if (isLocal || process.env.SEED_ALLOW_REMOTE === "true") return;

  throw new Error(
    `Refusing to seed: DATABASE_URL is not a local database, and seeding DELETES every row ` +
      `(users, bookings, payments included).\n` +
      `If you really mean to wipe and reload it, re-run with SEED_ALLOW_REMOTE=true.`,
  );
}

async function main() {
  assertSafeTarget();
  console.info("Seeding…");

  // Reset in FK-safe order so the seed is re-runnable.
  await db.delete(payments);
  await db.delete(bookings);
  await db.delete(courts);
  await db.delete(venues);
  await db.delete(subscriptions);
  await db.delete(subscriptionPlans);
  await db.delete(sessions);
  await db.delete(accounts);
  await db.delete(verifications);
  await db.delete(users);

  const [basic, pro] = await db
    .insert(subscriptionPlans)
    .values([
      { name: "Basic", maxVenues: 1, monthlyPrice: 249_000 },
      { name: "Pro", maxVenues: 5, monthlyPrice: 499_000 },
    ])
    .returning();

  const admin = await createUser({
    email: "admin@padel.id",
    fullName: "Super Admin",
    role: "super_admin",
    ownerStatus: "approved",
  });

  const owner = await createUser({
    email: "budi@padelcentral.id",
    fullName: "Budi Santoso",
    role: "venue_owner",
    ownerStatus: "approved",
    phone: "+6281234567890",
  });

  // A second owner still awaiting verification, so the admin panel has something to act on.
  await createUser({
    email: "sari@smasharena.id",
    fullName: "Sari Wijaya",
    role: "venue_owner",
    ownerStatus: "pending",
    phone: "+6281298765432",
  });

  const periodEnd = new Date();
  periodEnd.setMonth(periodEnd.getMonth() + 1);
  const [ownerSub] = await db
    .insert(subscriptions)
    .values({
      ownerId: owner.id,
      planId: pro.id,
      status: "active",
      currentPeriodEnd: periodEnd,
    })
    .returning();

  // Six months of paid subscription cycles, so the admin MRR chart has a history to draw.
  for (let monthsAgo = 5; monthsAgo >= 0; monthsAgo--) {
    const paidAt = new Date();
    paidAt.setMonth(paidAt.getMonth() - monthsAgo);
    paidAt.setDate(3);

    await db.insert(payments).values({
      subscriptionId: ownerSub.id,
      midtransOrderId: `SUB-SEED-${paidAt.getFullYear()}${String(paidAt.getMonth() + 1).padStart(2, "0")}`,
      amount: pro.monthlyPrice,
      status: "success",
      paymentMethod: "bank_transfer",
      paidAt,
      createdAt: paidAt,
    });
  }

  const players = [];
  for (const p of [
    { email: "rina@email.com", fullName: "Rina Anjani", phone: "+6281211112222" },
    { email: "andi@email.com", fullName: "Andi Pratama", phone: "+6281233334444" },
    { email: "dedi@email.com", fullName: "Dedi Rahman", phone: "+6281255556666" },
  ]) {
    players.push(
      await createUser({ ...p, role: "player", ownerStatus: "approved" }),
    );
  }

  const [venue] = await db
    .insert(venues)
    .values({
      ownerId: owner.id,
      name: "Padel Central",
      city: "Jakarta Pusat",
      address: "Jl. Sudirman No. 12, Jakarta Pusat",
      openTime: "06:00",
      closeTime: "23:00",
      photos: [
        "https://images.unsplash.com/photo-1554068950-cb1da4204267?w=1000&h=400&fit=crop&q=80",
      ],
    })
    .returning();

  const courtRows = await db
    .insert(courts)
    .values(
      [1, 2, 3, 4].map((n) => ({
        venueId: venue.id,
        name: `Court ${n}`,
        pricePerHour: 150_000,
        // Evening peak: 17:00–22:00 costs more.
        peakPriceOverride: [{ start: "17:00", end: "22:00", price: 200_000 }],
      })),
    )
    .returning();

  // --- bookings ---
  const plan = [
    { court: courtRows[0], player: players[0], day: 0, hour: 9, status: "confirmed" as const },
    { court: courtRows[1], player: players[1], day: 0, hour: 18, status: "confirmed" as const },
    { court: courtRows[2], player: players[2], day: 1, hour: 10, status: "confirmed" as const },
    { court: courtRows[0], player: players[0], day: 1, hour: 19, status: "confirmed" as const },
    { court: courtRows[3], player: players[1], day: -3, hour: 20, status: "confirmed" as const },
    { court: courtRows[1], player: players[2], day: -6, hour: 8, status: "cancelled" as const },
  ];

  for (const b of plan) {
    const start = slot(b.day, b.hour);
    const price = b.hour >= 17 && b.hour < 22 ? 200_000 : 150_000;

    const [booking] = await db
      .insert(bookings)
      .values({
        courtId: b.court.id,
        playerId: b.player.id,
        startTime: start,
        endTime: new Date(start.getTime() + HOUR),
        status: b.status,
        totalPrice: price,
        source: "online",
      })
      .returning();

    if (b.status === "confirmed") {
      await db.insert(payments).values({
        bookingId: booking.id,
        midtransOrderId: `PB-SEED-${booking.id.slice(0, 8).toUpperCase()}`,
        amount: price,
        status: "success",
        paymentMethod: "qris",
        paidAt: new Date(),
      });
    }
  }

  // A walk-in and a maintenance block, so the owner dashboard shows both sources.
  const walkInStart = slot(0, 20);
  await db.insert(bookings).values({
    courtId: courtRows[3].id,
    startTime: walkInStart,
    endTime: new Date(walkInStart.getTime() + HOUR),
    status: "confirmed",
    source: "walk_in",
    totalPrice: 200_000,
    guestName: "Tamu Walk-in",
  });

  const blockStart = slot(1, 6);
  await db.insert(bookings).values({
    courtId: courtRows[2].id,
    startTime: blockStart,
    endTime: new Date(blockStart.getTime() + HOUR),
    status: "confirmed",
    source: "blocked",
    totalPrice: 0,
    note: "Perbaikan lampu",
  });

  console.info(`Seed selesai.
  Admin  : ${admin.email}
  Owner  : ${owner.email} (Pro, aktif)
  Pending: sari@smasharena.id (menunggu verifikasi)
  Players: ${players.map((p) => p.email).join(", ")}
  Venue  : ${venue.name} — ${courtRows.length} court
  Plans  : ${basic.name}, ${pro.name}
  Password semua akun: ${DEMO_PASSWORD}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
