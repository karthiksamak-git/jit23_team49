"use client";

import React, { useState } from "react";
import { Terminal, Play, Sparkles, CheckCircle2, XCircle, RotateCcw } from "lucide-react";

interface CodeEditorShellProps {
  initialCode: string;
  onRunCode: (code: string) => void;
  onAskVerseBot: () => void;
  outputLog: string[];
  testResults: { name: string; passed: boolean }[];
  isSubmitting?: boolean;
}

export function CodeEditorShell({
  initialCode,
  onRunCode,
  onAskVerseBot,
  outputLog,
  testResults,
  isSubmitting = false,
}: CodeEditorShellProps) {
  const [code, setCode] = useState(initialCode);

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/90 overflow-hidden shadow-2xl backdrop-blur-xl flex flex-col h-[550px]">
      {/* Editor Header Bar */}
      <div className="px-5 py-3 border-b border-white/10 bg-slate-900/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-rose-500/80" />
            <div className="w-3 h-3 rounded-full bg-amber-500/80" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
          </div>
          <span className="text-xs font-mono font-bold text-slate-400">solution.ts — TypeScript Sandbox</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onAskVerseBot}
            className="px-3.5 py-1.5 rounded-xl font-bold text-xs bg-purple-500/20 text-purple-300 border border-purple-500/40 hover:bg-purple-500/30 transition-all flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Ask VerseBot AI
          </button>
          <button
            onClick={() => setCode(initialCode)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Reset Code"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={() => onRunCode(code)}
            disabled={isSubmitting}
            className="px-4 py-1.5 rounded-xl font-extrabold text-xs bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 transition-transform hover:scale-105"
          >
            <Play className="w-3.5 h-3.5 fill-white" /> {isSubmitting ? "Running..." : "Run Tests"}
          </button>
        </div>
      </div>

      {/* Main Split Body: Editor Text Area & Output Console */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/10 overflow-hidden">
        {/* Code Input Area */}
        <div className="p-4 font-mono text-sm bg-slate-950 text-slate-100 flex flex-col">
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            spellCheck={false}
            className="w-full h-full bg-transparent resize-none outline-none font-mono text-xs leading-relaxed text-indigo-200 selection:bg-indigo-500 selection:text-white"
          />
        </div>

        {/* Console Execution Output & Test Results */}
        <div className="p-4 bg-slate-900/60 font-mono text-xs space-y-4 overflow-y-auto">
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-indigo-400" /> Console Execution Log
            </span>
            <div className="p-3 rounded-xl bg-slate-950/80 border border-white/5 space-y-1 min-h-[100px]">
              {outputLog.length === 0 ? (
                <span className="text-slate-600 text-[11px]">Click "Run Tests" to execute solution.</span>
              ) : (
                outputLog.map((log, idx) => (
                  <p key={idx} className="text-emerald-400 text-[11px]">{log}</p>
                ))
              )}
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-white/5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Test Suite Suite Validation</span>
            <div className="space-y-1.5">
              {testResults.map((t, idx) => (
                <div
                  key={idx}
                  className={`p-2.5 rounded-lg border flex items-center justify-between text-[11px] ${
                    t.passed
                      ? "bg-emerald-950/30 border-emerald-500/30 text-emerald-300"
                      : "bg-rose-950/30 border-rose-500/30 text-rose-300"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {t.passed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-400" />
                    )}
                    <span>{t.name}</span>
                  </div>
                  <span className="font-bold">{t.passed ? "PASSED" : "FAILED"}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
