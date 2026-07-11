import { createHash } from "node:crypto";
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

/**
 * Midtrans signature: sha512(order_id + status_code + gross_amount + server_key).
 * Without a server key (dev/mock mode) there is nothing to verify against, so we
 * accept the notification — the mock payment page is the only thing that can send it.
 */
export function verifySignature(n: MidtransNotification): boolean {
  if (!isMidtransConfigured) return true;
  const expected = createHash("sha512")
    .update(`${n.order_id}${n.status_code}${n.gross_amount}${serverKey}`)
    .digest("hex");
  return expected === n.signature_key;
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
