"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";

/* ═══════════════════════════════════════════
   THE TRAINING GROUNDS — Code Sandbox
   A dark dojo terminal for practicing code.
   ═══════════════════════════════════════════ */

const challenges = [
  {
    id: 1,
    title: "The First SELECT",
    description: "Write a SQL query to retrieve all users from the 'warriors' table.",
    hint: "SELECT * FROM warriors;",
    solution: "SELECT * FROM warriors;",
  },
  {
    id: 2,
    title: "Filtering the Ranks",
    description: "Query only warriors whose rank is 'Ronin' or higher.",
    hint: "Use WHERE clause with rank condition",
    solution: "SELECT * FROM warriors WHERE rank >= 'Ronin';",
  },
];

export default function SandboxPage() {
  const [selectedChallenge, setSelectedChallenge] = useState(challenges[0]);
  const [code, setCode] = useState("");
  const [output, setOutput] = useState<string | null>(null);

  function runCode() {
    // Simple client-side check for demo
    const normalized = code.trim().replace(/\s+/g, " ").toLowerCase();
    const expected = selectedChallenge.solution.trim().replace(/\s+/g, " ").toLowerCase();
    if (normalized === expected) {
      setOutput("✓ Correct. The query executed successfully.");
    } else {
      setOutput("✗ Not quite. Review your query and try again.");
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="space-y-2 text-center">
        <p className="font-mono text-[10px] text-[#6b6358] tracking-widest uppercase">
          Practice Arena
        </p>
        <h1 className="font-cinzel text-2xl font-bold text-[#b49b64] tracking-wider">
          The Training Grounds
        </h1>
      </div>

      <div className="ink-divider" />

      {/* Challenge selector */}
      <div className="flex gap-2">
        {challenges.map((c) => (
          <button
            key={c.id}
            onClick={() => { setSelectedChallenge(c); setCode(""); setOutput(null); }}
            className={`px-4 py-2 rounded text-xs font-cinzel tracking-wider transition-colors ${
              selectedChallenge.id === c.id
                ? "btn-scroll"
                : "surface text-[#6b6358] hover:text-[#c8c0b0]"
            }`}
          >
            {c.title}
          </button>
        ))}
      </div>

      {/* Challenge description */}
      <div className="dialogue-box rounded px-5 py-4">
        <p className="font-cinzel text-sm text-[#b49b64] font-bold tracking-wider mb-2">
          {selectedChallenge.title}
        </p>
        <p className="text-xs text-[#6b6358] leading-relaxed italic">
          "{selectedChallenge.description}"
        </p>
      </div>

      {/* Code editor area */}
      <div className="surface rounded overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 border-b border-[rgba(180,155,100,0.08)]">
          <span className="font-mono text-[10px] text-[#6b6358]">query.sql</span>
          <button
            onClick={runCode}
            className="btn-blood px-4 py-1 rounded text-[10px] uppercase tracking-widest"
          >
            Execute
          </button>
        </div>
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Write your query here..."
          className="w-full bg-transparent text-sm font-mono text-[#c8c0b0] p-4 min-h-[120px] resize-none focus:outline-none placeholder:text-[#3d3830]"
          spellCheck={false}
        />
      </div>

      {/* Output */}
      {output && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`scroll-surface rounded px-5 py-3 font-mono text-sm ${
            output.startsWith("✓") ? "text-[#4a7a5a]" : "text-[#c43030]"
          }`}
        >
          {output}
        </motion.div>
      )}
    </div>
  );
}
