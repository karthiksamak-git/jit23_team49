"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGame } from "@/lib/game-context";

/* ═══════════════════════════════════════════
   MY PROGRESS — Learning Journey Tracker
   Shows completed topics, active learning,
   and the user's progress so far.
   ═══════════════════════════════════════════ */

interface ProgressEntry {
  id: string;
  chapter: string;
  title: string;
  description: string;
  status: "completed" | "active" | "locked";
  xp: number;
  date?: string;
}

const progressLog: ProgressEntry[] = [
  {
    id: "q1",
    chapter: "Getting Started",
    title: "Career Discovery Assessment",
    description: "You answered AI-generated questions and discovered your ideal IT career path. Your personalized learning journey was created based on your interests and goals.",
    status: "completed",
    xp: 50,
    date: "Day 1",
  },
  {
    id: "q2",
    chapter: "Foundations",
    title: "Understanding the Basics",
    description: "You learned the fundamental concepts of how technology works — from web requests to data storage.",
    status: "completed",
    xp: 100,
    date: "Day 1",
  },
  {
    id: "q3",
    chapter: "Building Skills",
    title: "First Practical Project",
    description: "You applied your knowledge by building your first small project, turning theory into practice.",
    status: "completed",
    xp: 150,
    date: "Day 2",
  },
  {
    id: "q4",
    chapter: "Going Deeper",
    title: "Intermediate Concepts",
    description: "Dive deeper into your chosen domain. Learn design patterns, best practices, and industry tools.",
    status: "active",
    xp: 200,
  },
  {
    id: "q5",
    chapter: "Real-World Ready",
    title: "Portfolio Project",
    description: "Build a substantial project that showcases your skills to potential employers.",
    status: "locked",
    xp: 300,
  },
  {
    id: "q6",
    chapter: "Job Ready",
    title: "Interview Prep & Applications",
    description: "Practice mock interviews, polish your resume, and start applying to jobs and internships.",
    status: "locked",
    xp: 500,
  },
];

const statusColors = {
  completed: { dot: "bg-[#10b981]", text: "text-[#34d399]", border: "border-[#10b981]/20" },
  active: { dot: "bg-[#06b6d4]", text: "text-[#22d3ee]", border: "border-[#06b6d4]/20" },
  locked: { dot: "bg-[#3d3830]", text: "text-[#6b6358]", border: "border-[#2a2520]/20" },
};

export default function ProgressPage() {
  const { player } = useGame();
  const [expanded, setExpanded] = useState<string | null>(null);

  const liveEntries = useMemo(() => {
    const completed = new Set(player.completedMissions);
    const entryToMission: Record<string, string> = {
      q1: "__onboarding__",
      q2: "m1",
      q3: "m2",
      q4: "backend-index-of-knowledge",
      q5: "m4",
      q6: "m5",
    };
    let foundActive = false;
    return progressLog.map((q) => {
      const mId = entryToMission[q.id];
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

  const completedXP = liveEntries
    .filter((q) => q.status === "completed")
    .reduce((sum, q) => sum + q.xp, 0);

  const completedCount = liveEntries.filter((q) => q.status === "completed").length;
  const progressPercent = Math.round((completedCount / liveEntries.length) * 100);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="space-y-2 text-center">
        <span className="text-[10px] font-mono text-[#3b82f6] uppercase tracking-widest px-3 py-1 rounded-full border border-[#3b82f6]/30 bg-[#3b82f6]/10">
          Your Journey
        </span>
        <h1 className="font-cinzel text-2xl font-bold text-[#e8dfc8] tracking-wider">
          My Progress
        </h1>
        <p className="text-xs text-[#6b6358]">
          Track your learning milestones and see how far you&apos;ve come
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="surface-emerald rounded-xl p-4 text-center">
          <p className="font-mono text-xl font-bold text-[#34d399]">{completedXP}</p>
          <p className="text-[10px] text-[#6b6358]">XP Earned</p>
        </div>
        <div className="surface-teal rounded-xl p-4 text-center">
          <p className="font-mono text-xl font-bold text-[#22d3ee]">{completedCount}</p>
          <p className="text-[10px] text-[#6b6358]">Completed</p>
        </div>
        <div className="surface-purple rounded-xl p-4 text-center">
          <p className="font-mono text-xl font-bold text-[#c084fc]">{progressPercent}%</p>
          <p className="text-[10px] text-[#6b6358]">Progress</p>
        </div>
      </div>

      {/* Overall progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[#6b6358]">Overall Progress</span>
          <span className="text-[#22d3ee]">{progressPercent}%</span>
        </div>
        <div className="xp-track h-2.5 rounded-full">
          <div
            className="xp-fill-teal rounded-full transition-all duration-1000"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="ink-divider-teal" />

      {/* Progress entries */}
      <div className="space-y-3">
        {liveEntries.map((q, idx) => {
          const isExpanded = expanded === q.id;
          const sc = statusColors[q.status];
          const isLocked = q.status === "locked";

          return (
            <motion.button
              key={q.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * idx }}
              onClick={() => !isLocked && setExpanded(isExpanded ? null : q.id)}
              className={`w-full text-left transition-all duration-200 rounded-xl ${
                isLocked ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
              }`}
            >
              <div className={`p-4 rounded-xl border ${sc.border} ${
                q.status === "active" ? "surface-teal" : "surface"
              }`}>
                {/* Header row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Status dot with connecting line */}
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full ${sc.dot} ${q.status === "active" ? "animate-pulse" : ""}`} />
                      {idx < liveEntries.length - 1 && (
                        <div className={`w-0.5 h-4 mt-1 ${q.status === "completed" ? "bg-[#10b981]/30" : "bg-[#2a2520]/30"}`} />
                      )}
                    </div>
                    <div>
                      <span className="text-[10px] text-[#6b6358] tracking-wider">
                        {q.chapter}
                      </span>
                      <p className={`text-sm font-medium tracking-wide ${sc.text}`}>
                        {q.title}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {q.date && (
                      <span className="text-[10px] text-[#3d3830]">{q.date}</span>
                    )}
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                      q.status === "completed" ? "border-[#10b981]/20 bg-[#10b981]/10 text-[#34d399]" :
                      q.status === "active" ? "border-[#06b6d4]/20 bg-[#06b6d4]/10 text-[#22d3ee]" :
                      "border-[#2a2520]/20 bg-[#2a2520]/10 text-[#3d3830]"
                    }`}>
                      +{q.xp} XP
                    </span>
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
                      <div className="mt-3 pt-3 border-t border-[#2a2520]/20">
                        <p className="text-xs text-[#9a9182] leading-relaxed">
                          {q.description}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
