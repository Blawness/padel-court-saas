import Link from "next/link";
import { redirect } from "next/navigation";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { isDevLoginEnabled, isSupabaseConfigured } from "@/lib/env";
import { LoginForm } from "@/components/auth/login-form";
import { Logo } from "@/components/site-header";
import { ThemeSwitch } from "@/components/theme-switch";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;

  const user = await getCurrentUser();
  if (user) {
    redirect(
      user.role === "venue_owner" ? "/owner" : user.role === "super_admin" ? "/admin" : "/venues",
    );
  }

  // In dev mode there are no passwords — offer the seeded accounts as one-click logins.
  const devAccounts = !isDevLoginEnabled
    ? []
    : await db.query.users.findMany({
        columns: { email: true, fullName: true, role: true },
        orderBy: asc(users.role),
        limit: 10,
      });

  return (
    <main className="grid min-h-screen place-items-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-between">
          <Logo />
          <ThemeSwitch />
        </div>

        <div className="card glow-border p-7">
          <h1 className="font-display text-2xl font-extrabold">Masuk</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Booking lapangan, kelola venue, semua di satu akun.
          </p>

          {error === "oauth" ? (
            <p className="chip chip-red mt-4 w-full justify-center py-2">
              Login Google gagal. Coba lagi.
            </p>
          ) : null}

          {!isSupabaseConfigured && !isDevLoginEnabled ? (
            <p className="chip chip-amber mt-4 w-full justify-center py-2 text-center">
              Auth belum dikonfigurasi. Set Supabase, atau ALLOW_DEV_LOGIN untuk demo.
            </p>
          ) : null}

          <LoginForm
            supabaseEnabled={isSupabaseConfigured}
            devAccounts={devAccounts}
            next={next ?? null}
          />

          <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            Belum punya akun?{" "}
            <Link href="/signup" className="text-brand-600 font-semibold">
              Daftar
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
