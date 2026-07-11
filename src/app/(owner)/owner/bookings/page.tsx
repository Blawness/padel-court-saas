import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { courts, venues as venuesTable } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { getOwnerSubscription, isSubscriptionActive } from "@/lib/subscription";
import { BookingsManager } from "@/components/dashboard/bookings-manager";

export const dynamic = "force-dynamic";

export default async function OwnerBookingsPage() {
  const user = await requireUser("venue_owner");
  const subscription = await getOwnerSubscription(user.id);

  const venues = await db.query.venues.findMany({
    where: eq(venuesTable.ownerId, user.id),
    with: { courts: { where: eq(courts.isActive, true), orderBy: asc(courts.name) } },
    orderBy: asc(venuesTable.name),
  });

  return (
    <BookingsManager
      canWrite={isSubscriptionActive(subscription)}
      venues={venues.map((v) => ({
        id: v.id,
        name: v.name,
        courts: v.courts.map((c) => ({ id: c.id, name: c.name })),
      }))}
    />
  );
}
