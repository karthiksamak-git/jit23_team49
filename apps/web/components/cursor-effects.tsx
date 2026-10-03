"use client";

import React, { useEffect, useRef, useState } from "react";

/* ═══════════════════════════════════════════
   PROFESSIONAL CURSOR — subtle & restrained
   • Small neutral pointer dot with soft ring
   • Gentle ripple on click (single, quiet)
   • No particle trails, no rainbow colors
   Auto-disabled on touch / reduced motion.
   ═══════════════════════════════════════════ */

export function CursorEffects() {
  const [enabled, setEnabled] = useState(false);
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: -100, y: -100, rx: -100, ry: -100 });
  const raf = useRef(0);
  const hovering = useRef(false);

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setEnabled(fine && !reduced);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    function onMove(e: MouseEvent) {
      pos.current.x = e.clientX;
      pos.current.y = e.clientY;
      const t = e.target as HTMLElement | null;
      hovering.current = !!t?.closest("a, button, input, select, textarea, [role='button']");
      if (ringRef.current) {
        ringRef.current.style.borderColor = hovering.current
          ? "rgba(34, 211, 238, 0.55)"
          : "rgba(148, 163, 184, 0.30)";
      }
    }

    function onDown(e: MouseEvent) {
      const ripple = document.createElement("span");
      ripple.className = "cursor-ripple";
      ripple.style.left = `${e.clientX}px`;
      ripple.style.top = `${e.clientY}px`;
      document.body.appendChild(ripple);
      window.setTimeout(() => ripple.remove(), 650);
    }

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mousedown", onDown);

    function tick() {
      pos.current.rx += (pos.current.x - pos.current.rx) * 0.16;
      pos.current.ry += (pos.current.y - pos.current.ry) * 0.16;
      if (dotRef.current) {
        dotRef.current.style.transform = `translate(${pos.current.x}px, ${pos.current.y}px)`;
      }
      if (ringRef.current) {
        ringRef.current.style.transform = `translate(${pos.current.rx}px, ${pos.current.ry}px) scale(${hovering.current ? 1.35 : 1})`;
      }
      raf.current = requestAnimationFrame(tick);
    }
    raf.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mousedown", onDown);
      cancelAnimationFrame(raf.current);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <>
      <div ref={dotRef} className="cursor-dot" aria-hidden />
      <div ref={ringRef} className="cursor-ring" aria-hidden />
    </>
  );
}
