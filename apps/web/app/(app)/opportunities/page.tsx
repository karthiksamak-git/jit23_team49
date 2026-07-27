"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGame } from "@/lib/game-context";
import { CleanSamuraiImg } from "@/lib/clean-samurai";
import { matchJobsWithUserSkills, JobOpportunity } from "@/lib/ai-client";

export default function OpportunitiesPage() {
  const { player } = useGame();
  const [opportunities, setOpportunities] = useState<JobOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<"All" | "Job" | "Internship">("All");

  async function fetchOpportunities() {
    setLoading(true);
    try {
      const res = await matchJobsWithUserSkills({
        characterName: player.characterName,
        realmName: player.realmName,
        level: player.level,
        completedMissions: player.completedMissions,
        skills: ["REST APIs", "SQL", "Database Design", "Node.js", "TypeScript", "HTTP Protocols"],
      });
      setOpportunities(res);
    } catch (err) {
      console.error("Failed to fetch opportunities:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchOpportunities();
  }, [player.completedMissions]);

  const filteredList = opportunities.filter((o) => {
    if (filterType === "All") return true;
    return o.type === filterType;
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <span className="font-mono text-[10px] text-[#b49b64] uppercase tracking-widest px-2.5 py-1 rounded border border-[#b49b64]/30 bg-[#b49b64]/10">
          Agentic Job & Internship Matcher
        </span>
        <h1 className="font-cinzel text-3xl font-bold text-[#b49b64] tracking-wider">
          Recommended Opportunities
        </h1>
        <p className="font-cinzel text-xs text-[#6b6358] italic max-w-xl mx-auto">
          The CareerVerse Agentic AI continuously scans the tech market, evaluating your completed forge trials against live job requirements.
        </p>
      </div>

      {/* Controls & Filter */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 surface rounded p-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterType("All")}
            className={`px-3 py-1 rounded text-xs font-mono transition-colors ${
              filterType === "All"
                ? "bg-[#b49b64]/15 text-[#b49b64] border border-[#b49b64]/30 font-bold"
                : "text-[#6b6358] hover:text-[#c8c0b0]"
            }`}
          >
            All Roles ({opportunities.length})
          </button>
          <button
            onClick={() => setFilterType("Job")}
            className={`px-3 py-1 rounded text-xs font-mono transition-colors ${
              filterType === "Job"
                ? "bg-[#b49b64]/15 text-[#b49b64] border border-[#b49b64]/30 font-bold"
                : "text-[#6b6358] hover:text-[#c8c0b0]"
            }`}
          >
            Full-time Jobs
          </button>
          <button
            onClick={() => setFilterType("Internship")}
            className={`px-3 py-1 rounded text-xs font-mono transition-colors ${
              filterType === "Internship"
                ? "bg-[#b49b64]/15 text-[#b49b64] border border-[#b49b64]/30 font-bold"
                : "text-[#6b6358] hover:text-[#c8c0b0]"
            }`}
          >
            Internships
          </button>
        </div>

        <button
          onClick={fetchOpportunities}
          disabled={loading}
          className="btn-scroll px-4 py-1.5 rounded text-xs font-mono flex items-center gap-2"
        >
          <span>🔄 Re-scan Market with AI</span>
        </button>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="p-12 text-center surface rounded space-y-3">
          <div className="w-8 h-8 border-2 border-[#b49b64] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="font-cinzel text-xs text-[#b49b64] animate-pulse">
            Agentic AI is crawling live job requisitions and matching your skills...
          </p>
        </div>
      ) : (
        /* Opportunity list */
        <div className="space-y-4">
          <AnimatePresence>
            {filteredList.map((op) => (
              <motion.div
                key={op.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="scroll-surface rounded p-6 space-y-4 hover:border-[#b49b64]/40 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[rgba(180,155,100,0.1)] pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`font-mono text-[10px] px-2 py-0.5 rounded border uppercase ${
                        op.type === "Internship"
                          ? "border-[#4a7a5a]/30 bg-[#4a7a5a]/10 text-[#4a7a5a]"
                          : "border-[#b49b64]/30 bg-[#b49b64]/10 text-[#b49b64]"
                      }`}>
                        {op.type}
                      </span>
                      <span className="font-mono text-[10px] text-[#6b6358]">{op.location}</span>
                    </div>
                    <h3 className="font-cinzel text-xl font-bold text-[#c8c0b0] tracking-wide">
                      {op.title}
                    </h3>
                    <p className="font-mono text-xs text-[#b49b64]">
                      {op.company} • <span className="text-[#c8c0b0]">{op.salaryOrStipend}</span>
                    </p>
                  </div>

                  <div className="flex flex-col items-end justify-center">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs text-[#6b6358]">Match:</span>
                      <span className="font-mono text-2xl font-bold text-[#4a7a5a]">
                        {op.matchScore}%
                      </span>
                    </div>
                    <span className="font-mono text-[9px] text-[#5a5548]">AI Compatibility</span>
                  </div>
                </div>

                {/* Narrative AI Reason */}
                <div className="dialogue-box rounded p-3 text-xs italic font-cinzel text-[#6b6358]">
                  "{op.reason}"
                </div>

                {/* Skill Match Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                  <div className="space-y-1.5">
                    <span className="text-[#4a7a5a]">✓ Skills You Satisfy:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {op.userSkillsMet.map((sk, i) => (
                        <span key={i} className="px-2 py-0.5 rounded bg-[#4a7a5a]/10 border border-[#4a7a5a]/30 text-[#4a7a5a]">
                          {sk}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[#8b2020]">⚡ Skill Gaps to Bridge:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {op.skillGaps.map((sg, i) => (
                        <span key={i} className="px-2 py-0.5 rounded bg-[#8b2020]/10 border border-[#8b2020]/30 text-[#c43030]">
                          {sg}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Apply Link CTA */}
                <div className="flex items-center justify-between pt-2">
                  <span className="font-mono text-[10px] text-[#5a5548]">
                    Verified by Agentic Web Search
                  </span>
                  <a
                    href={op.applyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-blood px-6 py-2 rounded text-xs uppercase tracking-widest flex items-center gap-2"
                  >
                    Apply Now on {op.company} →
                  </a>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
