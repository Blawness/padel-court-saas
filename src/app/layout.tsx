import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Sora } from "next/font/google";
import { Providers } from "@/components/providers";
import { ScrollProgress } from "@/components/scroll-progress";
import { Toaster } from "@/components/toaster";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  weight: ["400", "500", "600", "700", "800"],
});

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  weight: ["600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Padel Booking — Booking lapangan padel real-time",
  description:
    "Cari venue padel, lihat slot kosong real-time, booking dan bayar online. Untuk pemilik venue: kelola court, harga, dan pendapatan dalam satu dashboard.",
};

/** Applies the saved theme before first paint so dark mode never flashes. */
const themeScript = `try{var d=localStorage.getItem('pb-theme')==='dark';document.documentElement.classList.toggle('dark',d)}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className={`${jakarta.variable} ${sora.variable} dark:bg-ink bg-gray-50 text-gray-900 antialiased transition-colors dark:text-gray-100`}
      >
        <ScrollProgress />
        <Providers>{children}</Providers>
        <Toaster />
      </body>
    </html>
  );
}
