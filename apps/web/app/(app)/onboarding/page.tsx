"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { CleanNarratorImg } from "@/lib/clean-samurai";
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/gsap";
import { useGame } from "@/lib/game-context";
import {
  analyzeUserProfile,
  analyzeFreeText,
  profileFromRecommendation,
  validateCustomInput,
  OnboardingQuestion,
  OnboardingProfile,
  CareerRecommendation,
} from "@/lib/ai-onboarding";
import {
  TOTAL_QUESTIONS,
  getQuestion,
  opensCustomText,
  answerKeyForStep,
  RecordedAnswer,
} from "@/lib/onboarding-questions";

/* ═══════════════════════════════════════════
   AI-POWERED ONBOARDING WITH NARRATOR SENSEI
   Click-to-select options (auto-advances for
   single-select). Ranked recommendations from
   the career taxonomy — no forced default path.
   Follows up with a free-text question when
   responses don't match any domain, and gives
   a plain (roadmap-free) suggestion when the
   interest is fully outside engineering.
   ═══════════════════════════════════════════ */


const DOMAIN_COLORS: Record<string, string[]> = {
  teal: ["#22d3ee", "#06b6d4"],
  purple: ["#c084fc", "#a855f7"],
  emerald: ["#34d399", "#10b981"],
  amber: ["#fbbf24", "#f59e0b"],
  rose: ["#fb7185", "#f43f5e"],
  blue: ["#60a5fa", "#3b82f6"],
};

/* ═══════════════════════════════════════════
   FIXED BOTTOM-LEFT NARRATOR CHARACTER & SPEECH BUBBLE
   ═══════════════════════════════════════════ */
/* A single finished narration line: fades + lifts into place with GSAP.
   Separate component so each line owns its own animation lifecycle and
   the typewriter's state logic above is untouched. */
