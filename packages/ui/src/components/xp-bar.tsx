"use client";

import React from "react";
import { motion } from "framer-motion";
import { Zap } from "lucide-react";

interface XPBarProps {
  currentXP: number;
  nextLevelXP: number;
  level: number;
  title?: string;
  showIcon?: boolean;
}

export function XPBar({
  currentXP,
  nextLevelXP,
  level,
  title = "Explorer",
  showIcon = true,
}: XPBarProps) {
  const percentage = Math.min(100, Math.max(0, (currentXP / nextLevelXP) * 100));

  return (
    <div className="w-full space-y-1.5">
      <div className="flex items-center justify-between text-xs font-semibold">
        <div className="flex items-center gap-1.5 text-indigo-400">
          {showIcon && <Zap className="w-4 h-4 text-amber-400 fill-amber-400 animate-pulse" />}
          <span>Level {level} — <span className="text-slate-200">{title}</span></span>
        </div>
        <span className="text-slate-400 font-mono text-[11px]">
          {currentXP} / {nextLevelXP} XP
        </span>
      </div>
      <div className="relative h-3 w-full overflow-hidden rounded-full bg-slate-800/80 p-0.5 border border-white/5">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 shadow-lg shadow-indigo-500/30"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
