"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

/* ═══════════════════════════════════════════
   THE SENSEI'S QUESTIONS
   Story-driven onboarding. Each question is
   posed as dialogue from a master figure.
   Ends with character name entry & Auth redirect.
   ═══════════════════════════════════════════ */

import { CleanNarratorImg } from "@/lib/clean-samurai";

interface Chapter {
  id: string;
  senseiDialogue: string[];
  question: string;
  choices?: { id: string; label: string; lore: string }[];
  multi?: boolean;
  isNameInput?: boolean;
}

const chapters: Chapter[] = [
  {
    id: "origin",
    senseiDialogue: [
      "You have come far to reach this dojo.",
      "Before I can guide you, I must understand where your journey began.",
    ],
    question: "What grounds have you walked before arriving here?",
    choices: [
      { id: "HIGH_SCHOOL", label: "The Village Roads", lore: "Still learning the basics — a student of the first scrolls" },
      { id: "UNDERGRADUATE", label: "The Academy Gates", lore: "Pursuing knowledge in the halls of higher learning" },
      { id: "GRADUATE", label: "The Scholar's Tower", lore: "Deep in research, mastering advanced disciplines" },
      { id: "PROFESSIONAL", label: "The Merchant Quarter", lore: "Experienced in the real world, seeking a new craft" },
    ],
  },
  {
    id: "strength",
    senseiDialogue: [
      "I see. Your path has given you a certain foundation.",
      "Now tell me — how sharp is your blade?",
    ],
    question: "What is your experience with the craft of code?",
    choices: [
      { id: "BEGINNER", label: "Unsharpened", lore: "The blade is new — eager to learn the first strike" },
      { id: "INTERMEDIATE", label: "Tempered", lore: "You have struck before — some patterns are familiar" },
      { id: "ADVANCED", label: "Battle-Tested", lore: "You have fought in real engagements and survived" },
      { id: "EXPERT", label: "Master's Edge", lore: "Your blade has been through countless battles" },
    ],
  },
  {
    id: "ambition",
    senseiDialogue: [
      "Every warrior needs purpose beyond survival.",
      "What drives you to walk this path?",
    ],
    question: "Choose the ambitions that burn within you.",
    choices: [
      { id: "scalable", label: "Build Fortress Systems", lore: "Architect systems that stand the test of thousands" },
      { id: "design", label: "Craft Visual Worlds", lore: "Shape what users see and feel" },
      { id: "cloud", label: "Command the Clouds", lore: "Master infrastructure that spans the sky" },
      { id: "data", label: "Read the Data Streams", lore: "Find truth hidden in rivers of information" },
      { id: "first_job", label: "Earn the First Seal", lore: "Secure your place in the guild of builders" },
      { id: "senior", label: "Ascend to Elder", lore: "Prepare for leadership and mastery" },
    ],
    multi: true,
  },
  {
    id: "element",
    senseiDialogue: [
      "Every master draws power from a domain.",
      "Where does your spirit resonate most?",
    ],
    question: "Select the domains that call to you.",
    choices: [
      { id: "backend", label: "The Forge", lore: "Backend — where raw logic is hammered into APIs" },
      { id: "frontend", label: "The Canvas", lore: "Frontend — where users touch the craft" },
      { id: "devops", label: "The Watchtower", lore: "DevOps — guardians of the pipeline" },
      { id: "data_eng", label: "The Archive", lore: "Data — keepers of the knowledge streams" },
      { id: "ai_ml", label: "The Oracle", lore: "AI/ML — those who teach machines to think" },
      { id: "mobile", label: "The Messenger", lore: "Mobile — reaching hands wherever they are" },
    ],
    multi: true,
  },
  {
    id: "style",
    senseiDialogue: [
      "There are many ways to learn the ancient arts.",
      "Do you prefer the scroll or the sparring ring?",
    ],
    question: "How do you wish to train?",
    choices: [
      { id: "PRACTICAL", label: "The Sparring Ring", lore: "Learn by doing — missions, challenges, real combat" },
      { id: "THEORETICAL", label: "The Ancient Scrolls", lore: "Study first, then apply — deep reading and analysis" },
      { id: "MIXED", label: "The Balanced Way", lore: "Half in study, half in practice — the middle path" },
    ],
  },
  {
    id: "commitment",
    senseiDialogue: [
      "Mastery demands time.",
      "How many hours can you dedicate to training each day?",
    ],
    question: "Set your daily training commitment.",
    choices: [
      { id: "15", label: "A Brief Meditation", lore: "15 minutes — enough to maintain awareness" },
      { id: "30", label: "Morning Practice", lore: "30 minutes — steady progress, no rush" },
      { id: "60", label: "A Full Session", lore: "One hour — serious intent, real growth" },
      { id: "120", label: "The Warrior's Path", lore: "Two hours — relentless dedication" },
    ],
  },
  {
    id: "name",
    senseiDialogue: [
      "One final question, wanderer.",
      "By what name shall the ancient scrolls know your warrior spirit?",
    ],
    question: "Inscribe your warrior name.",
    isNameInput: true,
  },
];

