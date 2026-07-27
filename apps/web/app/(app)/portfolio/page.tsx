"use client";

import React, { useMemo } from "react";
import { useGame } from "@/lib/game-context";

/* ═══════════════════════════════════════════
   SCROLLS — Warrior's Proof of Work
   A vintage journal of skills earned,
   titles achieved, and knowledge sealed.
   Now driven by GameContext player state.
   ═══════════════════════════════════════════ */

interface Scroll {
  title: string;
  type: "skill" | "title" | "achievement";
  description: string;
  earnedAt: string;
}

/* Map of mission IDs to scroll entries earned on completion */
const missionScrollMap: Record<string, Scroll[]> = {
  m1: [
    {
      title: "HTTP Protocol Mastery",
      type: "skill",
      description: "Understanding of request/response cycle, status codes, and HTTP methods.",
      earnedAt: "Chapter I — The Foundation Shrine",
    },
  ],
  m2: [
    {
      title: "SQL Fundamentals",
      type: "skill",
      description: "Ability to query, filter, and join data across relational tables.",
      earnedAt: "Chapter II — The First Query",
    },
    {
      title: "Apprentice of the Forge",
      type: "title",
      description: "Awarded for completing two chapters in the Backend Forge operation.",
      earnedAt: "After Chapter II",
    },
  ],
  "backend-index-of-knowledge": [
    {
      title: "B-Tree Index Mastery",
      type: "skill",
      description: "Mastered B-Tree indexing to optimize database query performance.",
      earnedAt: "Chapter III — Index of Knowledge",
    },
  ],
  f1: [
    {
      title: "DOM Understanding",
      type: "skill",
      description: "Knowledge of the Document Object Model and browser rendering lifecycle.",
      earnedAt: "Chapter I — The Render Shrine",
    },
  ],
};

/* Streak-based achievements */
function streakAchievements(streak: number): Scroll[] {
  const achievements: Scroll[] = [];
  if (streak >= 3) {
    achievements.push({
      title: "Three-Day Discipline",
      type: "achievement",
      description: "Maintained training discipline for three consecutive days.",
      earnedAt: "Day 3",
    });
  }
  if (streak >= 5) {
    achievements.push({
      title: "Five-Day Streak",
      type: "achievement",
      description: "Maintained training discipline for five consecutive days.",
      earnedAt: "Day 5",
    });
  }
  if (streak >= 7) {
    achievements.push({
      title: "Week of Iron Will",
      type: "achievement",
      description: "Seven unbroken days of training. A rare mark of dedication.",
      earnedAt: "Day 7",
    });
  }
  return achievements;
}

function typeTag(type: string) {
  switch (type) {
    case "skill": return { label: "Skill Sealed", color: "text-[#b49b64] border-[#b49b64]/25" };
    case "title": return { label: "Title Earned", color: "text-[#4a7a5a] border-[#4a7a5a]/25" };
    case "achievement": return { label: "Achievement", color: "text-[#8b2020] border-[#8b2020]/25" };
    default: return { label: "Record", color: "text-[#6b6358] border-[#6b6358]/25" };
  }
}

export default function PortfolioPage() {
  const { player } = useGame();

  const scrolls = useMemo(() => {
    const earned: Scroll[] = [];
    // Add scrolls from completed missions
    for (const missionId of player.completedMissions) {
      const missionScrolls = missionScrollMap[missionId];
      if (missionScrolls) {
        earned.push(...missionScrolls);
      }
    }
    // Add streak achievements
    earned.push(...streakAchievements(player.streak));
    return earned;
  }, [player.completedMissions, player.streak]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="space-y-2 text-center">
        <p className="font-mono text-[10px] text-[#6b6358] tracking-widest uppercase">
          Proof of Work
        </p>
        <h1 className="font-cinzel text-2xl font-bold text-[#b49b64] tracking-wider">
          The Warrior&apos;s Scrolls
        </h1>
        <p className="font-cinzel text-xs text-[#6b6358] italic">
          Every skill sealed, every title earned, every trial survived
        </p>
      </div>

      <div className="ink-divider" />

      {/* Stats banner */}
      <div className="flex items-center justify-center gap-6 text-xs font-mono text-[#6b6358]">
        <span>{scrolls.filter(s => s.type === "skill").length} Skills</span>
        <span>·</span>
        <span>{scrolls.filter(s => s.type === "title").length} Titles</span>
        <span>·</span>
        <span>{scrolls.filter(s => s.type === "achievement").length} Achievements</span>
      </div>

      {/* Scroll entries */}
      {scrolls.length > 0 ? (
        <div className="space-y-4">
          {scrolls.map((s, i) => {
            const tag = typeTag(s.type);
            return (
              <div key={i} className="scroll-surface rounded p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-cinzel text-sm font-bold text-[#c8c0b0] tracking-wider">
                    {s.title}
                  </h3>
                  <span className={`font-mono text-[10px] tracking-widest uppercase px-2 py-0.5 rounded border ${tag.color}`}>
                    {tag.label}
                  </span>
                </div>
                <p className="text-xs text-[#6b6358] leading-relaxed">
                  {s.description}
                </p>
                <p className="font-mono text-[10px] text-[#3d3830]">
                  Earned: {s.earnedAt}
                </p>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="scroll-surface rounded p-8 text-center space-y-3">
          <p className="font-cinzel text-sm text-[#6b6358] italic">
            Your scroll collection is empty, warrior.
          </p>
          <p className="font-mono text-[10px] text-[#3d3830]">
            Complete missions in the World Map to earn skills, titles, and achievements.
          </p>
        </div>
      )}

      {/* Footer hint */}
      <div className="text-center pt-4">
        <p className="font-cinzel text-xs text-[#3d3830] italic">
          {scrolls.length > 0
            ? "Complete more missions to fill your scroll collection"
            : "Begin your journey at the World Map"}
        </p>
      </div>
    </div>
  );
}
