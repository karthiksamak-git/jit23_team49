"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useGame } from "@/lib/game-context";
import { GlobalMentorAgent } from "@/components/global-mentor-agent";
import { ProfilePanel } from "@/components/profile-panel";
import { HoverButton } from "@/components/ui/hover-glow-button";
import { startTimeTracking } from "@/lib/activity";
import { gsap, ScrollTrigger, prefersReducedMotion } from "@/lib/gsap";
import { Flame, Volume2, VolumeX, Hexagon } from "lucide-react";

/* ═══════════════════════════════════════════
   APP LAYOUT — Top navigation bar
   Professional labels, colorful accents
   ═══════════════════════════════════════════ */

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileNav, setMobileNav] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const { player, signOut, soundOn, toggleSound, sfx } = useGame();
  const prevCoins = useRef<number | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  /* Scroll progress bar — GSAP ScrollTrigger scales a gradient bar across
     the top edge as the page scrolls. No-ops for reduced-motion users. */
  useEffect(() => {
    if (prefersReducedMotion() || !progressRef.current) return;
    const el = progressRef.current;
    gsap.set(el, { scaleX: 0, transformOrigin: "left center" });

    const st = ScrollTrigger.create({
      trigger: document.body,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => {
        gsap.set(el, { scaleX: self.progress });
      },
    });

    return () => {
      st.kill();
      gsap.set(el, { clearProps: "transform" });
    };
  }, []);

  /* Real study-time tracker: ticks visible-app seconds into the activity
     log so the profile's hours/calendar are measured, not invented. */
  useEffect(() => {
    const stop = startTimeTracking();
    return stop;
  }, []);

  /* The avatar in the top bar opens the profile panel — there is no separate
     Profile tab. Close it on outside click or Escape, and let any page ask
     for it with the `careerverse:open-profile` event. */
  useEffect(() => {
    if (!profileOpen) return;
    const onDown = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setProfileOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [profileOpen]);

  useEffect(() => {
    const open = () => {
      setMobileNav(false);
      setProfileOpen(true);
    };
    window.addEventListener("careerverse:open-profile", open);
    return () => window.removeEventListener("careerverse:open-profile", open);
  }, []);

  // Soft coin ping when the balance grows
  useEffect(() => {
    if (prevCoins.current === null) {
      prevCoins.current = player.coins;
      return;
    }
    if (player.coins > prevCoins.current) sfx("coin");
    prevCoins.current = player.coins;
  }, [player.coins, sfx]);

  const routes = [
    { label: "Dashboard", href: "/dashboard", color: "text-[#22d3ee]", glow: "#22d3ee" },
    { label: "World Map", href: "/world-map", color: "text-[#c084fc]", glow: "#c084fc" },
    { label: "Practice Lab", href: "/sandbox", color: "text-[#fbbf24]", glow: "#fbbf24" },
    { label: "Mock Interview", href: "/interview", color: "text-[#fb7185]", glow: "#fb7185" },
    { label: "Jobs", href: "/opportunities", color: "text-[#34d399]", glow: "#34d399" },
    { label: "Collection", href: "/portfolio", color: "text-[#c084fc]", glow: "#c084fc" },
  ];

  const isBoarding = pathname === "/onboarding";

  return (
    <div className="relative min-h-screen bg-[#040506] text-[#c8c0b0]">
      {/* ══════ AURORA LIVING BACKGROUND ══════ */}
      <div className="aurora-bg" aria-hidden>
        <div className="aurora-core" />
      </div>
      <div className="aurora-stars" aria-hidden />

      {/* Vignette */}
      <div className="vignette" />

      {/* ══════ TOP BAR (Hidden on Onboarding) ══════ */}
      {!isBoarding && (
        <header className="fixed top-0 left-0 right-0 z-40 glass-bar">
          {/* Scroll progress bar (GSAP) */}
          <div
            ref={progressRef}
            aria-hidden="true"
            className="absolute bottom-0 left-0 h-[2px] w-full bg-[#b49b64] opacity-60"
          />
          <div className="flex items-center justify-between px-4 md:px-5 h-14 max-w-6xl mx-auto">

            {/* Left: profile button → profile panel (no separate tab) */}
            <div ref={profileRef} className="relative">
              <button
                onClick={() => {
                  sfx("click");
                  setProfileOpen((o) => !o);
                }}
                onMouseEnter={() => sfx("hover")}
                aria-label="Open profile"
                aria-expanded={profileOpen}
                className="flex items-center gap-3 group cursor-pointer"
              >
                {/* Avatar button — initial medallion instead of the old image */}
                <div className={`w-9 h-9 rounded-full border bg-[#0a0b0d] flex items-center justify-center font-cinzel text-sm font-bold text-[#e8dfc8] transition-all ${
                  profileOpen
                    ? "border-[#d4bf8a] shadow-[0_0_16px_rgba(212,191,138,0.45)]"
                    : "border-[#b49b64]/50 group-hover:border-[#d4bf8a] group-hover:shadow-[0_0_14px_rgba(180,155,100,0.35)]"
                }`}>
                  {(player.characterName || "?").charAt(0).toUpperCase()}
                </div>
                <div className="hidden sm:block text-left">
                  <span className="text-xs font-semibold tracking-wider group-hover:brightness-125 transition-all aurora-text-soft">
                    {player.characterName}
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono text-[9px] text-[#6b6358]">Lv.{player.level}</span>
                    {/* XP bar */}
                    <div className="xp-track w-16 h-[3px] rounded-full">
                      <div className="xp-fill-teal rounded-full" style={{ width: `${player.xpToNext > 0 ? Math.min(100, (player.xp / player.xpToNext) * 100) : 0}%` }} />
                    </div>
                    <span className="font-mono text-[9px] text-[#3d3830]">{player.xp}/{player.xpToNext}</span>
                  </div>
                </div>
              </button>

              {/* Profile panel — the whole profile, anchored under the avatar */}
              <AnimatePresence>
                {profileOpen && (
                  <motion.div
                    key="profile-panel"
                    initial={{ opacity: 0, y: -10, scale: 0.985 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.985 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    className="absolute left-0 top-full mt-2 w-[min(calc(100vw-2rem),52rem)] max-h-[calc(100vh-5.5rem)] overflow-y-auto rounded-2xl border border-[#2a2520] bg-[#06070a]/97 backdrop-blur-xl shadow-[0_24px_60px_rgba(0,0,0,0.7)] profile-panel-scroll z-50"
                  >
                    <ProfilePanel onClose={() => setProfileOpen(false)} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Center: Navigation */}
            <nav className="hidden xl:flex items-center gap-0.5">
              {routes.map((r) => {
                const active = pathname === r.href || pathname?.startsWith(r.href + "/");
                return (
                  <HoverButton
                    key={r.href}
                    href={r.href}
                    glowColor={r.glow}
                    backgroundColor="transparent"
                    textColor={active ? "#e8dfc8" : "#8a8175"}
                    hoverTextColor="#e8dfc8"
                    onClick={() => sfx("click")}
                    onMouseEnter={() => sfx("hover")}
                    className={`nav-pill px-4 py-2 text-xs tracking-wider font-semibold rounded-lg ${
                      active ? "nav-pill-active" : ""
                    }`}
                  >
                    <span className="flex flex-col items-center gap-1 w-full">
                      {r.label}
                      {/* visible accent bar for the active tab */}
                      <span
                        className={`h-[3px] w-full rounded-full transition-all ${active ? "opacity-100" : "opacity-0"}`}
                        style={{ background: r.glow, boxShadow: `0 0 8px ${r.glow}` }}
                      />
                    </span>
                  </HoverButton>
                );
              })}
            </nav>

            {/* Right: Stats & Sign Out */}
            <div className="flex items-center gap-3">
              {/* Streak */}
              <div className="flex items-center gap-1 float-idle">
                <Flame className="w-3.5 h-3.5 text-[#fbbf24]" strokeWidth={2} />
                <span className="text-xs font-mono font-bold text-[#fbbf24]">{player.streak}</span>
              </div>
              {/* Sound toggle */}
              <button
                onClick={toggleSound}
                className="text-sm transition-all hover:scale-110 cursor-pointer"
                title={soundOn ? "Mute sound effects" : "Unmute sound effects"}
              >
                {soundOn ? <Volume2 className="w-4 h-4" strokeWidth={2} /> : <VolumeX className="w-4 h-4" strokeWidth={2} />}
              </button>
              {/* Coins */}
              <div className="flex items-center gap-1">
                <Hexagon className="w-3.5 h-3.5 text-[#c084fc] float-idle" strokeWidth={2} style={{ animationDelay: "-2.2s" }} />
                <span className="text-xs font-mono font-bold text-[#c084fc]">{player.coins.toLocaleString()}</span>
              </div>

              {/* Sign Out Button */}
              <button
                onClick={signOut}
                className="hidden sm:flex items-center text-[11px] font-semibold text-[#fb7185] bg-[#fb7185]/10 hover:bg-[#fb7185]/20 px-2.5 py-1 rounded-lg border border-[#fb7185]/30 transition-all cursor-pointer"
                title="Sign Out"
              >
                Sign Out
              </button>

              {/* Mobile toggle */}
              <button
                onClick={() => setMobileNav(!mobileNav)}
                className="xl:hidden text-[#6b6358] hover:text-[#c8c0b0] transition-colors px-1"
              >
                <svg viewBox="0 0 20 20" className="w-5 h-5" fill="currentColor">
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
                className="xl:hidden border-t border-[#2a2520]/30 overflow-hidden"
              >
                <div className="px-5 py-3 space-y-1">
                  {routes.map((r) => {
                    const active = pathname === r.href;
                    return (
                      <HoverButton
                        key={r.href}
                        href={r.href}
                        glowColor={r.glow}
                        backgroundColor="transparent"
                        textColor={active ? "#e8dfc8" : "#8a8175"}
                        hoverTextColor="#e8dfc8"
                        onClick={() => setMobileNav(false)}
                        className={`block w-full text-left px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                          active ? "nav-pill nav-pill-active" : ""
                        }`}
                      >
                        {r.label}
                      </HoverButton>
                    );
                  })}
                  <button
                    onClick={() => { setMobileNav(false); signOut(); }}
                    className="w-full text-left px-3 py-2.5 text-sm font-medium text-[#fb7185] hover:bg-white/5 rounded-lg transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Animated aurora sheen under the bar */}
          <div className="header-sheen" />
        </header>
      )}

      {/* ══════ MAIN CONTENT ══════ */}
      <main key={pathname} className={`page-enter relative z-10 min-h-screen ${isBoarding ? "pt-0" : "pt-14"}`}>
        {children}
      </main>

      {/* ══════ PERSISTENT AI MENTOR (after login, never on onboarding) ══════ */}
      {!isBoarding && player.isAuthenticated && <GlobalMentorAgent />}

    </div>
  );
}
