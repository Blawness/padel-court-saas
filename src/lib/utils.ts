import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { AuthError } from "@/lib/auth";
import { SlotTakenError } from "@/lib/booking";
import { NextResponse } from "next/server";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Single error shape for every route handler. */
export function apiError(err: unknown): NextResponse {
  if (err instanceof AuthError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  if (err instanceof SlotTakenError) {
    return NextResponse.json({ error: err.message }, { status: 409 });
  }
  if (err instanceof Error && err.name === "ZodError") {
    return NextResponse.json({ error: "Input tidak valid.", detail: err.message }, { status: 400 });
  }
  console.error("[api]", err);
  const message = err instanceof Error ? err.message : "Terjadi kesalahan.";
  return NextResponse.json({ error: message }, { status: 500 });
}
