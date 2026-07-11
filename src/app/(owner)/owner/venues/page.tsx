import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { courts, venues as venuesTable } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { getOwnerSubscription, isSubscriptionActive } from "@/lib/subscription";
import { parsePeakRules } from "@/lib/booking";
import { VenueManager } from "@/components/dashboard/venue-manager";

export const dynamic = "force-dynamic";

export default async function OwnerVenuesPage() {
  const user = await requireUser("venue_owner");
  const subscription = await getOwnerSubscription(user.id);

  const venues = await db.query.venues.findMany({
    where: eq(venuesTable.ownerId, user.id),
    with: { courts: { orderBy: asc(courts.name) } },
    orderBy: asc(venuesTable.createdAt),
  });

  return (
    <VenueManager
      canWrite={isSubscriptionActive(subscription)}
      maxVenues={subscription?.plan.maxVenues ?? 0}
      planName={subscription?.plan.name ?? "—"}
      venues={venues.map((v) => ({
        id: v.id,
        name: v.name,
        city: v.city,
        address: v.address,
        openTime: v.openTime,
        closeTime: v.closeTime,
        courts: v.courts.map((c) => ({
          id: c.id,
          name: c.name,
          pricePerHour: c.pricePerHour,
          isActive: c.isActive,
          peak: parsePeakRules(c.peakPriceOverride),
        })),
      }))}
    />
  );
}
