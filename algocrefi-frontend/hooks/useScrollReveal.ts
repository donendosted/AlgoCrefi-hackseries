"use client";
import { useEffect } from "react";

/**
 * Attaches IntersectionObserver to every .reveal and .reveal-x element
 * on the page. When an element enters the viewport it gets the .visible class
 * applied, triggering the CSS transition defined in globals.css.
 * Call this once at the top-level (page.tsx).
 */
export function useScrollReveal() {
  useEffect(() => {
    const targets = document.querySelectorAll<HTMLElement>(".reveal, .reveal-x");

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );

    targets.forEach((el) => obs.observe(el));

    // Re-observe if new elements get added to the DOM
    const mutObs = new MutationObserver(() => {
      document.querySelectorAll<HTMLElement>(".reveal:not(.visible), .reveal-x:not(.visible)").forEach((el) => obs.observe(el));
    });
    mutObs.observe(document.body, { childList: true, subtree: true });

    return () => {
      obs.disconnect();
      mutObs.disconnect();
    };
  }, []);
}
