"use client";

import React, { useState, useCallback, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Flame, Code, Search, Puzzle, Clapperboard, Scale, Target, Lightbulb, Check, X, Wrench, Repeat, Pin, Clock, Loader2 } from "lucide-react";
import Link from "next/link";
import { useGame } from "@/lib/game-context";
import { generateEasierRetryChallenge, DojoChallenge } from "@/lib/ai-dojo";
import {
  Challenge, QuizChallenge, QUIZ_KINDS, QUIZ_KIND_LABELS, buildSession, resolveLearningPath,
  toArenaQuiz, fromDojo,
} from "@/lib/challenges";
import { QuizCard, CodingCard } from "../../sandbox/challenge-cards";
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
   PRACTICE TRIAL — gamified mission arena
   Same challenge engine as the Practice Lab's
   Challenge Arena: coding problems judged by
   the real compiler + EVERY quiz format
   (choices, true/false, scenario, code fill,
   bug hunt, pseudocode order, ranking, typed
   answers), scoped to this mission's path.
   • 30s per quiz card · coding runs untimed
   • Spec XP: +10 correct, +5 (3-combo),
     +15 (5-combo), +20 session, +50 level-up
   • Hearts: 5, wrong = -1, 0 = session ends early
   • Fix-Your-Mistakes: re-asks missed ones in a
     DIFFERENT format (MCQ→True/False, others→
     a simpler question)
   ═══════════════════════════════════════════ */

type Phase = "intro" | "battle" | "mistakes" | "victory" | "defeat";
const MAX_HEARTS = 5;
const QUESTION_TIME = 30; // seconds per question

// Spec XP economy
const XP_CORRECT = 10;
const XP_COMBO_3 = 5;
const XP_COMBO_5 = 15;
const XP_SESSION_BONUS = 20;

// Victory requires mastering at least this share of the trial's concepts
// (correct first-try answers + mistakes cleared in Fix-Your-Mistakes).
const MASTERY_PASS = 0.6;

/**
 * A trial = ONE question per format (so the student meets every kind) plus
 * real coding problems. The pool is fed to the adaptive picker, which orders it.
 */
function pickTrialSet(session: Challenge[]): Challenge[] {
  const quiz = session.filter((c): c is QuizChallenge => c.kind === "quiz");
  const code = session.filter((c) => c.kind === "coding");
  const perKind: QuizChallenge[] = [];
  for (const kind of QUIZ_KINDS) {
    const hit = quiz.find((q) => q.quizKind === kind);
    if (hit) perKind.push(hit);
  }
  return [...perKind, ...code.slice(0, 2)];
}

/** Sensei's line above each challenge — mentor voice per format. */
function senseiFor(c: Challenge): string {
  if (c.kind === "coding") {
    return "Real code this time — ▸ Run the sample, then ▸ Submit to face the hidden tests.";
  }
  const dojo = toArenaQuiz(c);
  if (dojo.senseiSays) return dojo.senseiSays;
  switch (c.quizKind) {
    case "bug-hunt": return `Something in that snippet breaks — find it before it breaks ${c.concept}.`;
    case "code-fill": return `Fill the gap so the code stays correct — ${c.concept} is the point.`;
    case "pseudocode-order":
    case "ranking": return `Don't guess from memory — reason the order out for ${c.concept}.`;
    case "typed-answer": return `No options to lean on — type the answer you're confident of for ${c.concept}.`;
    case "true-false": return `One statement, one truth — does ${c.concept} really work that way?`;
    case "scenario": return `Read the situation twice — this is how ${c.concept} shows up in the real world.`;
    default: return `Deep breath — ${c.concept} is the concept on the line here.`;
  }
}

