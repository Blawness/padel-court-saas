import { appUrl } from "@/lib/env";

/**
 * One source of truth for everything a crawler or a social card reads. Metadata, the sitemap,
 * robots.txt, the manifest and the JSON-LD all derive from here, so the product name and copy
 * can never drift apart between the tab title and the share preview.
 */
export const site = {
  name: "Padel Booking",
  /** Used in the title template, so keep it short — it is appended to every page title. */
  shortName: "Padel Booking",
  url: appUrl,
  tagline: "Booking lapangan padel real-time",
  description:
    "Cari venue padel di kotamu, lihat slot kosong secara real-time, lalu booking dan bayar online dalam hitungan detik. Pemilik venue bisa mengelola court, harga peak-hour, dan pendapatan dari satu dashboard.",
  locale: "id_ID",
  /** Mirrors globals.css: --color-brand-600, --color-ink, and the `.aurora` gradient stops. */
  brand: "#16a34a",
  ink: "#0a0f0d",
  aurora: ["#22c55e", "#14b8a6", "#a3e635"],
  keywords: [
    "booking padel",
    "lapangan padel",
    "sewa lapangan padel",
    "padel Jakarta",
    "venue padel",
    "booking lapangan online",
    "padel court booking",
    "jadwal padel",
  ],
} as const;
