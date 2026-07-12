import { ImageResponse } from "next/og";
import { OG_FONT_FAMILY, ogFonts } from "@/lib/og-font";
import { site } from "@/lib/site";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/**
 * The favicon, generated rather than checked in as a binary so it stays in step with the
 * brand colours in globals.css. Same mark as the header logo: a heavy white "P" on the
 * aurora gradient. At 32px the gradient reads as a single green, which is the point.
 */
export default async function Icon() {
  const fonts = await ogFonts(800);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: `linear-gradient(120deg, ${site.aurora[0]}, ${site.aurora[1]}, ${site.aurora[2]})`,
          color: "white",
          fontSize: 22,
          fontWeight: 800,
          fontFamily: fonts.length ? OG_FONT_FAMILY : "sans-serif",
          borderRadius: 7,
        }}
      >
        P
      </div>
    ),
    { ...size, ...(fonts.length ? { fonts } : {}) },
  );
}
