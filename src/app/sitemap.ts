import type { MetadataRoute } from "next";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { users, venues } from "@/db/schema";
import { site } from "@/lib/site";

/** Rebuilt hourly: new venues should be discoverable without waiting for a deploy. */
export const revalidate = 3600;

const staticRoutes: MetadataRoute.Sitemap = [
  { url: site.url, changeFrequency: "weekly", priority: 1 },
  { url: `${site.url}/venues`, changeFrequency: "daily", priority: 0.9 },
  { url: `${site.url}/signup`, changeFrequency: "monthly", priority: 0.5 },
  { url: `${site.url}/login`, changeFrequency: "monthly", priority: 0.3 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    // Same visibility rule the venue list enforces: an unapproved owner's venue isn't public,
    // so submitting it would hand Google a page players can't reach.
    const rows = await db
      .select({ id: venues.id, updatedAt: venues.updatedAt })
      .from(venues)
      .innerJoin(users, eq(venues.ownerId, users.id))
      .where(eq(users.ownerStatus, "approved"))
      .orderBy(asc(venues.createdAt));

    return [
      ...staticRoutes,
      ...rows.map((v) => ({
        url: `${site.url}/venues/${v.id}`,
        lastModified: v.updatedAt,
        changeFrequency: "daily" as const,
        priority: 0.8,
      })),
    ];
  } catch (err) {
    // The sitemap is prerendered at build time. A build without database access (a preview
    // env missing DATABASE_URL, say) should still ship a valid sitemap rather than fail.
    console.error("[sitemap] gagal memuat venue, hanya rute statis yang disertakan:", err);
    return staticRoutes;
  }
}
