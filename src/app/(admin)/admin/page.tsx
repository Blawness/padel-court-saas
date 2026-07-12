import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowBigUpDash,
  Building2,
  CalendarDays,
  LayoutDashboard,
  Receipt,
  TrendingUp,
  Undo2,
  Users,
  Wallet,
} from "lucide-react";
import { and, count, desc, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import { bookings, payments, subscriptions, users, venues } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { ThemeSwitch } from "@/components/theme-switch";
import { LogoutButton } from "@/components/logout-button";
import { RevealOnScroll } from "@/components/reveal";
import { formatIDRShort, toDateKey, wibSlotStart } from "@/lib/format";
import { OwnerVerification } from "@/components/dashboard/owner-verification";
import { PlanManager } from "@/components/dashboard/plan-manager";
import { privatePage } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata = privatePage("Admin");

const monthFmt = new Intl.DateTimeFormat("id-ID", { month: "short", timeZone: "Asia/Jakarta" });

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");
  if (user.role !== "super_admin") redirect(user.role === "venue_owner" ? "/owner" : "/venues");

  const todayKey = toDateKey(new Date());
  const startOfMonth = wibSlotStart(`${todayKey.slice(0, 7)}-01`, 0);

  // Six-month MRR history comes from successful subscription payments.
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  const [owners, plans, [venueCount], [monthBookings], allSubs] = await Promise.all([
    db.query.users.findMany({
      where: eq(users.role, "venue_owner"),
      with: {
        venues: { columns: { id: true, name: true, city: true } },
        subscriptions: {
          orderBy: (s, { desc: d }) => d(s.createdAt),
          limit: 1,
          with: { plan: true },
        },
      },
      orderBy: desc(users.createdAt),
    }),

    db.query.subscriptionPlans.findMany({
      with: { subscriptions: { columns: { status: true } } },
      orderBy: (p, { asc }) => asc(p.monthlyPrice),
    }),

    db.select({ n: count() }).from(venues),

    db
      .select({ n: count() })
      .from(bookings)
      .where(and(eq(bookings.status, "confirmed"), gte(bookings.startTime, startOfMonth))),

    db.select({ status: subscriptions.status }).from(subscriptions),
  ]);

  // Only subscription payments (not booking payments) count toward MRR history.
  const subPaymentRows = await db
    .select({ amount: payments.amount, createdAt: payments.createdAt })
    .from(payments)
    .innerJoin(subscriptions, eq(payments.subscriptionId, subscriptions.id))
    .where(and(eq(payments.status, "success"), gte(payments.createdAt, sixMonthsAgo)));

  const mrrSeries = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(sixMonthsAgo);
    d.setMonth(sixMonthsAgo.getMonth() + i);
    const key = toDateKey(d).slice(0, 7);
    const revenue = subPaymentRows
      .filter((p) => toDateKey(p.createdAt).slice(0, 7) === key)
      .reduce((sum, p) => sum + p.amount, 0);
    return { key, label: monthFmt.format(d), revenue };
  });

  const mrr = plans.reduce(
    (sum, p) => sum + p.subscriptions.filter((s) => s.status === "active").length * p.monthlyPrice,
    0,
  );

  const activeSubs = allSubs.filter((s) => s.status === "active").length;
  const trialSubs = allSubs.filter((s) => s.status === "trial").length;
  const conversion = allSubs.length ? Math.round((activeSubs / allSubs.length) * 100) : 0;

  const totalSubscribers = plans.reduce(
    (sum, p) => sum + p.subscriptions.filter((s) => s.status !== "cancelled").length,
    0,
  );

  return (
    <div className="shell">
      <RevealOnScroll />

      {/* SIDEBAR */}
      <aside className="side border-r border-white/10 bg-gray-900 p-5 text-gray-300">
        <Link href="/" className="mb-8 flex items-center gap-2.5">
          <span className="aurora grid h-10 w-10 place-items-center rounded-xl text-xl font-black text-white">
            P
          </span>
          <span className="font-display text-xl font-extrabold text-white">
            Padel<span className="text-brand-400">Admin</span>
          </span>
        </Link>

        <div className="mb-2 text-xs font-semibold tracking-wider text-gray-500 uppercase">
          Platform
        </div>
        <nav className="space-y-1">
          <span className="nav-item active">
            <LayoutDashboard className="h-4 w-4" /> Overview
          </span>
          <a href="#owners" className="nav-item">
            <Users className="h-4 w-4" /> Owner Venue
          </a>
          <a href="#plans" className="nav-item">
            <Receipt className="h-4 w-4" /> Subscription Plan
          </a>
          <a href="#mrr" className="nav-item">
            <TrendingUp className="h-4 w-4" /> Analytics
          </a>
        </nav>

        <Link href="/" className="nav-item mt-6 border-t border-white/10 pt-4">
          <Undo2 className="h-4 w-4" /> Ke Situs Publik
        </Link>
        <div className="mt-2">
          <LogoutButton label="Keluar" />
        </div>
      </aside>

      <div className="min-w-0">
        {/* HEADER */}
        <header className="dark:bg-ink/80 sticky top-0 z-40 border-b border-gray-100 bg-white/80 backdrop-blur-xl dark:border-white/10">
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <h1 className="font-display text-xl font-extrabold">Platform Overview</h1>
              <p className="text-xs text-gray-400">Kesehatan platform & metrik bisnis real-time.</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="chip chip-green">
                <span className="pdot h-1.5 w-1.5 rounded-full bg-green-500" /> Live
              </span>
              <ThemeSwitch />
              <span className="from-brand-500 grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br to-teal-500 font-bold text-white">
                SA
              </span>
            </div>
          </div>
        </header>

        <main className="space-y-6 p-6">
          {/* KPIs */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi
              icon={Wallet}
              tone="brand"
              label="MRR"
              value={formatIDRShort(mrr)}
              hint={`${activeSubs} langganan aktif`}
            />
            <Kpi
              icon={Building2}
              tone="blue"
              label="Venue Aktif"
              value={String(venueCount.n)}
              hint={`${owners.length} owner terdaftar`}
            />
            <Kpi
              icon={ArrowBigUpDash}
              tone="purple"
              label="Trial → Paid"
              value={`${conversion}%`}
              hint={`${trialSubs} masih trial`}
            />
            <Kpi
              icon={CalendarDays}
              tone="amber"
              label="Total Booking"
              value={String(monthBookings.n)}
              hint="Bulan ini"
            />
          </div>

          <div id="mrr" className="grid gap-6 lg:grid-cols-3">
            {/* MRR growth */}
            <div className="reveal card rounded-2xl p-5 lg:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-bold">Pertumbuhan MRR</h2>
                <span className="text-xs text-gray-400">6 bulan terakhir</span>
              </div>

              <div className="flex h-56 items-end gap-3">
                {mrrSeries.map((m) => {
                  const max = Math.max(...mrrSeries.map((x) => x.revenue), 1);
                  return (
                    <div key={m.key} className="flex h-full flex-1 flex-col items-center gap-2">
                      {/* Track needs a definite height or the bar's `height: %` resolves to 0. */}
                      <div className="relative w-full flex-1">
                        <div
                          className="bar bg-brand-500 absolute bottom-0 w-full"
                          style={{ height: `${Math.max((m.revenue / max) * 100, 2)}%` }}
                          title={formatIDRShort(m.revenue)}
                        />
                      </div>
                      <span className="text-[10px] text-gray-400">{m.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* plan distribution */}
            <div className="reveal d1 card rounded-2xl p-5">
              <h2 className="mb-4 font-bold">Distribusi Plan</h2>
              <div className="space-y-3">
                {plans.map((p, i) => {
                  const subscribers = p.subscriptions.filter((s) => s.status !== "cancelled").length;
                  const pct = totalSubscribers
                    ? Math.round((subscribers / totalSubscribers) * 100)
                    : 0;
                  const colors = ["bg-brand-500", "bg-teal-500", "bg-amber-500"];
                  return (
                    <div key={p.id}>
                      <div className="flex items-center justify-between text-sm">
                        <span>{p.name}</span>
                        <span className="font-semibold">{subscribers}</span>
                      </div>
                      <div className="mt-1 h-2 rounded-full bg-gray-100 dark:bg-white/10">
                        <div
                          className={`h-full rounded-full ${colors[i % colors.length]}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}

                <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4 text-sm dark:border-white/10">
                  <span className="text-gray-500 dark:text-gray-400">Dalam trial</span>
                  <span className="font-semibold text-amber-600">{trialSubs}</span>
                </div>
              </div>
            </div>
          </div>

          <div id="owners">
            <OwnerVerification
              owners={owners.map((o) => ({
                id: o.id,
                fullName: o.fullName,
                email: o.email,
                ownerStatus: o.ownerStatus,
                venueName: o.venues[0]?.name ?? null,
                venueCount: o.venues.length,
                city: o.venues[0]?.city ?? null,
                createdAt: o.createdAt.toISOString(),
                planName: o.subscriptions[0]?.plan.name ?? null,
                subStatus: o.subscriptions[0]?.status ?? null,
              }))}
            />
          </div>

          <div id="plans">
            <PlanManager
              plans={plans.map((p) => ({
                id: p.id,
                name: p.name,
                maxVenues: p.maxVenues,
                monthlyPrice: p.monthlyPrice,
                isActive: p.isActive,
                activeSubscribers: p.subscriptions.filter((s) => s.status === "active").length,
              }))}
            />
          </div>
        </main>
      </div>
    </div>
  );
}

const tones = {
  brand: "bg-brand-100 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400",
  blue: "bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400",
  purple: "bg-purple-100 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400",
  amber: "bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400",
} as const;

function Kpi({
  icon: Icon,
  tone,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tone: keyof typeof tones;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="reveal lift card rounded-2xl p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
        <span className={`grid h-9 w-9 place-items-center rounded-lg ${tones[tone]}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="font-display mt-2 text-2xl font-extrabold">{value}</div>
      <div className="mt-1 text-xs text-gray-400">{hint}</div>
    </div>
  );
}
