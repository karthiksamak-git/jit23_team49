"use client";

import React from "react";
import { Lock, CheckCircle2, Play, Trophy } from "lucide-react";
import { motion } from "framer-motion";

interface WorldMapNodeProps {
  levelNumber: number;
  title: string;
  subtitle?: string;
  status: "LOCKED" | "AVAILABLE" | "IN_PROGRESS" | "COMPLETED";
  isBoss?: boolean;
  onClick?: () => void;
}

export function WorldMapNode({
  levelNumber,
  title,
  subtitle,
  status,
  isBoss = false,
  onClick,
}: WorldMapNodeProps) {
  const isLocked = status === "LOCKED";
  const isCompleted = status === "COMPLETED";
  const isAvailable = status === "AVAILABLE" || status === "IN_PROGRESS";

  return (
    <motion.div
      whileHover={!isLocked ? { scale: 1.05 } : {}}
      whileTap={!isLocked ? { scale: 0.95 } : {}}
      onClick={!isLocked ? onClick : undefined}
      className={`relative flex flex-col items-center p-4 rounded-2xl border backdrop-blur-md transition-all ${
        isLocked
          ? "bg-slate-900/40 border-slate-800 text-slate-600 cursor-not-allowed opacity-60"
          : isCompleted
          ? "bg-emerald-950/30 border-emerald-500/40 text-emerald-300 cursor-pointer shadow-lg shadow-emerald-500/10"
          : isBoss
          ? "bg-rose-950/40 border-rose-500/60 text-rose-300 cursor-pointer shadow-xl shadow-rose-500/20 ring-2 ring-rose-500/40 animate-pulse"
          : "bg-indigo-950/40 border-indigo-500/40 text-indigo-200 cursor-pointer shadow-lg shadow-indigo-500/20 ring-1 ring-indigo-500/30"
      }`}
    >
      <div className="relative mb-2 flex items-center justify-center w-12 h-12 rounded-full font-extrabold text-sm border shadow-inner">
        {isLocked && <Lock className="w-5 h-5 text-slate-500" />}
        {isCompleted && <CheckCircle2 className="w-6 h-6 text-emerald-400" />}
        {isAvailable && !isBoss && (
          <span className="text-indigo-300 flex items-center gap-1 font-mono text-base">
            <Play className="w-4 h-4 fill-indigo-400 text-indigo-400" />
            L{levelNumber}
          </span>
        )}
        {isBoss && isAvailable && <Trophy className="w-6 h-6 text-amber-400 fill-amber-400" />}
      </div>
      <div className="text-center space-y-0.5">
        <h4 className="text-sm font-bold tracking-wide">{title}</h4>
        {subtitle && <p className="text-[11px] text-slate-400">{subtitle}</p>}
      </div>
    </motion.div>
  );
}
