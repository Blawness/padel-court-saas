import { NextResponse, type NextRequest } from "next/server";
import { releaseExpiredHolds } from "@/lib/booking";

/**
 * Safety net for the 10-minute hold: every availability read and booking write already
 * releases lapsed holds, so this only matters for slots nobody is currently looking at.
 * Wire it to a Vercel Cron (see vercel.json).
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const released = await releaseExpiredHolds();
  return NextResponse.json({ released });
}
