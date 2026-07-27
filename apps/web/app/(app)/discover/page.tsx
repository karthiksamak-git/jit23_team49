"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGame } from "@/lib/game-context";

/* ═══════════════════════════════════════════
   QUEST LOG — The Warrior's Journal
   Shows completed quests, active missions,
   and the user's story so far.
   ═══════════════════════════════════════════ */

interface QuestEntry {
  id: string;
  chapter: string;
  title: string;
  description: string;
  status: "completed" | "active" | "locked";
  xp: number;
  date?: string;
}

const questLog: QuestEntry[] = [
  {
    id: "q1",
    chapter: "Prologue",
    title: "The Sensei's Questions",
    description: "You answered the sensei's questions and revealed your nature. Your career path was forged based on your ambitions, strengths, and the domains that call to you.",
    status: "completed",
    xp: 50,
    date: "Day 1",
  },
  {
    id: "q2",
    chapter: "Chapter I",
    title: "The Foundation Shrine",
    description: "You learned the fundamentals of how servers receive and respond to requests. The HTTP protocol is now part of your arsenal.",
    status: "completed",
    xp: 100,
    date: "Day 1",
  },
  {
    id: "q3",
    chapter: "Chapter II",
    title: "The First Query",
    description: "Master Kael taught you the ancient language of SQL. You crafted your first queries and felt the database respond to your commands.",
    status: "completed",
    xp: 150,
    date: "Day 2",
  },
  {
    id: "q4",
    chapter: "Chapter III",
    title: "Index of Knowledge",
    description: "The archives are vast. Apply the art of indexing to make the database respond in heartbeats. Your current challenge awaits.",
    status: "active",
    xp: 200,
  },
  {
    id: "q5",
    chapter: "Chapter IV",
    title: "The API Gateway",
    description: "Build RESTful endpoints that are both powerful and secure. This path opens after completing the current trial.",
    status: "locked",
    xp: 250,
  },
  {
    id: "q6",
    chapter: "Boss Battle",
    title: "The Core Compiler",
    description: "The corrupted compiler awaits at the peak. It will test everything you have learned.",
    status: "locked",
    xp: 500,
  },
];

export default function QuestLogPage() {
  const { player } = useGame();
  const [expanded, setExpanded] = useState<string | null>(null);

  // Dynamically compute quest statuses from player progress
  const liveQuests = useMemo(() => {
    const completed = new Set(player.completedMissions);
    // Map quest IDs to mission IDs for status calculation
    const questToMission: Record<string, string> = {
      q1: "__onboarding__", // always completed if auth'd
      q2: "m1",
      q3: "m2",
      q4: "backend-index-of-knowledge",
      q5: "m4",
      q6: "m5",
    };
    let foundActive = false;
    return questLog.map((q) => {
      const mId = questToMission[q.id];
      if (mId === "__onboarding__" && player.isAuthenticated) {
        return { ...q, status: "completed" as const };
      }
      if (mId && completed.has(mId)) {
        return { ...q, status: "completed" as const };
      }
      if (!foundActive) {
        foundActive = true;
        return { ...q, status: "active" as const };
      }
      return { ...q, status: "locked" as const };
    });
  }, [player.completedMissions, player.isAuthenticated]);

  const completedXP = liveQuests
    .filter((q) => q.status === "completed")
    .reduce((sum, q) => sum + q.xp, 0);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="space-y-2 text-center">
        <p className="font-mono text-[10px] text-[#6b6358] tracking-widest uppercase">
          Your Journey
        </p>
        <h1 className="font-cinzel text-2xl font-bold text-[#b49b64] tracking-wider">
          The Quest Log
        </h1>
        <p className="font-cinzel text-xs text-[#6b6358] italic">
          A record of every trial faced and every lesson earned
        </p>
      </div>

      {/* Summary */}
      <div className="flex items-center justify-center gap-8">
        <div className="text-center">
          <p className="font-mono text-lg font-bold text-[#b49b64]">{completedXP}</p>
          <p className="font-mono text-[10px] text-[#6b6358]">XP Earned</p>
        </div>
        <div className="w-px h-8 bg-[rgba(180,155,100,0.12)]" />
        <div className="text-center">
          <p className="font-mono text-lg font-bold text-[#4a7a5a]">
            {liveQuests.filter((q) => q.status === "completed").length}
          </p>
          <p className="font-mono text-[10px] text-[#6b6358]">Completed</p>
        </div>
        <div className="w-px h-8 bg-[rgba(180,155,100,0.12)]" />
        <div className="text-center">
          <p className="font-mono text-lg font-bold text-[#c8c0b0]">
            {liveQuests.length}
          </p>
          <p className="font-mono text-[10px] text-[#6b6358]">Total</p>
        </div>
      </div>

      <div className="ink-divider" />

      {/* Quest entries */}
      <div className="space-y-3">
        {liveQuests.map((q) => {
          const isExpanded = expanded === q.id;
          const isCompleted = q.status === "completed";
          const isActive = q.status === "active";
          const isLocked = q.status === "locked";

          return (
            <button
              key={q.id}
              onClick={() => !isLocked && setExpanded(isExpanded ? null : q.id)}
              className={`w-full text-left transition-all duration-200 rounded ${
                isLocked ? "opacity-30 cursor-not-allowed" : "cursor-pointer"
              }`}
            >
              <div className={`p-4 rounded ${
                isActive ? "scroll-surface border-[#b49b64]/25" : "surface"
              }`}>
                {/* Header row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Status indicator */}
                    <div className={`w-2 h-2 rounded-full ${
                      isCompleted ? "bg-[#4a7a5a]" : isActive ? "bg-[#b49b64]" : "bg-[#3d3830]"
                    }`} />
                    <div>
                      <span className="font-mono text-[10px] text-[#6b6358] tracking-wider">
                        {q.chapter}
                      </span>
                      <p className={`font-cinzel text-sm tracking-wider ${
                        isActive ? "text-[#b49b64]" : isCompleted ? "text-[#c8c0b0]" : "text-[#6b6358]"
                      }`}>
                        {q.title}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {q.date && (
                      <span className="font-mono text-[10px] text-[#3d3830]">{q.date}</span>
                    )}
                    <span className="font-mono text-[10px] text-[#b49b64]">+{q.xp} XP</span>
                  </div>
                </div>

                {/* Expanded content */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3 pt-3 border-t border-[rgba(180,155,100,0.08)]">
                        <p className="font-cinzel text-xs text-[#6b6358] italic leading-relaxed">
                          "{q.description}"
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
