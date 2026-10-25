"use client";

/* ═══════════════════════════════════════════
   GSAP REGISTRY — lean core
   Import `gsap` / `useGSAP` from this module
   instead of from "gsap" directly.

   IMPORTANT: this module registers ONLY the
   plugins the app actually uses at load time
   (core + ScrollTrigger). Eagerly registering
   the full ~25-plugin set added ~120 kB to the
   First Load JS of every page that imported it.

   If you need a heavier plugin (Draggable,
   MorphSVG, SplitText, Physics2D, …) import it
   on demand from `@/lib/gsap-premium`, which
   code-splits so pages that don't use it pay
   nothing.

   Notes:
   - All gsap plugins are import-safe under Node
     (no window access at module scope), so Next.js
     SSR module-eval is fine.
   - Animations only ever run on the client.
   ═══════════════════════════════════════════ */

import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/* Register once — guard against double-registration under HMR. */
if (!(gsap as any).__cvRegistered) {
  gsap.registerPlugin(useGSAP, ScrollTrigger);
  (gsap as any).__cvRegistered = true;

  /* Signature easings used across the app. */
  gsap.registerEase("cvSoft", (p: number) => 1 - Math.pow(1 - p, 3));
}

/* Named exports so components use one import path. */
export { gsap, useGSAP, ScrollTrigger };

/**
 * True when the user asked for less motion. Read lazily so it is
 * always false during SSR (no window), then correct on the client.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
