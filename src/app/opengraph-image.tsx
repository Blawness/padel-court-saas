import { ImageResponse } from "next/og";
import { OG_FONT_FAMILY, ogFonts } from "@/lib/og-font";
import { site } from "@/lib/site";

export const alt = `${site.name} — ${site.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * The card that shows up in WhatsApp, X and Slack — for a consumer product in Indonesia,
 * WhatsApp is the one that matters. Generated at build time from the same brand tokens as
 * the app, so it can't go stale the way a hand-exported PNG does.
 *
 * Satori (what ImageResponse runs on) only supports flexbox and a subset of CSS: every
 * element needs an explicit `display: flex`, and there is no `gap` shorthand on text runs,
 * hence the explicit margins below.
 */
export default async function OpengraphImage() {
  const fonts = await ogFonts(400, 800);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: site.ink,
          // A soft brand glow bleeding in from the top-right, echoing the landing page blobs.
          backgroundImage: `radial-gradient(900px 500px at 88% -12%, rgba(34,197,94,0.35), transparent 70%), radial-gradient(700px 500px at 8% 118%, rgba(20,184,166,0.22), transparent 70%)`,
          color: "white",
          fontFamily: fonts.length ? OG_FONT_FAMILY : "sans-serif",
        }}
      >
        {/* brand lockup */}
        <div style={{ display: "flex", alignItems: "center" }}>
          <div
            style={{
              width: 72,
              height: 72,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 20,
              background: `linear-gradient(120deg, ${site.aurora[0]}, ${site.aurora[1]}, ${site.aurora[2]})`,
              fontSize: 44,
              fontWeight: 900,
            }}
          >
            P
          </div>
          <div style={{ display: "flex", marginLeft: 24, fontSize: 40, fontWeight: 800 }}>
            {site.name}
          </div>
        </div>

        {/* headline */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: 78,
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: -2,
              maxWidth: 900,
            }}
          >
            Booking lapangan padel, real-time.
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 28,
              fontSize: 32,
              lineHeight: 1.4,
              color: "rgba(255,255,255,0.72)",
              maxWidth: 860,
            }}
          >
            Lihat slot kosong, kunci lapanganmu, bayar online. Untuk pemain dan pemilik venue.
          </div>
        </div>

        {/* slot strip: the product's core object, shown rather than described */}
        <div style={{ display: "flex", alignItems: "center" }}>
          {[
            { label: "07:00", state: "free" },
            { label: "08:00", state: "free" },
            { label: "09:00", state: "taken" },
            { label: "19:00", state: "sel" },
            { label: "20:00", state: "free" },
          ].map((slot) => (
            <div
              key={slot.label}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 152,
                height: 72,
                marginRight: 18,
                borderRadius: 16,
                fontSize: 28,
                fontWeight: 700,
                ...(slot.state === "sel"
                  ? { background: site.brand, color: "white" }
                  : slot.state === "taken"
                    ? { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.35)" }
                    : {
                        background: "rgba(34,197,94,0.12)",
                        color: site.aurora[0],
                        border: "2px solid rgba(34,197,94,0.35)",
                      }),
              }}
            >
              {slot.label}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size, ...(fonts.length ? { fonts } : {}) },
  );
}
