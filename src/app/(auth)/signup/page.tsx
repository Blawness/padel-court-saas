import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { SignupForm } from "@/components/auth/signup-form";
import { Logo } from "@/components/site-header";
import { ThemeSwitch } from "@/components/theme-switch";
import { site } from "@/lib/site";

export const dynamic = "force-dynamic";

/**
 * Unlike /login this one is worth indexing: it's the landing page for an owner searching for
 * "aplikasi booking lapangan padel", and the free-trial pitch is the whole conversion.
 */
export const metadata: Metadata = {
  title: "Daftar Gratis",
  description:
    "Buat akun Padel Booking. Pemain bisa langsung booking lapangan; pemilik venue dapat 14 hari uji coba gratis untuk mengelola court, harga, dan pendapatan.",
  alternates: { canonical: "/signup" },
  openGraph: {
    title: `Daftar Gratis — ${site.name}`,
    description:
      "Pemain: booking lapangan padel dalam hitungan detik. Pemilik venue: 14 hari uji coba gratis.",
    url: "/signup",
  },
  twitter: {
    title: `Daftar Gratis — ${site.name}`,
    description:
      "Pemain: booking lapangan padel dalam hitungan detik. Pemilik venue: 14 hari uji coba gratis.",
  },
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const { role } = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect("/venues");

  const asOwner = role === "venue_owner";

  return (
    <main className="grid min-h-screen place-items-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-between">
          <Logo />
          <ThemeSwitch />
        </div>

        <div className="card glow-border p-7">
          <h1 className="font-display text-2xl font-extrabold">
            {asOwner ? "Daftarkan venue kamu" : "Daftar"}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {asOwner
              ? "Trial 14 hari, tanpa kartu kredit. Venue kamu tayang setelah diverifikasi admin."
              : "Booking lapangan padel dalam hitungan menit."}
          </p>

          <SignupForm defaultRole={asOwner ? "venue_owner" : "player"} />

          <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            Sudah punya akun?{" "}
            <Link href="/login" className="text-brand-600 font-semibold">
              Masuk
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
