"use client";

import React, { useMemo, useState } from "react";
import { Download, Lock, Award } from "lucide-react";
import { useGame } from "@/lib/game-context";
import { BadgeStatus, getBadgeStatuses, renderBadgeCanvas, downloadBadge } from "@/lib/badges";

/* ═══════════════════════════════════════════
   COLLECTION — LEARNING BADGES
   Every badge here is earned from real state
   (levels, XP, missions, tracked hours, real
   streaks, check-ins, accepted submissions).
   Each badge is a 1:1 artwork that renders
   on a 1024×1024 canvas and downloads as a
   separate PNG — locked ones included, so
   the user can see what is still ahead.
   ═══════════════════════════════════════════ */

function BadgeArt({ status, owner }: { status: BadgeStatus; owner: string }) {
  const ref = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const source = renderBadgeCanvas(status, owner);
    canvas.width = source.width;
    canvas.height = source.height;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.drawImage(source, 0, 0);
  }, [status, owner]);

  return (
    <canvas
      ref={ref}
      className="w-full aspect-square rounded-xl block"
      aria-label={status.badge.name}
    />
  );
}

export default function CollectionPage() {
  const { player } = useGame();
  const [filter, setFilter] = useState<"all" | "earned" | "locked">("all");

  const statuses = useMemo(
    () =>
      getBadgeStatuses({
        level: player.level,
        xp: player.xp,
        missions: player.completedMissions.length,
        onboardingComplete: player.onboardingComplete,
      }),
    [player.level, player.xp, player.completedMissions.length, player.onboardingComplete]
  );

  const earned = statuses.filter((s) => s.earned);
  const locked = statuses.filter((s) => !s.earned);
  const shown = filter === "all" ? statuses : filter === "earned" ? earned : locked;
  const owner = player.characterName || "CareerVerse";
  const earnedPct = statuses.length ? Math.round((earned.length / statuses.length) * 100) : 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="space-y-2 text-center">
        <p className="font-mono text-[10px] text-[#6b6358] tracking-widest uppercase">
          Earned through real learning
        </p>
        <h1 className="font-cinzel text-2xl font-bold text-[#b49b64] tracking-wider">
          Collection
        </h1>
        <p className="font-cinzel text-xs text-[#6b6358] italic">
          Download any badge as a 1:1 image — each one is yours to keep
        </p>
      </div>

      {/* Progress banner */}
      <div className="surface rounded-xl p-4 space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[#6b6358]">
            <Award className="inline-block w-3.5 h-3.5 -mt-0.5 mr-1 text-[#f59e0b]" strokeWidth={2} />
            {earned.length} of {statuses.length} badges earned
          </span>
          <span className="font-mono text-[#f59e0b]">{earnedPct}%</span>
        </div>
        <div className="xp-track h-2 rounded-full">
          <div className="xp-fill-amber rounded-full transition-all duration-700" style={{ width: `${earnedPct}%` }} />
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-center gap-2">
        {(["all", "earned", "locked"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium capitalize transition-all cursor-pointer border ${
              filter === f
                ? "border-[#b49b64]/50 bg-[#b49b64]/10 text-[#e8dfc8]"
                : "border-[#2a2520]/60 text-[#6b6358] hover:text-[#c8c0b0]"
            }`}
          >
            {f} ({f === "all" ? statuses.length : f === "earned" ? earned.length : locked.length})
          </button>
        ))}
      </div>

      {/* Badge grid — every artwork is strictly 1:1 */}
      {shown.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {shown.map((status) => (
            <div
              key={status.badge.id}
              className={`group rounded-xl border p-3 space-y-2.5 transition-all ${
                status.earned
                  ? "border-[#2a2520]/70 bg-[#0e1014]/80 hover:border-[#b49b64]/40 card-lift"
                  : "border-[#2a2520]/40 bg-[#0a0b0d]/70"
              }`}
            >
              <BadgeArt status={status} owner={owner} />
              <div className="space-y-1 text-center">
                <p className={`text-xs font-semibold ${status.earned ? "text-[#e8dfc8]" : "text-[#6b6358]"}`}>
                  {status.badge.name}
                </p>
                <p className="text-[10px] text-[#3d3830] leading-snug">
                  {status.earned && status.earnedAt
                    ? `Earned ${new Date(status.earnedAt).toLocaleDateString()}`
                    : status.badge.how}
                </p>
              </div>
              <button
                onClick={() => downloadBadge(status, owner)}
                className={`w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-medium transition-all cursor-pointer border ${
                  status.earned
                    ? "border-[#06b6d4]/40 bg-[#06b6d4]/10 text-[#22d3ee] hover:bg-[#06b6d4]/20"
                    : "border-[#2a2520]/60 bg-[#141518]/60 text-[#6b6358] hover:text-[#c8c0b0]"
                }`}
                title={`Download ${status.badge.name} (1024×1024 PNG)`}
              >
                {status.earned ? <Download className="w-3 h-3" strokeWidth={2} /> : <Lock className="w-3 h-3" strokeWidth={2} />}
                {status.earned ? "Download" : "Locked"}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="scroll-surface rounded-xl p-8 text-center">
          <p className="font-cinzel text-sm text-[#6b6358] italic">
            {filter === "earned" ? "No badges earned yet — start learning to earn your first." : "Nothing here."}
          </p>
        </div>
      )}

      {/* Footer hint */}
      <div className="text-center pt-2">
        <p className="font-cinzel text-xs text-[#3d3830] italic">
          Badges unlock from real activity — levels, missions, streaks, check-ins, study hours and accepted code
        </p>
      </div>
    </div>
  );
}
