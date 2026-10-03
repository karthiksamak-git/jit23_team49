"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useGame } from "@/lib/game-context";
import { motion, AnimatePresence } from "framer-motion";
import { CleanSamuraiImg } from "@/lib/clean-samurai";

/* ═══════════════════════════════════════════
   LANDING PAGE — Public welcome page
   Authenticated users redirect to /dashboard
   ═══════════════════════════════════════════ */

function HeroCharacter() {
  return (
    <div className="relative flex flex-col items-center justify-center">
      <CleanSamuraiImg
        alt="CareerVerse Mascot"
        className="w-[320px] md:w-[420px] h-auto object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.95)] transition-transform duration-500 hover:scale-105"
      />
      <div className="w-56 h-5 bg-[#06b6d4]/15 rounded-[100%] blur-md -mt-5 pointer-events-none" />
    </div>
  );
}

/* Typewriter reveal for landing page */
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
      const t = setTimeout(() => setCharIndex((c) => c + 1), 40);
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(() => {
        setFinished((f) => [...f, line]);
        setLineIndex((l) => l + 1);
        setCharIndex(0);
      }, 700);
      return () => clearTimeout(t);
    }
  }, [lineIndex, charIndex, lines, onComplete]);

  return (
    <div className="space-y-4 max-w-lg mx-auto text-center">
      {finished.map((l, i) => (
        <p key={i} className="text-sm md:text-base text-[#6b6358] tracking-wide leading-relaxed">
          {l}
        </p>
      ))}
      {lineIndex < lines.length && (
        <p className="text-sm md:text-base text-[#06b6d4] tracking-wide leading-relaxed">
          {lines[lineIndex].slice(0, charIndex)}
          <span className="inline-block w-[1.5px] h-[1em] bg-[#06b6d4] ml-0.5 opacity-60 cursor-blink" />
        </p>
      )}
    </div>
  );
}

export default function LandingPage() {
  const { player, loading } = useGame();
  const router = useRouter();
  const [narrativeDone, setNarrativeDone] = useState(false);

  const onNarrativeComplete = useCallback(() => setNarrativeDone(true), []);

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (!loading && player.isAuthenticated) {
      router.push("/dashboard");
    }
  }, [loading, player.isAuthenticated, router]);

  const story = [
    "Not sure which IT career is right for you?",
    "CareerVerse uses AI to discover your strengths and interests.",
    "Let's find the perfect path — from where you are to where you want to be.",
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#040506]">
        <div className="vignette" />
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#06b6d4] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[#6b6358] tracking-wider animate-pulse">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render landing if authenticated (will redirect)
  if (player.isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#040506]">
        <div className="vignette" />
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#06b6d4] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[#6b6358] tracking-wider">Going to your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-[#040506]">
      <div className="vignette" />

      {/* Background color blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] rounded-full bg-[#06b6d4] opacity-[0.025] blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/3 w-[500px] h-[500px] rounded-full bg-[#a855f7] opacity-[0.025] blur-[120px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center px-6 py-16 gap-8">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2 }}
          className="text-center space-y-2"
        >
          <h1 className="font-cinzel text-4xl md:text-6xl font-bold tracking-[0.12em]">
            <span className="text-[#06b6d4]">CAREER</span>
            <span className="text-[#a855f7]">VERSE</span>
          </h1>
          <div className="flex items-center justify-center gap-4">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-[#06b6d4]/40" />
            <span className="text-[10px] tracking-[0.3em] text-[#6b6358] uppercase">
              Discover Your IT Career Path
            </span>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-[#a855f7]/40" />
          </div>
        </motion.div>

        {/* Mascot */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.4 }}
        >
          <HeroCharacter />
        </motion.div>

        {/* Narrative typewriter */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.2 }}
        >
          <NarrativeReveal lines={story} onComplete={onNarrativeComplete} />
        </motion.div>

        {/* CTA */}
        <AnimatePresence>
          {narrativeDone && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="flex flex-col items-center gap-8 mt-2"
            >
              <Link
                href="/onboarding"
                className="btn-primary px-10 py-3.5 rounded-xl text-sm font-bold uppercase tracking-widest"
              >
                <span>Start Your Journey →</span>
              </Link>

              <p className="text-xs text-[#3d3830] tracking-wider">
                Already have an account?{" "}
                <Link href="/auth" className="text-[#06b6d4] hover:underline">
                  Sign in
                </Link>
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
