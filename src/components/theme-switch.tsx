"use client";

import { useCallback, useSyncExternalStore } from "react";

/** The <html> class is the source of truth — the inline script in layout.tsx sets it pre-paint. */
const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

const isDark = () => document.documentElement.classList.contains("dark");

export function ThemeSwitch() {
  const dark = useSyncExternalStore(
    subscribe,
    isDark,
    () => false, // server render: assume light, the inline script corrects it before paint
  );

  const toggle = useCallback(() => {
    const next = !isDark();
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("pb-theme", next ? "dark" : "light");
    listeners.forEach((l) => l());
  }, []);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Ganti ke mode terang" : "Ganti ke mode gelap"}
      aria-pressed={dark}
      className={`switch ${dark ? "on" : ""}`}
    >
      <span className="knob" />
    </button>
  );
}
