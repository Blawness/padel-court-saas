import { create } from "zustand";

type ToastState = {
  message: string | null;
  variant: "success" | "error";
  show: (message: string, variant?: "success" | "error") => void;
  hide: () => void;
};

/** Zustand-backed toast, mirroring the mockup's `toast()` helper. */
export const useToast = create<ToastState>((set) => ({
  message: null,
  variant: "success",
  show: (message, variant = "success") => set({ message, variant }),
  hide: () => set({ message: null }),
}));

export const toast = (message: string, variant: "success" | "error" = "success") =>
  useToast.getState().show(message, variant);
