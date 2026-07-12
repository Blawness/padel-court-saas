import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { bookings as bookingsTable } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { SiteHeader } from "@/components/site-header";
import { RevealOnScroll } from "@/components/reveal";
import { ProfileTabs } from "@/components/booking/profile-tabs";
import { privatePage } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata = privatePage("Booking Saya");

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/profile");
  if (user.role === "venue_owner") redirect("/owner");
  if (user.role === "super_admin") redirect("/admin");

  const bookings = await db.query.bookings.findMany({
    where: eq(bookingsTable.playerId, user.id),
    with: { court: { with: { venue: true } } },
    orderBy: desc(bookingsTable.startTime),
  });

  const now = new Date();
  const upcoming = bookings
    .filter(
      (b) =>
        b.startTime > now && (b.status === "confirmed" || b.status === "pending_payment"),
    )
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  const past = bookings.filter((b) => !upcoming.includes(b));

  const hoursPlayed = bookings.filter((b) => b.status === "confirmed").length;

  const view = (b: (typeof bookings)[number]) => ({
    id: b.id,
    venueName: b.court.venue.name,
    venuePhone: b.court.venue.address,
    courtName: b.court.name,
    startTime: b.startTime.toISOString(),
    endTime: b.endTime.toISOString(),
    status: b.status,
    totalPrice: b.totalPrice,
  });

  return (
    <>
      <RevealOnScroll />
      <SiteHeader user={user} />

      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="reveal card flex flex-col items-center gap-5 p-6 sm:flex-row">
          <div className="aurora font-display grid h-20 w-20 place-items-center rounded-2xl text-3xl font-extrabold text-white">
            {user.fullName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h1 className="font-display text-2xl font-extrabold">{user.fullName}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {user.email}
              {user.phone ? ` · ${user.phone}` : ""}
            </p>
            <div className="mt-2 flex flex-wrap justify-center gap-2 sm:justify-start">
              <span className="chip chip-green">Akun aktif</span>
              <span className="chip chip-blue">Pemain</span>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-4">
          <Stat value={bookings.length} label="Total Booking" />
          <Stat value={upcoming.length} label="Akan Datang" />
          <Stat value={hoursPlayed} label="Jam Main" />
        </div>

        <ProfileTabs upcoming={upcoming.map(view)} past={past.map(view)} />
      </main>
    </>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="reveal lift card p-5 text-center">
      <div className="font-display text-brand-600 dark:text-brand-400 text-3xl font-extrabold">
        {value}
      </div>
      <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{label}</div>
    </div>
  );
}
