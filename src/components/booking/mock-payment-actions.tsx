"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/stores/toast";

const METHODS = ["qris", "gopay", "bank_transfer", "credit_card"] as const;

export function MockPaymentActions({
  orderId,
  amount,
  redirectTo,
}: {
  orderId: string;
  amount: number;
  redirectTo: string;
}) {
  const router = useRouter();
  const [method, setMethod] = useState<(typeof METHODS)[number]>("qris");
  const [busy, setBusy] = useState(false);

  const notify = async (transactionStatus: "settlement" | "deny") => {
    setBusy(true);
    const res = await fetch("/api/webhooks/midtrans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        order_id: orderId,
        status_code: transactionStatus === "settlement" ? "200" : "202",
        gross_amount: `${amount}.00`,
        signature_key: "mock",
        transaction_status: transactionStatus,
        payment_type: method,
      }),
    });

    if (!res.ok) {
      setBusy(false);
      toast("Webhook gagal diproses.", "error");
      return;
    }

    toast(
      transactionStatus === "settlement" ? "Pembayaran berhasil!" : "Pembayaran gagal, slot dilepas.",
      transactionStatus === "settlement" ? "success" : "error",
    );
    router.push(redirectTo);
    router.refresh();
  };

  return (
    <>
      <p className="mt-5 mb-3 text-sm font-semibold">Pilih metode pembayaran</p>
      <div className="grid grid-cols-2 gap-2">
        {METHODS.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMethod(m)}
            className={`rounded-xl border-2 p-3 text-left text-sm font-semibold transition ${
              m === method
                ? "border-brand-500 bg-brand-50 dark:bg-brand-500/10"
                : "border-gray-200 dark:border-white/10"
            }`}
          >
            {m.replace("_", " ").toUpperCase()}
          </button>
        ))}
      </div>

      <button
        type="button"
        disabled={busy}
        onClick={() => notify("settlement")}
        className="btn-primary shimmer mt-5 w-full py-3.5"
      >
        {busy ? "Memproses…" : "Bayar Sekarang"}
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => notify("deny")}
        className="btn-ghost mt-2 w-full py-3"
      >
        Simulasikan pembayaran gagal
      </button>
    </>
  );
}
