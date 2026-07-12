import type { Metadata } from "next";

/**
 * Metadata for a page that lives behind a login. A crawler hitting one of these only ever
 * gets a redirect to /login, so keeping them out of the index costs nothing and avoids
 * "soft 404" noise in Search Console. robots.txt already discourages the crawl; this is the
 * belt-and-braces header for anything that gets linked directly.
 */
export function privatePage(title: string): Metadata {
  return {
    title,
    robots: { index: false, follow: false, nocache: true },
  };
}
