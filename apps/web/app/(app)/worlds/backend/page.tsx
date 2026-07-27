"use client";

import React, { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useGame } from "@/lib/game-context";

/* ═══════════════════════════════════════════
   THE DOJO — Mission Challenge Screen
   Dark dojo interior. Health bar. Questions
   presented as combat exchanges. Correct = strike.
   Wrong = damage. Boss has multi-rounds.
   ═══════════════════════════════════════════ */

interface Challenge {
  id: number;
  senseiSays: string;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

const missionChallenges: Challenge[] = [
  {
    id: 1,
    senseiSays: "The foundation of every server lies in understanding how it listens.",
    question: "What does an HTTP status code 201 indicate?",
    options: [
      "The request was successful and the server is sending data",
      "A new resource has been successfully created",
      "The server is redirecting to a different URL",
      "The request requires authentication",
    ],
    correct: 1,
    explanation: "201 Created indicates that the request has been fulfilled and has resulted in a new resource being created. This is commonly returned after a successful POST request.",
  },
  {
    id: 2,
    senseiSays: "A warrior must choose the right weapon for each battle.",
    question: "Which HTTP method is idempotent and used to update a complete resource?",
    options: ["POST", "PATCH", "PUT", "DELETE"],
    correct: 2,
    explanation: "PUT is idempotent — calling it multiple times produces the same result. It replaces the entire resource, unlike PATCH which applies partial modifications.",
  },
  {
    id: 3,
    senseiSays: "The database is your memory. Without indexes, you are searching blind.",
    question: "What is the primary advantage of a B-Tree index in PostgreSQL?",
    options: [
      "It reduces disk space usage",
      "It speeds up equality and range queries on indexed columns",
      "It encrypts sensitive column data",
      "It automatically normalizes the table schema",
    ],
    correct: 1,
    explanation: "B-Tree indexes create a balanced tree structure that enables O(log n) lookups for both equality (=) and range (<, >, BETWEEN) queries, dramatically reducing scan time.",
  },
  {
    id: 4,
    senseiSays: "The final test. Show me you understand the architecture.",
    question: "In a RESTful API, what does HATEOAS stand for?",
    options: [
      "Hypertext As The Engine Of Application State",
      "HTTP Authorization Through Enhanced OAuth Schemes",
      "Hierarchical API Transfer Extension Over Authenticated Services",
      "Hosted Application Testing Environment Over API Standards",
    ],
    correct: 0,
    explanation: "HATEOAS (Hypertext As The Engine Of Application State) is a constraint of REST where the server provides hypermedia links in responses, guiding the client through available actions.",
  },
];

type Phase = "intro" | "battle" | "result" | "victory" | "defeat";

export default function BackendWorldPage() {
  const { completeMission, addCoins } = useGame();
  const [phase, setPhase] = useState<Phase>("intro");
  const [questionIdx, setQuestionIdx] = useState(0);
  const [health, setHealth] = useState(100);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);

  const challenge = missionChallenges[questionIdx];
  const totalQuestions = missionChallenges.length;

  const startBattle = useCallback(() => setPhase("battle"), []);

  function submitAnswer(idx: number) {
    if (selectedAnswer !== null) return; // already answered
    setSelectedAnswer(idx);
    setShowExplanation(true);

    if (idx === challenge.correct) {
      setScore((s) => s + 1);
      setXpEarned((x) => x + 50);
    } else {
      setHealth((h) => Math.max(0, h - 25));
    }
  }

  function nextQuestion() {
    setSelectedAnswer(null);
    setShowExplanation(false);

    if (health <= 0) {
      setPhase("defeat");
      return;
    }

    if (questionIdx + 1 >= totalQuestions) {
      setPhase("victory");
    } else {
      setQuestionIdx((q) => q + 1);
    }
  }

  // Award XP when victory phase is reached
  useEffect(() => {
    if (phase === "victory" && xpEarned > 0) {
      completeMission("backend-index-of-knowledge", xpEarned);
      addCoins(Math.floor(xpEarned * 0.5));
    }
  }, [phase, xpEarned, completeMission, addCoins]);

