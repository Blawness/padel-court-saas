import { NextResponse, type NextRequest } from "next/server";
import { releaseExpiredHolds } from "@/lib/booking";

/**
 * Backstop for the 10-minute hold. Every path that can *observe* a lapsed hold already
 * sweeps first — availability reads, booking writes, the owner dashboard and bookings
 * table, and the player's profile — so a stale `pending_payment` row is never shown to
 * anyone and never blocks a slot. That makes the daily Vercel Cron (see vercel.json)
 * genuinely a backstop rather than the mechanism, which is what lets it stay daily and
 * fit inside the Hobby plan's once-a-day cron limit.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;

  // In production the secret is mandatory: treating "not configured" as "open to everyone"
  // would leave the endpoint callable by anyone the moment the env var is missing.
  if (process.env.NODE_ENV === "production" && !secret) {
    console.error("[cron] CRON_SECRET belum diset — endpoint ditolak.");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const released = await releaseExpiredHolds();
  return NextResponse.json({ released });
}
