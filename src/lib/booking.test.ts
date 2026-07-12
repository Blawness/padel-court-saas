import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertBookableSlot,
  InvalidSlotError,
  openCloseHours,
  parsePeakRules,
  priceForSlot,
} from "@/lib/booking";

/** 07:00 WIB on 2026-07-12 == 00:00 UTC. */
const wib = (hhmm: string) => new Date(`2026-07-12T${hhmm}:00+07:00`);

const venue = { openTime: "06:00", closeTime: "23:00" };
const court = {
  pricePerHour: 150_000,
  peakPriceOverride: [{ start: "17:00", end: "22:00", price: 250_000 }],
};

describe("parsePeakRules", () => {
  it("keeps well-formed rules", () => {
    assert.deepEqual(parsePeakRules([{ start: "17:00", end: "22:00", price: 250_000 }]), [
      { start: "17:00", end: "22:00", price: 250_000 },
    ]);
  });

  it("drops anything malformed rather than throwing", () => {
    assert.deepEqual(parsePeakRules([{ start: "17:00", end: "22:00", price: "250000" }]), []);
    assert.deepEqual(parsePeakRules(null), []);
    assert.deepEqual(parsePeakRules("nope"), []);
  });
});

describe("priceForSlot", () => {
  it("charges the peak price inside the window", () => {
    assert.equal(priceForSlot(court, wib("17:00")), 250_000);
    assert.equal(priceForSlot(court, wib("21:00")), 250_000);
  });

  it("charges the base price outside it, and at the exclusive end bound", () => {
    assert.equal(priceForSlot(court, wib("16:00")), 150_000);
    assert.equal(priceForSlot(court, wib("22:00")), 150_000);
  });

  it("reads the hour in Jakarta, not in the server's zone", () => {
    // 17:00 WIB is 10:00 UTC; a UTC server must still see this as peak.
    assert.equal(priceForSlot(court, new Date("2026-07-12T10:00:00Z")), 250_000);
  });
});

describe("openCloseHours", () => {
  it("rounds a partial open hour down and a partial close hour up", () => {
    assert.deepEqual(openCloseHours({ openTime: "06:30", closeTime: "22:30" }), {
      openHour: 6,
      closeHour: 23,
    });
  });
});

describe("assertBookableSlot", () => {
  it("accepts a whole hour inside the operating window", () => {
    assert.doesNotThrow(() => assertBookableSlot(venue, wib("06:00")));
    assert.doesNotThrow(() => assertBookableSlot(venue, wib("22:00")));
  });

  it("rejects a start that is not on the hour", () => {
    assert.throws(() => assertBookableSlot(venue, wib("19:30")), InvalidSlotError);
  });

  it("rejects slots outside the operating window, including the closing hour", () => {
    assert.throws(() => assertBookableSlot(venue, wib("05:00")), InvalidSlotError);
    assert.throws(() => assertBookableSlot(venue, wib("23:00")), InvalidSlotError);
  });

  it("rejects an unparseable date", () => {
    assert.throws(() => assertBookableSlot(venue, new Date("not a date")), InvalidSlotError);
  });
});
