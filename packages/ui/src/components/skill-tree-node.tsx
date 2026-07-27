"use client";

import React from "react";
import { motion } from "framer-motion";
import { Lock, CheckCircle, Zap, Star } from "lucide-react";

interface SkillTreeNodeProps {
  id: string;
  name: string;
  category: string;
  level: number;
  status: "LOCKED" | "AVAILABLE" | "MASTERED";
  xpReward: number;
  onClick?: () => void;
}

export function SkillTreeNode({
  id,
  name,
  category,
  level,
  status,
  xpReward,
  onClick,
}: SkillTreeNodeProps) {
  const isLocked = status === "LOCKED";
  const isMastered = status === "MASTERED";
  const isAvailable = status === "AVAILABLE";

  return (
    <motion.div
      whileHover={!isLocked ? { scale: 1.08, y: -4 } : {}}
      whileTap={!isLocked ? { scale: 0.95 } : {}}
      onClick={!isLocked ? onClick : undefined}
      className={`relative flex flex-col items-center p-5 rounded-2xl border backdrop-blur-xl transition-all ${
        isLocked
          ? "bg-slate-950/40 border-slate-800 text-slate-600 cursor-not-allowed opacity-50"
          : isMastered
          ? "bg-gradient-to-b from-emerald-950/60 to-slate-950/80 border-emerald-500/60 text-emerald-300 shadow-xl shadow-emerald-500/20 ring-1 ring-emerald-500/40 cursor-pointer"
          : "bg-gradient-to-b from-indigo-950/60 to-slate-950/80 border-indigo-500/60 text-indigo-200 shadow-xl shadow-indigo-500/25 ring-2 ring-indigo-500/50 cursor-pointer animate-pulse-slow"
      }`}
    >
      <div className="relative mb-3 flex items-center justify-center w-14 h-14 rounded-2xl border shadow-inner">
        {isLocked && <Lock className="w-6 h-6 text-slate-600" />}
        {isMastered && <CheckCircle className="w-7 h-7 text-emerald-400" />}
        {isAvailable && <Zap className="w-7 h-7 text-indigo-400 fill-indigo-400" />}
      </div>

      <div className="text-center space-y-1">
        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-900 border border-white/10 text-slate-400">
          Level {level} • {category}
        </span>
        <h4 className="text-sm font-extrabold tracking-wide text-white">{name}</h4>
        <p className="text-[11px] font-mono text-amber-400 font-bold">+{xpReward} XP</p>
      </div>
    </motion.div>
  );
}
