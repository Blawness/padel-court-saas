"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/stores/toast";

type Role = "player" | "venue_owner";

export function SignupForm({ defaultRole }: { defaultRole: Role }) {
  const router = useRouter();
  const [role, setRole] = useState<Role>(defaultRole);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: String(form.get("fullName")),
        email: String(form.get("email")),
        phone: String(form.get("phone") || "") || undefined,
        password: String(form.get("password")),
        role,
      }),
    });
    const json = await res.json();
    setBusy(false);

    if (!res.ok) {
      toast(json.error ?? "Pendaftaran gagal.", "error");
      return;
    }

    if (role === "venue_owner") {
      toast("Akun dibuat. Menunggu verifikasi admin sebelum venue tayang.");
      router.push("/owner");
    } else {
      toast("Akun dibuat. Selamat bermain!");
      router.push("/venues");
    }
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="mt-6 space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <RoleButton active={role === "player"} onClick={() => setRole("player")}>
          Pemain
        </RoleButton>
        <RoleButton active={role === "venue_owner"} onClick={() => setRole("venue_owner")}>
          Pemilik venue
        </RoleButton>
      </div>

      <Field name="fullName" label="Nama lengkap" placeholder="Nama kamu" required />
      <Field name="email" label="Email" type="email" placeholder="kamu@email.com" required />
      <Field name="phone" label="No. WhatsApp (opsional)" placeholder="+62812…" />
      <Field
        name="password"
        label="Password (min. 8 karakter)"
        type="password"
        placeholder="••••••••"
        required
      />

      <button type="submit" disabled={busy} className="btn-primary w-full py-3">
        {busy ? "Memproses…" : "Buat akun"}
      </button>
    </form>
  );
}

function RoleButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border-2 py-2.5 text-sm font-semibold transition ${
        active
          ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300"
          : "border-gray-200 dark:border-white/10"
      }`}
    >
      {children}
    </button>
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
        required={required}
        placeholder={placeholder}
        className="input"
      />
    </label>
  );
}