/* Fixed Bottom-Left Narrator Character & Popup Speech Bubble */
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
      {/* 1. Standing Character PNG at bottom-left corner (LARGER SIZE, no box/frame container) */}
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

      {/* 2. Pop-up Speech Bubble Narration Box (LARGER SIZE) */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        onClick={onDone}
        className="pointer-events-auto mb-12 md:mb-20 w-80 sm:w-[420px] md:w-[520px] rounded-2xl bg-[#090b0f]/95 border-2 border-[#b49b64]/60 p-5 md:p-6 shadow-[0_15px_50px_rgba(0,0,0,0.95)] backdrop-blur-md relative space-y-4 cursor-pointer group"
        title="Click to continue"
      >
        {/* Speech Bubble Pointer pointing to character */}
        <div className="absolute -left-3.5 bottom-8 w-0 h-0 border-y-8 border-y-transparent border-r-[14px] border-r-[#b49b64]/60 hidden sm:block" />
        <div className="absolute -left-[11px] bottom-8 w-0 h-0 border-y-8 border-y-transparent border-r-[12px] border-r-[#090b0f] hidden sm:block" />

        {/* Narrator Header */}
        <div className="flex items-center justify-between border-b border-[#b49b64]/25 pb-3">
          <div className="flex items-center gap-2">
            <span className="font-cinzel text-xs md:text-sm font-bold text-[#b49b64] uppercase tracking-widest">
              Master Sensei
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
              "{l}"
            </p>
          ))}
          {lineIdx < lines.length && (
            <p className="font-cinzel text-sm md:text-base text-[#b49b64] leading-relaxed italic font-medium">
              "{lines[lineIdx].slice(0, charIdx)}
              <span className="inline-block w-0.5 h-4 bg-[#b49b64] ml-0.5 animate-pulse" />"
            </p>
          )}
        </div>

        {/* Skip action prompt */}
        <div className="pt-2 flex items-center justify-end border-t border-[#b49b64]/20">
          <span className="font-cinzel text-xs font-bold text-[#b49b64] group-hover:text-[#ffffff] transition-colors flex items-center gap-1 animate-pulse">
            <span>Skip</span>
            <span className="text-sm font-mono">→</span>
          </span>
        </div>
      </motion.div>
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [dialogueDone, setDialogueDone] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({
    name: "Master Ronin",
  });

  const chapter = chapters[step];
  const isLast = step === chapters.length - 1;

  const resetDialogue = useCallback(() => setDialogueDone(false), []);

  const currentAnswer = answers[chapter.id];
  const hasAnswer = chapter.isNameInput
    ? typeof currentAnswer === "string" && currentAnswer.trim().length > 0
    : chapter.multi
    ? Array.isArray(currentAnswer) && currentAnswer.length > 0
    : !!currentAnswer;

  function selectChoice(choiceId: string) {
    if (chapter.multi) {
      const prev = (answers[chapter.id] as string[]) || [];
      const next = prev.includes(choiceId)
        ? prev.filter((x) => x !== choiceId)
        : [...prev, choiceId];
      setAnswers({ ...answers, [chapter.id]: next });
    } else {
      setAnswers({ ...answers, [chapter.id]: choiceId });
    }
  }

  function isSelected(choiceId: string) {
    if (chapter.multi) {
      return ((answers[chapter.id] as string[]) || []).includes(choiceId);
    }
    return answers[chapter.id] === choiceId;
  }

  function handleNext() {
    if (!hasAnswer) return;
    if (isLast) {
      // Store character name in localStorage & proceed to auth
      if (typeof window !== "undefined") {
        localStorage.setItem("character_name", (answers.name as string) || "Master Ronin");
      }
      router.push("/auth");
    } else {
      resetDialogue();
      setStep(step + 1);
    }
  }

  function handleBack() {
    if (step > 0) {
      resetDialogue();
      setStep(step - 1);
    }
  }

  return (
    <div
      onClick={() => {
        if (!dialogueDone) setDialogueDone(true);
      }}
      className="relative min-h-[calc(100vh-48px)] flex items-center justify-center px-4 py-8 pb-48 md:pb-12 overflow-hidden"
    >
      {/* Bright Medieval Battle Scene Background Image (vecteezy_warriors-in-medieval-battle-scene-fighting-in-silhouette_27447174) */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <img
          src="/png/vecteezy_warriors-in-medieval-battle-scene-fighting-in-silhouette_27447174.jpg"
          alt="Medieval Battle Scene"
          className="w-full h-full object-cover opacity-55 filter brightness-90 contrast-110 saturate-80 scale-105"
        />
        {/* Soft Vignette Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#06070a] via-[#06070a]/30 to-[#06070a]/70" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#06070a]/60 via-transparent to-[#06070a]/60" />
      </div>

      {/* Bottom-Left Standing Narrator PNG + Pop-up Dialogue Box (Disappears when dialogueDone is true) */}
      <AnimatePresence>
        {!dialogueDone && (
          <BottomLeftNarrator
            key={`narrator-${step}`}
            lines={chapter.senseiDialogue}
            onDone={() => setDialogueDone(true)}
          />
        )}
      </AnimatePresence>

      <div className="relative z-10 w-full max-w-4xl lg:max-w-5xl space-y-8">
        {/* Progress — simple ink marks */}
        <div className="flex items-center justify-center gap-2.5">
          {chapters.map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all duration-500 ${
                i < step
                  ? "w-10 md:w-14 bg-[#b49b64]/60"
                  : i === step
                  ? "w-12 md:w-16 bg-[#b49b64]"
                  : "w-5 md:w-6 bg-[#3d3830]/50"
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.4 }}
            className="space-y-8"
          >
            {/* Reveal Question + Choices when dialogueDone is true */}
            <AnimatePresence mode="wait">
              {dialogueDone && (
                <motion.div
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="space-y-8"
                >
                  <p className="font-cinzel text-xl md:text-3xl lg:text-4xl font-extrabold text-[#e8dfc8] text-center tracking-wide drop-shadow-[0_4px_16px_rgba(0,0,0,0.95)]">
                    {chapter.question}
                  </p>

                  {/* Character Name Input */}
                  {chapter.isNameInput ? (
                    <div className="scroll-surface rounded-xl p-8 md:p-12 max-w-xl mx-auto space-y-6 shadow-2xl border-2 border-[#b49b64]/40 bg-[#090b0f]/95 backdrop-blur-md">
                      <label className="block font-cinzel text-xs md:text-sm text-[#8c8270] uppercase tracking-widest text-center font-bold">
                        Warrior Name
                      </label>
                      <input
                        type="text"
                        value={(answers.name as string) || ""}
                        onChange={(e) => setAnswers({ ...answers, name: e.target.value })}
                        placeholder="e.g. Master Ronin"
                        className="w-full bg-[#040507] border-2 border-[#b49b64]/50 rounded-lg px-6 py-4 text-center font-cinzel text-lg md:text-2xl text-[#b49b64] placeholder:text-[#3d3830] focus:outline-none focus:border-[#b49b64] shadow-inner"
                        autoFocus
                      />
                      <p className="text-xs md:text-sm text-[#7a7263] text-center italic">
                        This name will be sealed onto your warrior scrolls and profile.
                      </p>
                    </div>
                  ) : (
                    /* Choice cards — scroll/parchment style (LARGER SIZE) */
                    <div
                      className={`grid gap-4 md:gap-6 ${
                        (chapter.choices?.length || 0) <= 4
                          ? "grid-cols-1 sm:grid-cols-2"
                          : "grid-cols-2 sm:grid-cols-3"
                      }`}
                    >
                      {chapter.choices?.map((c) => {
                        const selected = isSelected(c.id);
                        return (
                          <button
                            key={c.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              selectChoice(c.id);
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
                              {c.lore}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Navigation */}
                  <div className="flex items-center justify-between pt-6">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBack();
                      }}
                      disabled={step === 0}
                      className={`font-cinzel text-xs md:text-sm font-bold tracking-widest uppercase px-6 py-3 rounded-lg transition-colors ${
                        step === 0
                          ? "text-[#3d3830] cursor-not-allowed"
                          : "text-[#8c8270] hover:text-[#e8dfc8]"
                      }`}
                    >
                      ← Return
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNext();
                      }}
                      disabled={!hasAnswer}
                      className={`btn-scroll px-10 py-3.5 rounded-lg text-xs md:text-sm font-bold uppercase tracking-widest transition-all ${
                        !hasAnswer ? "opacity-30 cursor-not-allowed" : "shadow-[0_0_25px_rgba(180,155,100,0.4)]"
                      }`}
                    >
                      {isLast ? "Proceed to Sign Up →" : "Continue →"}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
