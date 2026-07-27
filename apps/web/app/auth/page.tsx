"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { useGame } from "@/lib/game-context";

/* ═══════════════════════════════════════════
   AUTH PAGE — Sign Up & Sign In
   Styled in CareerVerse vintage parchment.
   Uses GameContext for auth — tries API first,
   falls back to local mock when backend is offline.
   ═══════════════════════════════════════════ */

export default function AuthPage() {
  const router = useRouter();
  const { player, signIn, signUp, demoSignIn } = useGame();
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [name, setName] = useState("Master Ronin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-fill character name from onboarding
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedName = localStorage.getItem("character_name");
      if (savedName) setName(savedName);
    }
  }, []);

  // If already authenticated, redirect to home
  useEffect(() => {
    if (player.isAuthenticated) {
      router.push("/");
    }
  }, [player.isAuthenticated, router]);

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all required fields.");
      return;
    }

    setLoading(true);
    setError(null);

    let result: { ok: boolean; error?: string };

    if (mode === "signup") {
      result = await signUp(name, email, password);
    } else {
      result = await signIn(email, password);
    }

    setLoading(false);

    if (result.ok) {
      router.push("/");
    } else {
      setError(result.error || "Authentication failed. Please try again.");
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-[#040506] relative">
      <div className="vignette" />

      <div className="relative z-10 w-full max-w-md space-y-6">
        {/* Title */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-block">
            <h1 className="font-cinzel text-3xl font-bold tracking-widest text-[#c8c0b0]">
              CAREER<span className="text-[#b49b64]">VERSE</span>
            </h1>
          </Link>
          <p className="font-cinzel text-xs text-[#6b6358] tracking-wider uppercase">
            {mode === "signup" ? "Seal Your Warrior Scroll" : "Enter The Guild"}
          </p>
        </div>

        {/* Auth Mode Toggle */}
        <div className="flex rounded border border-[rgba(180,155,100,0.15)] bg-[#0a0b0d] p-1">
          <button
            onClick={() => { setMode("signup"); setError(null); }}
            className={`flex-1 py-2 text-xs font-cinzel tracking-wider rounded transition-colors ${
              mode === "signup"
                ? "bg-[#1a1714] text-[#b49b64] border border-[#b49b64]/30"
                : "text-[#6b6358] hover:text-[#c8c0b0]"
            }`}
          >
            Create Warrior Scroll
          </button>
          <button
            onClick={() => { setMode("signin"); setError(null); }}
            className={`flex-1 py-2 text-xs font-cinzel tracking-wider rounded transition-colors ${
              mode === "signin"
                ? "bg-[#1a1714] text-[#b49b64] border border-[#b49b64]/30"
                : "text-[#6b6358] hover:text-[#c8c0b0]"
            }`}
          >
            Sign In
          </button>
        </div>

        {/* Auth Form Box */}
        <div className="scroll-surface rounded p-6 space-y-5">
          <form onSubmit={handleAuth} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <label className="block font-mono text-[10px] text-[#6b6358] uppercase tracking-widest">
                  Warrior Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Master Ronin"
                  className="w-full bg-[#0a0b0d] border border-[#b49b64]/25 rounded px-4 py-2.5 font-cinzel text-sm text-[#c8c0b0] placeholder:text-[#3d3830] focus:outline-none focus:border-[#b49b64]"
                  required
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block font-mono text-[10px] text-[#6b6358] uppercase tracking-widest">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="warrior@careerverse.dev"
                className="w-full bg-[#0a0b0d] border border-[#b49b64]/25 rounded px-4 py-2.5 font-mono text-sm text-[#c8c0b0] placeholder:text-[#3d3830] focus:outline-none focus:border-[#b49b64]"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="block font-mono text-[10px] text-[#6b6358] uppercase tracking-widest">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#0a0b0d] border border-[#b49b64]/25 rounded px-4 py-2.5 font-mono text-sm text-[#c8c0b0] placeholder:text-[#3d3830] focus:outline-none focus:border-[#b49b64]"
                required
              />
            </div>

            {error && (
              <p className="font-mono text-xs text-[#c43030] text-center pt-1">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-scroll w-full py-3 rounded text-xs uppercase tracking-widest mt-2"
            >
              {loading
                ? "Sealing Credentials..."
                : mode === "signup"
                ? "Seal Scroll & Enter Realm →"
                : "Enter Guild →"}
            </button>
          </form>

          {/* Quick Demo Bypass */}
          <div className="pt-3 border-t border-[rgba(180,155,100,0.08)] text-center">
            <button
              onClick={() => {
                demoSignIn(name);
                router.push("/");
              }}
              className="font-mono text-[10px] text-[#6b6358] hover:text-[#b49b64] transition-colors"
            >
              ⚡ Fast Entry as Demo Warrior ({name || "Master Ronin"})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
