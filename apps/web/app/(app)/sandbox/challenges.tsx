"use client";

/* ═══════════════════════════════════════════
   PRACTICE LAB — CHALLENGES
   A LeetCode-style trainer mixed with every
   quiz format the platform supports:
   • coding problems → real judge (sample +
     hidden tests), per-language starter code,
     verdicts, and an AI "explain my mistake"
   • quiz cards → multiple choice, true/false,
     scenario, code fill, bug hunt, pseudocode
     ordering, ranking and typed answers
   ═══════════════════════════════════════════ */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play, Upload, Loader2, RotateCcw, Check, X, ChevronUp, ChevronDown,
  Lightbulb, Trophy, SkipForward, AlertTriangle, Sparkles,
} from "lucide-react";
import { useGame } from "@/lib/game-context";
import { CODE_LANGUAGES, CodeLanguage } from "@/lib/code-runner";
import {
  Challenge, QuizChallenge, CodingChallenge, Verdict, TestResult,
  QUIZ_KIND_LABELS, QUIZ_KINDS, buildSession, judgeCoding, starterFor, gradeTyped,
  explainCodingMistake, visibleSamples, resolveLearningPath,
} from "@/lib/challenges";

import { QuizCard, CodingCard } from "./challenge-cards";
/* ═══════════════════════════════════════════
   TAB ROOT — session flow
   ═══════════════════════════════════════════ */

export default function ChallengesTab() {
  const { player } = useGame();
  const level = player.difficultyLevel || "Beginner";
  /* Scope = the path the student follows on the world map (starred or
     AI-forged); the onboarding pick is only the fallback. */
  const path = useMemo(
    () => resolveLearningPath(player.recommendedDomain || player.realmName || ""),
    [player.recommendedDomain, player.realmName]
  );
  const domain = path.label;

  const [phase, setPhase] = useState<"loading" | "playing" | "summary">("loading");
  const [items, setItems] = useState<Challenge[]>([]);
  const [index, setIndex] = useState(0);
  const [outcomes, setOutcomes] = useState<Record<string, boolean>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const didInit = useRef(false);
  const buildSeq = useRef(0);

  const start = useCallback(async () => {
    const seq = ++buildSeq.current; // newest build wins; stale ones bail out
    setPhase("loading");
    setLoadError(null);
    try {
      const session = await buildSession(path, level);
      if (seq !== buildSeq.current) return;
      setItems(session);
      setIndex(0);
      setOutcomes({});
      setPhase(session.length ? "playing" : "summary");
    } catch (err) {
      if (seq !== buildSeq.current) return;
      console.warn("Challenge session failed to build:", err);
      setLoadError(err instanceof Error ? err.message : "Could not build a session.");
      setPhase("summary");
    }
  }, [path, level]);

  useEffect(() => {
    // dev StrictMode mounts twice — build exactly one session per real mount
    if (didInit.current) return;
    didInit.current = true;
    start();
  }, [start]);

  const record = useCallback((id: string, correct: boolean) => {
    setOutcomes((prev) => ({ ...prev, [id]: prev[id] || correct }));
  }, []);

  const next = useCallback(() => {
    setIndex((i) => {
      const n = i + 1;
      if (n >= items.length) setPhase("summary");
      return n;
    });
  }, [items.length]);

  const current = items[index];
  const cleared = Object.values(outcomes).filter(Boolean).length;

  if (phase === "loading") {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-[#fbbf24]" strokeWidth={2} />
        <p className="font-mono text-[11px] text-[#6b6358] tracking-widest uppercase">
          Forging challenges for {domain}…
        </p>
        <p className="text-[10px] text-[#3d3830]">
          {path.fromGeneratedPath
            ? `${path.topics.length} missions on your path · all ${QUIZ_KINDS.length} question types · curated + AI`
            : `no saved path yet · all ${QUIZ_KINDS.length} question types · curated + AI`}
        </p>
      </div>
    );
  }

  if (phase === "summary") {
    return (
      <div className="max-w-2xl mx-auto surface rounded-xl border border-[#2a2520]/60 p-6 space-y-5 text-center">
        <Trophy className="w-8 h-8 mx-auto text-[#fbbf24]" strokeWidth={1.5} />
        <h2 className="font-cinzel text-2xl font-bold text-[#e8dfc8] tracking-wider">
          {loadError ? "Session unavailable" : `${cleared} of ${items.length} cleared`}
        </h2>
        {loadError ? (
          <p className="text-sm text-[#9a9182]">{loadError}</p>
        ) : (
          <div className="space-y-1.5 text-left max-h-64 overflow-y-auto pr-1">
            {items.map((it) => {
              const ok = outcomes[it.id];
              return (
                <div key={it.id} className="flex items-center gap-2 text-xs">
                  {ok ? (
                    <Check className="w-3.5 h-3.5 text-[#34d399]" strokeWidth={3} />
                  ) : (
                    <X className="w-3.5 h-3.5 text-[#3d3830]" strokeWidth={3} />
                  )}
                  <span className="text-[#9a9182]">
                    {it.kind === "coding" ? `Coding · ${it.title}` : `${QUIZ_KIND_LABELS[it.quizKind]} · ${it.concept}`}
                  </span>
                </div>
              );
            })}
          </div>
        )}
        <button
          onClick={start}
          className="btn-teal px-6 py-2.5 rounded-lg text-[11px] font-bold uppercase tracking-widest inline-flex items-center gap-2"
        >
          <RotateCcw className="w-3.5 h-3.5" strokeWidth={2.5} /> New session
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* progress rail */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] text-[#6b6358] uppercase tracking-widest">
            Challenge {Math.min(index + 1, items.length)} / {items.length}
          </span>
          <div className="flex gap-1.5">
            {items.map((it, i) => (
              <span
                key={it.id}
                title={it.kind === "coding" ? it.title : QUIZ_KIND_LABELS[it.quizKind]}
                className={`w-2.5 h-2.5 rounded-full border ${
                  outcomes[it.id] === true
                    ? "bg-[#10b981] border-[#10b981]"
                    : outcomes[it.id] === false
                      ? "bg-[#fb7185]/70 border-[#fb7185]"
                      : i === index
                        ? "bg-[#fbbf24] border-[#fbbf24]"
                        : "bg-transparent border-[#3d3830]"
                }`}
              />
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span
            className="font-mono text-[10px] text-[#3d3830]"
            title={path.topics.length ? path.topics.join(" → ") : path.track}
          >
            {path.fromGeneratedPath ? "Path · " : "Track · "}
            {domain}
          </span>
          <button
            onClick={start}
            className="text-[10px] font-mono uppercase tracking-widest text-[#6b6358] hover:text-[#c8c0b0] flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" strokeWidth={2} /> restart
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {current?.kind === "coding" ? (
          <CodingCard key={current.id} item={current} onNext={next} onResult={(ok) => record(current.id, ok)} />
        ) : current ? (
          <QuizCard key={current.id} item={current} onNext={next} onResult={(ok) => record(current.id, ok)} />
        ) : null}
      </AnimatePresence>
    </div>
  );
}
