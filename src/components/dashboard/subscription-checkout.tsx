"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { formatIDR } from "@/lib/format";
import { payWithSnap } from "@/lib/snap";
import { toast } from "@/stores/toast";

type Plan = { id: string; name: string; maxVenues: number; monthlyPrice: number };

export function SubscriptionCheckout({
  plans,
  currentPlanId,
}: {
  plans: Plan[];
  currentPlanId: string | null;
}) {
  const [busy, setBusy] = useState<string | null>(null);

  const checkout = async (planId: string) => {
    setBusy(planId);
    const res = await fetch("/api/subscriptions/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId }),
    });
    const json = await res.json();

    if (!res.ok) {
      setBusy(null);
      toast(json.error ?? "Gagal membuat pembayaran.", "error");
      return;
    }

    await payWithSnap(json, {
      onSuccess: () => {
        toast("Langganan aktif!");
        window.location.reload();
      },
      onClose: () => setBusy(null),
      onError: () => {
        setBusy(null);
        toast("Pembayaran gagal.", "error");
      },
    });
  };

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {plans.map((plan, i) => {
        const current = plan.id === currentPlanId;
        return (
          <div
            key={plan.id}
            className={`reveal d${i + 1} lift card p-6 ${current ? "glow-border" : ""}`}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold">{plan.name}</h3>
              {current ? <span className="chip chip-green">Paket kamu</span> : null}
            </div>

            <div className="font-display text-brand-600 dark:text-brand-400 mt-3 text-2xl font-extrabold">
              {formatIDR(plan.monthlyPrice)}
              <span className="text-sm font-semibold text-gray-400">/bln</span>
            </div>

            <ul className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li className="flex items-center gap-2">
                <Check className="text-brand-600 h-4 w-4" /> Sampai {plan.maxVenues} venue
              </li>
              <li className="flex items-center gap-2">
                <Check className="text-brand-600 h-4 w-4" /> Court & harga tanpa batas
              </li>
              <li className="flex items-center gap-2">
                <Check className="text-brand-600 h-4 w-4" /> Booking online + Midtrans
              </li>
            </ul>

            <button
              type="button"
              disabled={busy !== null}
              onClick={() => checkout(plan.id)}
              className={`mt-6 w-full py-3 ${current ? "btn-primary" : "btn-ghost"}`}
            >
              {busy === plan.id
                ? "Memproses…"
                : current
                  ? "Perpanjang 1 bulan"
                  : `Pindah ke ${plan.name}`}
            </button>
          </div>
        );
      })}
    </div>
  );
}
