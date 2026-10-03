"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { CleanNarratorImg } from "@/lib/clean-samurai";
import {
  generateFirstQuestion,
  generateNextQuestion,
  analyzeUserProfile,
  OnboardingQuestion,
  OnboardingProfile,
} from "@/lib/ai-onboarding";

/* ═══════════════════════════════════════════
   AI-POWERED ONBOARDING WITH NARRATOR SENSEI
   Standing Narrator PNG at bottom-left corner
   + Pop-up Speech Bubble Narration Box with typewriter text.
   Questions generated dynamically by AI for each user.
   ═══════════════════════════════════════════ */

const TOTAL_QUESTIONS = 6;

/* ═══════════════════════════════════════════
   FIXED BOTTOM-LEFT NARRATOR CHARACTER & SPEECH BUBBLE
   (Original working narrator system)
   ═══════════════════════════════════════════ */
function BottomLeftNarrator({
  lines,
  onDone,
}: {
  lines: string[];
  onDone: () => void;
}) {
  const [lineIdx, setLineIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [done, setDone] = useState<string[]>([]);

  useEffect(() => {
    setLineIdx(0);
    setCharIdx(0);
    setDone([]);
  }, [lines]);

  useEffect(() => {
    if (lineIdx >= lines.length) return;
    const line = lines[lineIdx];
    if (charIdx < line.length) {
      const t = setTimeout(() => setCharIdx((c) => c + 1), 30);
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(() => {
        setDone((d) => [...d, line]);
        setLineIdx((l) => l + 1);
        setCharIdx(0);
      }, 400);
      return () => clearTimeout(t);
    }
  }, [lineIdx, charIdx, lines]);

  const isTyping = lineIdx < lines.length;

  return (
    <div className="fixed bottom-0 left-2 md:left-8 z-40 flex items-end gap-3 md:gap-6 pointer-events-none">
      {/* 1. Standing Character PNG at bottom-left corner */}
      <div className="relative flex-shrink-0 flex flex-col items-center">
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
          onClick={onDone}
          className="relative z-10 w-48 sm:w-64 md:w-80 h-[260px] sm:h-[350px] md:h-[430px] flex items-end justify-center pointer-events-auto cursor-pointer group"
          title="Click to continue"
        >
          <CleanNarratorImg
            alt="Narrator Sensei"
            className="w-full h-full object-contain filter drop-shadow-[0_15px_30px_rgba(0,0,0,0.95)] transition-transform duration-300 group-hover:scale-105"
          />
        </motion.div>
        {/* Soft floor shadow */}
        <div className="w-36 md:w-56 h-4 bg-[#b49b64]/30 rounded-full blur-md -mt-4 pointer-events-none" />
      </div>

      {/* 2. Pop-up Speech Bubble Narration Box */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        onClick={onDone}
        className="pointer-events-auto mb-12 md:mb-20 w-80 sm:w-[420px] md:w-[520px] rounded-2xl bg-[#090b0f]/95 border-2 border-[#b49b64]/60 p-5 md:p-6 shadow-[0_15px_50px_rgba(0,0,0,0.95)] backdrop-blur-md relative space-y-4 cursor-pointer group"
        title="Click to continue"
      >
        {/* Speech Bubble Pointer */}
        <div className="absolute -left-3.5 bottom-8 w-0 h-0 border-y-8 border-y-transparent border-r-[14px] border-r-[#b49b64]/60 hidden sm:block" />
        <div className="absolute -left-[11px] bottom-8 w-0 h-0 border-y-8 border-y-transparent border-r-[12px] border-r-[#090b0f] hidden sm:block" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#b49b64]/25 pb-3">
          <div className="flex items-center gap-2">
            <span className="font-cinzel text-xs md:text-sm font-bold text-[#b49b64] uppercase tracking-widest">
              AI Career Sensei
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isTyping ? (
              <div className="flex items-center gap-1">
                <span className="w-1 h-3 bg-[#b49b64] rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1 h-4 bg-[#b49b64] rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1 h-2.5 bg-[#b49b64] rounded-full animate-bounce" />
              </div>
            ) : (
              <span className="font-mono text-[10px] text-[#4a7a5a] uppercase flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#4a7a5a]" />
                Dialogue Complete
              </span>
            )}
          </div>
        </div>

        {/* Dialogue Text */}
        <div className="space-y-2.5 max-h-48 overflow-y-auto scrollbar-thin">
          {done.map((l, i) => (
            <p key={i} className="font-cinzel text-sm md:text-base text-[#c8c0b0] leading-relaxed italic">
              &quot;{l}&quot;
            </p>
          ))}
          {lineIdx < lines.length && (
            <p className="font-cinzel text-sm md:text-base text-[#b49b64] leading-relaxed italic font-medium">
              &quot;{lines[lineIdx].slice(0, charIdx)}
              <span className="inline-block w-0.5 h-4 bg-[#b49b64] ml-0.5 animate-pulse" />&quot;
            </p>
          )}
        </div>

        {/* Skip action prompt */}
        <div className="pt-2 flex items-center justify-end border-t border-[#b49b64]/20">
          <span className="font-cinzel text-xs font-bold text-[#b49b64] group-hover:text-[#ffffff] transition-colors flex items-center gap-1 animate-pulse">
            <span>Skip / Reveal Question</span>
            <span className="text-sm font-mono">→</span>
          </span>
        </div>
      </motion.div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   WELCOME STEP (Name Input)
   ═══════════════════════════════════════════ */
function WelcomeStep({
  name,
  setName,
  onContinue,
}: {
  name: string;
  setName: (v: string) => void;
  onContinue: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="scroll-surface rounded-2xl p-8 md:p-12 max-w-xl mx-auto space-y-6 shadow-2xl border-2 border-[#b49b64]/40 bg-[#090b0f]/95 backdrop-blur-md text-center"
    >
      <div className="space-y-3">
        <span className="font-cinzel text-xs text-[#b49b64] uppercase tracking-widest font-bold">
          Step 1 of Assessment
        </span>
        <h1 className="font-cinzel text-2xl md:text-4xl font-extrabold text-[#e8dfc8] tracking-wide">
          Enter Your Name
        </h1>
        <p className="text-sm text-[#9a9182] leading-relaxed">
          Welcome to CareerVerse! Before the AI Sensei begins your personalized career assessment, what should we call you?
        </p>
      </div>

      <div className="space-y-4 pt-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your name..."
          className="w-full bg-[#040507] border-2 border-[#b49b64]/50 rounded-xl px-6 py-4 text-center font-cinzel text-xl md:text-2xl text-[#b49b64] placeholder:text-[#3d3830] focus:outline-none focus:border-[#b49b64] shadow-inner"
          autoFocus
        />

        <button
          onClick={onContinue}
          disabled={!name.trim()}
          className={`btn-scroll w-full py-4 rounded-xl text-sm font-bold uppercase tracking-widest transition-all ${
            !name.trim() ? "opacity-30 cursor-not-allowed" : "shadow-[0_0_25px_rgba(180,155,100,0.4)]"
          }`}
        >
          Begin AI Assessment →
        </button>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════
   RESULTS / PROFILE SUMMARY STEP
   ═══════════════════════════════════════════ */
function ResultsStep({
  profile,
  onCreateAccount,
}: {
  profile: OnboardingProfile;
  onCreateAccount: () => void;
}) {
  const domainColors: Record<string, { text: string; border: string; bg: string; glow: string }> = {
    teal: { text: "text-[#22d3ee]", border: "border-[#06b6d4]", bg: "bg-[#06b6d4]/10", glow: "glow-teal" },
    purple: { text: "text-[#c084fc]", border: "border-[#a855f7]", bg: "bg-[#a855f7]/10", glow: "glow-purple" },
    emerald: { text: "text-[#34d399]", border: "border-[#10b981]", bg: "bg-[#10b981]/10", glow: "glow-emerald" },
    amber: { text: "text-[#fbbf24]", border: "border-[#f59e0b]", bg: "bg-[#f59e0b]/10", glow: "glow-amber" },
    rose: { text: "text-[#fb7185]", border: "border-[#f43f5e]", bg: "bg-[#f43f5e]/10", glow: "glow-rose" },
    blue: { text: "text-[#60a5fa]", border: "border-[#3b82f6]", bg: "bg-[#3b82f6]/10", glow: "glow-teal" },
  };
  const color = domainColors[profile.domainColor] || domainColors.teal;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6 }}
      className="max-w-3xl mx-auto space-y-8 relative z-20"
    >
      {/* Main result card */}
      <div className={`rounded-2xl p-8 md:p-10 border-2 ${color.border}/50 ${color.bg} ${color.glow} bg-[#090b0f]/95 backdrop-blur-md text-center space-y-4 shadow-2xl`}>
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className={`text-xs font-mono uppercase tracking-widest px-3 py-1 rounded-full border ${color.border}/50 ${color.bg} ${color.text}`}>
            AI Recommendation Result
          </span>
        </div>
        <h2 className="font-cinzel text-2xl md:text-4xl font-extrabold text-[#e8dfc8]">
          Recommended Path: <span className={color.text}>{profile.recommendedDomain}</span>
        </h2>
        <p className="text-sm md:text-base text-[#9a9182] leading-relaxed max-w-xl mx-auto font-sans">
          {profile.learningPathSummary}
        </p>
        <div className={`inline-block px-4 py-1.5 rounded-full border ${color.border}/40 ${color.bg}`}>
          <span className={`font-mono text-xs ${color.text}`}>
            Starting Level: {profile.difficultyLevel}
          </span>
        </div>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Interests */}
        <div className="surface-teal rounded-xl p-5 space-y-3 bg-[#090b0f]/90 backdrop-blur-md">
          <h3 className="text-xs font-cinzel font-bold text-[#22d3ee] uppercase tracking-widest">
            Your Interests
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {profile.interests.map((interest, i) => (
              <span
                key={i}
                className="text-xs px-2.5 py-1 rounded-full bg-[#06b6d4]/10 border border-[#06b6d4]/30 text-[#22d3ee]"
              >
                {interest}
              </span>
            ))}
          </div>
        </div>

        {/* Strengths */}
        <div className="surface-purple rounded-xl p-5 space-y-3 bg-[#090b0f]/90 backdrop-blur-md">
          <h3 className="text-xs font-cinzel font-bold text-[#c084fc] uppercase tracking-widest">
            Your Strengths
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {profile.strengths.map((strength, i) => (
              <span
                key={i}
                className="text-xs px-2.5 py-1 rounded-full bg-[#a855f7]/10 border border-[#a855f7]/30 text-[#c084fc]"
              >
                {strength}
              </span>
            ))}
          </div>
        </div>

        {/* Suggested Topics */}
        <div className="surface-emerald rounded-xl p-5 space-y-3 bg-[#090b0f]/90 backdrop-blur-md">
          <h3 className="text-xs font-cinzel font-bold text-[#34d399] uppercase tracking-widest">
            First Learning Topics
          </h3>
          <ul className="space-y-1.5">
            {profile.suggestedTopics.slice(0, 4).map((topic, i) => (
              <li key={i} className="text-xs text-[#9a9182] flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                {topic}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* CTA */}
      <div className="text-center space-y-4 pt-4">
        <button
          onClick={onCreateAccount}
          className="btn-scroll px-12 py-4 rounded-xl text-base font-bold uppercase tracking-widest shadow-[0_0_30px_rgba(180,155,100,0.4)]"
        >
          Create Account & Enter Platform →
        </button>
        <p className="text-xs text-[#6b6358] italic">
          Your personalized learning path will be waiting for you upon login.
        </p>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════
   MAIN ONBOARDING PAGE
   ═══════════════════════════════════════════ */
export default function OnboardingPage() {
  const router = useRouter();

  const [phase, setPhase] = useState<"welcome" | "assessment" | "analyzing" | "results">("welcome");
  const [name, setName] = useState("");
  const [step, setStep] = useState(0);
  const [dialogueDone, setDialogueDone] = useState(false);
  const [questions, setQuestions] = useState<OnboardingQuestion[]>([]);
  const [answers, setAnswers] = useState<{ questionId: string; questionText: string; selectedIds: string[]; selectedLabels: string[] }[]>([]);
  const [currentSelection, setCurrentSelection] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [profile, setProfile] = useState<OnboardingProfile | null>(null);

  const resetDialogue = useCallback(() => setDialogueDone(false), []);

  /* Generate AI question for a given step */
  const fetchQuestionForStep = useCallback(
    async (stepIdx: number, userAnswers: typeof answers) => {
      setIsGenerating(true);
      try {
        let q: OnboardingQuestion;
        if (stepIdx === 0) {
          q = await generateFirstQuestion(name || "Learner");
        } else {
          const prevFormatted = userAnswers.map((a) => ({
            question: a.questionText,
            answer: a.selectedLabels.join(", "),
          }));
          q = await generateNextQuestion(name || "Learner", prevFormatted, stepIdx + 1, TOTAL_QUESTIONS);
        }
        setQuestions((prev) => {
          const updated = [...prev];
          updated[stepIdx] = q;
          return updated;
        });
      } catch (err) {
        console.error("Failed to generate AI question:", err);
      } finally {
        setIsGenerating(false);
      }
    },
    [name]
  );

  /* Start assessment when welcome completes */
  function handleStartAssessment() {
    if (!name.trim()) return;
    if (typeof window !== "undefined") {
      localStorage.setItem("character_name", name);
    }
    setPhase("assessment");
    setStep(0);
    resetDialogue();
    fetchQuestionForStep(0, []);
  }

  const currentQuestion = questions[step] || null;

  /* Handle option selection */
  function selectOption(optionId: string) {
    if (!currentQuestion) return;
    if (currentQuestion.multiSelect) {
      setCurrentSelection((prev) =>
        prev.includes(optionId) ? prev.filter((x) => x !== optionId) : [...prev, optionId]
      );
    } else {
      setCurrentSelection([optionId]);
    }
  }

  function isOptionSelected(optionId: string) {
    return currentSelection.includes(optionId);
  }

  /* Advance to next AI question */
  async function handleNextQuestion() {
    if (!currentQuestion || currentSelection.length === 0) return;

    const selectedLabels = currentSelection.map(
      (id) => currentQuestion.options.find((o) => o.id === id)?.label || id
    );

    const updatedAnswers = [
      ...answers.slice(0, step),
      {
        questionId: currentQuestion.id,
        questionText: currentQuestion.question,
        selectedIds: currentSelection,
        selectedLabels,
      },
    ];

    setAnswers(updatedAnswers);
    setCurrentSelection([]);

    if (step + 1 >= TOTAL_QUESTIONS) {
      // Assessment complete → analyze profile with AI
      setPhase("analyzing");
      const formattedForAnalysis = updatedAnswers.map((a) => ({
        question: a.questionText,
        answer: a.selectedLabels.join(", "),
      }));
      const res = await analyzeUserProfile(name, formattedForAnalysis);
      setProfile(res);

      if (typeof window !== "undefined") {
        localStorage.setItem("cv_onboarding_profile", JSON.stringify(res));
      }

      setPhase("results");
    } else {
      const nextStep = step + 1;
      setStep(nextStep);
      resetDialogue();
      fetchQuestionForStep(nextStep, updatedAnswers);
    }
  }

  /* Return to previous question */
  function handleBack() {
    if (step > 0) {
      const prevStep = step - 1;
      const prevAnswer = answers[prevStep];
      setCurrentSelection(prevAnswer?.selectedIds || []);
      setStep(prevStep);
      resetDialogue();
    } else {
      setPhase("welcome");
      setQuestions([]);
      setAnswers([]);
      setCurrentSelection([]);
    }
  }

  return (
    <div
      onClick={() => {
        if (!dialogueDone && phase === "assessment") setDialogueDone(true);
      }}
      className="relative min-h-[calc(100vh-48px)] flex items-center justify-center px-4 py-8 pb-48 md:pb-12 overflow-hidden"
    >
      {/* Medieval Battle Scene Background Overlay (Original design preserved) */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <img
          src="/png/vecteezy_warriors-in-medieval-battle-scene-fighting-in-silhouette_27447174.jpg"
          alt="Medieval Battle Scene"
          className="w-full h-full object-cover opacity-55 filter brightness-90 contrast-110 saturate-80 scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#06070a] via-[#06070a]/30 to-[#06070a]/70" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#06070a]/60 via-transparent to-[#06070a]/60" />
      </div>

      {/* Standing Narrator PNG + Speech Bubble (Original narration system preserved) */}
      <AnimatePresence>
        {phase === "assessment" && !dialogueDone && currentQuestion && (
          <BottomLeftNarrator
            key={`narrator-${step}`}
            lines={currentQuestion.senseiDialogue || [
              `Question ${step + 1} of ${TOTAL_QUESTIONS}`,
              currentQuestion.question,
            ]}
            onDone={() => setDialogueDone(true)}
          />
        )}
      </AnimatePresence>

      <div className="relative z-10 w-full max-w-4xl lg:max-w-5xl space-y-8">
        {/* Step Progress Bar */}
        {phase === "assessment" && (
          <div className="flex items-center justify-center gap-2.5">
            {Array.from({ length: TOTAL_QUESTIONS }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  i < step
                    ? "w-10 md:w-14 bg-[#b49b64]/60"
                    : i === step
                    ? "w-12 md:w-16 bg-[#b49b64] animate-pulse"
                    : "w-5 md:w-6 bg-[#3d3830]/50"
                }`}
              />
            ))}
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* Step 1: Name Input */}
          {phase === "welcome" && (
            <WelcomeStep
              key="welcome"
              name={name}
              setName={setName}
              onContinue={handleStartAssessment}
            />
          )}

          {/* Assessment: AI Questions */}
          {phase === "assessment" && (
            <motion.div key={step} className="space-y-8">
              {isGenerating ? (
                <div className="p-12 text-center surface rounded-2xl max-w-md mx-auto space-y-4 bg-[#090b0f]/90 backdrop-blur-md border-2 border-[#b49b64]/40">
                  <div className="w-10 h-10 border-2 border-[#b49b64] border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="font-cinzel text-sm text-[#b49b64] animate-pulse">
                    AI Sensei is formulating your personalized question...
                  </p>
                </div>
              ) : (
                /* Reveal Question & Choices when dialogueDone is true */
                <AnimatePresence mode="wait">
                  {dialogueDone && currentQuestion && (
                    <motion.div
                      initial={{ opacity: 0, y: 18 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -12 }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                      className="space-y-8"
                    >
                      <div className="text-center space-y-2">
                        <span className="font-cinzel text-xs text-[#b49b64] uppercase tracking-widest">
                          Question {step + 1} of {TOTAL_QUESTIONS}
                          {currentQuestion.multiSelect && " • Select all that apply"}
                        </span>
                        <p className="font-cinzel text-xl md:text-3xl lg:text-4xl font-extrabold text-[#e8dfc8] tracking-wide drop-shadow-[0_4px_16px_rgba(0,0,0,0.95)]">
                          {currentQuestion.question}
                        </p>
                      </div>

                      {/* Choice cards in scroll/parchment style */}
                      <div
                        className={`grid gap-4 md:gap-6 ${
                          currentQuestion.options.length <= 4
                            ? "grid-cols-1 sm:grid-cols-2"
                            : "grid-cols-2 sm:grid-cols-3"
                        }`}
                      >
                        {currentQuestion.options.map((c) => {
                          const selected = isOptionSelected(c.id);
                          return (
                            <button
                              key={c.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                selectOption(c.id);
                              }}
                              className={`text-left p-6 md:p-8 rounded-xl transition-all duration-200 shadow-2xl backdrop-blur-md border-2 ${
                                selected
                                  ? "bg-[#14120e]/95 border-[#b49b64] ring-2 ring-[#b49b64]/30 scale-[1.02]"
                                  : "bg-[#090b0f]/90 border-[#b49b64]/25 hover:border-[#b49b64]/60 hover:bg-[#0d1016]/95 hover:scale-[1.01]"
                              }`}
                            >
                              <p
                                className={`font-cinzel text-base md:text-xl lg:text-2xl font-extrabold tracking-wider ${
                                  selected ? "text-[#b49b64]" : "text-[#e0d6c3]"
                                }`}
                              >
                                {c.label}
                              </p>
                              <p className="text-sm md:text-base text-[#9a9182] mt-2.5 leading-relaxed font-sans font-medium">
                                {c.description}
                              </p>
                            </button>
                          );
                        })}
                      </div>

                      {/* Navigation buttons */}
                      <div className="flex items-center justify-between pt-6">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleBack();
                          }}
                          className="font-cinzel text-xs md:text-sm font-bold tracking-widest uppercase px-6 py-3 rounded-lg text-[#8c8270] hover:text-[#e8dfc8] transition-colors"
                        >
                          ← Return
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNextQuestion();
                          }}
                          disabled={currentSelection.length === 0}
                          className={`btn-scroll px-10 py-3.5 rounded-lg text-xs md:text-sm font-bold uppercase tracking-widest transition-all ${
                            currentSelection.length === 0
                              ? "opacity-30 cursor-not-allowed"
                              : "shadow-[0_0_25px_rgba(180,155,100,0.4)]"
                          }`}
                        >
                          {step + 1 === TOTAL_QUESTIONS ? "Complete Assessment →" : "Continue →"}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
            </motion.div>
          )}

          {/* Analyzing Step */}
          {phase === "analyzing" && (
            <motion.div
              key="analyzing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-12 text-center surface rounded-2xl max-w-md mx-auto space-y-4 bg-[#090b0f]/95 backdrop-blur-md border-2 border-[#b49b64]/40 shadow-2xl"
            >
              <div className="w-12 h-12 border-2 border-[#b49b64] border-t-transparent rounded-full animate-spin mx-auto" />
              <div className="space-y-2">
                <h3 className="font-cinzel text-lg font-bold text-[#b49b64]">
                  Analyzing Your Assessment
                </h3>
                <p className="text-xs text-[#9a9182] leading-relaxed">
                  AI Sensei is processing your responses to recommend the optimal IT career path...
                </p>
              </div>
            </motion.div>
          )}

          {/* Step Results: AI Profile Recommendation */}
          {phase === "results" && profile && (
            <ResultsStep
              key="results"
              profile={profile}
              onCreateAccount={() => router.push("/auth")}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
