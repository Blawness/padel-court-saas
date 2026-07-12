import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, it } from "node:test";
import {
  mapTransactionStatus,
  verifySignature,
  type MidtransNotification,
  type SignatureConfig,
} from "@/lib/midtrans";

const SERVER_KEY = "SB-Mid-server-TESTKEY";

const sign = (n: Omit<MidtransNotification, "signature_key">, key = SERVER_KEY) =>
  createHash("sha512")
    .update(`${n.order_id}${n.status_code}${n.gross_amount}${key}`)
    .digest("hex");

const notification = (over: Partial<MidtransNotification> = {}): MidtransNotification => {
  const base = {
    order_id: "BOOK-123",
    status_code: "200",
    gross_amount: "150000.00",
    transaction_status: "settlement",
    ...over,
  };
  return { signature_key: sign(base), ...base, ...over } as MidtransNotification;
};

const live: SignatureConfig = { serverKey: SERVER_KEY, allowUnsigned: false };
const mock: SignatureConfig = { serverKey: "", allowUnsigned: true };

describe("verifySignature", () => {
  it("accepts a correctly signed notification", () => {
    assert.equal(verifySignature(notification(), live), true);
  });

  it("rejects a tampered amount, even though the rest still matches", () => {
    // The classic attack: replay a real notification for a cheaper booking.
    const n = notification();
    n.gross_amount = "1000.00";
    assert.equal(verifySignature(n, live), false);
  });

  it("rejects a forged signature and a missing one", () => {
    assert.equal(verifySignature(notification({ signature_key: "deadbeef" }), live), false);
    assert.equal(
      verifySignature(notification({ signature_key: undefined as unknown as string }), live),
      false,
    );
  });

  it("rejects a signature made with a different server key", () => {
    const n = notification();
    n.signature_key = sign(n, "SB-Mid-server-ATTACKER");
    assert.equal(verifySignature(n, live), false);
  });

  it("accepts unsigned notifications only in mock mode", () => {
    const unsigned = notification({ signature_key: "" });
    assert.equal(verifySignature(unsigned, mock), true);

    // Production without a server key must fail closed: allowUnsigned is false, and no
    // signature can match an empty key, so nobody can confirm a booking for free.
    const prodNoKey: SignatureConfig = { serverKey: "", allowUnsigned: false };
    assert.equal(verifySignature(unsigned, prodNoKey), false);
    assert.equal(verifySignature(notification(), prodNoKey), false);
  });
});

describe("mapTransactionStatus", () => {
  const status = (over: Partial<MidtransNotification>) =>
    mapTransactionStatus(notification(over as Partial<MidtransNotification>));

  it("treats settlement and a clean capture as paid", () => {
    assert.equal(status({ transaction_status: "settlement" }), "success");
    assert.equal(status({ transaction_status: "capture", fraud_status: "accept" }), "success");
  });

  it("holds a fraud-challenged capture as pending rather than paid", () => {
    assert.equal(status({ transaction_status: "capture", fraud_status: "challenge" }), "pending");
  });

  it("maps pending to pending", () => {
    assert.equal(status({ transaction_status: "pending" }), "pending");
  });

  it("treats deny, cancel, expire, failure and anything unknown as failed", () => {
    for (const s of ["deny", "cancel", "expire", "failure", "something_new"]) {
      assert.equal(status({ transaction_status: s }), "failed", s);
    }
  });
});