function NarrationLine({ text }: { text: string }) {
  const ref = useRef<HTMLParagraphElement>(null);

  useGSAP(() => {
    if (prefersReducedMotion() || !ref.current) return;
    gsap.from(ref.current, { autoAlpha: 0, y: 8, duration: 0.4, ease: "power2.out" });
  }, { scope: ref });

  return (
    <p ref={ref} className="font-cinzel text-sm md:text-base text-[#c8c0b0] leading-relaxed italic">
      &quot;{text}&quot;
    </p>
  );
}

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
            <NarrationLine key={i} text={l} />
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
            !name.trim() ? "opacity-30 cursor-not-allowed" : "shadow-[0_0_16px_rgba(180,155,100,0.12)]"
          }`}
        >
          Begin AI Assessment →
        </button>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════
   RECOMMENDATION CARD (used for top pick &
   alternate matches)
   ═══════════════════════════════════════════ */
function RecommendationCard({
  rec,
  top,
  onSelect,
}: {
  rec: CareerRecommendation;
  top: boolean;
  onSelect?: (rec: CareerRecommendation) => void;
}) {
  const [text, border] = DOMAIN_COLORS[rec.color] || DOMAIN_COLORS.teal;
  return (
    <button
      onClick={() => onSelect?.(rec)}
      className={`w-full text-left rounded-2xl p-6 md:p-7 border-2 bg-[#090b0f]/95 backdrop-blur-md space-y-3 shadow-2xl transition-all ${
        top
          ? "border-[#b49b64]/70 ring-1 ring-[#b49b64]/40 shadow-[0_0_18px_rgba(180,155,100,0.10)]"
          : "border-[#b49b64]/25 hover:border-[#b49b64]/60 hover:scale-[1.01]"
      }`}
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <span
            className="text-[10px] font-mono uppercase tracking-widest px-2.5 py-1 rounded-full border"
            style={{ borderColor: `${border}66`, color: text, backgroundColor: `${border}1a` }}
          >
            {rec.categoryLabel}
          </span>
          <h3 className={`font-cinzel text-xl md:text-2xl font-extrabold ${top ? "text-[#e8dfc8]" : "text-[#e0d6c3]"}`}>
            {rec.domainName}
          </h3>
        </div>
        <div className="text-right space-y-1">
          <span className="font-mono text-lg font-bold" style={{ color: text }}>
            {rec.matchPercent}%
          </span>
          <p className="text-[10px] font-mono text-[#6b6358] uppercase tracking-widest">{top ? "Best Match" : "Strong Match"}</p>
        </div>
      </div>

      {/* Match strength bar */}
      <div className="h-1.5 w-full rounded-full bg-[#3d3830]/60 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${rec.matchPercent}%`, background: `linear-gradient(90deg, ${border}, ${text})` }}
        />
      </div>

      {rec.evidence.length > 0 && (
        <p className="text-xs text-[#9a9182] italic">
          Matched on: {rec.evidence.join(" · ")}
        </p>
      )}

      <div>
        <p className="text-[10px] font-mono text-[#6b6358] uppercase tracking-widest mb-1.5">Your learning roadmap</p>
        <ol className="space-y-1.5">
          {rec.roadmap.slice(0, top ? 6 : 3).map((step, i) => (
            <li key={i} className="flex items-start gap-2 text-xs md:text-sm text-[#c8c0b0] leading-relaxed">
              <span className="font-mono text-[10px] mt-0.5 px-1.5 py-0.5 rounded bg-[#b49b64]/15 text-[#b49b64] font-bold">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
        {!top && (
          <p className="text-[11px] text-[#b49b64] mt-2 font-cinzel font-bold flex items-center gap-1">
            Choose this path instead →
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5 pt-1">
        {rec.entryRoles.slice(0, top ? 3 : 2).map((role, i) => (
          <span
            key={i}
            className="text-[10px] px-2 py-0.5 rounded-full border border-[#b49b64]/30 text-[#9a9182] font-mono"
          >
            {role}
          </span>
        ))}
      </div>
    </button>
  );
}

/* ═══════════════════════════════════════════
   RESULTS STEP — ranked recommendations OR
   outside-engineering suggestion (no roadmap)
   ═══════════════════════════════════════════ */
function ResultsStep({
  profile,
  onPickPrimary,
  onCreateAccount,
  onRevise,
  onBackToSelection,
}: {
  profile: OnboardingProfile;
  onPickPrimary: (rec: CareerRecommendation) => void;
  onCreateAccount: () => void;
  /** shown when a custom description was rejected — back to the text step */
  onRevise?: () => void;
  /** shown when a custom description was rejected — back to career direction */
  onBackToSelection?: () => void;
}) {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  /* ── OUTSIDE ENGINEERING: suggestion only, no roadmap ── */
  if (profile.status === "outside-engineering") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-3xl mx-auto space-y-6 relative z-20"
      >
        <div className="rounded-2xl p-8 md:p-10 border-2 border-[#b49b64]/50 bg-[#090b0f]/95 backdrop-blur-md text-center space-y-4 shadow-2xl">
          <span className="text-xs font-mono uppercase tracking-widest px-3 py-1 rounded-full border border-[#f43f5e]/50 bg-[#f43f5e]/10 text-[#fb7185]">
            Honest Counsel
          </span>
          <h2 className="font-cinzel text-xl md:text-3xl font-extrabold text-[#e8dfc8]">
            {profile.rejectionHeading || "Your interest is outside the engineering & tech world"}
          </h2>
          {profile.freeTextInterest && (
            <p className="text-sm text-[#9a9182] italic">
              &quot;{profile.freeTextInterest}&quot;
            </p>
          )}
          <p className="text-sm md:text-base text-[#9a9182] leading-relaxed max-w-xl mx-auto font-sans text-left">
            {profile.outOfEngineeringSuggestion}
          </p>
          <p className="text-xs text-[#6b6358] font-sans text-left leading-relaxed border-t border-[#b49b64]/20 pt-4">
            Because CareerVerse helps students <b className="text-[#b49b64]">learn skills and get hired</b> where their
            abilities match a company&apos;s needs, we don&apos;t invent a fake roadmap for fields we can&apos;t train
            or place you in. If you change direction, come back and the Sensei will build your path.
          </p>
        </div>

        <div className="text-center space-y-4 pt-2">
          <button
            onClick={onCreateAccount}
            className="btn-scroll px-12 py-4 rounded-xl text-base font-bold uppercase tracking-widest shadow-[0_0_16px_rgba(180,155,100,0.12)]"
          >
            Still Explore The Platform →
          </button>
          {(onRevise || onBackToSelection) && (
            <div className="flex items-center justify-center gap-3 pt-2 flex-wrap">
              {onRevise && (
                <button
                  onClick={onRevise}
                  className="font-cinzel text-xs font-bold tracking-widest uppercase px-6 py-3 rounded-lg border border-[#b49b64]/40 text-[#b49b64] hover:text-[#e8dfc8] hover:border-[#b49b64] transition-colors"
                >
                  Revise My Description
                </button>
              )}
              {onBackToSelection && (
                <button
                  onClick={onBackToSelection}
                  className="font-cinzel text-xs font-bold tracking-widest uppercase px-6 py-3 rounded-lg border border-[#b49b64]/40 text-[#b49b64] hover:text-[#e8dfc8] hover:border-[#b49b64] transition-colors"
                >
                  Choose A Different Career Area
                </button>
              )}
            </div>
          )}
          <p className="text-xs text-[#6b6358] italic">
            You can retake the assessment anytime — your answers stay yours.
          </p>
        </div>
      </motion.div>
    );
  }

  const top = profile.recommendations[0];
  const alternates = profile.recommendations.slice(1, 4);
  if (!top) return null;

  const [text, border] = DOMAIN_COLORS[profile.domainColor] || DOMAIN_COLORS.teal;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6 }}
      className="max-w-3xl mx-auto space-y-6 relative z-20"
    >
      <div className="text-center space-y-2">
        <span className="text-xs font-mono uppercase tracking-widest px-3 py-1 rounded-full border border-[#b49b64]/50 bg-[#b49b64]/10 text-[#b49b64]">
          Analyzed From Your {Object.keys(profile.answers).filter((k) => /^q\d/.test(k)).length} Responses
        </span>
        <h2 className="font-cinzel text-xl md:text-2xl font-extrabold text-[#e8dfc8]">
          Paths ranked for you — {top.domainName} first, {alternates.length > 0 ? "but every match is yours to choose" : "choose freely"}
        </h2>
      </div>

      {/* Top recommendation */}
      <RecommendationCard rec={top} top />

      {/* Summary grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl p-5 space-y-3 bg-[#090b0f]/90 backdrop-blur-md border border-[#06b6d4]/25">
          <h3 className="text-xs font-cinzel font-bold text-[#22d3ee] uppercase tracking-widest">Deep Subdomains</h3>
          <div className="flex flex-wrap gap-1.5">
            {top.subdomains.map((s, i) => (
              <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-[#06b6d4]/10 border border-[#06b6d4]/30 text-[#22d3ee]">
                {s}
              </span>
            ))}
          </div>
        </div>
        <div className="rounded-xl p-5 space-y-3 bg-[#090b0f]/90 backdrop-blur-md border border-[#a855f7]/25">
          <h3 className="text-xs font-cinzel font-bold text-[#c084fc] uppercase tracking-widest">Specializations</h3>
          <div className="flex flex-wrap gap-1.5">
            {top.specializations.slice(0, 4).map((s, i) => (
              <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-[#a855f7]/10 border border-[#a855f7]/30 text-[#c084fc]">
                {s}
              </span>
            ))}
          </div>
        </div>
        <div className="rounded-xl p-5 space-y-3 bg-[#090b0f]/90 backdrop-blur-md border border-[#10b981]/25">
          <h3 className="text-xs font-cinzel font-bold text-[#34d399] uppercase tracking-widest">First Learning Topics</h3>
          <ul className="space-y-1.5">
            {profile.suggestedTopics.slice(0, 5).map((topic, i) => (
              <li key={i} className="text-xs text-[#9a9182] flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] flex-shrink-0" />
                {topic}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Alternate matches — click to switch */}
      {alternates.length > 0 && (
        <div className="space-y-3">
          <p className="text-center text-xs font-mono text-[#6b6358] uppercase tracking-widest">
            Other strong matches — click one to make it your path instead
          </p>
          {alternates.map((rec) => (
            <RecommendationCard key={rec.domainId} rec={rec} top={false} onSelect={onPickPrimary} />
          ))}
        </div>
      )}

      {/* Entry info strip */}
      <div
        className="rounded-xl p-4 border border-[#b49b64]/30 bg-[#090b0f]/90 backdrop-blur-md text-center"
        style={{ backgroundColor: `${border}10` }}
      >
        <p className="font-cinzel text-xs font-bold uppercase tracking-widest" style={{ color: text }}>
          Starting Level: {profile.difficultyLevel} · Entry Accessibility: {top.entryAccessibility === "high" ? "Fresh friendly" : top.entryAccessibility === "moderate" ? "Needs consistent effort" : "Experience first"}
        </p>
      </div>

      {/* CTA */}
      <div className="text-center space-y-4 pt-2">
        <button
          onClick={onCreateAccount}
          className="btn-scroll px-12 py-4 rounded-xl text-base font-bold uppercase tracking-widest shadow-[0_0_16px_rgba(180,155,100,0.12)]"
        >
          Continue With {top.domainName} →
        </button>
        <p className="text-xs text-[#6b6358] italic">
          Your ranked learning paths will be waiting for you upon login.
        </p>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════
   ADDITIONAL INFO STEP (free-text follow-up)
   Shown when answers don't match any domain —
   the Sensei asks how & what work you like,
   then the engine generates the road from it.
   ═══════════════════════════════════════════ */
