import { and, asc, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import { bookings, courts, venues as venuesTable } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { getOwnerSubscription, isSubscriptionActive } from "@/lib/subscription";
import { parsePeakRules } from "@/lib/booking";
import { toDateKey, wibSlotStart } from "@/lib/format";
import { isBlobConfigured } from "@/lib/env";
import { VenueManager } from "@/components/dashboard/venue-manager";

export const dynamic = "force-dynamic";

const WEEK_DAYS = 7;

export default async function OwnerVenuesPage() {
  const user = await requireUser("venue_owner");
  const subscription = await getOwnerSubscription(user.id);

  const rows = await db.query.venues.findMany({
    where: eq(venuesTable.ownerId, user.id),
    with: { courts: { orderBy: asc(courts.name) } },
    orderBy: asc(venuesTable.createdAt),
  });

  // Occupancy per court over the last 7 days = confirmed bookings / sellable court-hours.
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - (WEEK_DAYS - 1));
  const since = wibSlotStart(toDateKey(weekStart), 0);

  const weekBookings = await db
    .select({ courtId: bookings.courtId })
    .from(bookings)
    .innerJoin(courts, eq(bookings.courtId, courts.id))
    .innerJoin(venuesTable, eq(courts.venueId, venuesTable.id))
    .where(
      and(
        eq(venuesTable.ownerId, user.id),
        eq(bookings.status, "confirmed"),
        gte(bookings.startTime, since),
      ),
    );

  const bookedPerCourt = new Map<string, number>();
  for (const b of weekBookings) {
    bookedPerCourt.set(b.courtId, (bookedPerCourt.get(b.courtId) ?? 0) + 1);
  }

  return (
    <VenueManager
      blobEnabled={isBlobConfigured}
      canWrite={isSubscriptionActive(subscription)}
      maxVenues={subscription?.plan.maxVenues ?? 0}
      planName={subscription?.plan.name ?? "—"}
      venues={rows.map((v) => {
        const openHour = Number(v.openTime.split(":")[0]);
        const closeHour = Number(v.closeTime.split(":")[0]);
        const capacity = Math.max(closeHour - openHour, 1) * WEEK_DAYS;
        const prices = v.courts.map((c) => c.pricePerHour);

        return {
          id: v.id,
          name: v.name,
          city: v.city,
          address: v.address,
          openTime: v.openTime,
          closeTime: v.closeTime,
          photo: v.photos[0] ?? null,
          avgPrice: prices.length
            ? Math.round(prices.reduce((s, p) => s + p, 0) / prices.length)
            : 0,
          courts: v.courts.map((c) => {
            const peak = parsePeakRules(c.peakPriceOverride);
            return {
              id: c.id,
              name: c.name,
              pricePerHour: c.pricePerHour,
              isActive: c.isActive,
              peak,
              occupancy: c.isActive
                ? Math.min(Math.round(((bookedPerCourt.get(c.id) ?? 0) / capacity) * 100), 100)
                : null,
            };
          }),
        };
      })}
    />
  );
}
