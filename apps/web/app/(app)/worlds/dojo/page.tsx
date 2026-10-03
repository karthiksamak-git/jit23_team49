"use client";

import React, { useState, useCallback, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useGame } from "@/lib/game-context";
import { generateDojoChallenges, generateEasierRetryChallenge, DojoChallenge, QuestionType } from "@/lib/ai-dojo";
import {
  startSession,
  queueMistake,
  getMistakes,
  resolveMistake,
  recordAnswer,
  pickNextChallenge,
  updateProficiency,
} from "@/lib/adaptive-session";
import { CleanSamuraiImg } from "@/lib/clean-samurai";

/* ═══════════════════════════════════════════
   ADAPTIVE QUIZ ARENA — full gamified flow
   • 5 questions • 30s per question timer
   • Spec XP: +10 correct, +5 (3-combo), +15 (5-combo),
     +20 session bonus, +50 level-up
   • Hearts: 5, wrong = -1, 0 = session ends early
   • Fix-Your-Mistakes: re-asks missed ones in a DIFFERENT
     format (MCQ→True/False, others→simplified MCQ)
   ═══════════════════════════════════════════ */

type Phase = "intro" | "battle" | "mistakes" | "victory" | "defeat";
const MAX_HEARTS = 5;
const QUESTION_TIME = 30; // seconds per question

// Spec XP economy
const XP_CORRECT = 10;
const XP_COMBO_3 = 5;
const XP_COMBO_5 = 15;
const XP_SESSION_BONUS = 20;

