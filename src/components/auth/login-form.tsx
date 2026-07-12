"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "@/lib/auth-client";
import { toast } from "@/stores/toast";

export function LoginForm({
  googleEnabled,
  next,
}: {
  googleEnabled: boolean;
  next: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);

    const { error } = await signIn.email({
      email: String(f.get("email")),
      password: String(f.get("password")),
    });
    setBusy(false);

    if (error) {
      // Better Auth's messages are English; keep the UI in one language.
      const message =
        error.code === "INVALID_EMAIL_OR_PASSWORD"
          ? "Email atau password salah."
          : (error.message ?? "Login gagal. Coba lagi.");
      toast(message, "error");
      return;
    }

    // /login redirects an authenticated user to their role's home, so bounce through it
    // rather than duplicating the role→route mapping on the client.
    router.push(next ?? "/login");
    router.refresh();
  };

  const withGoogle = async () => {
    await signIn.social({ provider: "google", callbackURL: next ?? "/" });
  };

  return (
    <>
      <form onSubmit={submit} className="mt-6 space-y-3">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400">
            Email
          </span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="input"
            placeholder="kamu@email.com"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400">
            Password
          </span>
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="input"
            placeholder="••••••••"
          />
        </label>

        <button type="submit" disabled={busy} className="btn-primary w-full py-3">
          {busy ? "Memproses…" : "Masuk"}
        </button>
      </form>

      {googleEnabled ? (
        <button type="button" onClick={withGoogle} className="btn-ghost mt-3 w-full py-3">
          Masuk dengan Google
        </button>
      ) : null}
    </>
  );
}