  return (
    <div className="min-h-[calc(100vh-48px)] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-2xl">
        <AnimatePresence mode="wait">
          {/* ══════ INTRO ══════ */}
          {phase === "intro" && (
            <motion.div
              key="intro"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-8 text-center"
            >
              <div className="space-y-3">
                <p className="font-mono text-[10px] text-[#6b6358] tracking-widest uppercase">
                  Entering Mission
                </p>
                <h1 className="font-cinzel text-2xl md:text-3xl font-bold text-[#b49b64] tracking-wider">
                  Index of Knowledge
                </h1>
                <p className="font-cinzel text-xs text-[#6b6358] italic tracking-wide">
                  Chapter III — The Backend Forge
                </p>
              </div>

              <div className="ink-divider max-w-xs mx-auto" />

              <div className="dialogue-box rounded px-6 py-5 max-w-md mx-auto text-left">
                <p className="font-cinzel text-sm text-[#6b6358] leading-relaxed italic">
                  "The archives hold the answers you seek, apprentice. But they are vast and
                  unordered. Only through the discipline of indexing can you retrieve
                  knowledge before the Core Compiler strikes. Show me your readiness."
                </p>
                <p className="mt-3 font-cinzel text-[10px] text-[#3d3830] tracking-widest">
                  — Master Kael
                </p>
              </div>

              <div className="flex items-center justify-center gap-6 text-xs font-mono text-[#6b6358]">
                <span>{totalQuestions} Questions</span>
                <span>·</span>
                <span>200 XP Reward</span>
                <span>·</span>
                <span>Survive to Win</span>
              </div>

              <button
                onClick={startBattle}
                className="btn-blood px-10 py-3 rounded text-sm uppercase tracking-widest mx-auto block"
              >
                Draw Your Blade
              </button>
            </motion.div>
          )}

          {/* ══════ BATTLE ══════ */}
          {phase === "battle" && (
            <motion.div
              key={`battle-${questionIdx}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* HUD: Health + Progress */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-[#8b2020]">HP</span>
                    <span className="text-[#6b6358]">{health}/100</span>
                  </div>
                  <div className="health-track h-[6px]">
                    <div
                      className="health-fill"
                      style={{ width: `${health}%` }}
                    />
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-mono text-[10px] text-[#6b6358]">
                    {questionIdx + 1} / {totalQuestions}
                  </span>
                </div>
              </div>

              {/* Sensei context */}
              <div className="dialogue-box rounded px-5 py-4">
                <p className="font-cinzel text-xs text-[#6b6358] italic leading-relaxed">
                  "{challenge.senseiSays}"
                </p>
              </div>

              {/* Question */}
              <p className="font-cinzel text-base text-[#c8c0b0] leading-relaxed">
                {challenge.question}
              </p>

              {/* Answer options */}
              <div className="space-y-2">
                {challenge.options.map((opt, i) => {
                  let optStyle = "surface hover:border-[#b49b64]/25";
                  if (selectedAnswer !== null) {
                    if (i === challenge.correct) {
                      optStyle = "border-[#4a7a5a]/60 bg-[#4a7a5a]/8";
                    } else if (i === selectedAnswer && i !== challenge.correct) {
                      optStyle = "border-[#8b2020]/60 bg-[#8b2020]/8";
                    } else {
                      optStyle = "surface opacity-40";
                    }
                  }

                  return (
                    <button
                      key={i}
                      onClick={() => submitAnswer(i)}
                      disabled={selectedAnswer !== null}
                      className={`w-full text-left px-5 py-3.5 rounded transition-all duration-200 border ${optStyle} ${
                        selectedAnswer !== null ? "cursor-default" : "cursor-pointer"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="font-mono text-xs text-[#6b6358] mt-0.5 w-4 flex-shrink-0">
                          {String.fromCharCode(65 + i)}.
                        </span>
                        <span className={`text-sm leading-relaxed ${
                          selectedAnswer !== null && i === challenge.correct
                            ? "text-[#4a7a5a]"
                            : selectedAnswer === i && i !== challenge.correct
                            ? "text-[#c43030]"
                            : "text-[#c8c0b0]"
                        }`}>
                          {opt}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Explanation (after answering) */}
              <AnimatePresence>
                {showExplanation && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="space-y-4"
                  >
                    <div className="scroll-surface rounded px-5 py-4">
                      <p className="font-mono text-[10px] text-[#6b6358] tracking-widest uppercase mb-2">
                        {selectedAnswer === challenge.correct ? "Strike Landed" : "Damage Taken"}
                      </p>
                      <p className="text-sm text-[#c8c0b0] leading-relaxed">
                        {challenge.explanation}
                      </p>
                    </div>

                    <button
                      onClick={nextQuestion}
                      className="btn-scroll px-8 py-2.5 rounded text-xs uppercase tracking-widest w-full"
                    >
                      {questionIdx + 1 >= totalQuestions ? "See Results" : "Next Challenge →"}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ══════ VICTORY ══════ */}
          {phase === "victory" && (
            <motion.div
              key="victory"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-8 text-center"
            >
              <div className="space-y-3">
                <p className="font-mono text-[10px] text-[#4a7a5a] tracking-widest uppercase">
                  Mission Complete
                </p>
                <h2 className="font-cinzel text-2xl font-bold text-[#b49b64] tracking-wider">
                  Victory
                </h2>
              </div>

              <div className="dialogue-box rounded px-6 py-5 max-w-md mx-auto text-left">
                <p className="font-cinzel text-sm text-[#6b6358] italic leading-relaxed">
                  "You have proven your worth, apprentice. The archives respond to your command now.
                  The path ahead grows steeper — but so does your strength."
                </p>
                <p className="mt-3 font-cinzel text-[10px] text-[#3d3830] tracking-widest">
                  — Master Kael
                </p>
              </div>

              <div className="ink-divider max-w-xs mx-auto" />

              {/* Rewards */}
              <div className="scroll-surface rounded px-6 py-5 max-w-sm mx-auto space-y-4">
                <p className="font-mono text-[10px] text-[#6b6358] tracking-widest uppercase">
                  Rewards Earned
                </p>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#c8c0b0]">Score</span>
                    <span className="font-mono text-sm font-bold text-[#b49b64]">
                      {score}/{totalQuestions}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#c8c0b0]">XP Earned</span>
                    <span className="font-mono text-sm font-bold text-[#b49b64]">
                      +{xpEarned} XP
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#c8c0b0]">Health Remaining</span>
                    <span className="font-mono text-sm font-bold text-[#4a7a5a]">
                      {health}%
                    </span>
                  </div>
                </div>
              </div>

              <Link
                href="/world-map"
                className="btn-scroll inline-block px-8 py-3 rounded text-sm uppercase tracking-widest"
              >
                Return to World Map
              </Link>
            </motion.div>
          )}

          {/* ══════ DEFEAT ══════ */}
          {phase === "defeat" && (
            <motion.div
              key="defeat"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-8 text-center"
            >
              <div className="space-y-3">
                <p className="font-mono text-[10px] text-[#8b2020] tracking-widest uppercase">
                  Mission Failed
                </p>
                <h2 className="font-cinzel text-2xl font-bold text-[#c43030] tracking-wider">
                  Defeated
                </h2>
              </div>

              <div className="dialogue-box rounded px-6 py-5 max-w-md mx-auto text-left">
                <p className="font-cinzel text-sm text-[#6b6358] italic leading-relaxed">
                  "Even the strongest warriors fall, apprentice. Return to the scrolls,
                  study the patterns, and try again. The path does not close — it waits."
                </p>
                <p className="mt-3 font-cinzel text-[10px] text-[#3d3830] tracking-widest">
                  — Master Kael
                </p>
              </div>

              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => {
                    setPhase("intro");
                    setQuestionIdx(0);
                    setHealth(100);
                    setScore(0);
                    setXpEarned(0);
                    setSelectedAnswer(null);
                    setShowExplanation(false);
                  }}
                  className="btn-blood px-8 py-3 rounded text-sm uppercase tracking-widest"
                >
                  Try Again
                </button>
                <Link
                  href="/world-map"
                  className="btn-scroll px-8 py-3 rounded text-sm uppercase tracking-widest"
                >
                  Retreat
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
