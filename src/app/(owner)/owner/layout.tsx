import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getOwnerSubscription, isSubscriptionActive } from "@/lib/subscription";
import { OwnerNav } from "@/components/dashboard/owner-nav";
import { Logo } from "@/components/site-header";
import { ThemeSwitch } from "@/components/theme-switch";
import { LogoutButton } from "@/components/logout-button";
import { RevealOnScroll } from "@/components/reveal";
import { SubscriptionStatusChip } from "@/components/status-chip";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/owner");
  if (user.role !== "venue_owner") redirect(user.role === "super_admin" ? "/admin" : "/venues");

  const subscription = await getOwnerSubscription(user.id);
  const active = isSubscriptionActive(subscription);

  return (
    <div className="shell">
      <RevealOnScroll />

      <aside className="side dark:bg-panel-deep border-r border-gray-100 bg-white p-5 dark:border-white/10">
        <div className="mb-8">
          <Logo />
        </div>

        <OwnerNav />

        <div
          className={`mt-8 rounded-2xl p-4 text-white ${
            active ? "from-brand-500 bg-gradient-to-br to-teal-500" : "bg-gray-800"
          }`}
        >
          <div className="flex items-center gap-2 text-sm font-semibold">
            {subscription ? (
              <>
                Paket {subscription.plan.name}
                <SubscriptionStatusChip status={subscription.status} />
              </>
            ) : (
              "Belum ada paket"
            )}
          </div>
          {subscription ? (
            <p className="mt-1 text-xs opacity-90">
              {active
                ? `Berlaku s.d. ${formatDate(subscription.currentPeriodEnd)}`
                : "Perpanjang untuk membuka kembali perubahan data."}
            </p>
          ) : null}
          <Link
            href="/owner/subscription"
            className="mt-3 block rounded-lg bg-white/20 py-1.5 text-center text-xs font-bold backdrop-blur transition hover:bg-white/30"
          >
            Kelola langganan
          </Link>
        </div>

        {user.ownerStatus !== "approved" ? (
          <p className="chip chip-amber mt-3 w-full justify-center py-2 text-center">
            {user.ownerStatus === "pending" ? "Menunggu verifikasi admin" : "Akun disuspend"}
          </p>
        ) : null}

        <div className="mt-2">
          <LogoutButton label="Keluar" />
        </div>
      </aside>

      <div className="min-w-0">
        <header className="dark:bg-ink/80 sticky top-0 z-40 border-b border-gray-100 bg-white/80 backdrop-blur-xl dark:border-white/10">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="min-w-0">
              <h1 className="font-display truncate text-xl font-extrabold">
                Halo {user.fullName.split(" ")[0]} 👋
              </h1>
              <p className="text-xs text-gray-400">Kelola venue, booking, dan pendapatanmu.</p>
            </div>
            <ThemeSwitch />
          </div>
        </header>

        {!active ? (
          <div className="mx-6 mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-500/30 dark:bg-amber-500/10">
            <b>Langganan tidak aktif.</b> Kamu masih bisa melihat data dan booking yang berjalan,
            tapi menambah/mengubah venue, court, dan harga terkunci sampai langganan diperpanjang.{" "}
            <Link href="/owner/subscription" className="text-brand-600 font-semibold underline">
              Perpanjang sekarang
            </Link>
          </div>
        ) : null}

        <main className="space-y-6 p-6">{children}</main>
      </div>
    </div>
  );
}
