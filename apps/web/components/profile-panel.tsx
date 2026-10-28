"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Flame, Clock, Hexagon, Trophy, CalendarCheck, CheckCircle2, BookOpen, Zap, Target, Download, FileText } from "lucide-react";
import { useGame } from "@/lib/game-context";
import {
  getStreak, getCheckins, hasCheckedInToday, checkInToday, getTotalSeconds,
  getDailyActivity, getActiveDays, daysAgoKey, getSecondsOn, countEvents,
} from "@/lib/activity";
import { getBadgeStatuses } from "@/lib/badges";
import { downloadReport } from "@/lib/user-report";

/* ═══════════════════════════════════════════
   PROFILE PANEL — opened from the avatar in
   the top bar (there is no separate Profile
   tab).
   Every number, the calendar and the graphs
   are derived from real activity data:
   tracked seconds, the event log, check-ins
   and actual player state. Includes the
   downloadable PDF report with project tag,
   user details, statistics, graphs and the
   generation date & time.
   ═══════════════════════════════════════════ */

const MILESTONES = [
  { id: "q1", chapter: "Getting Started", title: "Career Discovery Assessment" },
  { id: "q2", chapter: "Foundations", title: "Understanding the Basics" },
  { id: "q3", chapter: "Building Skills", title: "First Practical Project" },
  { id: "q4", chapter: "Going Deeper", title: "Intermediate Concepts" },
  { id: "q5", chapter: "Real-World Ready", title: "Portfolio Project" },
  { id: "q6", chapter: "Job Ready", title: "Interview Prep & Applications" },
];

