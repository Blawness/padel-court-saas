import { ImageResponse } from "next/og";
import { OG_FONT_FAMILY, ogFonts } from "@/lib/og-font";
import { site } from "@/lib/site";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/**
 * iOS home-screen icon. Apple applies its own rounding and composites any transparency onto
 * black, so this draws a full-bleed opaque tile rather than a rounded one.
 */
export default async function AppleIcon() {
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
          fontSize: 112,
          fontWeight: 800,
          fontFamily: fonts.length ? OG_FONT_FAMILY : "sans-serif",
        }}
      >
        P
      </div>
    ),
    { ...size, ...(fonts.length ? { fonts } : {}) },
  );
}
