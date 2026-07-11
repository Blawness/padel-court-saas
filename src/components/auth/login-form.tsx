"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Role } from "@/db/schema";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { toast } from "@/stores/toast";

type DevAccount = { email: string; fullName: string; role: Role };

const roleLabel: Record<Role, string> = {
  player: "Pemain",
  venue_owner: "Pemilik venue",
  super_admin: "Super admin",
};

const homeFor = (role: Role) =>
  role === "venue_owner" ? "/owner" : role === "super_admin" ? "/admin" : "/venues";

export function LoginForm({
  supabaseEnabled,
  devAccounts,
  next,
}: {
  supabaseEnabled: boolean;
  devAccounts: DevAccount[];
  next: string | null;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const finish = (role: Role) => {
    router.push(next ?? homeFor(role));
    router.refresh();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);

    if (supabaseEnabled) {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase!.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) {
        toast(error.message, "error");
        return;
      }
      router.push(next ?? "/venues");
      router.refresh();
      return;
    }

    const res = await fetch("/api/auth/dev-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const json = await res.json();
    setBusy(false);

    if (!res.ok) {
      toast(json.error ?? "Login gagal.", "error");
      return;
    }
    finish(json.user.role as Role);
  };

  const loginWithGoogle = async () => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next ?? "/venues")}`,
      },
    });
  };

  const quickLogin = async (account: DevAccount) => {
    setBusy(true);
    const res = await fetch("/api/auth/dev-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: account.email }),
    });
    setBusy(false);
    if (!res.ok) {
      toast("Login gagal.", "error");
      return;
    }
    finish(account.role);
  };

  return (
    <>
      <form onSubmit={submit} className="mt-6 space-y-3">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400">
            Email
          </span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
            placeholder="kamu@email.com"
          />
        </label>

        {supabaseEnabled ? (
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400">
              Password
            </span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              placeholder="••••••••"
            />
          </label>
        ) : null}

        <button type="submit" disabled={busy} className="btn-primary w-full py-3">
          {busy ? "Memproses…" : "Masuk"}
        </button>
      </form>

      {supabaseEnabled ? (
        <button type="button" onClick={loginWithGoogle} className="btn-ghost mt-3 w-full py-3">
          Masuk dengan Google
        </button>
      ) : null}

      {!supabaseEnabled && devAccounts.length > 0 ? (
        <div className="mt-6 border-t border-gray-100 pt-5 dark:border-white/10">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
            Mode dev — Supabase belum dikonfigurasi. Login cepat sebagai:
          </p>
          <div className="mt-3 space-y-2">
            {devAccounts.map((a) => (
              <button
                key={a.email}
                type="button"
                disabled={busy}
                onClick={() => quickLogin(a)}
                className="btn-ghost flex w-full items-center justify-between py-2.5 text-left"
              >
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{a.fullName}</span>
                  <span className="block truncate text-xs text-gray-400">{a.email}</span>
                </span>
                <span className="chip chip-gray shrink-0">{roleLabel[a.role]}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}
