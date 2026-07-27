"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useGame } from "@/lib/game-context";
import { motion, AnimatePresence } from "framer-motion";

import { CleanSamuraiImg } from "@/lib/clean-samurai";

/* ═══════════════════════════════════════════
   SAMURAI WARRIOR — Fierce Samurai PNG Image
   ═══════════════════════════════════════════ */
function SamuraiWarrior() {
  return (
    <div className="relative flex flex-col items-center justify-center">
      <CleanSamuraiImg
        alt="Fierce Samurai Warrior"
        className="w-[260px] md:w-[340px] h-auto object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.95)] transition-transform duration-500 hover:scale-105"
      />
      {/* Soft ambient ground shadow */}
      <div className="w-48 h-4 bg-[#b49b64]/20 rounded-[100%] blur-md -mt-4 pointer-events-none" />
    </div>
  );
}

/* Narrative typewriter reveal for first visit */
function NarrativeReveal({ lines, onComplete }: { lines: string[]; onComplete: () => void }) {
  const [lineIndex, setLineIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [finished, setFinished] = useState<string[]>([]);

  useEffect(() => {
    if (lineIndex >= lines.length) {
      onComplete();
      return;
    }
    const line = lines[lineIndex];
    if (charIndex < line.length) {
      const t = setTimeout(() => setCharIndex((c) => c + 1), 45);
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(() => {
        setFinished((f) => [...f, line]);
        setLineIndex((l) => l + 1);
        setCharIndex(0);
      }, 800);
      return () => clearTimeout(t);
    }
  }, [lineIndex, charIndex, lines, onComplete]);

  return (
    <div className="space-y-4 max-w-lg mx-auto text-center">
      {finished.map((l, i) => (
        <p key={i} className="font-cinzel text-sm md:text-base text-[#6b6358] tracking-wide leading-relaxed">
          {l}
        </p>
      ))}
      {lineIndex < lines.length && (
        <p className="font-cinzel text-sm md:text-base text-[#b49b64] tracking-wide leading-relaxed">
          {lines[lineIndex].slice(0, charIndex)}
          <span className="inline-block w-[1.5px] h-[1em] bg-[#b49b64] ml-0.5 opacity-60 cursor-blink" />
        </p>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   AUTHENTICATED PLAYER HOME DASHBOARD
   Appears after successful login!
   ═══════════════════════════════════════════ */
function LoggedInHomeHub() {
  const { player, signOut } = useGame();
  return (
    <div className="relative z-10 w-full max-w-4xl mx-auto px-6 py-12 space-y-8">
      {/* Top Banner */}
      <div className="scroll-surface rounded p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] text-[#4a7a5a] uppercase tracking-widest px-2 py-0.5 rounded border border-[#4a7a5a]/30 bg-[#4a7a5a]/10">
              Active Warrior
            </span>
            <span className="font-mono text-[10px] text-[#6b6358]">Level {player.level} Ronin</span>
          </div>
          <h1 className="font-cinzel text-2xl md:text-4xl font-bold text-[#c8c0b0] tracking-wider">
            Welcome back, <span className="text-[#b49b64]">{player.characterName}</span>
          </h1>
          <p className="font-cinzel text-xs text-[#6b6358] italic leading-relaxed max-w-lg">
            Master Kael awaits your next move in the <strong className="text-[#b49b64]">{player.realmName}</strong>. Your blade grows sharper with every completed trial.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/world-map"
            className="btn-blood px-6 py-3 rounded text-xs uppercase tracking-widest flex items-center gap-2"
          >
            Enter World Map →
          </Link>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="surface rounded p-5 space-y-2">
          <span className="font-mono text-[10px] text-[#6b6358] uppercase tracking-wider block">
            Experience Points
          </span>
          <p className="font-mono text-2xl font-bold text-[#b49b64]">{player.xp} <span className="text-xs text-[#6b6358]">XP</span></p>
          <p className="font-mono text-[10px] text-[#4a7a5a]">{Math.max(0, player.xpToNext - player.xp)} XP to next level</p>
        </div>

        <div className="surface rounded p-5 space-y-2">
          <span className="font-mono text-[10px] text-[#6b6358] uppercase tracking-wider block">
            Training Streak
          </span>
          <p className="font-mono text-2xl font-bold text-[#c8c0b0]">🔥 {player.streak} <span className="text-xs text-[#6b6358]">Days</span></p>
          <p className="font-mono text-[10px] text-[#6b6358]">Active Today</p>
        </div>

        <div className="surface rounded p-5 space-y-2">
          <span className="font-mono text-[10px] text-[#6b6358] uppercase tracking-wider block">
            Primary Realm Fit
          </span>
          <p className="font-mono text-2xl font-bold text-[#b49b64]">{player.realmFit}%</p>
          <p className="font-mono text-[10px] text-[#6b6358]">{player.realmName}</p>
        </div>

        <div className="surface rounded p-5 space-y-2">
          <span className="font-mono text-[10px] text-[#6b6358] uppercase tracking-wider block">
            Guild Coins
          </span>
          <p className="font-mono text-2xl font-bold text-[#c8c0b0]">⬡ {player.coins.toLocaleString()}</p>
          <p className="font-mono text-[10px] text-[#6b6358]">Ready to Spend</p>
        </div>
      </div>

      {/* Main Realm Gateway Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="scroll-surface rounded p-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <span className="font-mono text-[10px] text-[#b49b64] uppercase tracking-widest">
              Active Quest
            </span>
            <h3 className="font-cinzel text-lg font-bold text-[#c8c0b0]">
              The World Map
            </h3>
            <p className="text-xs text-[#6b6358] leading-relaxed">
              Explore your personalized branching roadmap with level icons. Traverse nodes, unlock regions, and take down boss compilers.
            </p>
          </div>
          <Link
            href="/world-map"
            className="btn-scroll text-center py-2.5 rounded text-xs uppercase tracking-widest w-full"
          >
            Open Map →
          </Link>
        </div>

        <div className="scroll-surface rounded p-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <span className="font-mono text-[10px] text-[#8b2020] uppercase tracking-widest">
              Combat Practice
            </span>
            <h3 className="font-cinzel text-lg font-bold text-[#c8c0b0]">
              The Dojo
            </h3>
            <p className="text-xs text-[#6b6358] leading-relaxed">
              Enter the sparring ring against Master Kael. Answer questions to deal strikes and protect your health bar.
            </p>
          </div>
          <Link
            href="/worlds/backend"
            className="btn-blood text-center py-2.5 rounded text-xs uppercase tracking-widest w-full"
          >
            Enter Dojo →
          </Link>
        </div>

        <div className="scroll-surface rounded p-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <span className="font-mono text-[10px] text-[#4a7a5a] uppercase tracking-widest">
              Warrior Records
            </span>
            <h3 className="font-cinzel text-lg font-bold text-[#c8c0b0]">
              Quest Log & Scrolls
            </h3>
            <p className="text-xs text-[#6b6358] leading-relaxed">
              Review completed chapters, sealed skills, and proof-of-work achievements recorded in your personal scroll.
            </p>
          </div>
          <Link
            href="/portfolio"
            className="btn-scroll text-center py-2.5 rounded text-xs uppercase tracking-widest w-full"
          >
            View Scrolls →
          </Link>
        </div>
      </div>

      {/* Footer controls */}
      <div className="pt-6 border-t border-[rgba(180,155,100,0.08)] flex items-center justify-between text-xs font-mono text-[#5a5548]">
        <span>Logged in as {player.characterName}</span>
        <button
          onClick={signOut}
          className="hover:text-[#b49b64] transition-colors uppercase tracking-wider"
        >
          Sign Out / Change Identity
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN HOME PAGE ROUTER
   ═══════════════════════════════════════════ */
export default function LandingPage() {
  const { player, loading } = useGame();
  const [narrativeDone, setNarrativeDone] = useState(false);

  const onNarrativeComplete = useCallback(() => setNarrativeDone(true), []);

  const story = [
    "Every master was once a wanderer without direction.",
    "The ancient scrolls speak of a path — hidden, guarded, earned.",
    "Only those who seek will find where their craft truly lies.",
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#040506]">
        <div className="vignette" />
        <p className="font-cinzel text-sm text-[#6b6358] tracking-wider animate-pulse">Entering the realm...</p>
      </div>
    );
  }

  if (player.isAuthenticated) {
    return (
      <div className="relative min-h-screen bg-[#040506]">
        <div className="vignette" />
        <LoggedInHomeHub />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-[#040506]">
      <div className="vignette" />

      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-[#b49b64] opacity-[0.015] blur-[120px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center px-6 py-20 gap-10">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5 }}
          className="text-center space-y-2"
        >
          <h1 className="font-cinzel text-4xl md:text-6xl font-bold tracking-[0.15em] text-[#c8c0b0]">
            CAREER<span className="text-[#b49b64]">VERSE</span>
          </h1>
          <div className="flex items-center justify-center gap-4">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-[#b49b64]/30" />
            <span className="font-cinzel text-[10px] tracking-[0.4em] text-[#6b6358] uppercase">
              FORGE YOUR DESTINY • MASTER YOUR CRAFT
            </span>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-[#b49b64]/30" />
          </div>
        </motion.div>

        {/* Uploaded Silhouette Character */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.5, delay: 0.6 }}
        >
          <SamuraiWarrior />
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.8 }}
        >
          <NarrativeReveal lines={story} onComplete={onNarrativeComplete} />
        </motion.div>

        <AnimatePresence>
          {narrativeDone && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="flex flex-col items-center gap-5 mt-4"
            >
              <Link
                href="/onboarding"
                className="btn-scroll px-10 py-3.5 rounded text-sm uppercase tracking-widest"
              >
                Begin Your Journey
              </Link>
              <span className="font-mono text-[10px] text-[#3d3830] tracking-wider">
                Your story begins with a single choice
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
