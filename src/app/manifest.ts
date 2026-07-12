import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

/**
 * Players book from their phone at the court, so the app should install to the home screen
 * cleanly. `start_url` points at the venue list rather than the marketing page — someone who
 * installed the app has already been sold on it.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${site.name} — ${site.tagline}`,
    short_name: site.shortName,
    description: site.description,
    start_url: "/venues",
    display: "standalone",
    background_color: site.ink,
    theme_color: site.brand,
    lang: "id",
    categories: ["sports", "lifestyle"],
    icons: [
      { src: "/icon", sizes: "32x32", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
