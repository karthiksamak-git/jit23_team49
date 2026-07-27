"use client";

import React from "react";
import { Flame } from "lucide-react";
import { motion } from "framer-motion";

interface StreakBadgeProps {
  streak: number;
  activeToday?: boolean;
}

export function StreakBadge({ streak, activeToday = true }: StreakBadgeProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition-colors ${
        activeToday
          ? "bg-amber-500/10 border-amber-500/30 text-amber-400 shadow-lg shadow-amber-500/10"
          : "bg-slate-800/60 border-slate-700/50 text-slate-400"
      }`}
    >
      <Flame
        className={`w-4 h-4 ${
          activeToday ? "text-amber-500 fill-amber-500 animate-bounce" : "text-slate-500"
        }`}
      />
      <span>{streak} Day Streak</span>
    </motion.div>
  );
}
