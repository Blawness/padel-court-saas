"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useState } from "react";

export function LogoutButton({ label }: { label?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const logout = async () => {
    setBusy(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  };

  if (label) {
    return (
      <button type="button" onClick={logout} disabled={busy} className="nav-item w-full">
        <LogOut className="h-4 w-4" /> {label}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={logout}
      disabled={busy}
      aria-label="Keluar"
      title="Keluar"
      className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 transition hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10"
    >
      <LogOut className="h-4 w-4 text-gray-600 dark:text-gray-300" />
    </button>
  );
}