function DojoContent() {
  const searchParams = useSearchParams();
  const { completeMission, addXp, player, sfx } = useGame();

  const missionId = searchParams.get("missionId") || "m1";
  const missionTitle = searchParams.get("title") || "Foundations Trial";
  const domain = searchParams.get("domain") || player.recommendedDomain || player.realmName || "Backend Development";
  const lore = searchParams.get("lore") || "Test your practical knowledge and prove your competence.";

  const [challenges, setChallenges] = useState<DojoChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<Phase>("intro");

  /* ── Session flow ── */
  const [usedIds, setUsedIds] = useState<Set<number>>(new Set());
  const [current, setCurrent] = useState<DojoChallenge | null>(null);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [mistakeQueue, setMistakeQueue] = useState<DojoChallenge[]>([]);
  const [mistakeIdx, setMistakeIdx] = useState(0);
  const [stillFailing, setStillFailing] = useState<string[]>([]);
  const [clearedMistakes, setClearedMistakes] = useState(0);

  /* ── Player feedback ── */
  const [hearts, setHearts] = useState(MAX_HEARTS);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [sessionXp, setSessionXp] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [isGeneratingRetry, setIsGeneratingRetry] = useState(false);
  const [lastGain, setLastGain] = useState(0);
  const [gainParts, setGainParts] = useState<string[]>([]);
  const [shakeKey, setShakeKey] = useState(0);

  /* ── Timer ── */
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const questionStart = useRef<number>(Date.now());
  const mistakeSimplifierRan = useRef(false);
  const prevLevel = useRef<number | null>(null);

  /* ── Load challenges ── */
  useEffect(() => {
    async function loadChallenges() {
      setLoading(true);
      try {
        const generated = await generateDojoChallenges(missionTitle, domain, lore, player.capacityLevel || "Apprentice");
        setChallenges(generated.slice(0, 7));
      } catch (err) {
        console.error("Failed to load Dojo challenges:", err);
      } finally {
        setLoading(false);
      }
    }
    loadChallenges();
  }, [missionTitle, domain, lore, player.capacityLevel]);

  /* ── +50 level-up fanfare ── */
  useEffect(() => {
    if (prevLevel.current === null) {
      prevLevel.current = player.level;
      return;
    }
    if (player.level > prevLevel.current) {
      sfx("levelUp");
      addXp(50); // +50 real XP on level up (spec)
      setSessionXp((x) => x + 50); // reflect on the session summary
    }
    prevLevel.current = player.level;
  }, [player.level, sfx, addXp]);

  /* ── Wrap up: award XP + mission ── */
  useEffect(() => {
    if (phase === "victory") {
      const bonus = sessionXp > 0 ? XP_SESSION_BONUS : 0;
      const finalXp = sessionXp + bonus;
      completeMission(missionId, Math.max(finalXp, 30));
      sfx("victory");
    } else if (phase === "defeat") {
      sfx("defeat");
    }
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Per-question countdown timer ── */
  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    stopTimer();
    setTimeLeft(QUESTION_TIME);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          stopTimer();
          sfx("timeUp");
          return 0;
        }
        if (t <= 6) sfx(t <= 3 ? "tickUrgent" : "tick");
        return t - 1;
      });
    }, 1000);
  }, [sfx, stopTimer]);

  useEffect(() => () => stopTimer(), [stopTimer]);

  const totalPlanned = challenges.length;

  const startBattle = useCallback(() => {
    startSession(missionId);
    sfx("click");
    const first = pickNextChallenge(challenges, new Set());
    setCurrent(first);
    setUsedIds(first ? new Set([first.id]) : new Set());
    questionStart.current = Date.now();
    startTimer();
    setPhase("battle");
  }, [challenges, missionId, sfx, startTimer]);

  /* ════════ MAIN PHASE ════════ */

  function submitAnswer(idx: number) {
    if (selectedAnswer !== null || !current) return;
    stopTimer();
    setSelectedAnswer(idx);
    setShowExplanation(true);

    const isCorrect = idx === current.correct;
    const responseMs = Date.now() - questionStart.current;

    updateProficiency(isCorrect, responseMs);
    recordAnswer(current.conceptKey, isCorrect, responseMs);

    if (isCorrect) {
      const newCombo = combo + 1;
      setCombo(newCombo);
      setBestCombo((b) => Math.max(b, newCombo));

      // Spec XP: +10, combo3 +5, combo5 +15
      let points = XP_CORRECT;
      const parts: string[] = [`+${XP_CORRECT} XP`];
      if (newCombo >= 5) {
        points += XP_COMBO_5;
        parts.push(`+${XP_COMBO_5} combo`);
      } else if (newCombo >= 3) {
        points += XP_COMBO_3;
        parts.push(`+${XP_COMBO_3} combo`);
      }
      setSessionXp((x) => x + points);
      setLastGain(points);
      setGainParts(parts);

      if (newCombo >= 3) sfx("combo", newCombo);
      else sfx("correct");
    } else {
      sfx("wrong");
      sfx("heartLost");
      setCombo(0);
      setHearts((h) => Math.max(0, h - 1));
      setShakeKey((k) => k + 1);
      queueMistake(current, idx);
    }
  }

  /* ── Timer expiry = wrong answer ── */
  useEffect(() => {
    if (phase === "battle" && timeLeft === 0 && selectedAnswer === null && current) {
      submitAnswer(-1); // -1 never matches → counts as wrong
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, phase]);

  function advance() {
    setSelectedAnswer(null);
    setShowExplanation(false);
    questionStart.current = Date.now();

    const next = pickNextChallenge(challenges, usedIds);
    if (next && hearts > 0) {
      setUsedIds((prev) => new Set(prev).add(next.id));
      setCurrent(next);
      setAnsweredCount((c) => c + 1);
      startTimer();
      return;
    }

    if (hearts <= 0) {
      setPhase("defeat");
      return;
    }

    /* ── Main set done → Fix Your Mistakes in a DIFFERENT format ── */
    const mistakes = getMistakes().map((m) => m.challenge);
    if (mistakes.length > 0) {
      setMistakeQueue(mistakes);
      setMistakeIdx(0);
      setCurrent(mistakes[0]);
      setPhase("mistakes");
    } else {
      setPhase("victory");
    }
  }

  /* ── Rebuild missed questions in a DIFFERENT format ── */
  function swapFormat(q: DojoChallenge): DojoChallenge {
    // MCQ → True/False (statement built from the question + correct option)
    if (q.type === "multiple-choice" || q.type === "scenario") {
      const correctText = q.options[q.correct] || "";
      const isTrue = Math.random() < 0.5;
      if (isTrue) {
        return {
          ...q,
          type: "true-false",
          question: `True or False: ${q.question.replace(/^\s*(which|what)\b/i, "").trim()} — ${correctText}`,
          options: ["True", "False"],
          correct: 0,
          senseiSays: "Same idea, new format — trust your understanding!",
        };
      }
      // False version: subtly wrong variant (negate the correct answer)
      return {
        ...q,
        type: "true-false",
        question: `True or False: ${correctText} is the correct approach for: ${q.question}`,
        options: ["True", "False"],
        correct: 1,
        explanation: q.explanation,
        senseiSays: "Careful — check the logic before answering!",
      };
    }
    // Other types → simplified MCQ handled by AI; if unavailable, original
    return q;
  }

  useEffect(() => {
    if (phase !== "mistakes" || mistakeSimplifierRan.current) return;
    mistakeSimplifierRan.current = true;

    async function rebuildMistakes() {
      setIsGeneratingRetry(true);
      const rebuilt: DojoChallenge[] = [];
      for (const m of mistakeQueue) {
        try {
          // Scenario/quiz-type → simplified MCQ via AI; MCQ → True/False swap
          if (m.type === "multiple-choice" || m.type === "scenario") {
            rebuilt.push(swapFormat(m));
          } else {
            const easier = await generateEasierRetryChallenge(domain, m.conceptKey || "foundations", m.question);
            rebuilt.push({ ...easier, id: m.id, conceptKey: m.conceptKey || easier.conceptKey });
          }
        } catch {
          rebuilt.push(swapFormat(m));
        }
      }
      setIsGeneratingRetry(false);
      setMistakeQueue(rebuilt);
      setCurrent(rebuilt[0] || null);
      questionStart.current = Date.now();
    }
    rebuildMistakes();
  }, [phase, mistakeQueue, domain]);

  /* ════════ MISTAKE PHASE HANDLERS ════════ */

  function submitMistakeAnswer(idx: number) {
    if (selectedAnswer !== null || !current) return;
    setSelectedAnswer(idx);
    setShowExplanation(true);

    const isCorrect = idx === current.correct;
    recordAnswer(current.conceptKey, isCorrect, Date.now() - questionStart.current);

    if (isCorrect) {
      sfx("correct");
      setSessionXp((x) => x + XP_CORRECT);
      setLastGain(XP_CORRECT);
      setGainParts([`+${XP_CORRECT} XP`]);
      setClearedMistakes((c) => c + 1);
      resolveMistake(current.id);
    } else {
      sfx("wrong");
      setCombo(0);
      setStillFailing((prev) => [...new Set([...prev, current.conceptKey || "topic"])]);
    }
  }

  function nextMistake() {
    setSelectedAnswer(null);
    setShowExplanation(false);

    if (mistakeIdx + 1 < mistakeQueue.length) {
      const nextIdx = mistakeIdx + 1;
      setMistakeIdx(nextIdx);
      setCurrent(mistakeQueue[nextIdx]);
      questionStart.current = Date.now();
    } else {
      setPhase("victory");
    }
  }

  const totalLessonSteps = totalPlanned + mistakeQueue.length;
  const progress = Math.min(100, ((answeredCount + mistakeIdx) / Math.max(1, totalLessonSteps)) * 100);
  const timePct = (timeLeft / QUESTION_TIME) * 100;

  const isTrueFalse = current?.type === "true-false";

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-48px)] flex items-center justify-center px-4">
        <div className="surface rounded-2xl p-10 text-center space-y-4 max-w-md bg-[#090b0f]/95 border-2 border-[#06b6d4]/30 shadow-2xl">
          <div className="relative w-12 h-12 mx-auto">
            <div className="w-12 h-12 border-2 border-[#06b6d4] border-t-transparent rounded-full animate-spin" />
            <div className="absolute inset-1 w-10 h-10 border-2 border-[#a855f7]/40 border-b-transparent rounded-full animate-spin" style={{ animationDirection: "reverse", animationDuration: "1.5s" }} />
          </div>
          <div className="space-y-1">
            <h3 className="font-cinzel text-lg font-bold text-[#e8dfc8]">Formulating Adaptive AI Scenarios</h3>
            <p className="text-xs text-[#06b6d4] animate-pulse">
              Matching challenge complexity to your <strong className="text-[#e8dfc8]">{player.capacityLevel}</strong> level ({domain})...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-48px)] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-2xl">
        <AnimatePresence mode="wait">

          {/* ══════ INTRO ══════ */}
          {phase === "intro" && (
            <motion.div
              key="intro"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-8 text-center surface-teal rounded-2xl p-8 md:p-10 border border-[#06b6d4]/30 shadow-2xl"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-[10px] font-mono text-[#06b6d4] uppercase tracking-widest px-3 py-1 rounded-full border border-[#06b6d4]/30 bg-[#06b6d4]/10">
                    {domain} • Adaptive Trial
                  </span>
                  <span className="text-[10px] font-mono text-[#a855f7] uppercase tracking-widest px-3 py-1 rounded-full border border-[#a855f7]/30 bg-[#a855f7]/10">
                    {player.capacityLevel}
                  </span>
                </div>
                <h1 className="font-cinzel text-2xl md:text-4xl font-extrabold text-[#e8dfc8] tracking-wide">{missionTitle}</h1>
                <p className="text-xs text-[#6b6358] max-w-md mx-auto">{lore}</p>
              </div>

              <div className="ink-divider-teal max-w-xs mx-auto" />

              <div className="dialogue-box-teal rounded-xl px-6 py-5 max-w-md mx-auto text-left">
                <p className="font-cinzel text-sm text-[#c8c0b0] leading-relaxed italic">
                  &quot;{totalPlanned} scenarios, <strong>30 seconds</strong> each. Chain answers for combo XP, and missed questions return in a <strong>different format</strong> at the end — Fix Your Mistakes!&quot;
                </p>
                <p className="mt-3 text-[10px] font-mono text-[#06b6d4] uppercase tracking-widest">— AI Mentor</p>
              </div>

              <div className="flex items-center justify-center gap-6 text-xs font-mono text-[#6b6358]">
                <span>{totalPlanned} Scenarios</span>
                <span>·</span>
                <span>⏱ 30s each</span>
                <span>·</span>
                <span>{MAX_HEARTS} Hearts</span>
              </div>

              <button
                onClick={startBattle}
                onMouseEnter={() => sfx("hover")}
                className="btn-primary px-10 py-3.5 rounded-xl text-xs font-bold uppercase tracking-widest mx-auto block shadow-lg cursor-pointer"
              >
                <span>Start Practice Trial →</span>
              </button>
            </motion.div>
          )}

          {/* ══════ BATTLE ══════ */}
          {phase === "battle" && current && (
            <motion.div
              key={`battle-${current.id}-${answeredCount}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6 surface rounded-2xl p-6 md:p-8 border border-[#2a2520]"
            >
              {/* HUD row: hearts, combo, timer */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-1">
                  {Array.from({ length: MAX_HEARTS }).map((_, i) => (
                    <span key={i} className={`text-sm transition-all ${i < hearts ? "opacity-100 scale-100" : "opacity-20 scale-90 grayscale"}`}>
                      ❤️
                    </span>
                  ))}
                </div>

                {combo >= 3 && (
                  <motion.span
                    key={combo}
                    initial={{ scale: 1.5 }}
                    animate={{ scale: 1 }}
                    className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#f97316]/15 border border-[#f97316]/40 text-[#fdba74] animate-pulse"
                  >
                    🔥 {combo} COMBO
                  </motion.span>
                )}

                {/* Timer ring */}
                <div className="relative w-11 h-11">
                  <svg viewBox="0 0 40 40" className="w-11 h-11 -rotate-90">
                    <circle cx="20" cy="20" r="17" fill="none" stroke="#2a2520" strokeWidth="3" />
                    <circle
                      cx="20" cy="20" r="17" fill="none"
                      stroke={timeLeft <= 5 ? "#fb7185" : timeLeft <= 10 ? "#fbbf24" : "#22d3ee"}
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 17}
                      strokeDashoffset={2 * Math.PI * 17 * (1 - timePct / 100)}
                      className="transition-all duration-1000 ease-linear"
                    />
                  </svg>
                  <span className={`absolute inset-0 flex items-center justify-center font-mono text-[11px] font-bold ${timeLeft <= 5 ? "text-[#fb7185] animate-pulse" : "text-[#c8c0b0]"}`}>
                    {timeLeft}
                  </span>
                </div>
              </div>

              {/* Progress */}
              <div className="xp-track h-1.5 rounded-full overflow-hidden">
                <div className="xp-fill-teal rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>

              {/* Question */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-[#06b6d4] uppercase tracking-widest px-2.5 py-0.5 rounded-full border border-[#06b6d4]/30 bg-[#06b6d4]/10">
                    {current.type === "code-fill" ? "💻 Code Fill" : current.type === "bug-hunt" ? "🔍 Bug Hunt" : current.type === "pseudocode-order" ? "🧩 Logic Sequence" : current.type === "scenario" ? "🎬 Scenario" : current.type === "true-false" ? "⚖️ True or False" : "🎯 Quiz"}
                  </span>
                  <span className="font-mono text-[10px] text-[#6b6358]">
                    {answeredCount + 1}/{totalPlanned}
                  </span>
                </div>

                <div className="dialogue-box-teal p-3 rounded-xl text-xs text-[#c8c0b0] italic flex items-center gap-3">
                  <span className="text-lg">💡</span>
                  <p>&quot;{current.senseiSays}&quot;</p>
                </div>

                <h2 className="font-cinzel text-lg md:text-xl font-bold text-[#e8dfc8] leading-snug">
                  {current.question}
                </h2>
              </div>

              {current.codeSnippet && (
                <div className="bg-[#050608] border border-[#2a2520] rounded-xl p-4 font-mono text-xs text-[#34d399] overflow-x-auto leading-relaxed shadow-inner">
                  <pre>{current.codeSnippet}</pre>
                </div>
              )}

              {/* Options */}
              <div className={`space-y-3 pt-2 ${isTrueFalse ? "grid grid-cols-2" : ""}`}>
                {current.options.map((optText, i) => {
                  let cardStyle = "border-[#2a2520] bg-[#0a0b0d]/80 text-[#c8c0b0] hover:border-[#06b6d4]/50 hover:bg-[#06b6d4]/5";
                  if (selectedAnswer !== null) {
                    if (i === current.correct) {
                      cardStyle = "border-[#10b981] bg-[#10b981]/15 text-[#34d399] shadow-[0_0_15px_rgba(16,185,129,0.3)]";
                    } else if (i === selectedAnswer) {
                      cardStyle = "border-[#fb7185] bg-[#fb7185]/15 text-[#fb7185]";
                    } else {
                      cardStyle = "border-[#1e1a16] bg-[#060708]/40 text-[#4a443a] opacity-50";
                    }
                  }
                  return (
                    <motion.button
                      key={i}
                      whileHover={selectedAnswer === null ? { scale: 1.01 } : {}}
                      whileTap={selectedAnswer === null ? { scale: 0.99 } : {}}
                      onMouseEnter={selectedAnswer === null ? () => sfx("hover") : undefined}
                      onClick={() => submitAnswer(i)}
                      disabled={selectedAnswer !== null}
                      className={`p-4 rounded-xl text-left border text-xs md:text-sm font-medium transition-all flex items-start gap-3 ${cardStyle}`}
                    >
                      <span className="font-mono text-xs opacity-60 w-5 text-center mt-0.5 shrink-0">
                        {isTrueFalse ? (i === 0 ? "✓" : "✗") : String.fromCharCode(65 + i)}
                      </span>
                      <span className="flex-1 leading-relaxed">{optText}</span>
                    </motion.button>
                  );
                })}
              </div>

              {/* Feedback */}
              <AnimatePresence>
                {showExplanation && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden pt-2"
                  >
                    <div
                      key={shakeKey}
                      className={`rounded-xl p-5 space-y-3 border ${
                        selectedAnswer === current.correct
                          ? "border-[#10b981]/40 bg-[#10b981]/10 text-[#34d399]"
                          : "border-[#fb7185]/40 bg-[#fb7185]/10 text-[#fb7185]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-bold text-sm flex-wrap">
                          <span>
                            {selectedAnswer === current.correct ? "✅ Correct!" : selectedAnswer === -1 ? "⏰ Time's Up!" : "❌ Not Quite!"}
                          </span>
                          {selectedAnswer === current.correct && (
                            <motion.span
                              key={lastGain}
                              initial={{ opacity: 0, y: -6 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#10b981]/20 border border-[#10b981]/30"
                            >
                              {gainParts.join(" ")}
                            </motion.span>
                          )}
                          {selectedAnswer !== current.correct && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#fb7185]/20 border border-[#fb7185]/30">
                              Fix it at the end — different format!
                            </span>
                          )}
                        </div>
                      </div>

                      <p className="text-xs text-[#e8dfc8] leading-relaxed">{current.explanation}</p>

                      <button
                        onClick={advance}
                        onMouseEnter={() => sfx("hover")}
                        className="btn-primary w-full py-3 rounded-xl text-xs font-bold uppercase tracking-wider mt-2 shadow-md cursor-pointer"
                      >
                        <span>{selectedAnswer === current.correct ? "Next Challenge →" : "Got it — continue →"}</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ══════ FIX YOUR MISTAKES ══════ */}
          {phase === "mistakes" && current && (
            <motion.div
              key={`mistake-${current.id}-${mistakeIdx}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6 surface rounded-2xl p-6 md:p-8 border border-[#fbbf24]/40 shadow-[0_0_25px_rgba(251,191,36,0.08)]"
            >
              <div className="flex items-center justify-between gap-4">
                <span className="text-[10px] font-mono text-[#fbbf24] uppercase tracking-widest px-3 py-1 rounded-full border border-[#fbbf24]/30 bg-[#fbbf24]/10">
                  🛠 Fix Your Mistakes {isGeneratingRetry ? "• preparing…" : ""}
                </span>
                <span className="font-mono text-[10px] text-[#6b6358]">
                  {mistakeIdx + 1}/{mistakeQueue.length}
                </span>
              </div>

              <div className="dialogue-box-teal p-3.5 rounded-xl text-xs text-[#c8c0b0] italic flex items-center gap-3">
                <span className="text-lg">🔁</span>
                <p>&quot;Same concepts, <strong>different format</strong> — prove you truly understand!&quot;</p>
              </div>

              <h2 className="font-cinzel text-lg md:text-xl font-bold text-[#e8dfc8] leading-snug">
                {current.question}
              </h2>

              <div className={`space-y-3 ${current.type === "true-false" ? "grid grid-cols-2" : ""}`}>
                {current.options.map((optText, i) => {
                  let cardStyle = "border-[#2a2520] bg-[#0a0b0d]/80 text-[#c8c0b0] hover:border-[#fbbf24]/50 hover:bg-[#fbbf24]/5";
                  if (selectedAnswer !== null) {
                    if (i === current.correct) {
                      cardStyle = "border-[#10b981] bg-[#10b981]/15 text-[#34d399] shadow-[0_0_15px_rgba(16,185,129,0.3)]";
                    } else if (i === selectedAnswer) {
                      cardStyle = "border-[#fb7185] bg-[#fb7185]/15 text-[#fb7185]";
                    } else {
                      cardStyle = "border-[#1e1a16] bg-[#060708]/40 text-[#4a443a] opacity-50";
                    }
                  }
                  return (
                    <motion.button
                      key={i}
                      whileHover={selectedAnswer === null ? { scale: 1.01 } : {}}
                      whileTap={selectedAnswer === null ? { scale: 0.99 } : {}}
                      onClick={() => submitMistakeAnswer(i)}
                      disabled={selectedAnswer !== null || isGeneratingRetry}
                      className={`p-4 rounded-xl text-left border text-xs md:text-sm font-medium transition-all flex items-start gap-3 ${cardStyle}`}
                    >
                      <span className="font-mono text-xs opacity-60 w-5 text-center mt-0.5 shrink-0">
                        {current.type === "true-false" ? (i === 0 ? "✓" : "✗") : String.fromCharCode(65 + i)}
                      </span>
                      <span className="flex-1 leading-relaxed">{optText}</span>
                    </motion.button>
                  );
                })}
              </div>

              <AnimatePresence>
                {showExplanation && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className={`rounded-xl p-5 space-y-3 border ${
                      selectedAnswer === current.correct
                        ? "border-[#10b981]/40 bg-[#10b981]/10 text-[#34d399]"
                        : "border-[#fb7185]/40 bg-[#fb7185]/10 text-[#fb7185]"
                    }`}>
                      <div className="font-bold text-sm flex items-center gap-2 flex-wrap">
                        <span>{selectedAnswer === current.correct ? "✅ Mistake fixed!" : "🔁 Still tricky —"}</span>
                        {selectedAnswer === current.correct && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#10b981]/20 border border-[#10b981]/30">+{lastGain} XP</span>
                        )}
                      </div>
                      <p className="text-xs text-[#e8dfc8] leading-relaxed">{current.explanation}</p>
                      {selectedAnswer !== current.correct && (
                        <p className="text-[10px] font-mono text-[#fbbf24]">
                          📌 Queued for spaced-repetition review: 1 day, then 3, 7, 14, 30 days.
                        </p>
                      )}
                      <button
                        onClick={nextMistake}
                        onMouseEnter={() => sfx("hover")}
                        className="btn-primary w-full py-3 rounded-xl text-xs font-bold uppercase tracking-wider mt-2 shadow-md cursor-pointer"
                      >
                        <span>{mistakeIdx + 1 < mistakeQueue.length ? "Next Mistake →" : "Finish Trial →"}</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ══════ VICTORY ══════ */}
          {phase === "victory" && (
            <motion.div
              key="victory"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6 text-center surface-teal rounded-2xl p-8 md:p-10 border border-[#10b981]/40 shadow-2xl"
            >
              <div className="w-20 h-20 mx-auto rounded-full border-2 border-[#10b981]/50 bg-[#10b981]/10 flex items-center justify-center">
                <CleanSamuraiImg alt="Victory Mascot" className="w-16 h-16 object-contain" />
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-mono text-[#34d399] uppercase tracking-widest px-3 py-1 rounded-full border border-[#10b981]/30 bg-[#10b981]/10">
                  Trial Mastered • Milestone Unlocked!
                </span>
                <h1 className="font-cinzel text-3xl font-extrabold aurora-text">Victory Achieved!</h1>
                <p className="text-xs text-[#6b6358] max-w-sm mx-auto">
                  You completed <strong className="text-[#e8dfc8]">{missionTitle}</strong>
                  {clearedMistakes > 0 && <> — fixing {clearedMistakes} mistake{clearedMistakes > 1 ? "s" : ""} along the way</>}!
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 max-w-md mx-auto">
                <div className="surface rounded-xl p-3 border border-[#06b6d4]/20 space-y-1">
                  <span className="text-[9px] text-[#6b6358] block">SESSION XP</span>
                  <span className="font-mono text-base font-bold text-[#22d3ee]">+{sessionXp + XP_SESSION_BONUS}</span>
                </div>
                <div className="surface rounded-xl p-3 border border-[#f97316]/20 space-y-1">
                  <span className="text-[9px] text-[#6b6358] block">BEST COMBO</span>
                  <span className="font-mono text-base font-bold text-[#fdba74]">🔥 {bestCombo}</span>
                </div>
                <div className="surface rounded-xl p-3 border border-[#a855f7]/20 space-y-1">
                  <span className="text-[9px] text-[#6b6358] block">HEARTS LEFT</span>
                  <span className="font-mono text-base font-bold text-[#fb7185]">❤️ {hearts}</span>
                </div>
              </div>

              <p className="text-[10px] font-mono text-[#3d3830]">
                incl. +{XP_SESSION_BONUS} session completion bonus
              </p>

              {stillFailing.length > 0 && (
                <p className="text-[10px] font-mono text-[#fbbf24] max-w-sm mx-auto">
                  📌 {stillFailing.length} concept{stillFailing.length > 1 ? "s" : ""} queued for spaced-repetition review (1 → 3 → 7 → 14 → 30 days).
                </p>
              )}

              <Link
                href="/world-map"
                className="btn-primary inline-block px-8 py-3.5 rounded-xl text-xs font-bold uppercase tracking-widest"
              >
                <span>Return to World Map & Unlock Next Level →</span>
              </Link>
            </motion.div>
          )}

          {/* ══════ DEFEAT ══════ */}
          {phase === "defeat" && (
            <motion.div
              key="defeat"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6 text-center surface-rose rounded-2xl p-8 md:p-10 border border-[#fb7185]/40 shadow-2xl"
            >
              <div className="space-y-2">
                <span className="text-[10px] font-mono text-[#fb7185] uppercase tracking-widest px-3 py-1 rounded-full border border-[#fb7185]/30 bg-[#fb7185]/10">
                  Session Ended Early
                </span>
                <h1 className="font-cinzel text-3xl font-extrabold text-[#fb7185]" style={{ textShadow: "0 0 30px rgba(251,113,133,0.4)" }}>Out of Hearts</h1>
                <p className="text-xs text-[#6b6358] max-w-sm mx-auto">
                  Every mistake is a step toward mastery! Your weak topics are queued for review — come back stronger.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto">
                <div className="surface rounded-xl p-3 border border-[#06b6d4]/20 space-y-1">
                  <span className="text-[9px] text-[#6b6358] block">XP EARNED</span>
                  <span className="font-mono text-base font-bold text-[#22d3ee]">+{sessionXp}</span>
                </div>
                <div className="surface rounded-xl p-3 border border-[#f97316]/20 space-y-1">
                  <span className="text-[9px] text-[#6b6358] block">BEST COMBO</span>
                  <span className="font-mono text-base font-bold text-[#fdba74]">🔥 {bestCombo}</span>
                </div>
              </div>

              <button
                onClick={() => {
                  sfx("click");
                  setHearts(MAX_HEARTS);
                  setUsedIds(new Set());
                  setAnsweredCount(0);
                  setCombo(0);
                  setSessionXp(0);
                  setMistakeQueue([]);
                  setStillFailing([]);
                  setClearedMistakes(0);
                  mistakeSimplifierRan.current = false;
                  startSession(missionId);
                  const first = pickNextChallenge(challenges, new Set());
                  setCurrent(first);
                  setUsedIds(first ? new Set([first.id]) : new Set());
                  setPhase("battle");
                  startTimer();
                }}
                onMouseEnter={() => sfx("hover")}
                className="btn-primary px-8 py-3.5 rounded-xl text-xs font-bold uppercase tracking-widest mx-auto block"
              >
                <span>Retry Trial →</span>
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}

export default function DojoPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[#06b6d4] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <DojoContent />
    </Suspense>
  );
}
