"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { useGame } from "@/lib/game-context";

/* ═══════════════════════════════════════════
   AUTH PAGE — Create Account & Sign In
   Professional, colorful, clear language.
   Redirects to /dashboard after successful auth.
   ═══════════════════════════════════════════ */

export default function AuthPage() {
  const router = useRouter();
  const { player, signIn, signUp, demoSignIn } = useGame();
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-fill name from onboarding
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedName = localStorage.getItem("character_name");
      if (savedName) setName(savedName);
    }
  }, []);

  // If already authenticated, redirect to dashboard
  useEffect(() => {
    if (player.isAuthenticated) {
      router.push("/dashboard");
    }
  }, [player.isAuthenticated, router]);

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all the fields.");
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
      router.push("/dashboard");
    } else {
      setError(result.error || "Something went wrong. Please try again.");
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-[#040506] relative">
      <div className="vignette" />

      {/* Background accents */}
      <div className="absolute top-1/4 left-1/3 w-[400px] h-[400px] rounded-full bg-[#06b6d4] opacity-[0.03] blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-[400px] h-[400px] rounded-full bg-[#a855f7] opacity-[0.03] blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md space-y-6"
      >
        {/* Title */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-block">
            <h1 className="font-cinzel text-3xl font-bold tracking-widest">
              <span className="text-[#06b6d4]">CAREER</span>
              <span className="text-[#a855f7]">VERSE</span>
            </h1>
          </Link>
          <p className="text-xs text-[#6b6358] tracking-wider">
            {mode === "signup" ? "Create your free account" : "Welcome back! Sign in to continue"}
          </p>
        </div>

        {/* Auth Mode Toggle */}
        <div className="flex rounded-xl border border-[#2a2520] bg-[#0a0b0d] p-1">
          <button
            onClick={() => { setMode("signup"); setError(null); }}
            className={`flex-1 py-2.5 text-xs font-semibold tracking-wider rounded-lg transition-all ${
              mode === "signup"
                ? "bg-gradient-to-r from-[#06b6d4]/15 to-[#a855f7]/15 text-[#22d3ee] border border-[#06b6d4]/30"
                : "text-[#6b6358] hover:text-[#c8c0b0]"
            }`}
          >
            Create Account
          </button>
          <button
            onClick={() => { setMode("signin"); setError(null); }}
            className={`flex-1 py-2.5 text-xs font-semibold tracking-wider rounded-lg transition-all ${
              mode === "signin"
                ? "bg-gradient-to-r from-[#06b6d4]/15 to-[#a855f7]/15 text-[#22d3ee] border border-[#06b6d4]/30"
                : "text-[#6b6358] hover:text-[#c8c0b0]"
            }`}
          >
            Sign In
          </button>
        </div>

        {/* Auth Form */}
        <div className="rounded-2xl p-6 space-y-5 bg-[#0a0b0d]/80 border border-[#2a2520] backdrop-blur-sm">
          <form onSubmit={handleAuth} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <label className="block text-[10px] text-[#6b6358] uppercase tracking-widest font-medium">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name..."
                  className="w-full bg-[#060708] border border-[#2a2520] rounded-lg px-4 py-2.5 text-sm text-[#e8dfc8] placeholder:text-[#3d3830] focus:outline-none focus:border-[#06b6d4] transition-colors"
                  required
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-[10px] text-[#6b6358] uppercase tracking-widest font-medium">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-[#060708] border border-[#2a2520] rounded-lg px-4 py-2.5 font-mono text-sm text-[#e8dfc8] placeholder:text-[#3d3830] focus:outline-none focus:border-[#06b6d4] transition-colors"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] text-[#6b6358] uppercase tracking-widest font-medium">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#060708] border border-[#2a2520] rounded-lg px-4 py-2.5 font-mono text-sm text-[#e8dfc8] placeholder:text-[#3d3830] focus:outline-none focus:border-[#06b6d4] transition-colors"
                required
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#f43f5e]/10 border border-[#f43f5e]/20">
                <span className="text-[#fb7185] text-xs">⚠</span>
                <p className="text-xs text-[#fb7185]">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 rounded-xl text-sm font-semibold uppercase tracking-wider mt-2 disabled:opacity-50"
            >
              <span>
                {loading
                  ? "Please wait..."
                  : mode === "signup"
                  ? "Create Account & Continue →"
                  : "Sign In →"}
              </span>
            </button>
          </form>

          {/* Demo bypass for development */}
          <div className="pt-3 border-t border-[#2a2520]/50 text-center">
            <button
              onClick={() => {
                demoSignIn(name || undefined);
                router.push("/dashboard");
              }}
              className="text-[10px] text-[#6b6358] hover:text-[#06b6d4] transition-colors"
            >
              ⚡ Quick Demo Access (skip signup)
            </button>
          </div>
        </div>

        {/* Back to onboarding link */}
        <p className="text-center text-[10px] text-[#3d3830]">
          Haven&apos;t taken the assessment yet?{" "}
          <Link href="/onboarding" className="text-[#06b6d4] hover:underline">
            Start here
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
