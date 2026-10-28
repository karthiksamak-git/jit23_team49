"use client";

/* ═══════════════════════════════════════════
   CHALLENGE CARDS — shared by the Practice Lab
   and the Dojo mission trial:
   • QuizCard    → every quiz format (choices,
     true/false, scenario, code fill, bug hunt,
     pseudocode order, ranking, typed answers)
   • CodingCard  → LeetCode-style editor + the
     real judge: sample & hidden tests, verdicts,
     and an AI "explain my mistake" pass
   ═══════════════════════════════════════════ */

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play, Upload, Loader2, RotateCcw, Check, X, ChevronUp, ChevronDown,
  Lightbulb, SkipForward, AlertTriangle, Sparkles,
} from "lucide-react";
import { CODE_LANGUAGES, CodeLanguage } from "@/lib/code-runner";
import {
  QuizChallenge, CodingChallenge, Verdict, TestResult,
  QUIZ_KIND_LABELS, judgeCoding, starterFor, gradeTyped,
  explainCodingMistake, visibleSamples,
} from "@/lib/challenges";

/* ── shared bits ── */

const VERDICT_STYLE: Record<Verdict, { fg: string; bg: string; label: string }> = {
  Accepted: { fg: "text-[#34d399]", bg: "border-[#10b981]/40 bg-[#10b981]/10", label: "Accepted" },
  "Wrong Answer": { fg: "text-[#fb7185]", bg: "border-[#fb7185]/40 bg-[#fb7185]/10", label: "Wrong Answer" },
  "Compile Error": { fg: "text-[#fb7185]", bg: "border-[#fb7185]/40 bg-[#fb7185]/10", label: "Compile Error" },
  "Runtime Error": { fg: "text-[#fb7185]", bg: "border-[#fb7185]/40 bg-[#fb7185]/10", label: "Runtime Error" },
  "Time Limit Exceeded": { fg: "text-[#fbbf24]", bg: "border-[#fbbf24]/40 bg-[#fbbf24]/10", label: "Time Limit Exceeded" },
  "Runtime Missing": { fg: "text-[#fbbf24]", bg: "border-[#fbbf24]/40 bg-[#fbbf24]/10", label: "Runtime Not Installed" },
  "Engine Offline": { fg: "text-[#fbbf24]", bg: "border-[#fbbf24]/40 bg-[#fbbf24]/10", label: "Code Engine Offline" },
  "Judge Error": { fg: "text-[#fbbf24]", bg: "border-[#fbbf24]/40 bg-[#fbbf24]/10", label: "Judge Error" },
};

const DIFF_STYLE: Record<string, string> = {
  Easy: "text-[#34d399] border-[#10b981]/40",
  Medium: "text-[#fbbf24] border-[#fbbf24]/40",
  Hard: "text-[#fb7185] border-[#fb7185]/40",
  Easier: "text-[#34d399] border-[#10b981]/40",
  Standard: "text-[#fbbf24] border-[#fbbf24]/40",
  Challenging: "text-[#fb7185] border-[#fb7185]/40",
  Expert: "text-[#fb7185] border-[#fb7185]/40",
};

const KIND_ICON: Record<string, string> = {
  "multiple-choice": "A)",
  "true-false": "T/F",
  scenario: "▮",
  "code-fill": "</>",
  "bug-hunt": "⚑",
  "pseudocode-order": "≡",
  ranking: "⇅",
  "typed-answer": "⌨",
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[10px] uppercase tracking-widest text-[#6b6358] mb-1.5">
      {children}
    </p>
  );
}

function CodeBlock({ text }: { text: string }) {
  return (
    <pre className="bg-[#060709] border border-[#2a2520]/60 rounded-lg p-3 font-mono text-[12px] leading-relaxed text-[#c8c0b0] whitespace-pre-wrap break-words overflow-x-auto">
      {text}
    </pre>
  );
}

/* ═══════════════════════════════════════════
   QUIZ CARD — every non-coding question type
   ═══════════════════════════════════════════ */

function shuffledIndices(n: number): number[] {
  const idx = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx;
}

