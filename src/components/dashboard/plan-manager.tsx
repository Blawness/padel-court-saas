"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
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
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);

  const create = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);

    const res = await fetch("/api/admin/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: String(f.get("name")),
        maxVenues: Number(f.get("maxVenues")),
        monthlyPrice: Number(f.get("monthlyPrice")),
        isActive: true,
      }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);

    if (!res.ok) {
      toast(json.error ?? "Gagal membuat paket.", "error");
      return;
    }
    toast("Paket dibuat.");
    setCreating(false);
    router.refresh();
  };

  const toggle = async (plan: PlanRow) => {
    setBusy(true);
    const res = await fetch(`/api/admin/plans/${plan.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !plan.isActive }),
    });
    setBusy(false);

    if (!res.ok) {
      toast("Gagal memperbarui paket.", "error");
      return;
    }
    toast(plan.isActive ? "Paket dinonaktifkan." : "Paket diaktifkan.");
    router.refresh();
  };

  return (
    <div className="reveal card overflow-hidden">
      <div className="flex items-center justify-between border-b border-gray-100 p-5 dark:border-white/10">
        <div>
          <h2 className="font-bold">Paket Langganan</h2>
          <p className="text-xs text-gray-400">MRR dihitung dari paket berstatus aktif.</p>
        </div>
        <button
          type="button"
          onClick={() => setCreating((v) => !v)}
          className="btn-primary flex items-center gap-1.5"
        >
          <Plus className="h-4 w-4" /> Paket Baru
        </button>
      </div>

      {creating ? (
        <form onSubmit={create} className="grid gap-3 border-b border-gray-100 p-5 sm:grid-cols-4 dark:border-white/10">
          <Field name="name" label="Nama paket" placeholder="Pro" required />
          <Field name="maxVenues" label="Maks. venue" type="number" placeholder="5" required />
          <Field
            name="monthlyPrice"
            label="Harga/bulan (IDR)"
            type="number"
            placeholder="499000"
            required
          />
          <div className="flex items-end gap-2">
            <button type="submit" disabled={busy} className="btn-primary">
              Simpan
            </button>
            <button type="button" onClick={() => setCreating(false)} className="btn-ghost">
              Batal
            </button>
          </div>
        </form>
      ) : null}

      <div className="overflow-x-auto">
        <table className="tbl">
          <thead>
            <tr>
              <th>Paket</th>
              <th>Maks. venue</th>
              <th>Harga/bulan</th>
              <th>Pelanggan aktif</th>
              <th>MRR</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {plans.map((p) => (
              <tr key={p.id}>
                <td className="font-semibold">{p.name}</td>
                <td>{p.maxVenues}</td>
                <td>{formatIDR(p.monthlyPrice)}</td>
                <td>{p.activeSubscribers}</td>
                <td className="font-semibold">
                  {formatIDR(p.activeSubscribers * p.monthlyPrice)}
                </td>
                <td>
                  <span className={`chip ${p.isActive ? "chip-green" : "chip-gray"}`}>
                    {p.isActive ? "Aktif" : "Nonaktif"}
                  </span>
                </td>
                <td className="text-right">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => toggle(p)}
                    className="text-brand-600 text-sm font-semibold"
                  >
                    {p.isActive ? "Nonaktifkan" : "Aktifkan"}
                  </button>
                </td>
              </tr>
            ))}
            {plans.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-gray-400">
                  Belum ada paket.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Field({
  name,
  label,
  type = "text",
  placeholder,
  required,
}: {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400">
        {label}
      </span>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        className="input"
      />
    </label>
  );
}
