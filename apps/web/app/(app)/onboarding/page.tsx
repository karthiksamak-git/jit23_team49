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

import { CleanSamuraiImg } from "@/lib/clean-samurai";

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

/* Dialogue typewriter for sensei */
function SenseiDialogue({ lines, onDone }: { lines: string[]; onDone: () => void }) {
  const [lineIdx, setLineIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [done, setDone] = useState<string[]>([]);

  useEffect(() => {
    if (lineIdx >= lines.length) { onDone(); return; }
    const line = lines[lineIdx];
    if (charIdx < line.length) {
      const t = setTimeout(() => setCharIdx(c => c + 1), 35);
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(() => {
        setDone(d => [...d, line]);
        setLineIdx(l => l + 1);
        setCharIdx(0);
      }, 500);
      return () => clearTimeout(t);
    }
  }, [lineIdx, charIdx, lines, onDone]);

  return (
    <div className="dialogue-box rounded px-6 py-5 space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-full border border-[#b49b64]/40 bg-[#0a0b0d] overflow-hidden flex items-center justify-center p-0.5">
          <CleanSamuraiImg alt="Sensei" className="w-full h-full object-contain" />
        </div>
        <span className="font-cinzel text-[10px] tracking-[0.3em] text-[#6b6358] uppercase">
          Master Sensei
        </span>
      </div>
      {done.map((l, i) => (
        <p key={i} className="font-cinzel text-sm text-[#6b6358] leading-relaxed italic">"{l}"</p>
      ))}
      {lineIdx < lines.length && (
        <p className="font-cinzel text-sm text-[#b49b64] leading-relaxed italic">
          "{lines[lineIdx].slice(0, charIdx)}
          <span className="inline-block w-[1px] h-[0.9em] bg-[#b49b64]/50 ml-0.5 cursor-blink" />"
        </p>
      )}
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
    <div className="min-h-[calc(100vh-48px)] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-2xl space-y-6">
        {/* Progress — simple ink marks */}
        <div className="flex items-center justify-center gap-2">
          {chapters.map((_, i) => (
            <div
              key={i}
              className={`h-[3px] rounded-full transition-all duration-500 ${
                i < step
                  ? "w-8 bg-[#b49b64]/60"
                  : i === step
                  ? "w-10 bg-[#b49b64]"
                  : "w-4 bg-[#3d3830]/50"
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.4 }}
            className="space-y-6"
          >
            {/* Sensei dialogue */}
            <SenseiDialogue
              key={`dialogue-${step}`}
              lines={chapter.senseiDialogue}
              onDone={() => setDialogueDone(true)}
            />

            {/* Question + Choices — appear after dialogue */}
            <AnimatePresence>
              {dialogueDone && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="space-y-5"
                >
                  <p className="font-cinzel text-base text-[#c8c0b0] text-center tracking-wide">
                    {chapter.question}
                  </p>

                  {/* Character Name Input */}
                  {chapter.isNameInput ? (
                    <div className="scroll-surface rounded p-6 max-w-md mx-auto space-y-4">
                      <label className="block font-cinzel text-xs text-[#6b6358] uppercase tracking-widest text-center">
                        Warrior Name
                      </label>
                      <input
                        type="text"
                        value={(answers.name as string) || ""}
                        onChange={(e) => setAnswers({ ...answers, name: e.target.value })}
                        placeholder="e.g. Master Ronin"
                        className="w-full bg-[#0a0b0d] border border-[#b49b64]/30 rounded px-4 py-3 text-center font-cinzel text-base text-[#b49b64] placeholder:text-[#3d3830] focus:outline-none focus:border-[#b49b64]"
                        autoFocus
                      />
                      <p className="text-[11px] text-[#5a5548] text-center italic">
                        This name will be sealed onto your warrior scrolls and profile.
                      </p>
                    </div>
                  ) : (
                    /* Choice cards — scroll/parchment style */
                    <div className={`grid gap-3 ${
                      (chapter.choices?.length || 0) <= 4
                        ? "grid-cols-1 sm:grid-cols-2"
                        : "grid-cols-2 sm:grid-cols-3"
                    }`}>
                      {chapter.choices?.map((c) => {
                        const selected = isSelected(c.id);
                        return (
                          <button
                            key={c.id}
                            onClick={() => selectChoice(c.id)}
                            className={`text-left p-4 rounded transition-all duration-200 ${
                              selected
                                ? "scroll-surface border-[#b49b64]/40 ring-1 ring-[#b49b64]/20"
                                : "surface hover:border-[#b49b64]/20"
                            }`}
                          >
                            <p className={`font-cinzel text-sm font-bold tracking-wider ${
                              selected ? "text-[#b49b64]" : "text-[#c8c0b0]"
                            }`}>
                              {c.label}
                            </p>
                            <p className="text-xs text-[#6b6358] mt-1.5 leading-relaxed">
                              {c.lore}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Navigation */}
                  <div className="flex items-center justify-between pt-4">
                    <button
                      onClick={handleBack}
                      disabled={step === 0}
                      className={`font-cinzel text-xs tracking-widest uppercase px-4 py-2 rounded transition-colors ${
                        step === 0
                          ? "text-[#3d3830] cursor-not-allowed"
                          : "text-[#6b6358] hover:text-[#c8c0b0]"
                      }`}
                    >
                      ← Return
                    </button>
                    <button
                      onClick={handleNext}
                      disabled={!hasAnswer}
                      className={`btn-scroll px-8 py-2.5 rounded text-xs uppercase tracking-widest transition-all ${
                        !hasAnswer ? "opacity-30 cursor-not-allowed" : ""
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