export function QuizCard({
  item, onNext, onResult, forceReveal = false,
}: {
  item: QuizChallenge;
  onNext: () => void;
  onResult: (correct: boolean) => void;
  /** Reveal on the host's behalf — the Dojo's 30s countdown running out. Marks it wrong once. */
  forceReveal?: boolean;
}) {
  const isOrder = (item.quizKind === "pseudocode-order" || item.quizKind === "ranking") && !!item.lines?.length;
  const isTyped = item.quizKind === "typed-answer";

  const [selected, setSelected] = useState<number | null>(null);
  const [typed, setTyped] = useState("");
  const [display, setDisplay] = useState<number[]>(() =>
    isOrder ? shuffledIndices(item.lines?.length || 0) : []
  );
  const [checked, setChecked] = useState(false);
  const [correct, setCorrect] = useState(false);
  // Ref, not state: guarantees exactly ONE grading even if the host reveals
  // and the student clicks in the same tick (StrictMode runs effects twice).
  const gradedRef = useRef(false);

  useEffect(() => {
    if (!forceReveal || gradedRef.current) return;
    gradedRef.current = true;
    setCorrect(false);
    setChecked(true);
    onResult(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forceReveal]);

  const options = item.options || [];

  function evaluate(): boolean {
    if (isOrder) return display.every((v, i) => v === (item.order || [])[i]);
    if (isTyped) return gradeTyped(item, typed);
    return selected === item.correct;
  }

  function check() {
    if (checked || gradedRef.current) return;
    gradedRef.current = true;
    const ok = evaluate();
    setCorrect(ok);
    setChecked(true);
    onResult(ok);
  }

  function move(pos: number, dir: -1 | 1) {
    const next = [...display];
    const target = pos + dir;
    if (target < 0 || target >= next.length) return;
    [next[pos], next[target]] = [next[target], next[pos]];
    setDisplay(next);
  }

  const canCheck = isOrder || isTyped ? true : selected !== null;
  const correctText =
    isOrder
      ? (item.order || []).map((i) => item.lines?.[i]).join("  →  ")
      : isTyped
        ? item.answer || item.accepted?.[0] || ""
        : options[item.correct ?? 0] || "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto surface rounded-xl border border-[#2a2520]/60 p-5 md:p-6 space-y-4"
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] px-2 py-0.5 rounded border border-[#fbbf24]/40 text-[#fbbf24] uppercase tracking-widest flex items-center gap-1.5">
            <span aria-hidden>{KIND_ICON[item.quizKind] || "?"}</span>
            {QUIZ_KIND_LABELS[item.quizKind]}
          </span>
          <span className={`font-mono text-[10px] px-2 py-0.5 rounded border ${DIFF_STYLE[item.difficulty] || "text-[#6b6358] border-[#2a2520]"}`}>
            {item.difficulty}
          </span>
        </div>
        <span className="font-mono text-[10px] text-[#3d3830]">{item.concept}</span>
      </div>

      <p className="text-[#e8dfc8] text-sm leading-relaxed whitespace-pre-wrap">{item.prompt}</p>

      {item.code && <CodeBlock text={item.code} />}

      {/* ── option-based kinds ── */}
      {!isOrder && !isTyped && (
        <div className="space-y-2">
          {options.map((opt, i) => {
            const isPicked = selected === i;
            const isRight = checked && i === item.correct;
            const isWrongPick = checked && isPicked && i !== item.correct;
            return (
              <button
                key={i}
                onClick={() => !checked && setSelected(i)}
                disabled={checked}
                className={`w-full text-left flex items-start gap-3 px-3 py-2.5 rounded-lg border text-sm transition-all ${
                  isRight
                    ? "border-[#10b981]/60 bg-[#10b981]/10 text-[#34d399]"
                    : isWrongPick
                      ? "border-[#fb7185]/60 bg-[#fb7185]/10 text-[#fb7185]"
                      : isPicked
                        ? "border-[#06b6d4]/60 bg-[#06b6d4]/10 text-[#22d3ee]"
                        : "border-[#2a2520] text-[#c8c0b0] hover:border-[#3d3830] hover:text-[#e8dfc8]"
                } ${item.quizKind === "bug-hunt" || item.quizKind === "code-fill" ? "font-mono text-[12px]" : ""}`}
              >
                <span className="font-mono text-[11px] opacity-60 pt-0.5">
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="whitespace-pre-wrap break-words">{opt}</span>
                {isRight && <Check className="w-4 h-4 ml-auto shrink-0" strokeWidth={2.5} />}
                {isWrongPick && <X className="w-4 h-4 ml-auto shrink-0" strokeWidth={2.5} />}
              </button>
            );
          })}
        </div>
      )}

      {/* ── ordering kinds ── */}
      {isOrder && (
        <div className="space-y-2">
          <SectionTitle>Arrange in the correct order</SectionTitle>
          {display.map((origIdx, pos) => (
            <div
              key={origIdx}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#2a2520] bg-[#060709] text-sm text-[#c8c0b0]"
            >
              <span className="font-mono text-[11px] text-[#3d3830] w-5">{pos + 1}.</span>
              <span className="flex-1 whitespace-pre-wrap break-words">{item.lines?.[origIdx]}</span>
              <span className="flex flex-col gap-0.5">
                <button
                  onClick={() => move(pos, -1)}
                  disabled={checked || pos === 0}
                  className="p-0.5 text-[#6b6358] hover:text-[#e8dfc8] disabled:opacity-25"
                  aria-label="Move up"
                >
                  <ChevronUp className="w-4 h-4" strokeWidth={2.5} />
                </button>
                <button
                  onClick={() => move(pos, 1)}
                  disabled={checked || pos === display.length - 1}
                  className="p-0.5 text-[#6b6358] hover:text-[#e8dfc8] disabled:opacity-25"
                  aria-label="Move down"
                >
                  <ChevronDown className="w-4 h-4" strokeWidth={2.5} />
                </button>
              </span>
            </div>
          ))}
          {!checked && (
            <button
              onClick={() => setDisplay(shuffledIndices(item.lines?.length || 0))}
              className="text-[10px] font-mono uppercase tracking-widest text-[#6b6358] hover:text-[#c8c0b0] flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" strokeWidth={2.5} /> shuffle again
            </button>
          )}
        </div>
      )}

      {/* ── typed answer ── */}
      {isTyped && (
        <div className="space-y-2">
          <SectionTitle>Type your answer</SectionTitle>
          <textarea
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                check();
              }
            }}
            disabled={checked}
            rows={2}
            spellCheck={false}
            placeholder="Type the answer (or the exact command / pseudocode)…"
            className="w-full surface rounded-lg border border-[#2a2520] bg-[#060709] text-sm font-mono text-[#c8c0b0] p-3 resize-y focus:outline-none focus:border-[#06b6d4] placeholder:text-[#3d3830]"
          />
          <p className="text-[10px] font-mono text-[#3d3830]">Enter to check</p>
        </div>
      )}

      {/* ── check / result ── */}
      {!checked ? (
        <div className="flex justify-end">
          <button
            onClick={check}
            disabled={!canCheck}
            className="btn-teal px-5 py-2 rounded-lg text-[11px] font-bold uppercase tracking-widest flex items-center gap-2 disabled:opacity-40"
          >
            <Check className="w-3.5 h-3.5" strokeWidth={2.5} /> Check answer
          </button>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-xl border p-4 space-y-3 ${
            correct ? "border-[#10b981]/40 bg-[#10b981]/10" : "border-[#fb7185]/40 bg-[#fb7185]/10"
          }`}
        >
          <p className={`text-sm font-semibold flex items-center gap-2 ${correct ? "text-[#34d399]" : "text-[#fb7185]"}`}>
            {correct ? <Check className="w-4 h-4" strokeWidth={3} /> : <X className="w-4 h-4" strokeWidth={3} />}
            {correct ? "Correct" : "Not quite"}
          </p>
          {!correct && correctText && (
            <p className="text-xs text-[#c8c0b0]">
              <span className="text-[#6b6358]">Answer: </span>
              <span className="font-mono text-[#e8dfc8] break-words">{correctText}</span>
            </p>
          )}
          <p className="text-xs leading-relaxed text-[#9a9182] whitespace-pre-wrap">{item.explanation}</p>
          <div className="flex justify-end">
            <button
              onClick={onNext}
              className="btn-teal px-5 py-2 rounded-lg text-[11px] font-bold uppercase tracking-widest flex items-center gap-2"
            >
              Next challenge <ChevronDown className="w-3.5 h-3.5 -rotate-90" strokeWidth={2.5} />
            </button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════
   CODING CARD — description | editor | judge
   ═══════════════════════════════════════════ */

export function CodingCard({
  item, onNext, onResult,
}: {
  item: CodingChallenge;
  onNext: () => void;
  onResult: (accepted: boolean) => void;
}) {
  const [langId, setLangId] = useState("javascript");
  const lang: CodeLanguage = CODE_LANGUAGES.find((l) => l.id === langId) || CODE_LANGUAGES[0];

  const [sources, setSources] = useState<Record<string, string>>({});
  const code = sources[langId] ?? starterFor(item, lang);

  const [busy, setBusy] = useState<"run" | "submit" | null>(null);
  const [progress, setProgress] = useState("");
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [results, setResults] = useState<TestResult[]>([]);
  const [message, setMessage] = useState<string | undefined>(undefined);
  const [explain, setExplain] = useState<string | null>(null);
  const [explaining, setExplaining] = useState(false);
  const samples = visibleSamples(item);

  function setCode(next: string) {
    setSources((prev) => ({ ...prev, [langId]: next }));
  }

  async function run(mode: "run" | "submit") {
    if (busy) return;
    setBusy(mode);
    setVerdict(null);
    setResults([]);
    setMessage(undefined);
    setExplain(null);
    setProgress("starting…");
    try {
      const out = await judgeCoding(item, lang, code, mode, (d, t) => setProgress(`${d}/${t}`));
      setVerdict(out.verdict);
      setResults(out.results);
      setMessage(out.message);
      if (mode === "submit") onResult(out.verdict === "Accepted");
    } catch (err) {
      setVerdict("Judge Error");
      setMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
      setProgress("");
    }
  }

  async function explainMistake() {
    if (explaining || !verdict) return;
    setExplaining(true);
    setExplain(null);
    try {
      const text = await explainCodingMistake({
        challenge: item,
        languageLabel: lang.label,
        source: code,
        verdict,
        results,
        message,
      });
      setExplain(text);
    } catch (err) {
      setExplain(err instanceof Error ? `Could not reach the mentor: ${err.message}` : "Could not reach the mentor.");
    } finally {
      setExplaining(false);
    }
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      run("submit");
      return;
    }
    if (e.key === "Tab") {
      e.preventDefault();
      const el = e.currentTarget;
      const { selectionStart: s, selectionEnd: en } = el;
      setCode(code.slice(0, s) + "  " + code.slice(en));
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = s + 2;
      });
    }
  };

  const accepted = verdict === "Accepted";
  const vs = verdict ? VERDICT_STYLE[verdict] : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid lg:grid-cols-2 gap-4 items-start"
    >
      {/* ── LEFT: problem statement ── */}
      <div className="surface rounded-xl border border-[#2a2520]/60 p-5 space-y-4 lg:max-h-[70vh] lg:overflow-y-auto">
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-[10px] px-2 py-0.5 rounded border border-[#06b6d4]/40 text-[#22d3ee] uppercase tracking-widest flex items-center gap-1.5">
              <span aria-hidden>⌨</span> Coding
            </span>
            <span className={`font-mono text-[10px] px-2 py-0.5 rounded border ${DIFF_STYLE[item.difficulty] || "text-[#6b6358] border-[#2a2520]"}`}>
              {item.difficulty}
            </span>
            {item.tags.map((t) => (
              <span key={t} className="font-mono text-[9px] px-1.5 py-0.5 rounded border border-[#2a2520] text-[#6b6358] uppercase">
                {t}
              </span>
            ))}
          </div>
          <h2 className="font-cinzel text-xl font-bold text-[#e8dfc8] tracking-wide">
            {item.title}
          </h2>
        </div>

        <p className="text-sm leading-relaxed text-[#c8c0b0] whitespace-pre-wrap">{item.statement}</p>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <SectionTitle>Input</SectionTitle>
            <p className="text-xs text-[#9a9182] leading-relaxed">{item.inputFormat}</p>
          </div>
          <div>
            <SectionTitle>Output</SectionTitle>
            <p className="text-xs text-[#9a9182] leading-relaxed">{item.outputFormat}</p>
          </div>
        </div>

        <div className="space-y-3">
          <SectionTitle>Examples</SectionTitle>
          {samples.map((s, i) => (
            <div key={i} className="space-y-1.5">
              <p className="font-mono text-[10px] text-[#6b6358]">Example {i + 1}</p>
              <CodeBlock text={s.stdin} />
              <CodeBlock text={s.expected} />
            </div>
          ))}
        </div>

        {item.constraints.length > 0 && (
          <div>
            <SectionTitle>Constraints</SectionTitle>
            <ul className="space-y-1">
              {item.constraints.map((c, i) => (
                <li key={i} className="text-xs text-[#9a9182] font-mono">• {c}</li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-[10px] font-mono text-[#3d3830]">
          Sample test runs on ▸ Run · hidden tests run on ▸ Submit
        </p>
      </div>

      {/* ── RIGHT: editor + results ── */}
      <div className="space-y-3">
        {/* language picker */}
        <div className="flex flex-wrap gap-1.5">
          {CODE_LANGUAGES.map((l) => (
            <button
              key={l.id}
              onClick={() => setLangId(l.id)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium tracking-wide transition-all ${
                l.id === langId
                  ? "bg-[#06b6d4]/15 text-[#22d3ee] border border-[#06b6d4]/40 font-semibold"
                  : "surface text-[#6b6358] hover:text-[#c8c0b0]"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>

        {/* editor */}
        <div className="surface rounded-xl overflow-hidden border border-[#2a2520]/60">
          <div className="flex items-center justify-between px-4 py-2 border-b border-[#2a2520]/40 bg-[#0a0b0d]">
            <span className="font-mono text-[11px] text-[#9a9182]">{lang.fileName}</span>
            <div className="flex items-center gap-3">
              <span className={`font-mono text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded border ${lang.local ? "text-[#34d399] border-[#10b981]/30 bg-[#10b981]/10" : "text-[#6b6358] border-[#2a2520]"}`}>
                {lang.local ? "browser runtime" : "local engine"}
              </span>
              <button
                onClick={() => setCode(starterFor(item, lang))}
                className="text-[#6b6358] hover:text-[#c8c0b0] text-[10px] font-mono uppercase tracking-widest flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" strokeWidth={2} /> Reset
              </button>
            </div>
          </div>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={onKeyDown}
            spellCheck={false}
            className="w-full bg-[#060709] text-[13px] leading-relaxed font-mono text-[#c8c0b0] p-4 min-h-[280px] resize-y focus:outline-none"
          />
        </div>

        {/* actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => run("run")}
            disabled={!!busy}
            className="px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-widest flex items-center gap-2 border border-[#06b6d4]/50 text-[#22d3ee] hover:bg-[#06b6d4]/10 disabled:opacity-40"
          >
            {busy === "run" ? <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={2.5} /> : <Play className="w-3.5 h-3.5" strokeWidth={2.5} />}
            Run samples
          </button>
          <button
            onClick={() => run("submit")}
            disabled={!!busy}
            className="btn-teal px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-widest flex items-center gap-2 disabled:opacity-40"
          >
            {busy === "submit" ? <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={2.5} /> : <Upload className="w-3.5 h-3.5" strokeWidth={2.5} />}
            Submit
          </button>
          {verdict && !accepted && (
            <button
              onClick={explainMistake}
              disabled={explaining}
              className="px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-widest flex items-center gap-2 border border-[#fbbf24]/50 text-[#fbbf24] hover:bg-[#fbbf24]/10 disabled:opacity-40"
            >
              {explaining ? <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={2.5} /> : <Lightbulb className="w-3.5 h-3.5" strokeWidth={2.5} />}
              {explaining ? "Analysing" : "Explain my mistake"}
            </button>
          )}
          <button
            onClick={onNext}
            className="ml-auto text-[10px] font-mono uppercase tracking-widest text-[#6b6358] hover:text-[#c8c0b0] flex items-center gap-1"
          >
            {accepted ? "Next challenge" : "Skip"} <SkipForward className="w-3.5 h-3.5" strokeWidth={2} />
          </button>
        </div>

        {/* results */}
        <AnimatePresence mode="wait">
          {(verdict || busy) && (
            <motion.div
              key={verdict || "busy"}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-xl border border-[#2a2520]/60 bg-[#060709] overflow-hidden"
            >
              <div className="px-4 py-2 border-b border-[#2a2520]/40 bg-[#0a0b0d] flex items-center justify-between">
                <span className="font-mono text-[10px] text-[#6b6358] uppercase tracking-widest flex items-center gap-1.5">
                  <Play className="w-3 h-3" strokeWidth={2} /> Result
                </span>
                {busy ? (
                  <span className="font-mono text-[10px] text-[#6b6358]">running {progress}</span>
                ) : verdict && (
                  <span className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded border ${vs?.bg} ${vs?.fg}`}>
                    {vs?.label}
                  </span>
                )}
              </div>

              <div className="p-4 space-y-3">
                {verdict === "Engine Offline" && (
                  <p className="text-xs text-[#fbbf24] flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" strokeWidth={2} />
                    <span>
                      The local code engine is not running. Start Docker, then run{" "}
                      <code className="font-mono bg-[#0a0b0d] px-1 rounded">npm run engine:up</code>.
                      JavaScript still runs without it.
                    </span>
                  </p>
                )}
                {verdict === "Runtime Missing" && (
                  <p className="text-xs text-[#fbbf24] flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" strokeWidth={2} />
                    <span>{message || "This runtime is not installed in the local engine yet."}</span>
                  </p>
                )}
                {message && verdict !== "Engine Offline" && verdict !== "Runtime Missing" && (
                  <pre className="text-[#fb7185] text-xs whitespace-pre-wrap break-words font-mono">{message}</pre>
                )}

                {results.map((r, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="flex items-center gap-2 font-mono text-[11px]">
                      {r.passed ? (
                        <Check className="w-3.5 h-3.5 text-[#34d399]" strokeWidth={3} />
                      ) : (
                        <X className="w-3.5 h-3.5 text-[#fb7185]" strokeWidth={3} />
                      )}
                      <span className={r.passed ? "text-[#34d399]" : "text-[#fb7185]"}>{r.label}</span>
                      <span className="text-[#3d3830]">{r.passed ? "passed" : "failed"}</span>
                    </div>
                    {!r.passed && (
                      <div className="grid sm:grid-cols-2 gap-2">
                        <div>
                          <p className="font-mono text-[9px] uppercase tracking-widest text-[#6b6358]">Input</p>
                          <CodeBlock text={r.stdin} />
                        </div>
                        <div>
                          <p className="font-mono text-[9px] uppercase tracking-widest text-[#6b6358]">Expected</p>
                          <CodeBlock text={r.expected} />
                        </div>
                        <div className="sm:col-span-2">
                          <p className="font-mono text-[9px] uppercase tracking-widest text-[#6b6358]">Your output</p>
                          <CodeBlock text={r.actual || "(no output)"} />
                        </div>
                        {r.error && (
                          <div className="sm:col-span-2">
                            <p className="font-mono text-[9px] uppercase tracking-widest text-[#fb7185]">
                              {r.compileFailed ? "Compiler said" : "Error"}
                            </p>
                            <pre className="text-[#fb7185] text-xs whitespace-pre-wrap break-words font-mono bg-[#0a0b0d] border border-[#2a2520]/60 rounded-lg p-3">
                              {r.error}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* AI explanation */}
        <AnimatePresence>
          {(explaining || explain) && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-xl border border-[#fbbf24]/40 bg-[#fbbf24]/5 p-4 space-y-2"
            >
              <p className="font-mono text-[10px] uppercase tracking-widest text-[#fbbf24] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" strokeWidth={2} /> Sensei on your mistake
              </p>
              {explaining ? (
                <p className="text-xs text-[#9a9182] flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={2} /> Reading your code…
                </p>
              ) : (
                <p className="text-sm leading-relaxed text-[#c8c0b0] whitespace-pre-wrap">{explain}</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