function fmtHours(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

function dateKeyOf(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function ProfilePanel({ onClose }: { onClose?: () => void }) {
  const { player, addXp, addCoins, sfx } = useGame();
  const [checkedToday, setCheckedToday] = useState(false);
  const [justChecked, setJustChecked] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setCheckedToday(hasCheckedInToday());
    setTick((t) => t + 1);
  }, []);

  const streak = useMemo(() => getStreak(), [tick]);
  const checkins = useMemo(() => getCheckins(), [tick]);
  const totalSeconds = useMemo(() => getTotalSeconds(), [tick]);
  const activeDays = useMemo(() => getActiveDays().size, [tick]);
  const daily = useMemo(() => getDailyActivity(14), [tick]);

  /* Calendar: 12 whole weeks, aligned so rows are Sun…Sat and the last
     cell is TODAY — real local dates, no placeholders. */
  const calendar = useMemo(() => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(start.getDate() - 83);
    start.setDate(start.getDate() - start.getDay()); // back up to Sunday
    const cells: { date: string; minutes: number; checkin: boolean; isToday: boolean; future: boolean }[] = [];
    const cursor = new Date(start);
    const todayKey = dateKeyOf(today);
    while (cursor <= today) {
      const date = dateKeyOf(cursor);
      cells.push({
        date,
        minutes: Math.round(getSecondsOn(date) / 60),
        checkin: checkins.includes(date),
        isToday: date === todayKey,
        future: false,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    return cells;
  }, [tick, checkins]);

  const badges = useMemo(
    () =>
      getBadgeStatuses({
        level: player.level,
        xp: player.xp,
        missions: player.completedMissions.length,
        onboardingComplete: player.onboardingComplete,
      }),
    [tick, player.level, player.xp, player.completedMissions.length, player.onboardingComplete]
  );
  const earnedCount = badges.filter((b) => b.earned).length;

  const xpPercent = player.xpToNext > 0 ? Math.min(100, (player.xp / player.xpToNext) * 100) : 0;
  const solved = countEvents("code_solve");
  const missionCount = player.completedMissions.length;
  const doneAt = [
    player.onboardingComplete,
    missionCount >= 1, missionCount >= 2, missionCount >= 4, missionCount >= 6, missionCount >= 8,
  ];

  const maxMin = Math.max(60, ...daily.map((d) => d.minutes));
  const maxXp = Math.max(50, ...daily.map((d) => d.xp));

  const today = new Date();
  const todayLabel = today.toLocaleDateString(undefined, {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  async function handleDownload() {
    if (downloading) return;
    setDownloading(true);
    try {
      await downloadReport(player, badges);
    } catch (err) {
      console.warn("Report generation failed:", err);
    } finally {
      setDownloading(false);
    }
  }

  function handleCheckIn() {
    if (checkedToday) return;
    const res = checkInToday();
    if (!res.already) {
      addXp(15);
      addCoins(5);
      sfx("unlock");
      setJustChecked(true);
    }
    setCheckedToday(true);
    setTick((t) => t + 1);
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-7 relative">
      {/* Header */}
      <div className="space-y-2 text-center">
        <h1 className="font-cinzel text-2xl font-bold text-[#dcd0b0] tracking-wider italic uppercase">
          Your Profile
        </h1>
        <p className="text-xs text-[#6b6358]">
          Everything below is measured from your real activity · {todayLabel}
        </p>
      </div>

      {onClose && (
        <button
          onClick={onClose}
          aria-label="Close profile"
          className="absolute top-3 right-3 sm:right-5 w-8 h-8 rounded-lg border border-[#2a2520]/60 bg-[#0e1014] text-[#6b6358] hover:text-[#e8dfc8] hover:border-[#b49b64]/50 transition-all flex items-center justify-center cursor-pointer"
        >
          ✕
        </button>
      )}

      {/* Identity + check-in + report */}
      <div className="surface rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full border-2 border-[#b49b64]/50 bg-[#0a0b0d] flex items-center justify-center font-cinzel text-xl font-bold text-[#e8dfc8]">
              {(player.characterName || "?").charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="font-cinzel text-lg font-bold text-[#e8dfc8] tracking-wide">{player.characterName}</h2>
              <p className="text-[11px] text-[#6b6358]">{player.email || "Local learner"}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="font-mono text-[10px] text-[#b49b64]">Lv.{player.level}</span>
                <div className="xp-track w-32 h-1.5 rounded-full">
                  <div className="xp-fill-teal rounded-full" style={{ width: `${xpPercent}%` }} />
                </div>
                <span className="font-mono text-[10px] text-[#3d3830]">{player.xp}/{player.xpToNext}</span>
              </div>
            </div>
          </div>

          <div className="sm:ml-auto flex flex-wrap items-center gap-3">
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold border border-[#b49b64]/40 bg-[#b49b64]/10 text-[#d4bf8a] hover:bg-[#b49b64]/20 transition-all cursor-pointer disabled:opacity-60"
              title="Download your learning report as a PDF file"
            >
              <FileText className="w-4 h-4" strokeWidth={2} />
              {downloading ? "Generating PDF…" : "Download Report (PDF)"}
            </button>
          </div>
        </div>

        {/* Daily check-in */}
        <div className={`rounded-xl p-4 border flex items-center justify-between gap-4 ${
          checkedToday ? "border-[#10b981]/30 bg-[#10b981]/10" : "border-[#06b6d4]/40 bg-[#06b6d4]/10"
        }`}>
          <div className="flex items-center gap-3">
            {checkedToday ? (
              <CheckCircle2 className="w-6 h-6 text-[#34d399] shrink-0" strokeWidth={2} />
            ) : (
              <CalendarCheck className="w-6 h-6 text-[#22d3ee] shrink-0 animate-pulse" strokeWidth={2} />
            )}
            <div>
              <p className="text-sm font-semibold text-[#e8dfc8]">
                {checkedToday ? "Checked in today" : "Daily Check-In"}
              </p>
              <p className="text-[11px] text-[#6b6358]">
                {checkedToday
                  ? `Come back tomorrow to extend your streak · ${streak.current} day streak`
                  : "+15 XP · +5 coins · counts once per day, saved even if you log out"}
              </p>
            </div>
          </div>
          <button
            onClick={handleCheckIn}
            disabled={checkedToday}
            className={`shrink-0 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              checkedToday
                ? "bg-[#10b981]/20 text-[#34d399] border border-[#10b981]/30 opacity-70 cursor-not-allowed"
                : "btn-primary text-black"
            }`}
          >
            {checkedToday ? "Done" : "Check In"}
          </button>
        </div>
        {justChecked && (
          <p className="text-[11px] text-[#34d399] text-center -mt-2">+15 XP · +5 coins earned</p>
        )}
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCell icon={<Zap className="w-4 h-4" />} label="Experience" value={player.xp.toLocaleString()} unit="XP" color="#22d3ee" />
        <StatCell icon={<Flame className="w-4 h-4" />} label="Current Streak" value={streak.current} unit={`d · best ${streak.longest}`} color="#fbbf24" />
        <StatCell icon={<Clock className="w-4 h-4" />} label="Time Spent" value={fmtHours(totalSeconds)} unit={`${activeDays} active days`} color="#34d399" />
        <StatCell icon={<Hexagon className="w-4 h-4" />} label="Coins" value={player.coins.toLocaleString()} unit="earned" color="#c084fc" />
        <StatCell icon={<BookOpen className="w-4 h-4" />} label="Topics Mastered" value={missionCount} unit="missions" color="#34d399" />
        <StatCell icon={<Trophy className="w-4 h-4" />} label="Badges" value={`${earnedCount}/${badges.length}`} unit="collection" color="#f59e0b" />
        <StatCell icon={<Target className="w-4 h-4" />} label="Code Accepted" value={solved} unit="submissions" color="#22d3ee" />
        <StatCell icon={<CalendarCheck className="w-4 h-4" />} label="Check-ins" value={checkins.length} unit="days" color="#60a5fa" />
      </div>

      {/* Real calendar */}
      <section className="surface rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-[#b49b64]">
            Learning Calendar
          </h3>
          <span className="flex items-center gap-1.5 text-[10px] text-[#6b6358]">
            Less
            <span className="w-3 h-3 rounded-sm bg-[#141518] border border-[#2a2520]" />
            <span className="w-3 h-3 rounded-sm bg-[#0e7490]" />
            <span className="w-3 h-3 rounded-sm bg-[#06b6d4]" />
            <span className="w-3 h-3 rounded-sm bg-[#22d3ee]" />
            More
          </span>
        </div>
        <div className="overflow-x-auto pb-1">
          <div className="flex gap-2 w-fit">
            {/* weekday labels */}
            <div className="grid grid-rows-7 gap-1 text-[9px] font-mono text-[#3d3830] pr-1">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <span key={d} className="h-4 leading-4">{d}</span>
              ))}
            </div>
            <div
              className="grid grid-rows-7 grid-flow-col gap-1"
              style={{ gridAutoColumns: "1rem" }}
            >
              {calendar.map((d) => {
                const level =
                  d.minutes >= 60 ? "bg-[#22d3ee]" :
                  d.minutes >= 30 ? "bg-[#06b6d4]" :
                  d.minutes >= 5 ? "bg-[#0e7490]" :
                  "bg-[#141518] border border-[#2a2520]/80";
                return (
                  <div
                    key={d.date}
                    title={`${d.date}${d.isToday ? " (today)" : ""} · ${d.minutes} min${d.checkin ? " · checked in" : ""}`}
                    className={`relative w-4 h-4 rounded-sm ${level} ${d.isToday ? "ring-2 ring-[#d4bf8a] ring-offset-1 ring-offset-[#0a0b0d]" : ""}`}
                  >
                    {d.checkin && (
                      <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[#fbbf24]" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap justify-between gap-2 text-[10px] font-mono text-[#6b6358]">
          <span>Today: <span className="text-[#d4bf8a]">{todayLabel}</span></span>
          <span>Gold dot = check-in · ring = today · time is real tracked study time</span>
        </div>
      </section>

      {/* Graphs */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="surface rounded-xl p-5 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-[#b49b64]">
            Minutes Learned · last 14 days
          </h3>
          <div className="flex items-end gap-1.5 h-32 border-l border-b border-[#2a2520] pl-2 pb-1">
            {daily.map((d) => (
              <div key={d.date} className="flex-1 flex flex-col items-center justify-end h-full" title={`${d.date} · ${d.minutes} min`}>
                <div
                  className="w-full rounded-t bg-gradient-to-t from-[#0e7490] to-[#22d3ee]"
                  style={{ height: `${Math.max(2, (d.minutes / maxMin) * 100)}%` }}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between text-[9px] font-mono text-[#3d3830]">
            <span>{daily[0]?.date}</span>
            <span>max {maxMin}m</span>
            <span>today</span>
          </div>
        </div>

        <div className="surface rounded-xl p-5 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-[#b49b64]">
            XP Earned · last 14 days
          </h3>
          <div className="flex items-end gap-1.5 h-32 border-l border-b border-[#2a2520] pl-2 pb-1">
            {daily.map((d) => (
              <div key={d.date} className="flex-1 flex flex-col items-center justify-end h-full" title={`${d.date} · ${d.xp} XP`}>
                <div
                  className={`w-full rounded-t ${d.xp > 0 ? "bg-gradient-to-t from-[#7c3aed] to-[#c084fc]" : "bg-[#1a1714]"}`}
                  style={{ height: `${Math.max(2, (d.xp / maxXp) * 100)}%` }}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between text-[9px] font-mono text-[#3d3830]">
            <span>{daily[0]?.date}</span>
            <span>max {maxXp} XP</span>
            <span>today</span>
          </div>
        </div>
      </section>

      {/* Knowledge — interests & topics (as in the reference image) */}
      <section className="space-y-3">
        <h2 className="font-cinzel text-lg font-bold text-[#dcd0b0] italic tracking-wider uppercase">
          Your Profile
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="surface-teal rounded-xl p-5 space-y-3">
            <h3 className="text-xs font-medium text-[#22d3ee] uppercase tracking-widest">Interests</h3>
            {player.interests.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {player.interests.map((int, i) => (
                  <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-[#06b6d4]/10 border border-[#06b6d4]/30 text-[#22d3ee]">
                    {int}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#3d3830]">No interests recorded yet.</p>
            )}
          </div>
          <div className="surface-teal rounded-xl p-5 space-y-3">
            <h3 className="text-xs font-medium text-[#22d3ee] uppercase tracking-widest">Next Topics to Learn</h3>
            {player.suggestedTopics.length > 0 ? (
              <ul className="space-y-1.5">
                {player.suggestedTopics.slice(0, 6).map((topic, i) => (
                  <li key={i} className="text-xs text-[#e8dfc8] flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#06b6d4] shrink-0" />
                    {topic}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-[#3d3830]">No topics queued yet.</p>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
          <InfoTile label="Path" value={player.recommendedDomain || player.realmName || "Exploring"} />
          <InfoTile label="Capacity" value={`${player.capacityLevel} · ${player.capacityScore}/100`} />
          <InfoTile label="Difficulty" value={player.difficultyLevel || "Beginner"} />
        </div>
        {player.strengths.length > 0 && (
          <p className="text-[11px] text-[#6b6358]">
            <span className="text-[#34d399]">Strengths:</span> {player.strengths.join(" · ")}
          </p>
        )}
      </section>

      {/* Journey */}
      <section className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-[#b49b64]">
          Learning Journey
        </h3>
        <div className="space-y-2">
          {MILESTONES.map((m, i) => {
            const done = doneAt[i];
            const active = !done && doneAt.slice(0, i).every(Boolean);
            return (
              <div key={m.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border ${
                done
                  ? "border-[#10b981]/25 bg-[#10b981]/10"
                  : active
                  ? "border-[#06b6d4]/30 bg-[#06b6d4]/10"
                  : "border-[#2a2520]/40 bg-[#0e1014]/50 opacity-50"
              }`}>
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                  done ? "bg-[#10b981]" : active ? "bg-[#06b6d4] animate-pulse" : "bg-[#3d3830]"
                }`} />
                <div className="min-w-0">
                  <p className="text-[10px] text-[#6b6358] tracking-wider">{m.chapter}</p>
                  <p className={`text-xs font-medium truncate ${done ? "text-[#34d399]" : active ? "text-[#22d3ee]" : "text-[#6b6358]"}`}>
                    {m.title}
                  </p>
                </div>
                <span className="ml-auto text-[10px] font-mono text-[#3d3830]">
                  {done ? "Completed" : active ? "In progress" : "Locked"}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Report CTA at the bottom too */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-[#b49b64]/30 bg-gradient-to-br from-[#0e1014] to-[#14110a] p-5 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left"
      >
        <div>
          <p className="text-sm font-semibold text-[#d4bf8a]">Your learning report</p>
          <p className="text-[11px] text-[#6b6358]">
            A real PDF with the project tag, your details, statistics, graphs, calendar and badges — stamped with the exact date & time it was generated.
          </p>
        </div>
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="sm:ml-auto flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold btn-primary text-black cursor-pointer disabled:opacity-60"
        >
          <Download className="w-4 h-4" strokeWidth={2} />
          {downloading ? "Generating PDF…" : "Download PDF Report"}
        </button>
      </motion.div>
    </div>
  );
}

function StatCell({ icon, label, value, unit, color }: {
  icon: React.ReactNode; label: string; value: React.ReactNode; unit: string; color: string;
}) {
  return (
    <div className="rounded-xl border border-[#2a2520]/50 bg-[#0e1014]/70 p-3.5 space-y-1.5">
      <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[#6b6358]">
        <span style={{ color }}>{icon}</span>
        {label}
      </span>
      <p className="font-mono text-lg font-bold" style={{ color }}>{value}</p>
      <p className="font-mono text-[10px] text-[#3d3830]">{unit}</p>
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#2a2520]/50 bg-[#0e1014]/70 px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-wider text-[#6b6358]">{label}</p>
      <p className="text-xs text-[#c8c0b0] mt-0.5 truncate">{value}</p>
    </div>
  );
}
