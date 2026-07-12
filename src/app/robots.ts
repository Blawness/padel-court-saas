import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

/**
 * Public surface is the marketing page and the venue catalogue. Everything behind a login
 * (dashboards, a player's own bookings) and the payment hand-off pages are crawl-dead: they
 * need a session, so a crawler only ever sees a redirect, and letting them into the index
 * would spend crawl budget on nothing.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/owner", "/admin", "/profile", "/payment/"],
    },
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}
