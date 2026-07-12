import { createHash, timingSafeEqual } from "node:crypto";
import midtransClient from "midtrans-client";
import { appUrl, isMidtransConfigured } from "@/lib/env";

const serverKey = process.env.MIDTRANS_SERVER_KEY ?? "";
const clientKey = process.env.MIDTRANS_CLIENT_KEY ?? "";
const isProduction = process.env.MIDTRANS_IS_PRODUCTION === "true";

export const MOCK_SNAP_TOKEN_PREFIX = "mock-snap-";

export type SnapCharge = {
  orderId: string;
  amount: number;
  itemName: string;
  customer: { name: string; email: string; phone?: string | null };
};

export type SnapResult = { token: string; redirectUrl: string; isMock: boolean };

/**
 * Creates a Snap transaction. Without Midtrans keys we return a mock token; the UI then
 * routes to /payment/mock, which drives the exact same webhook the real gateway calls.
 */
export async function createSnapTransaction(charge: SnapCharge): Promise<SnapResult> {
  if (!isMidtransConfigured) {
    const token = `${MOCK_SNAP_TOKEN_PREFIX}${charge.orderId}`;
    return {
      token,
      redirectUrl: `${appUrl}/payment/mock?order_id=${encodeURIComponent(charge.orderId)}`,
      isMock: true,
    };
  }

  const snap = new midtransClient.Snap({ isProduction, serverKey, clientKey });

  // @types/midtrans-client omits item_details/customer_details/callbacks, which the API accepts.
  const parameters = {
    transaction_details: { order_id: charge.orderId, gross_amount: charge.amount },
    item_details: [
      { id: charge.orderId, name: charge.itemName.slice(0, 50), price: charge.amount, quantity: 1 },
    ],
    customer_details: {
      first_name: charge.customer.name,
      email: charge.customer.email,
      phone: charge.customer.phone ?? undefined,
    },
    callbacks: { finish: `${appUrl}/profile` },
  } as unknown as Parameters<typeof snap.createTransaction>[0];

  const tx = await snap.createTransaction(parameters);

  return { token: tx.token, redirectUrl: tx.redirect_url, isMock: false };
}

export type MidtransNotification = {
  order_id: string;
  status_code: string;
  gross_amount: string;
  signature_key: string;
  transaction_status: string;
  fraud_status?: string;
  payment_type?: string;
};

export type SignatureConfig = {
  serverKey: string;
  /** True only in local/mock mode, where the mock payment page sends unsigned notifications. */
  allowUnsigned: boolean;
};

/**
 * Unsigned notifications are accepted only when there is no server key AND we are not in
 * production. Treating "no key configured" as "accept everything" in production would let
 * anyone confirm a booking for free by POSTing to the webhook — the same trap the cron
 * endpoint had. So production always fails closed, key or no key.
 */
export function signatureConfig(): SignatureConfig {
  return {
    serverKey,
    allowUnsigned: !isMidtransConfigured && process.env.NODE_ENV !== "production",
  };
}

/**
 * Midtrans signature: sha512(order_id + status_code + gross_amount + server_key).
 */
export function verifySignature(
  n: MidtransNotification,
  cfg: SignatureConfig = signatureConfig(),
): boolean {
  if (cfg.allowUnsigned) return true;

  const expected = createHash("sha512")
    .update(`${n.order_id}${n.status_code}${n.gross_amount}${cfg.serverKey}`)
    .digest("hex");

  // Constant-time: a plain === leaks how many leading hex chars a guess got right, which
  // is enough to walk a forged signature out byte by byte.
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(n.signature_key ?? "", "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Maps Midtrans transaction_status to our Payment.status. */
export function mapTransactionStatus(n: MidtransNotification): "success" | "pending" | "failed" {
  const status = n.transaction_status;
  if (status === "capture") return n.fraud_status === "challenge" ? "pending" : "success";
  if (status === "settlement") return "success";
  if (status === "pending") return "pending";
  return "failed"; // deny, cancel, expire, failure
}

export { clientKey as midtransClientKey };
