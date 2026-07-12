/**
 * `ImageResponse` ships a single font — Noto Sans at weight 400 — so any `fontWeight` above
 * that is silently ignored and the mark renders thin and off-brand. This pulls the real
 * Plus Jakarta Sans (the same family the app loads through next/font) so the weights land.
 *
 * Called during prerender, so the fetch happens at build time, not per request. A failure
 * returns an empty list and satori falls back to Noto Sans: an off-brand image is a better
 * outcome than a failed build.
 */
export type OgFont = {
  name: string;
  data: ArrayBuffer;
  weight: 400 | 800;
  style: "normal";
};

async function load(weight: 400 | 800): Promise<OgFont | null> {
  try {
    const css = await fetch(
      `https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@${weight}`,
      // Google serves woff2 — which satori can't parse — unless the UA looks like an old browser.
      { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 6.1; rv:1.0) Gecko/20100101" } },
    ).then((r) => r.text());

    const url = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
    if (!url) return null;

    const data = await fetch(url).then((r) => r.arrayBuffer());
    return { name: "Jakarta", data, weight, style: "normal" };
  } catch (err) {
    console.error(`[og] gagal memuat font Plus Jakarta Sans ${weight}:`, err);
    return null;
  }
}

/** The font family name to pass to `fontFamily`, given whatever loaded. */
export const OG_FONT_FAMILY = "Jakarta";

export async function ogFonts(...weights: (400 | 800)[]): Promise<OgFont[]> {
  const loaded = await Promise.all(weights.map(load));
  return loaded.filter((f): f is OgFont => f !== null);
}