function AdditionalInfoStep({
  onAnalyze,
  isAnalyzing,
}: {
  onAnalyze: (text: string) => void;
  isAnalyzing: boolean;
}) {
  const [text, setText] = useState("");
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="scroll-surface rounded-2xl p-8 md:p-12 max-w-2xl mx-auto space-y-6 shadow-2xl border-2 border-[#b49b64]/40 bg-[#090b0f]/95 backdrop-blur-md"
    >
      <div className="space-y-3 text-center">
        <span className="font-cinzel text-xs text-[#b49b64] uppercase tracking-widest font-bold">
          Free Exploration
        </span>
        <h2 className="font-cinzel text-xl md:text-3xl font-extrabold text-[#e8dfc8] leading-snug">
          Your answers don&apos;t fit a standard box — that&apos;s interesting
        </h2>
        <p className="text-sm text-[#9a9182] leading-relaxed">
          Tell me in your own words: <b className="text-[#e8dfc8]">what kind of work interests you,
          and how would you like to spend your days?</b>{" "}
          Anything counts — tools, fields, industries, a problem you dream of solving. From this,
          I&apos;ll map your road in the CareerVerse taxonomy.
        </p>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        maxLength={600}
        placeholder="e.g. I love designing Fortnite skins… / I want to work with Salesforce stuff my uncle uses… / I enjoy organizing people and events…"
        className="w-full bg-[#040507] border-2 border-[#b49b64]/50 rounded-xl px-5 py-4 font-sans text-base text-[#e8dfc8] placeholder:text-[#3d3830] focus:outline-none focus:border-[#b49b64] shadow-inner resize-none"
        autoFocus
      />

      <div className="flex items-center justify-between gap-4">
        <span className="font-mono text-[10px] text-[#6b6358]">{text.length}/600</span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onAnalyze(text.trim())}
            disabled={text.trim().length < 8 || isAnalyzing}
            className={`btn-scroll px-10 py-3.5 rounded-xl text-xs md:text-sm font-bold uppercase tracking-widest transition-all ${
              text.trim().length < 8 || isAnalyzing
                ? "opacity-30 cursor-not-allowed"
                : "shadow-[0_0_16px_rgba(180,155,100,0.12)]"
            }`}
          >
            {isAnalyzing ? "Mapping Your Road…" : "Find My Real Path →"}
          </button>
        </div>
      </div>
      {text.trim().length > 0 && text.trim().length < 8 && (
        <p className="text-[11px] text-[#f43f5e] text-right">A little more detail please (min 8 characters)</p>
      )}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════
   MAIN ONBOARDING PAGE
   ═══════════════════════════════════════════ */
