import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { getOwnerSubscription } from "@/lib/subscription";
import { apiError } from "@/lib/utils";

/**
 * GET /api/admin/owners — every venue owner and their verification state.
 * PRD §10 decision: owner signup is self-serve, but a new owner stays `pending`
 * (their venues stay hidden from players) until a SuperAdmin approves them.
 */
export async function GET() {
  try {
    await requireUser("super_admin");

    const owners = await db.query.users.findMany({
      where: eq(users.role, "venue_owner"),
      with: {
        venues: { columns: { id: true, name: true, city: true } },
        subscriptions: {
          orderBy: (s, { desc: d }) => d(s.createdAt),
          limit: 1,
          with: { plan: true },
        },
      },
      orderBy: desc(users.createdAt),
    });

    return NextResponse.json({
      owners: owners.map((o) => ({
        id: o.id,
        fullName: o.fullName,
        email: o.email,
        phone: o.phone,
        ownerStatus: o.ownerStatus,
        createdAt: o.createdAt,
        venues: o.venues,
        subscription: o.subscriptions[0] ?? null,
      })),
    });
  } catch (err) {
    return apiError(err);
  }
}

const patchSchema = z.object({
  ownerId: z.string().uuid(),
  ownerStatus: z.enum(["pending", "approved", "suspended"]),
});

/** PATCH /api/admin/owners — approve or suspend an owner. */
export async function PATCH(req: NextRequest) {
  try {
    await requireUser("super_admin");
    const { ownerId, ownerStatus } = patchSchema.parse(await req.json());

    const [owner] = await db
      .update(users)
      .set({ ownerStatus })
      .where(eq(users.id, ownerId))
      .returning();

    // Approving an owner starts their 14-day trial if they don't have a subscription yet.
    if (ownerStatus === "approved") await getOwnerSubscription(owner.id);

    return NextResponse.json({ owner });
  } catch (err) {
    return apiError(err);
  }
}
