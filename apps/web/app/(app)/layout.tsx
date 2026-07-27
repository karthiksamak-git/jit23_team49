"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useGame } from "@/lib/game-context";
import { CleanSamuraiImg } from "@/lib/clean-samurai";
import { GlobalMentorAgent } from "@/components/global-mentor-agent";

/* ═══════════════════════════════════════════
   APP LAYOUT — Minimal Forge HUD
   No sidebar. Thin top bar. Dark atmosphere.
   ═══════════════════════════════════════════ */

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileNav, setMobileNav] = useState(false);
  const { player } = useGame();

  const routes = [
    { label: "World Map", href: "/world-map" },
    { label: "The Dojo", href: "/worlds/backend" },
    { label: "AI Interview", href: "/interview" },
    { label: "Jobs & Internships", href: "/opportunities" },
    { label: "Training", href: "/sandbox" },
    { label: "Quest Log", href: "/discover" },
    { label: "Scrolls", href: "/portfolio" },
  ];

  return (
    <div className="relative min-h-screen bg-[#040506] text-[#c8c0b0]">
      {/* Vignette */}
      <div className="vignette" />

      {/* ══════ TOP BAR ══════ */}
      <header className="fixed top-0 left-0 right-0 z-40 surface border-b border-[rgba(180,155,100,0.12)]">
        <div className="flex items-center justify-between px-5 h-12 max-w-6xl mx-auto">

          {/* Left: Identity */}
          <Link href="/" className="flex items-center gap-3 group">
            {/* Seal avatar */}
            <div className="w-7 h-7 rounded-full border border-[#b49b64]/40 bg-[#0a0b0d] flex items-center justify-center p-0.5 overflow-hidden shadow-sm">
              <CleanSamuraiImg alt="Warrior Avatar" className="w-full h-full object-contain" />
            </div>
            <div className="hidden sm:block">
              <span className="font-cinzel text-xs font-bold text-[#b49b64] tracking-wider group-hover:text-[#d4bf8a] transition-colors">
                {player.characterName}
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-mono text-[9px] text-[#6b6358]">Lv.{player.level}</span>
                {/* XP micro-bar */}
                <div className="xp-track w-16 h-[3px]">
                  <div className="xp-fill" style={{ width: `${player.xpToNext > 0 ? Math.min(100, (player.xp / player.xpToNext) * 100) : 0}%` }} />
                </div>
                <span className="font-mono text-[9px] text-[#3d3830]">{player.xp}/{player.xpToNext}</span>
              </div>
            </div>
          </Link>

          {/* Center: Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {routes.map((r) => {
              const active = pathname === r.href || pathname?.startsWith(r.href + "/");
              return (
                <Link
                  key={r.href}
                  href={r.href}
                  className={`px-3 py-1.5 text-xs tracking-widest uppercase font-cinzel transition-colors rounded ${
                    active
                      ? "text-[#b49b64] bg-[#b49b64]/8 border border-[#b49b64]/20"
                      : "text-[#6b6358] hover:text-[#c8c0b0]"
                  }`}
                >
                  {r.label}
                </Link>
              );
            })}
          </nav>

          {/* Right: Stats */}
          <div className="flex items-center gap-3">
            {/* Streak */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-[#6b6358] font-mono">🔥</span>
              <span className="text-xs font-mono font-bold text-[#c8c0b0]">{player.streak}</span>
            </div>
            {/* Coins */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-[#b49b64]">⬡</span>
              <span className="text-xs font-mono font-bold text-[#c8c0b0]">{player.coins.toLocaleString()}</span>
            </div>

            {/* Mobile toggle */}
            <button
              onClick={() => setMobileNav(!mobileNav)}
              className="md:hidden text-[#6b6358] hover:text-[#c8c0b0] transition-colors px-1"
            >
              <svg viewBox="0 0 20 20" className="w-4 h-4" fill="currentColor">
                <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile nav dropdown */}
        <AnimatePresence>
          {mobileNav && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden border-t border-[rgba(180,155,100,0.08)] overflow-hidden"
            >
              <div className="px-5 py-3 space-y-1">
                {routes.map((r) => (
                  <Link
                    key={r.href}
                    href={r.href}
                    onClick={() => setMobileNav(false)}
                    className={`block px-3 py-2 text-sm font-cinzel tracking-wider ${
                      pathname === r.href ? "text-[#b49b64]" : "text-[#6b6358] hover:text-[#c8c0b0]"
                    }`}
                  >
                    {r.label}
                  </Link>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ══════ MAIN CONTENT ══════ */}
      <main className="relative z-10 pt-12 min-h-screen">
        {children}
      </main>

      {/* ══════ PERSISTENT GLOBAL AI MENTOR AGENT ══════ */}
      <GlobalMentorAgent />
    </div>
  );
}
