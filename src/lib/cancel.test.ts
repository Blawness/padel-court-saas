import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assertCancellable, CancelNotAllowedError, type CancelActor } from "@/lib/booking";
import type { BookingStatus } from "@/db/schema";

const NOW = new Date("2026-07-12T10:00:00+07:00");

const booking = (hoursFromNow: number, status: BookingStatus = "confirmed") => ({
  status,
  startTime: new Date(NOW.getTime() + hoursFromNow * 3_600_000),
});

const PLAYER: CancelActor = { isPlayer: true, isOwner: false, isAdmin: false };
const OWNER: CancelActor = { isPlayer: false, isOwner: true, isAdmin: false };
const ADMIN: CancelActor = { isPlayer: false, isOwner: false, isAdmin: true };
const STRANGER: CancelActor = { isPlayer: false, isOwner: false, isAdmin: false };

const statusOf = (fn: () => void): number => {
  try {
    fn();
  } catch (err) {
    assert.ok(err instanceof CancelNotAllowedError);
    return err.status;
  }
  return 200;
};

describe("assertCancellable", () => {
  it("lets a player cancel outside the 2-hour window", () => {
    assert.doesNotThrow(() => assertCancellable(booking(3), PLAYER, NOW));
    assert.doesNotThrow(() => assertCancellable(booking(2), PLAYER, NOW));
  });

  it("refuses a player inside the window, and once the slot has started", () => {
    assert.equal(statusOf(() => assertCancellable(booking(1.5), PLAYER, NOW)), 403);
    assert.equal(statusOf(() => assertCancellable(booking(-1), PLAYER, NOW)), 403);
  });

  it("lets the owner and the admin cancel inside the window", () => {
    // They need this for maintenance and refunds; the 2h rule only binds the player.
    assert.doesNotThrow(() => assertCancellable(booking(0.5), OWNER, NOW));
    assert.doesNotThrow(() => assertCancellable(booking(0.5), ADMIN, NOW));
  });

  it("refuses a stranger before anything else", () => {
    assert.equal(statusOf(() => assertCancellable(booking(5), STRANGER, NOW)), 403);
  });

  it("refuses to cancel a booking that is already dead", () => {
    assert.equal(statusOf(() => assertCancellable(booking(5, "cancelled"), PLAYER, NOW)), 409);
    assert.equal(statusOf(() => assertCancellable(booking(5, "expired"), OWNER, NOW)), 409);
  });

  it("still allows cancelling a slot that is only held, not yet paid", () => {
    assert.doesNotThrow(() => assertCancellable(booking(5, "pending_payment"), PLAYER, NOW));
  });

  it("does not let an owner who is also the player dodge their own player window", () => {
    // An owner booking their own court is acting as the owner, so the window shouldn't apply.
    const ownerAndPlayer: CancelActor = { isPlayer: true, isOwner: true, isAdmin: false };
    assert.doesNotThrow(() => assertCancellable(booking(0.5), ownerAndPlayer, NOW));
  });
});
