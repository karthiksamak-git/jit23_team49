"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useGame } from "@/lib/game-context";
import { generateDailyRecommendations, LearningRecommendation } from "@/lib/ai-learning-engine";

/* ═══════════════════════════════════════════
   PERSONALIZED DASHBOARD
   Shows AI-recommended domain, daily learning,
   progress stats, and quick access links.
   ═══════════════════════════════════════════ */

const domainColorMap: Record<string, { text: string; bg: string; border: string; glow: string; fill: string }> = {
  teal: { text: "text-[#22d3ee]", bg: "bg-[#06b6d4]/10", border: "border-[#06b6d4]/30", glow: "glow-teal", fill: "xp-fill-teal" },
  purple: { text: "text-[#c084fc]", bg: "bg-[#a855f7]/10", border: "border-[#a855f7]/30", glow: "glow-purple", fill: "xp-fill-purple" },
  emerald: { text: "text-[#34d399]", bg: "bg-[#10b981]/10", border: "border-[#10b981]/30", glow: "glow-emerald", fill: "xp-fill-emerald" },
  amber: { text: "text-[#fbbf24]", bg: "bg-[#f59e0b]/10", border: "border-[#f59e0b]/30", glow: "glow-amber", fill: "xp-fill-amber" },
  rose: { text: "text-[#fb7185]", bg: "bg-[#f43f5e]/10", border: "border-[#f43f5e]/30", glow: "glow-rose", fill: "xp-fill-rose" },
  blue: { text: "text-[#60a5fa]", bg: "bg-[#3b82f6]/10", border: "border-[#3b82f6]/30", glow: "glow-teal", fill: "xp-fill-teal" },
};

const diffColors: Record<string, string> = {
  Easy: "text-[#34d399] bg-[#10b981]/10 border-[#10b981]/30",
  Medium: "text-[#fbbf24] bg-[#f59e0b]/10 border-[#f59e0b]/30",
  Hard: "text-[#fb7185] bg-[#f43f5e]/10 border-[#f43f5e]/30",
};

