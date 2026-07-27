"use client";

import React from "react";
import { Trophy, ShieldCheck, ExternalLink, Award } from "lucide-react";

interface PortfolioCardProps {
  title: string;
  category: string;
  issuedAt: string;
  verifiedBadge: boolean;
  score: string;
}

export function PortfolioCard({
  title,
  category,
  issuedAt,
  verifiedBadge = true,
  score,
}: PortfolioCardProps) {
  return (
    <div className="p-6 rounded-2xl border border-white/10 bg-slate-950/60 backdrop-blur-xl space-y-4 hover:border-indigo-500/50 transition-all hover:-translate-y-1">
      <div className="flex items-center justify-between">
        <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
          <Award className="w-5 h-5" />
        </div>
        {verifiedBadge && (
          <span className="flex items-center gap-1 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <ShieldCheck className="w-3 h-3" /> Verified On-Chain
          </span>
        )}
      </div>

      <div className="space-y-1">
        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">{category}</span>
        <h4 className="font-extrabold text-base text-white">{title}</h4>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-400 border-t border-white/5 pt-3 font-mono">
        <span>Score: <strong className="text-indigo-300">{score}</strong></span>
        <span>Issued: {issuedAt}</span>
      </div>
    </div>
  );
}