export default function OnboardingPage() {
  const router = useRouter();
  const { updateProfile } = useGame();

  /* Push the chosen paths/roles into the live game state so the World Map,
     Dashboard and Dojo immediately follow the selected path — no re-login needed. */
  function syncToPlayer(p: OnboardingProfile) {
    if (p.status !== "matched") return;
    updateProfile({
      onboardingComplete: true,
      recommendedDomain: p.recommendedDomain,
      domainColor: p.domainColor,
      difficultyLevel: p.difficultyLevel,
      learningPathSummary: p.learningPathSummary,
      interests: p.interests,
      strengths: p.strengths,
      suggestedTopics: p.suggestedTopics,
      realmName: p.recommendedDomain,
    });
  }

  const [phase, setPhase] = useState<"welcome" | "assessment" | "analyzing" | "details" | "results">("welcome");
  const [name, setName] = useState("");
  const [step, setStep] = useState(0);
  const [dialogueDone, setDialogueDone] = useState(false);
  const [answers, setAnswers] = useState<RecordedAnswer[]>([]);
  const [currentSelection, setCurrentSelection] = useState<string[]>([]);
  /** free-text custom description for the Question 5 Others step */
  const [customText, setCustomText] = useState("");
  /** clarification attached to the custom-input step — never a numbered question */
  const [clarifyMsg, setClarifyMsg] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [profile, setProfile] = useState<OnboardingProfile | null>(null);
  /** guards double-advance on rapid clicks */
  const advancingRef = useRef(false);
  /** guards duplicate custom-input submissions */
  const validatingRef = useRef(false);

  const resetDialogue = useCallback(() => setDialogueDone(false), []);

  /* Start assessment when welcome completes */
  function handleStartAssessment() {
    if (!name.trim()) return;
    if (typeof window !== "undefined") {
      localStorage.setItem("character_name", name);
    }
    setAnswers([]);
    setCurrentSelection([]);
    setCustomText("");
    setClarifyMsg("");
    setPhase("assessment");
    setStep(0);
    resetDialogue();
  }

  /* Deterministic adaptive question for the current step — always recomputed
     from the answers recorded before it, so changing an earlier answer
     automatically recalculates every downstream branch. */
  const currentQuestion: OnboardingQuestion | null =
    phase === "assessment" ? getQuestion(step, answers, name || "Learner") : null;

  /* Handle option selection — a click saves the answer and auto-advances */
  function selectOption(optionId: string) {
    if (!currentQuestion || advancingRef.current) return;

    // Question 5 "Others" opens the free-text field inside the same numbered step
    if (opensCustomText(step, optionId)) {
      setCurrentSelection([optionId]);
      setClarifyMsg("");
      return;
    }

    setCurrentSelection([optionId]);
    const chosen = optionId;
    advancingRef.current = true;
    window.setTimeout(() => {
      advancingRef.current = false;
      runAdvance([chosen]);
    }, 280);
  }

  function isOptionSelected(optionId: string) {
    return currentSelection.includes(optionId);
  }

  /**
   * Full advance pipeline: save the answer for this step, then move to the
   * next numbered question — or run the analysis once Question 6 is answered.
   * answers.slice(0, step) drops stale downstream answers when an earlier
   * answer changed, so every later branch recalculates. The selection is
   * passed explicitly so rapid clicks never read stale state.
   */
  async function runAdvance(selection: string[], freeText?: string) {
    if (!currentQuestion || selection.length === 0) return;

    const selectedLabels = freeText
      ? [freeText]
      : selection.map((id) => currentQuestion.options.find((o) => o.id === id)?.label || id);

    const updatedAnswers: RecordedAnswer[] = [
      ...answers.slice(0, step),
      {
        answerKey: answerKeyForStep(step, selection, answers),
        questionId: currentQuestion.id,
        questionText: currentQuestion.question,
        selectedIds: selection,
        selectedLabels,
      },
    ];

    setAnswers(updatedAnswers);
    setCurrentSelection([]);
    setCustomText("");
    setClarifyMsg("");

    if (step + 1 >= TOTAL_QUESTIONS) {
      /* Question 6 answered — the recommendation is generated only now */
      setPhase("analyzing");
      const formattedForAnalysis = updatedAnswers.map((a) => ({
        question: a.questionText,
        answer: a.selectedLabels.join(", "),
      }));
      const res = await analyzeUserProfile(name || "Learner", formattedForAnalysis);

      if (res.status === "needs-details") {
        setPhase("details");
        return;
      }
      /* structured keys (educationStage, experienceLevel, …) alongside q0…q5 */
      const structured: Record<string, string | string[]> = { ...res.answers };
      for (const a of updatedAnswers) {
        structured[a.answerKey] =
          a.answerKey === "customCareerDescription" ? a.selectedLabels[0] || "" : a.selectedIds[0];
      }
      const finalProfile = { ...res, answers: structured };
      setProfile(finalProfile);
      localStorage.setItem("cv_onboarding_profile", JSON.stringify(finalProfile));
      syncToPlayer(finalProfile);
      setPhase("results");
    } else {
      const nextStep = step + 1;
      setStep(nextStep);
      resetDialogue();
    }
  }

  /* Question 5 custom description — validated before it can join the path */
  async function handleCustomSubmit() {
    const text = customText.trim();
    if (text.length < 8 || validatingRef.current || !currentQuestion) return;
    validatingRef.current = true;
    setIsValidating(true);
    try {
      const prior = answers.slice(0, step).map((a) => ({
        question: a.questionText,
        answer: a.selectedLabels.join(", "),
      }));
      const result = await validateCustomInput(name || "Learner", text, prior);

      if (result.outcome === "relevant") {
        await runAdvance(["others"], text);
      } else if (result.outcome === "ambiguous") {
        /* clarification attached to this step — never a new numbered question */
        setClarifyMsg(result.message);
      } else {
        /* out_of_scope / unsafe — stop the flow here: no roadmap is generated.
           Earlier answers stay intact so the user can revise or step back. */
        const exp = answers[1]?.selectedIds[0];
        const rejected: OnboardingProfile = {
          name: name || "Learner",
          answers: {},
          status: "outside-engineering",
          recommendedDomain: text.slice(0, 60),
          domainColor: "rose",
          difficultyLevel:
            exp === "advanced" ? "Advanced" : exp === "intermediate" ? "Intermediate" : "Beginner",
          learningPathSummary: "",
          interests: [text.slice(0, 60)],
          strengths: [],
          suggestedTopics: [],
          recommendations: [],
          freeTextInterest: text,
          outOfEngineeringSuggestion: result.message,
          rejectionHeading:
            result.outcome === "unsafe_or_disallowed"
              ? "That request is outside what CareerVerse can help with"
              : "CareerVerse specialises in IT careers",
        };
        setProfile(rejected);
        setPhase("results");
      }
    } finally {
      validatingRef.current = false;
      setIsValidating(false);
    }
  }

  /* Return to the immediately preceding step, restoring its selection */
  function handleBack() {
    if (step > 0) {
      const prevStep = step - 1;
      const prevAnswer = answers[prevStep];
      setCurrentSelection(prevAnswer?.selectedIds || []);
      setCustomText(
        prevAnswer?.answerKey === "customCareerDescription" ? prevAnswer.selectedLabels[0] || "" : ""
      );
      setClarifyMsg("");
      setStep(prevStep);
      resetDialogue();
    } else {
      setPhase("welcome");
      setAnswers([]);
      setCurrentSelection([]);
      setCustomText("");
      setClarifyMsg("");
    }
  }

  /* Free-text follow-up submission → re-analyze */
  async function handleFreeTextAnalyze(text: string) {
    const formatted = answers.map((a) => ({ question: a.questionText, answer: a.selectedLabels.join(", ") }));
    setIsAnalyzing(true);
    try {
      const res = await analyzeFreeText(name || "Learner", formatted, text);
      setProfile(res);
      localStorage.setItem("cv_onboarding_profile", JSON.stringify(res));
      syncToPlayer(res);
      setPhase("results");
    } finally {
      setIsAnalyzing(false);
    }
  }

  /* Alternate pick from results */
  function handlePickPrimary(rec: CareerRecommendation) {
    if (!profile) return;
    const updated = profileFromRecommendation(profile, rec);
    setProfile(updated);
    localStorage.setItem("cv_onboarding_profile", JSON.stringify(updated));
    syncToPlayer(updated);
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
              {/* Reveal Question & Choices when dialogueDone is true */}
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
                          {currentQuestion.inputKind === "text"
                            ? " • Describe it in your own words"
                            : " • Click a card to answer"}
                        </span>
                        <p className="font-cinzel text-xl md:text-3xl lg:text-4xl font-extrabold text-[#e8dfc8] tracking-wide drop-shadow-[0_4px_16px_rgba(0,0,0,0.95)]">
                          {currentQuestion.question}
                        </p>
                      </div>

                      {/* Question 5 custom description — same numbered step, never a 7th question */}
                      {currentQuestion.inputKind === "text" || (step === 4 && currentSelection.includes("others")) ? (
                        <div className="max-w-2xl mx-auto space-y-4">
                          <textarea
                            value={customText}
                            onChange={(e) => {
                              setCustomText(e.target.value);
                              if (clarifyMsg) setClarifyMsg("");
                            }}
                            rows={4}
                            maxLength={600}
                            placeholder="e.g. I want to build an AI assistant that answers questions about PDF files…"
                            className="w-full bg-[#040507] border-2 border-[#b49b64]/50 rounded-xl px-5 py-4 font-sans text-base text-[#e8dfc8] placeholder:text-[#3d3830] focus:outline-none focus:border-[#b49b64] shadow-inner resize-none"
                            autoFocus
                          />
                          <div className="flex items-center justify-between gap-4">
                            <span className="font-mono text-[10px] text-[#6b6358]">{customText.length}/600</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCustomSubmit();
                              }}
                              disabled={customText.trim().length < 8 || isValidating}
                              className={`btn-scroll px-10 py-3.5 rounded-lg text-xs md:text-sm font-bold uppercase tracking-widest transition-all ${
                                customText.trim().length < 8 || isValidating
                                  ? "opacity-30 cursor-not-allowed"
                                  : "shadow-[0_0_16px_rgba(180,155,100,0.12)]"
                              }`}
                            >
                              {isValidating ? "Checking Your Goal…" : "Confirm →"}
                            </button>
                          </div>
                          {clarifyMsg && (
                            <p className="text-[11px] text-[#fbbf24] text-right leading-relaxed">{clarifyMsg}</p>
                          )}
                          {customText.trim().length > 0 && customText.trim().length < 8 && (
                            <p className="text-[11px] text-[#f43f5e] text-right">
                              A little more detail please (min 8 characters)
                            </p>
                          )}
                        </div>
                      ) : (
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
                      )}

                      {/* Return control — steps back to the immediately preceding question */}
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
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
            </motion.div>
          )}

          {/* Analyzing Step */}
          {(phase === "analyzing" || isAnalyzing) && (
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
                  Analyzing Against The Career Taxonomy
                </h3>
                <p className="text-xs text-[#9a9182] leading-relaxed">
                  Ranking every career domain against your responses — no assumptions, no default path.
                </p>
              </div>
            </motion.div>
          )}

          {/* Free-text follow-up when nothing matched */}
          {phase === "details" && (
            <AdditionalInfoStep onAnalyze={handleFreeTextAnalyze} isAnalyzing={isAnalyzing} />
          )}

          {/* Step Results: ranked recommendations or honest suggestion */}
          {phase === "results" && profile && (
            <ResultsStep
              key="results"
              profile={profile}
              onPickPrimary={handlePickPrimary}
              onCreateAccount={() => router.push("/auth")}
              onRevise={
                profile.rejectionHeading
                  ? () => {
                      setCustomText(profile.freeTextInterest || "");
                      setClarifyMsg("");
                      setCurrentSelection(["others"]);
                      setProfile(null);
                      setStep(4);
                      resetDialogue();
                      setPhase("assessment");
                    }
                  : undefined
              }
              onBackToSelection={
                profile.rejectionHeading
                  ? () => {
                      setCustomText("");
                      setClarifyMsg("");
                      setCurrentSelection(answers[3]?.selectedIds || []);
                      setProfile(null);
                      setStep(3);
                      resetDialogue();
                      setPhase("assessment");
                    }
                  : undefined
              }
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