export default function DashboardPage() {
  const { player, signOut, sfx } = useGame();
  const [recommendations, setRecommendations] = useState<LearningRecommendation[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(true);

  const dColor = domainColorMap[player.domainColor] || domainColorMap.teal;

  useEffect(() => {
    async function loadRecs() {
      setLoadingRecs(true);
      try {
        const recs = await generateDailyRecommendations({
          name: player.characterName,
          domain: player.recommendedDomain || player.realmName || "Full-Stack Development",
          level: player.level,
          interests: player.interests || [],
          completedTopics: player.completedMissions || [],
        });
        setRecommendations(recs);
      } catch (err) {
        console.error("Failed to load recommendations:", err);
      } finally {
        setLoadingRecs(false);
      }
    }
    loadRecs();
  }, [player.characterName, player.recommendedDomain, player.realmName, player.level, player.interests, player.completedMissions]);

  const xpPercent = player.xpToNext > 0 ? Math.min(100, (player.xp / player.xpToNext) * 100) : 0;

  const quickLinks = [
    { href: "/world-map", title: "Learning Path", description: "Follow your personalized roadmap", color: "surface-teal" },
    { href: "/worlds/backend", title: "Practice Lab", description: "Hands-on coding challenges", color: "surface-purple" },
    { href: "/interview", title: "Mock Interview", description: "AI-powered interview practice", color: "surface-amber" },
    { href: "/opportunities", title: "Jobs & Internships", description: "Find roles matching your skills", color: "surface-emerald" },
    { href: "/sandbox", title: "Coding Sandbox", description: "Write and test code freely", color: "surface-rose" },
    { href: "/discover", title: "My Progress", description: "Track your learning journey", color: "surface-blue" },
  ];

  return (
    <div className="relative z-10 w-full max-w-5xl mx-auto px-4 md:px-6 py-8 space-y-8">
      {/* Welcome Banner */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={`card-lift rounded-2xl p-6 md:p-8 border ${dColor.border} ${dColor.glow} bg-gradient-to-br from-[#0a0b0d]/90 to-[#0e1014]/70 backdrop-blur-md`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-mono uppercase tracking-widest px-2.5 py-1 rounded-full border ${dColor.border} ${dColor.bg} ${dColor.text}`}>
                {player.recommendedDomain || player.realmName || "IT Learner"}
              </span>
              <span className="text-[10px] font-mono text-[#6b6358]">Level {player.level}</span>
            </div>
            <h1 className="font-cinzel text-2xl md:text-3xl font-bold text-[#e8dfc8] tracking-wide">
              Welcome back, <span className="aurora-text">{player.characterName}</span>
            </h1>
            {player.learningPathSummary && (
              <p className="text-xs text-[#6b6358] leading-relaxed max-w-lg">
                {player.learningPathSummary}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/world-map"
              onClick={() => sfx("click")}
              className="btn-primary px-6 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider"
            >
              <span>Continue Learning →</span>
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="surface-teal rounded-xl p-4 md:p-5 space-y-2">
          <span className="text-[10px] text-[#6b6358] uppercase tracking-wider block">
            Experience
          </span>
          <p className="font-mono text-xl md:text-2xl font-bold text-[#22d3ee]">
            {player.xp} <span className="text-xs text-[#6b6358]">XP</span>
          </p>
          <div className="xp-track h-1.5 rounded-full">
            <div className="xp-fill-teal rounded-full" style={{ width: `${xpPercent}%` }} />
          </div>
          <p className="font-mono text-[10px] text-[#3d3830]">{Math.max(0, player.xpToNext - player.xp)} XP to level {player.level + 1}</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="surface-amber rounded-xl p-4 md:p-5 space-y-2">
          <span className="text-[10px] text-[#6b6358] uppercase tracking-wider block">
            Learning Streak
          </span>
          <p className="font-mono text-xl md:text-2xl font-bold text-[#fbbf24]">
            🔥 {player.streak} <span className="text-xs text-[#6b6358]">days</span>
          </p>
          <p className="font-mono text-[10px] text-[#3d3830]">Keep it going!</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="surface-purple rounded-xl p-4 md:p-5 space-y-2">
          <span className="text-[10px] text-[#6b6358] uppercase tracking-wider block">
            Coins Earned
          </span>
          <p className="font-mono text-xl md:text-2xl font-bold text-[#c084fc]">
            ⬡ {player.coins.toLocaleString()}
          </p>
          <p className="font-mono text-[10px] text-[#3d3830]">Earned from practice</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="surface-emerald rounded-xl p-4 md:p-5 space-y-2">
          <span className="text-[10px] text-[#6b6358] uppercase tracking-wider block">
            Skills Mastered
          </span>
          <p className="font-mono text-xl md:text-2xl font-bold text-[#34d399]">
            {player.completedMissions.length}
          </p>
          <p className="font-mono text-[10px] text-[#3d3830]">topics completed</p>
        </motion.div>
      </div>

      {/* AI-Generated Daily Recommendations */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-cinzel text-lg font-bold aurora-text-soft tracking-wider">
              Today&apos;s Recommendations
            </h2>
            <p className="text-xs text-[#6b6358]">
              Personalized by AI based on your interests and progress
            </p>
          </div>
          <span className="chip-glow text-[10px] font-mono text-[#22d3ee] px-2.5 py-1 rounded-full border border-[#06b6d4]/30 bg-[#06b6d4]/10">
            ✦ AI Generated
          </span>
        </div>

        {loadingRecs ? (
          <div className="flex items-center justify-center py-12 surface rounded-xl">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-[#06b6d4] border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-[#06b6d4] animate-pulse">
                AI is preparing your personalized learning plan...
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {recommendations.map((rec, idx) => {
              const recColor = domainColorMap[rec.color] || domainColorMap.teal;
              return (
                <motion.div
                  key={rec.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * idx }}
                  className={`card-lift rounded-xl p-5 border ${recColor.border} bg-[#0a0b0d]/80 backdrop-blur-sm group`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className={`font-semibold text-sm ${recColor.text} group-hover:brightness-110 transition-all`}>
                      {rec.title}
                    </h3>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${diffColors[rec.difficulty] || diffColors.Medium}`}>
                      {rec.difficulty}
                    </span>
                  </div>
                  <p className="text-xs text-[#9a9182] leading-relaxed mb-3">
                    {rec.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-[#3d3830]">
                      ⏱ {rec.timeEstimate}
                    </span>
                    <span className="text-[10px] font-mono text-[#6b6358]">
                      {rec.domain}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Access Grid */}
      <div className="space-y-4">
        <h2 className="font-cinzel text-lg font-bold aurora-text-soft tracking-wider">
          Quick Access
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          {quickLinks.map((link, idx) => (
            <motion.div
              key={link.href}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * idx }}
            >
              <Link
                href={link.href}
                onClick={() => sfx("click")}
                onMouseEnter={() => sfx("hover")}
                className={`block ${link.color} card-lift rounded-xl p-5 space-y-2 group`}
              >
                <h3 className="text-sm font-semibold text-[#e8dfc8] group-hover:text-white transition-colors">
                  {link.title}
                </h3>
                <p className="text-xs text-[#6b6358] leading-relaxed">
                  {link.description}
                </p>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Interests & Topics */}
      {player.interests.length > 0 && (
        <div className="space-y-4">
          <h2 className="font-cinzel text-lg font-bold aurora-text-soft tracking-wider">
            Your Profile
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="surface-teal rounded-xl p-5 space-y-3">
              <h3 className="text-xs font-medium text-[#22d3ee] uppercase tracking-widest">Interests</h3>
              <div className="flex flex-wrap gap-1.5">
                {player.interests.map((int, i) => (
                  <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-[#06b6d4]/10 border border-[#06b6d4]/20 text-[#22d3ee]">
                    {int}
                  </span>
                ))}
              </div>
            </div>
            <div className="surface-emerald rounded-xl p-5 space-y-3">
              <h3 className="text-xs font-medium text-[#34d399] uppercase tracking-widest">Next Topics to Learn</h3>
              <ul className="space-y-1.5">
                {player.suggestedTopics.slice(0, 5).map((topic, i) => (
                  <li key={i} className="text-xs text-[#9a9182] flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                    {topic}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="pt-6 border-t border-[#2a2520]/30 flex items-center justify-between text-xs text-[#3d3830]">
        <span>Signed in as {player.characterName}</span>
        <button
          onClick={signOut}
          className="hover:text-[#fb7185] transition-colors"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
