"use client";

import { useEffect } from "react";

/**
 * Adds the `in` class to every `.reveal` element as it scrolls into view,
 * the same IntersectionObserver behaviour the mockup uses.
 */
export function RevealOnScroll() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            observer.unobserve(e.target);
          }
        }),
      { threshold: 0.12 },
    );

    const nodes = document.querySelectorAll(".reveal:not(.in)");
    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  });

  return null;
}
