"use client";

import React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "hover" | "glow" | "active";
  children: React.ReactNode;
}

export function GlassCard({
  variant = "default",
  className,
  children,
  ...props
}: GlassCardProps) {
  const baseStyles =
    "relative overflow-hidden rounded-2xl backdrop-blur-xl border border-white/10 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 shadow-xl transition-all duration-300";

  const variantStyles = {
    default: "",
    hover:
      "hover:border-indigo-500/50 hover:bg-white/80 dark:hover:bg-slate-900/80 hover:shadow-indigo-500/10 hover:-translate-y-1",
    glow: "border-indigo-500/30 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent shadow-indigo-500/20",
    active:
      "border-cyan-500/50 bg-cyan-500/10 shadow-cyan-500/20 ring-2 ring-cyan-500/30",
  };

  return (
    <div
      className={cn(baseStyles, variantStyles[variant], className)}
      {...props}
    >
      {children}
    </div>
  );
}
