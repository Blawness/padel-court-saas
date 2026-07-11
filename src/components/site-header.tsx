import Link from "next/link";
import { User as UserIcon } from "lucide-react";
import type { User } from "@/db/schema";
import { ThemeSwitch } from "@/components/theme-switch";
import { LogoutButton } from "@/components/logout-button";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span className="aurora grid h-9 w-9 place-items-center rounded-xl text-lg font-black text-white">
        P
      </span>
      <span className="gtext font-display text-lg font-extrabold">Padel Booking</span>
    </Link>
  );
}

/** Header for public + player pages. */
export function SiteHeader({ user }: { user: User | null }) {
  const homeForRole =
    user?.role === "venue_owner" ? "/owner" : user?.role === "super_admin" ? "/admin" : "/venues";

  return (
    <header className="dark:bg-ink/80 sticky top-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur-xl dark:border-white/10">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-8">
        <Logo />
        <div className="flex items-center gap-3">
          <Link
            href="/venues"
            className="hover:bg-brand-50 text-brand-700 dark:text-brand-300 rounded-lg px-4 py-2 text-sm font-semibold transition dark:hover:bg-white/5"
          >
            Cari Venue
          </Link>

          {user ? (
            <>
              <Link
                href={homeForRole}
                title={user.fullName}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 transition hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10"
              >
                <UserIcon className="h-4 w-4 text-gray-600 dark:text-gray-300" />
              </Link>
              <LogoutButton />
            </>
          ) : (
            <Link href="/login" className="btn-primary">
              Masuk
            </Link>
          )}

          <ThemeSwitch />
        </div>
      </div>
    </header>
  );
}