function DojoContent() {
  const searchParams = useSearchParams();
  const { completeMission, addXp, player, sfx } = useGame();

  const missionId = searchParams.get("missionId") || "m1";
  const missionTitle = searchParams.get("title") || "Foundations Trial";
  const domain = searchParams.get("domain") || player.recommendedDomain || player.realmName || "Software Engineering Foundations";
  const lore = searchParams.get("lore") || "Test your practical knowledge and prove your competence.";

  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<Phase>("intro");

  /* ── Session flow ── */
  const [usedIds, setUsedIds] = useState<Set<string | number>>(new Set());
  const [current, setCurrent] = useState<Challenge | null>(null);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [mistakeQueue, setMistakeQueue] = useState<Challenge[]>([]);
  const [mistakeIdx, setMistakeIdx] = useState(0);
  const [stillFailing, setStillFailing] = useState<string[]>([]);
  const [clearedMistakes, setClearedMistakes] = useState(0);

  /* ── Player feedback ── */
  const [hearts, setHearts] = useState(MAX_HEARTS);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [sessionXp, setSessionXp] = useState(0);
  const [mainCorrect, setMainCorrect] = useState(0);
  const [defeatCause, setDefeatCause] = useState<"hearts" | "mastery">("hearts");
  /** current challenge already graded — keeps card + countdown from double-grading */
  const [graded, setGraded] = useState(false);
  /** the 30s countdown expired → the quiz card reveals itself as wrong */
  const [timeUp, setTimeUp] = useState(false);
  const gradedRef = useRef(false);
  const [isGeneratingRetry, setIsGeneratingRetry] = useState(false);
  const [lastGain, setLastGain] = useState(0);
  const [gainParts, setGainParts] = useState<string[]>([]);

  /* ── Timer ── */
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const questionStart = useRef<number>(Date.now());
  const mistakeSimplifierRan = useRef(false);
  const prevLevel = useRef<number | null>(null);

  /* ── Load this mission's trial: SAME engine as the Practice Lab ── */
  useEffect(() => {
    async function loadChallenges() {
      setLoading(true);
      try {
        const base = resolveLearningPath(domain);
        const session = await buildSession(
          {
            ...base,
            // This trial is about one mission — it heads the syllabus
            topics: [missionTitle, lore, ...base.topics].filter(Boolean).slice(0, 12),
            key: `${base.key}::mission:${missionId}`,
          },
          player.difficultyLevel || "Beginner"
        );
        setChallenges(pickTrialSet(session));
      } catch (err) {
        console.error("Failed to load the practice trial:", err);
      } finally {
        setLoading(false);
      }
    }
    loadChallenges();
  }, [missionId, missionTitle, domain, lore, player.difficultyLevel]);

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
      if (sessionXp > 0) addXp(sessionXp); // earned XP still counts on a failed trial
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

  /** Reset per-question state and start the clock — quiz cards only; coding runs untimed. */
  const beginQuestion = useCallback(
    (next: Challenge | null) => {
      setCurrent(next);
      setGraded(false);
      gradedRef.current = false;
      setTimeUp(false);
      setLastGain(0);
      setGainParts([]);
      questionStart.current = Date.now();
      if (next && next.kind === "quiz") {
        startTimer();
      } else {
        stopTimer();
        setTimeLeft(QUESTION_TIME);
      }
    },
    [startTimer, stopTimer]
  );

  const startBattle = useCallback(() => {
    startSession(missionId);
    sfx("click");
    const first = pickNextChallenge(challenges, new Set<string | number>());
    setUsedIds(first ? new Set([first.id]) : new Set());
    beginQuestion(first);
    setPhase("battle");
  }, [challenges, missionId, sfx, beginQuestion]);

  /* ════════ MAIN PHASE ════════ */

  /**
   * One grading path for every format: the quiz card reports its own verdict,
   * the coding card reports Accepted / not, and leaving a challenge ungraded
   * (Skip on a coding problem) counts as a miss.
   */
  function grade(isCorrect: boolean) {
    if (gradedRef.current || !current) return;
    gradedRef.current = true;
    setGraded(true);
    stopTimer();

    const responseMs = Date.now() - questionStart.current;
    updateProficiency(isCorrect, responseMs);
    recordAnswer(current.concept, isCorrect, responseMs);

    if (isCorrect) {
      setMainCorrect((c) => c + 1);
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
      // Quiz misses return in Fix-Your-Mistakes; a coding problem is already
      // retryable in its editor, so it isn't queued for re-practice.
      if (current.kind === "quiz") queueMistake(current, -1);
    }
  }

  /* ── Timer expiry → the card reveals itself as wrong ── */
  useEffect(() => {
    if (phase === "battle" && timeLeft === 0 && !gradedRef.current && current?.kind === "quiz") {
      setTimeUp(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, phase]);

  function advance() {
    // Walking away without answering (Skip on a coding problem) is a miss
    if (!gradedRef.current) grade(false);

    const next = pickNextChallenge(challenges, usedIds);
    if (next && hearts > 0) {
      setUsedIds((prev) => new Set(prev).add(next.id));
      setAnsweredCount((c) => c + 1);
      beginQuestion(next);
      return;
    }

    if (hearts <= 0) {
      setDefeatCause("hearts");
      setPhase("defeat");
      return;
    }

    /* ── Main set done → Fix Your Mistakes in a DIFFERENT format ── */
    const mistakes = getMistakes<Challenge>().map((m) => m.challenge);
    if (mistakes.length > 0) {
      setMistakeQueue(mistakes);
      setMistakeIdx(0);
      beginQuestion(mistakes[0]);
      setPhase("mistakes");
    } else if ((mainCorrect + clearedMistakes) / Math.max(1, totalPlanned) >= MASTERY_PASS) {
      setPhase("victory");
    } else {
      // Failed the mastery bar — not every completed trial is a victory.
      setDefeatCause("mastery");
      setPhase("defeat");
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
      const rebuilt: Challenge[] = [];
      for (const m of mistakeQueue) {
        // A coding problem is re-attempted in its own editor — no rewrite needed
        if (m.kind === "coding") {
          rebuilt.push(m);
          continue;
        }
        const dojoForm = toArenaQuiz(m);
        try {
          if (dojoForm.type === "multiple-choice" || dojoForm.type === "scenario") {
            // choices → True/False: same idea, different format
            rebuilt.push(fromDojo(swapFormat(dojoForm), m.id));
          } else {
            // everything else → a simpler question from the AI
            const easier = await generateEasierRetryChallenge(domain, dojoForm.conceptKey || "foundations", dojoForm.question);
            rebuilt.push(fromDojo(easier, m.id));
          }
        } catch {
          rebuilt.push(m);
        }
      }
      setIsGeneratingRetry(false);
      setMistakeQueue(rebuilt);
      setCurrent(rebuilt[0] || null);
      setGraded(false);
      gradedRef.current = false;
      setTimeUp(false);
      questionStart.current = Date.now();
    }
    rebuildMistakes();
  }, [phase, mistakeQueue, domain]);

  /* ════════ MISTAKE PHASE HANDLERS ════════ */

  /** The re-practice card reports its own verdict — quiz or code. */
  function gradeMistake(isCorrect: boolean) {
    if (gradedRef.current || !current) return;
    gradedRef.current = true;
    setGraded(true);

    recordAnswer(current.concept, isCorrect, Date.now() - questionStart.current);

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
      setStillFailing((prev) => [...new Set([...prev, current.concept || "topic"])]);
    }
  }

  function nextMistake() {
    // Moved on without answering (Skip on code) counts as "still tricky"
    if (!gradedRef.current) gradeMistake(false);

    if (mistakeIdx + 1 < mistakeQueue.length) {
      const nextIdx = mistakeIdx + 1;
      setMistakeIdx(nextIdx);
      setCurrent(mistakeQueue[nextIdx]);
      setGraded(false);
      gradedRef.current = false;
      setTimeUp(false);
      questionStart.current = Date.now();
    } else if ((mainCorrect + clearedMistakes) / Math.max(1, totalPlanned) >= MASTERY_PASS) {
      setPhase("victory");
    } else {
      // Cleared the queue but too many concepts were never mastered.
      setDefeatCause("mastery");
      setPhase("defeat");
    }
  }

  const totalLessonSteps = totalPlanned + mistakeQueue.length;
  const progress = Math.min(100, ((answeredCount + mistakeIdx) / Math.max(1, totalLessonSteps)) * 100);
  const timePct = (timeLeft / QUESTION_TIME) * 100;
  const victoryBonus = sessionXp > 0 ? XP_SESSION_BONUS : 0;

  /** Mentor line shown above whatever card is live */
  const senseiLine = current ? senseiFor(current) : "";

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-48px)] flex items-center justify-center px-4">
        <div className="surface rounded-2xl p-10 text-center space-y-4 max-w-md bg-[#090b0f]/95 border-2 border-[#06b6d4]/30 shadow-2xl">
          <div className="relative w-12 h-12 mx-auto">
            <div className="w-12 h-12 border-2 border-[#06b6d4] border-t-transparent rounded-full animate-spin" />
            <div className="absolute inset-1 w-10 h-10 border-2 border-[#a855f7]/40 border-b-transparent rounded-full animate-spin" style={{ animationDirection: "reverse", animationDuration: "1.5s" }} />
          </div>
          <div className="space-y-1">
            <h3 className="font-cinzel text-lg font-bold text-[#e8dfc8]">Forging Your Practice Trial</h3>
            <p className="text-xs text-[#06b6d4] animate-pulse">
              Mixing compiler-judged coding with every quiz type for your <strong className="text-[#e8dfc8]">{player.capacityLevel}</strong> level ({domain})...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-48px)] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-2xl">
        {/* Stable session HUD — deliberately OUTSIDE the per-question animated card so the
            timer always renders the live value and never a stale snapshot while question cards swap. */}
        {phase === "battle" && current && (
          <div className="surface rounded-2xl p-4 md:p-5 mb-4 border border-[#2a2520] space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1">
                {Array.from({ length: MAX_HEARTS }).map((_, i) => (
                  <Heart key={i} className={`w-4 h-4 transition-all ${i < hearts ? "opacity-100 scale-100 text-[#fb7185]" : "opacity-20 scale-90 grayscale"}`} fill={i < hearts ? "currentColor" : "none"} strokeWidth={2} />
                ))}
              </div>

              {combo >= 3 && (
                <motion.span
                  key={combo}
                  initial={{ scale: 1.5 }}
                  animate={{ scale: 1 }}
                  className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#f97316]/15 border border-[#f97316]/40 text-[#fdba74] animate-pulse flex items-center gap-1"
                >
                  <Flame className="w-3 h-3" strokeWidth={2} />
                  {combo} COMBO
                </motion.span>
              )}

              {graded && gainParts.length > 0 && (
                <motion.span
                  key={lastGain}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#10b981]/20 border border-[#10b981]/30 text-[#34d399]"
                >
                  {gainParts.join(" ")}
                </motion.span>
              )}

              {/* Timer ring — coding challenges run untimed */}
              {current.kind === "coding" ? (
                <div
                  className="w-11 h-11 shrink-0 rounded-full border border-[#06b6d4]/40 bg-[#06b6d4]/10 flex items-center justify-center"
                  title="No clock — write real code"
                >
                  <span className="text-[#22d3ee] text-sm" aria-hidden="true">⌨</span>
                </div>
              ) : (
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
              )}
            </div>

            {/* Progress */}
            <div className="xp-track h-1.5 rounded-full overflow-hidden">
              <div className="xp-fill-teal rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}
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
                  &quot;{totalPlanned} challenges — <strong>real coding problems</strong> judged by the compiler, plus every quiz format: choices, ordering, bug hunts, typed answers. Quiz cards get <strong>30 seconds</strong>; code runs with <strong>no clock</strong>. Chain answers for combo XP, and missed ones return in a <strong>different format</strong> — Fix Your Mistakes!&quot;
                </p>
                <p className="mt-3 text-[10px] font-mono text-[#06b6d4] uppercase tracking-widest">— AI Mentor</p>
              </div>

              <div className="flex items-center justify-center gap-6 text-xs font-mono text-[#6b6358] flex-wrap">
                <span>{totalPlanned} Challenges</span>
                <span>·</span>
                <span>⌨ Coding + {QUIZ_KINDS.length} Quiz Types</span>
                <span>·</span>
                <span className="inline-flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" strokeWidth={2} /> 30s quiz · untimed code</span>
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
              {/* Session HUD (hearts / combo / timer ring / progress) is rendered in the
                  stable bar above, outside the per-question AnimatePresence card, so the
                  timer never displays a stale value when a new question mounts. */}

              {/* Challenge header: format + progress */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-mono text-[#06b6d4] uppercase tracking-widest px-2.5 py-0.5 rounded-full border border-[#06b6d4]/30 bg-[#06b6d4]/10">
                  {current.kind === "coding"
                    ? "Coding · Compiler Judge"
                    : QUIZ_KIND_LABELS[current.quizKind] || "Quiz"}
                </span>
                <span className="font-mono text-[10px] text-[#6b6358]">
                  {answeredCount + 1}/{totalPlanned}
                </span>
              </div>

              <div className="dialogue-box-teal p-3 rounded-xl text-xs text-[#c8c0b0] italic flex items-center gap-3">
                <Lightbulb className="w-4 h-4 text-[#fbbf24] shrink-0" strokeWidth={2} />
                <p>&quot;{senseiLine}&quot;</p>
              </div>

              {/* The exact cards the Practice Lab uses: every quiz format, plus
                  coding problems judged by the real compiler (Run → sample,
                  Submit → hidden tests, verdict + explain-my-mistake). */}
              {current.kind === "coding" ? (
                <CodingCard key={current.id} item={current} onNext={advance} onResult={grade} />
              ) : (
                <QuizCard key={current.id} item={current} onNext={advance} onResult={grade} forceReveal={timeUp} />
              )}
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
                <span className="text-[10px] font-mono text-[#fbbf24] uppercase tracking-widest px-3 py-1 rounded-full border border-[#fbbf24]/30 bg-[#fbbf24]/10 flex items-center gap-1.5">
                  <Wrench className="w-3 h-3" strokeWidth={2} />
                  Fix Your Mistakes {isGeneratingRetry ? "• preparing…" : ""}
                </span>
                <span className="font-mono text-[10px] text-[#6b6358]">
                  {mistakeIdx + 1}/{mistakeQueue.length}
                </span>
              </div>

              <div className="dialogue-box-teal p-3.5 rounded-xl text-xs text-[#c8c0b0] italic flex items-center gap-3">
                <Repeat className="w-4 h-4 text-[#22d3ee] shrink-0" strokeWidth={2} />
                <p>&quot;Same concepts, <strong>different format</strong> — prove you truly understand!&quot;</p>
              </div>

              {/* Re-asked through the SAME cards as the main set — choices come
                  back flipped (MCQ → True/False), other formats come back as a
                  simpler question, and a coding problem returns to its editor. */}
              {isGeneratingRetry ? (
                <div className="surface rounded-xl p-6 border border-[#2a2520] text-center text-xs text-[#9a9182] flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />
                  Rewriting your missed challenge in a new format…
                </div>
              ) : current.kind === "coding" ? (
                <CodingCard key={current.id} item={current} onNext={nextMistake} onResult={gradeMistake} />
              ) : (
                <QuizCard key={current.id} item={current} onNext={nextMistake} onResult={gradeMistake} />
              )}

              {graded && (
                <p
                  className={`text-[11px] font-mono flex items-center gap-1.5 ${
                    lastGain > 0 ? "text-[#34d399]" : "text-[#fbbf24]"
                  }`}
                >
                  {lastGain > 0 ? (
                    <><Check className="w-3.5 h-3.5" strokeWidth={2.5} /> Mistake fixed — +{lastGain} XP</>
                  ) : (
                    <><Pin className="w-3.5 h-3.5" strokeWidth={2} /> Still tricky — queued for spaced-repetition review: 1 → 3 → 7 → 14 → 30 days.</>
                  )}
                </p>
              )}
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
                  <span className="font-mono text-base font-bold text-[#22d3ee]">+{sessionXp + victoryBonus}</span>
                </div>
                <div className="surface rounded-xl p-3 border border-[#f97316]/20 space-y-1">
                  <span className="text-[9px] text-[#6b6358] block">BEST COMBO</span>
                  <span className="font-mono text-base font-bold text-[#fdba74] flex items-center gap-1.5">
                    <Flame className="w-4 h-4" strokeWidth={2} />
                    {bestCombo}
                  </span>
                </div>
                <div className="surface rounded-xl p-3 border border-[#a855f7]/20 space-y-1">
                  <span className="text-[9px] text-[#6b6358] block">HEARTS LEFT</span>
                  <span className="font-mono text-base font-bold text-[#fb7185] flex items-center gap-1.5">
                    <Heart className="w-4 h-4" strokeWidth={2} />
                    {hearts}
                  </span>
                </div>
              </div>

              <p className="text-[10px] font-mono text-[#3d3830]">
                incl. +{victoryBonus} session completion bonus
              </p>

              {stillFailing.length > 0 && (
                <p className="text-[10px] font-mono text-[#fbbf24] max-w-sm mx-auto flex items-center justify-center gap-1.5">
                  <Pin className="w-3 h-3" strokeWidth={2} />
                  {stillFailing.length} concept{stillFailing.length > 1 ? "s" : ""} queued for spaced-repetition review (1 → 3 → 7 → 14 → 30 days).
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
                  {defeatCause === "hearts" ? "Session Ended Early" : "Mastery Bar Not Reached"}
                </span>
                <h1 className="font-cinzel text-3xl font-extrabold text-[#fb7185]" style={{ textShadow: "0 0 30px rgba(251,113,133,0.4)" }}>
                  {defeatCause === "hearts" ? "Out of Hearts" : "Trial Not Cleared"}
                </h1>
                <p className="text-xs text-[#6b6358] max-w-sm mx-auto">
                  {defeatCause === "hearts"
                    ? "Every mistake is a step toward mastery! Your weak topics are queued for review — come back stronger."
                    : `You mastered ${mainCorrect + clearedMistakes} of ${totalPlanned} concepts — you need ${Math.ceil(totalPlanned * MASTERY_PASS)} to clear this trial. Your weak topics are queued for review, so train again!`}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto">
                <div className="surface rounded-xl p-3 border border-[#06b6d4]/20 space-y-1">
                  <span className="text-[9px] text-[#6b6358] block">XP EARNED</span>
                  <span className="font-mono text-base font-bold text-[#22d3ee]">+{sessionXp}</span>
                </div>
                <div className="surface rounded-xl p-3 border border-[#f97316]/20 space-y-1">
                  <span className="text-[9px] text-[#6b6358] block">BEST COMBO</span>
                  <span className="font-mono text-base font-bold text-[#fdba74] flex items-center gap-1.5">
                    <Flame className="w-4 h-4" strokeWidth={2} />
                    {bestCombo}
                  </span>
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
                  setMainCorrect(0);
                  setDefeatCause("hearts");
                  setMistakeQueue([]);
                  setStillFailing([]);
                  setClearedMistakes(0);
                  mistakeSimplifierRan.current = false;
                  startSession(missionId);
                  const first = pickNextChallenge(challenges, new Set<string | number>());
                  setUsedIds(first ? new Set([first.id]) : new Set());
                  beginQuestion(first);
                  setPhase("battle");
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
