"use client";

import { useEffect } from "react";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { useToast } from "@/stores/toast";

export function Toaster() {
  const { message, variant, hide } = useToast();

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(hide, 2600);
    return () => clearTimeout(t);
  }, [message, hide]);

  const Icon = variant === "error" ? AlertTriangle : CheckCircle2;

  return (
    <div
      id="toast"
      role="status"
      aria-live="polite"
      className={`flex items-center gap-2 rounded-xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white shadow-2xl ${message ? "show" : ""}`}
    >
      <Icon
        className={`h-4 w-4 ${variant === "error" ? "text-red-400" : "text-brand-400"}`}
        aria-hidden
      />
      {message ?? ""}
    </div>
  );
}
