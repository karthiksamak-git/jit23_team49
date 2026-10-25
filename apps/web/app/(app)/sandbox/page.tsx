"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Loader2, RotateCcw, Terminal, ChevronRight } from "lucide-react";
import { CODE_LANGUAGES, runProgram, RunResult, CodeLanguage } from "@/lib/code-runner";

/* ═══════════════════════════════════════════
   PRACTICE LAB — Real Code Compiler
   JavaScript runs instantly in the browser;
   every other language is executed by the
   self-hosted Piston engine (npm run engine:up).
   No AI involved — this is a compiler.
   ═══════════════════════════════════════════ */

export default function SandboxPage() {
  const [langId, setLangId] = useState("javascript");
  const lang: CodeLanguage =
    CODE_LANGUAGES.find((l) => l.id === langId) || CODE_LANGUAGES[0];

  const [sources, setSources] = useState<Record<string, string>>(() =>
    Object.fromEntries(CODE_LANGUAGES.map((l) => [l.id, l.template]))
  );
  const [stdin, setStdin] = useState("");
  const [showStdin, setShowStdin] = useState(false);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const runSeq = useRef(0);

  const code = sources[langId] ?? "";

  const handleRun = useCallback(async () => {
    const seq = ++runSeq.current;
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const res = await runProgram(lang, code, stdin);
      if (seq !== runSeq.current) return; // stale response from a prior run
      setResult(res);
    } catch (err) {
      if (seq !== runSeq.current) return;
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      if (seq === runSeq.current) setRunning(false);
    }
  }, [lang, code, stdin]);

  /* Ctrl/Cmd + Enter runs the program; Tab inserts two spaces */
  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleRun();
      return;
    }
    if (e.key === "Tab") {
      e.preventDefault();
      const el = e.currentTarget;
      const { selectionStart: s, selectionEnd: en } = el;
      const next = code.slice(0, s) + "  " + code.slice(en);
      setSources((prev) => ({ ...prev, [langId]: next }));
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = s + 2;
      });
    }
  };

  function switchLanguage(id: string) {
    setLangId(id);
    setResult(null);
    setError(null);
  }

  function resetTemplate() {
    setSources((prev) => ({ ...prev, [langId]: lang.template }));
    setResult(null);
    setError(null);
  }

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-8 space-y-5">
      {/* Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <p className="font-mono text-[10px] text-[#6b6358] tracking-widest uppercase">
            Practice Lab
          </p>
          <h1 className="font-cinzel text-2xl font-bold text-[#e8dfc8] tracking-wider">
            Code Compiler
          </h1>
          <p className="text-xs text-[#6b6358]">
            Write and run real code in {CODE_LANGUAGES.length} languages.
            JavaScript executes instantly in your browser; all other languages
            run on the project&apos;s local engine.
          </p>
        </div>
        <div className="font-mono text-[10px] text-[#3d3830] text-right">
          <p>Ctrl / Cmd + Enter → Run</p>
          <p>Tab → indent</p>
        </div>
      </div>

      <div className="ink-divider" />

      {/* Language selector */}
      <div className="flex flex-wrap gap-1.5">
        {CODE_LANGUAGES.map((l) => (
          <button
            key={l.id}
            onClick={() => switchLanguage(l.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium tracking-wider transition-all ${
              l.id === langId
                ? "bg-[#06b6d4]/15 text-[#22d3ee] border border-[#06b6d4]/40 font-semibold"
                : "surface text-[#6b6358] hover:text-[#c8c0b0]"
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>

      {/* Editor */}
      <div className="surface rounded-xl overflow-hidden border border-[#2a2520]/60">
        <div className="flex items-center justify-between px-4 py-2 border-b border-[#2a2520]/40 bg-[#0a0b0d]">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] text-[#9a9182]">
              {lang.fileName}
            </span>
            <span
              className={`font-mono text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded border ${
                lang.local
                  ? "text-[#34d399] border-[#10b981]/30 bg-[#10b981]/10"
                  : "text-[#6b6358] border-[#2a2520]"
              }`}
            >
              {lang.local ? "browser runtime" : "local engine"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={resetTemplate}
              className="text-[#6b6358] hover:text-[#c8c0b0] text-[10px] font-mono uppercase tracking-wider flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3 h-3" strokeWidth={2} />
              Reset
            </button>
            <button
              onClick={handleRun}
              disabled={running}
              className="btn-teal px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 disabled:opacity-40"
            >
              {running ? (
                <Loader2 className="w-3 h-3 animate-spin" strokeWidth={2.5} />
              ) : (
                <Play className="w-3 h-3" strokeWidth={2.5} />
              )}
              {running ? "Running" : "Run"}
            </button>
          </div>
        </div>
        <textarea
          value={code}
          onChange={(e) =>
            setSources((prev) => ({ ...prev, [langId]: e.target.value }))
          }
          onKeyDown={onKeyDown}
          spellCheck={false}
          className="w-full bg-[#060709] text-[13px] leading-relaxed font-mono text-[#c8c0b0] p-4 min-h-[320px] resize-y focus:outline-none"
        />
      </div>

      {/* Stdin toggle */}
      <div>
        <button
          onClick={() => setShowStdin((v) => !v)}
          className="text-[10px] font-mono uppercase tracking-widest text-[#6b6358] hover:text-[#c8c0b0] flex items-center gap-1 transition-colors"
        >
          <ChevronRight
            className={`w-3 h-3 transition-transform ${showStdin ? "rotate-90" : ""}`}
            strokeWidth={2}
          />
          Program input (stdin)
        </button>
        {showStdin && (
          <textarea
            value={stdin}
            onChange={(e) => setStdin(e.target.value)}
            placeholder="Optional input piped to your program…"
            spellCheck={false}
            className="mt-2 w-full surface rounded-lg border border-[#2a2520]/60 bg-[#060709] text-xs font-mono text-[#c8c0b0] p-3 min-h-[72px] resize-y focus:outline-none focus:border-[#06b6d4] placeholder:text-[#3d3830]"
          />
        )}
      </div>

      {/* Output */}
      <AnimatePresence mode="wait">
        {(result || error) && (
          <motion.div
            key={result ? `r-${result.engine}-${result.code}` : "err"}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-xl border border-[#2a2520]/60 bg-[#060709] overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-2 border-b border-[#2a2520]/40 bg-[#0a0b0d]">
              <span className="font-mono text-[10px] text-[#6b6358] uppercase tracking-widest flex items-center gap-1.5">
                <Terminal className="w-3 h-3" strokeWidth={2} />
                Output
              </span>
              {result && (
                <span className="font-mono text-[10px] flex items-center gap-3">
                  <span className="text-[#3d3830]">
                    {result.engine === "browser"
                      ? "ran in browser"
                      : `engine v${result.version}`}
                  </span>
                  <span
                    className={
                      result.code === 0
                        ? "text-[#34d399]"
                        : "text-[#fb7185]"
                    }
                  >
                    exit {result.code}
                    {result.killed ? " (killed)" : ""}
                  </span>
                </span>
              )}
            </div>

            <div className="p-4 font-mono text-xs space-y-3">
              {error && (
                <div className="text-[#fb7185] whitespace-pre-wrap break-words">
                  {error}
                </div>
              )}

              {result?.stdout && (
                <pre className="text-[#c8c0b0] whitespace-pre-wrap break-words">
                  {result.stdout}
                </pre>
              )}

              {result?.stderr && (
                <pre className="text-[#fb7185] whitespace-pre-wrap break-words border-t border-[#2a2520]/40 pt-3">
                  {result.stderr}
                </pre>
              )}

              {result && !result.stdout && !result.stderr && (
                <p className="text-[#3d3830] italic">
                  Program finished with no output.
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!result && !error && !running && (
        <p className="text-[10px] font-mono text-[#3d3830] text-center">
          Output will appear here. Press Run to execute {lang.label}.
        </p>
      )}
    </div>
  );
}
