import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isGoogleConfigured } from "@/lib/env";
import { LoginForm } from "@/components/auth/login-form";
import { Logo } from "@/components/site-header";
import { ThemeSwitch } from "@/components/theme-switch";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Masuk",
  description: "Masuk ke akun Padel Booking untuk booking lapangan dan mengelola jadwal mainmu.",
  alternates: { canonical: "/login" },
  // Nothing to rank for here, and the page redirects once you're signed in.
  robots: { index: false, follow: true },
};

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

          {error ? (
            <p className="chip chip-red mt-4 w-full justify-center py-2">
              Login gagal. Coba lagi.
            </p>
          ) : null}

          <LoginForm googleEnabled={isGoogleConfigured} next={next ?? null} />

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
