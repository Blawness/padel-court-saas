import { redirect } from "next/navigation";
import { Building2, Users, Wallet, CalendarCheck } from "lucide-react";
import { asc, count, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { bookings, subscriptionPlans, subscriptions, users, venues } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { Logo } from "@/components/site-header";
import { ThemeSwitch } from "@/components/theme-switch";
import { LogoutButton } from "@/components/logout-button";
import { RevealOnScroll } from "@/components/reveal";
import { formatIDRShort } from "@/lib/format";
import { OwnerVerification } from "@/components/dashboard/owner-verification";
import { PlanManager } from "@/components/dashboard/plan-manager";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");
  if (user.role !== "super_admin") redirect(user.role === "venue_owner" ? "/owner" : "/venues");

  const [owners, plans, [venueCount], [confirmedCount]] = await Promise.all([
    db.query.users.findMany({
      where: eq(users.role, "venue_owner"),
      with: {
        venues: { columns: { id: true, name: true } },
        subscriptions: {
          orderBy: (s, { desc: d }) => d(s.createdAt),
          limit: 1,
          with: { plan: true },
        },
      },
      orderBy: desc(users.createdAt),
    }),
    db.query.subscriptionPlans.findMany({
      with: {
        subscriptions: {
          where: eq(subscriptions.status, "active"),
          columns: { id: true },
        },
      },
      orderBy: asc(subscriptionPlans.monthlyPrice),
    }),
    db.select({ n: count() }).from(venues),
    db.select({ n: count() }).from(bookings).where(eq(bookings.status, "confirmed")),
  ]);

  const mrr = plans.reduce((sum, p) => sum + p.subscriptions.length * p.monthlyPrice, 0);
  const activeOwners = owners.filter((o) =>
    o.subscriptions.some((s) => s.status === "active" || s.status === "trial"),
  ).length;

  return (
    <div className="min-h-screen">
      <RevealOnScroll />

      <header className="dark:bg-ink/80 sticky top-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur-xl dark:border-white/10">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Logo />
            <span className="chip chip-red">SuperAdmin</span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeSwitch />
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-6 py-8 lg:px-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi icon={Wallet} label="MRR" value={formatIDRShort(mrr)} hint="Langganan aktif" />
          <Kpi
            icon={Users}
            label="Owner Aktif"
            value={String(activeOwners)}
            hint={`${owners.length} total owner`}
          />
          <Kpi icon={Building2} label="Venue" value={String(venueCount.n)} hint="Terdaftar" />
          <Kpi
            icon={CalendarCheck}
            label="Booking Lunas"
            value={String(confirmedCount.n)}
            hint="Sepanjang waktu"
          />
        </div>

        <OwnerVerification
          owners={owners.map((o) => ({
            id: o.id,
            fullName: o.fullName,
            email: o.email,
            ownerStatus: o.ownerStatus,
            venueCount: o.venues.length,
            planName: o.subscriptions[0]?.plan.name ?? null,
            subStatus: o.subscriptions[0]?.status ?? null,
          }))}
        />

        <PlanManager
          plans={plans.map((p) => ({
            id: p.id,
            name: p.name,
            maxVenues: p.maxVenues,
            monthlyPrice: p.monthlyPrice,
            isActive: p.isActive,
            activeSubscribers: p.subscriptions.length,
          }))}
        />
      </main>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="reveal lift card rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
        <span className="bg-brand-100 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400 grid h-9 w-9 place-items-center rounded-lg">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="font-display mt-2 text-2xl font-extrabold">{value}</div>
      <div className="mt-1 text-xs text-gray-400">{hint}</div>
    </div>
  );
}
