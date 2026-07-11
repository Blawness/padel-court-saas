"use client";

type SnapCallbacks = {
  onSuccess?: () => void;
  onPending?: () => void;
  onError?: () => void;
  onClose?: () => void;
};

type SnapWindow = Window & {
  snap?: { pay: (token: string, callbacks: SnapCallbacks) => void };
};

const SNAP_SANDBOX = "https://app.sandbox.midtrans.com/snap/snap.js";
const SNAP_PRODUCTION = "https://app.midtrans.com/snap/snap.js";

function loadSnapScript(clientKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as SnapWindow).snap) return resolve();

    const script = document.createElement("script");
    script.src =
      process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === "true" ? SNAP_PRODUCTION : SNAP_SANDBOX;
    script.dataset.clientKey = clientKey;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Gagal memuat Midtrans Snap."));
    document.head.appendChild(script);
  });
}

/**
 * Opens the Midtrans Snap popup. When Midtrans isn't configured the API returns a mock
 * token, and we send the player to /payment/mock — which posts the same webhook payload
 * the real gateway would, so the rest of the flow is identical.
 */
export async function payWithSnap(
  payment: { snapToken: string; redirectUrl: string; isMock: boolean },
  callbacks: SnapCallbacks,
): Promise<void> {
  if (payment.isMock) {
    window.location.href = payment.redirectUrl;
    return;
  }

  const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY ?? "";
  await loadSnapScript(clientKey);
  (window as SnapWindow).snap?.pay(payment.snapToken, callbacks);
}
