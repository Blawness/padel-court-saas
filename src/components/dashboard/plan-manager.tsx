"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { formatIDR } from "@/lib/format";
import { toast } from "@/stores/toast";

type PlanRow = {
  id: string;
  name: string;
  maxVenues: number;
  monthlyPrice: number;
  isActive: boolean;
  activeSubscribers: number;
};

export function PlanManager({ plans }: { plans: PlanRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<PlanRow | null>(null);

  const call = async (url: string, method: string, body: unknown) => {
    setBusy(true);
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);

    if (!res.ok) {
      toast((json as { error?: string }).error ?? "Gagal menyimpan paket.", "error");
      return null;
    }
    router.refresh();
    return json;
  };

  return (
    <>
      <div className="reveal d1">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Subscription Plan</h2>
            <p className="text-xs text-gray-400">
              MRR dihitung dari paket dengan langganan berstatus aktif.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> Plan
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {plans.map((plan, i) => {
            const featured = i === 1; // the mid tier is the highlighted one, as in the mockup

            return (
              <div
                key={plan.id}
                className={
                  featured
                    ? "from-brand-500 rounded-2xl bg-gradient-to-br to-teal-500 p-5 text-white"
                    : "card rounded-2xl p-5"
                }
              >
                <div className="flex items-center gap-2 font-bold">
                  {plan.name}
                  {featured ? <span className="chip chip-gray">Populer</span> : null}
                  {!plan.isActive ? <span className="chip chip-gray">Nonaktif</span> : null}
                </div>

                <div
                  className={`font-display mt-2 text-2xl font-extrabold ${
                    featured ? "" : "text-brand-600 dark:text-brand-400"
                  }`}
                >
                  {formatIDR(plan.monthlyPrice)}
                  <span
                    className={`text-sm font-normal ${featured ? "text-white/70" : "text-gray-400"}`}
                  >
                    /bln
                  </span>
                </div>

                <ul
                  className={`mt-3 space-y-1 text-sm ${
                    featured ? "opacity-95" : "text-gray-500 dark:text-gray-400"
                  }`}
                >
                  <li>• Hingga {plan.maxVenues} venue</li>
                  <li>• Unlimited court</li>
                  <li>• {plan.activeSubscribers} pelanggan aktif</li>
                  <li>• MRR {formatIDR(plan.activeSubscribers * plan.monthlyPrice)}</li>
                </ul>

                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setEditing(plan)}
                  className={`mt-4 w-full rounded-xl py-2 text-sm font-semibold transition ${
                    featured
                      ? "text-brand-700 bg-white hover:bg-gray-100"
                      : "btn-ghost"
                  }`}
                >
                  Edit
                </button>
              </div>
            );
          })}

          {plans.length === 0 ? (
            <div className="card p-8 text-center text-sm text-gray-400 md:col-span-3">
              Belum ada paket. Buat paket pertama agar owner bisa berlangganan.
            </div>
          ) : null}
        </div>
      </div>

      {creating ? (
        <PlanModal
          title="Plan Baru"
          busy={busy}
          onClose={() => setCreating(false)}
          onSubmit={async (data) => {
            if (await call("/api/admin/plans", "POST", { ...data, isActive: true })) {
              toast("Paket dibuat.");
              setCreating(false);
            }
          }}
        />
      ) : null}

      {editing ? (
        <PlanModal
          title={`Edit — ${editing.name}`}
          plan={editing}
          busy={busy}
          onClose={() => setEditing(null)}
          onSubmit={async (data) => {
            if (await call(`/api/admin/plans/${editing.id}`, "PUT", data)) {
              toast("Paket diperbarui.");
              setEditing(null);
            }
          }}
          onToggle={async () => {
            if (
              await call(`/api/admin/plans/${editing.id}`, "PUT", { isActive: !editing.isActive })
            ) {
              toast(editing.isActive ? "Paket dinonaktifkan." : "Paket diaktifkan.");
              setEditing(null);
            }
          }}
        />
      ) : null}
    </>
  );
}

type PlanData = { name: string; maxVenues: number; monthlyPrice: number };

function PlanModal({
  title,
  plan,
  busy,
  onClose,
  onSubmit,
  onToggle,
}: {
  title: string;
  plan?: PlanRow;
  busy: boolean;
  onClose: () => void;
  onSubmit: (data: PlanData) => void;
  onToggle?: () => void;
}) {
  return (
    <div className="fixed inset-0 z-80">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="dark:bg-panel absolute inset-x-0 bottom-0 rounded-t-3xl bg-white p-6 sm:inset-0 sm:m-auto sm:h-fit sm:max-w-md sm:rounded-3xl">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-bold">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full bg-gray-100 dark:bg-white/5"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            onSubmit({
              name: String(f.get("name")),
              maxVenues: Number(f.get("maxVenues")),
              monthlyPrice: Number(f.get("monthlyPrice")),
            });
          }}
          className="space-y-3"
        >
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Nama paket</span>
            <input name="name" defaultValue={plan?.name} placeholder="Pro" required className="input" />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Maks. venue</span>
            <input
              name="maxVenues"
              type="number"
              min={1}
              defaultValue={plan?.maxVenues}
              placeholder="5"
              required
              className="input"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Harga / bulan (IDR)</span>
            <input
              name="monthlyPrice"
              type="number"
              min={0}
              defaultValue={plan?.monthlyPrice}
              placeholder="349000"
              required
              className="input"
            />
          </label>

          <button type="submit" disabled={busy} className="btn-primary mt-4 w-full py-3">
            {busy ? "Menyimpan…" : "Simpan"}
          </button>

          {onToggle && plan ? (
            <button
              type="button"
              disabled={busy}
              onClick={onToggle}
              className="btn-ghost w-full py-2.5 text-sm"
            >
              {plan.isActive ? "Nonaktifkan paket" : "Aktifkan paket"}
            </button>
          ) : null}
        </form>
      </div>
    </div>
  );
}
