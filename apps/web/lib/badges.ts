/* ═══════════════════════════════════════════
   COLLECTION — LEARNING BADGES
   Every badge is derived from real state
   (levels, XP, missions, tracked hours, real
   streak, check-ins, accepted submissions).
   Earning dates are persisted the moment they
   are first detected so they stay truthful.
   Each badge renders to a 1:1 (1024×1024)
   PNG on a canvas and downloads separately.
   ═══════════════════════════════════════════ */

import {
  getStreak,
  getCheckins,
  getTotalSeconds,
  countEvents,
} from "./activity";

export type BadgeGlyph = "star" | "flame" | "code" | "clock" | "calendar" | "bolt" | "medal" | "book";

export interface Badge {
  id: string;
  name: string;
  description: string;
  how: string; // how it is earned (real requirement)
  glyph: BadgeGlyph;
  color: string; // accent hex
}

export interface BadgeStatus {
  badge: Badge;
  earned: boolean;
  earnedAt: number | null;
}

interface BadgeContext {
  level: number;
  xp: number;
  missions: number;
  onboardingComplete: boolean;
}

export const BADGES: Badge[] = [
  // Journey
  { id: "first-steps", name: "First Steps", description: "Finished the career discovery onboarding.", how: "Complete onboarding", glyph: "star", color: "#06b6d4" },
  { id: "level-2", name: "Rising Learner", description: "Reached level 2.", how: "Reach Level 2", glyph: "bolt", color: "#22d3ee" },
  { id: "level-5", name: "Seasoned Practitioner", description: "Reached level 5.", how: "Reach Level 5", glyph: "bolt", color: "#a855f7" },
  { id: "level-10", name: "Domain Adept", description: "Reached level 10.", how: "Reach Level 10", glyph: "bolt", color: "#f59e0b" },
  // XP
  { id: "xp-500", name: "500 XP Sealed", description: "Earned 500 experience points.", how: "Earn 500 XP", glyph: "medal", color: "#10b981" },
  { id: "xp-2500", name: "2500 XP Forged", description: "Earned 2,500 experience points.", how: "Earn 2,500 XP", glyph: "medal", color: "#06b6d4" },
  { id: "xp-10000", name: "10000 XP Legend", description: "Earned 10,000 experience points.", how: "Earn 10,000 XP", glyph: "medal", color: "#f43f5e" },
  // Missions
  { id: "mission-1", name: "First Mission", description: "Completed your first mission.", how: "Complete 1 mission", glyph: "book", color: "#34d399" },
  { id: "mission-5", name: "Mission Veteran", description: "Completed 5 missions.", how: "Complete 5 missions", glyph: "book", color: "#a855f7" },
  { id: "mission-10", name: "Mission Master", description: "Completed 10 missions.", how: "Complete 10 missions", glyph: "book", color: "#fbbf24" },
  // Consistency
  { id: "streak-3", name: "Three-Day Discipline", description: "Studied 3 days in a row.", how: "3-day real streak", glyph: "flame", color: "#f59e0b" },
  { id: "streak-7", name: "Week of Iron Will", description: "Studied 7 days in a row.", how: "7-day real streak", glyph: "flame", color: "#fb7185" },
  { id: "streak-30", name: "Unbroken Month", description: "Studied 30 days in a row.", how: "30-day real streak", glyph: "flame", color: "#f43f5e" },
  { id: "checkin-1", name: "Daily Check-In", description: "Checked in for the first time.", how: "First daily check-in", glyph: "calendar", color: "#3b82f6" },
  { id: "checkin-7", name: "Week of Presence", description: "Checked in 7 different days.", how: "7 daily check-ins", glyph: "calendar", color: "#06b6d4" },
  { id: "checkin-30", name: "Monthly Devotion", description: "Checked in 30 different days.", how: "30 daily check-ins", glyph: "calendar", color: "#a855f7" },
  // Real study time
  { id: "hours-5", name: "Five Hours Deep", description: "Tracked 5 hours of real study time.", how: "5 hours in the app", glyph: "clock", color: "#10b981" },
  { id: "hours-25", name: "Twenty-Five Hour Scholar", description: "Tracked 25 hours of real study time.", how: "25 hours in the app", glyph: "clock", color: "#06b6d4" },
  { id: "hours-100", name: "Hundred-Hour Mastery", description: "Tracked 100 hours of real study time.", how: "100 hours in the app", glyph: "clock", color: "#f59e0b" },
  // Code
  { id: "code-1", name: "Accepted", description: "Submitted a solution that passed the hidden tests.", how: "First accepted submission", glyph: "code", color: "#34d399" },
  { id: "code-10", name: "Ten Accepted", description: "Ten accepted submissions across the practice lab.", how: "10 accepted submissions", glyph: "code", color: "#22d3ee" },
];

const EARNED_KEY = "cv_badges"; // { badgeId: earnedAtMs }

function loadEarned(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(EARNED_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveEarned(map: Record<string, number>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(EARNED_KEY, JSON.stringify(map));
  } catch {}
}

function isEarned(id: string, ctx: BadgeContext, earnedMap: Record<string, number>): boolean {
  const hours = getTotalSeconds() / 3600;
  const streak = getStreak().longest;
  const checkins = getCheckins().length;
  const solves = countEvents("code_solve");
  switch (id) {
    case "first-steps": return ctx.onboardingComplete;
    case "level-2": return ctx.level >= 2;
    case "level-5": return ctx.level >= 5;
    case "level-10": return ctx.level >= 10;
    case "xp-500": return ctx.xp >= 500;
    case "xp-2500": return ctx.xp >= 2500;
    case "xp-10000": return ctx.xp >= 10000;
    case "mission-1": return ctx.missions >= 1;
    case "mission-5": return ctx.missions >= 5;
    case "mission-10": return ctx.missions >= 10;
    case "streak-3": return streak >= 3;
    case "streak-7": return streak >= 7;
    case "streak-30": return streak >= 30;
    case "checkin-1": return checkins >= 1;
    case "checkin-7": return checkins >= 7;
    case "checkin-30": return checkins >= 30;
    case "hours-5": return hours >= 5;
    case "hours-25": return hours >= 25;
    case "hours-100": return hours >= 100;
    case "code-1": return solves >= 1;
    case "code-10": return solves >= 10;
    default: return false;
  }
}

/**
 * Evaluate every badge against real state, persisting the earning timestamp
 * the first time a badge flips to earned (so dates never get rewritten).
 */
export function getBadgeStatuses(ctx: BadgeContext): BadgeStatus[] {
  const earnedMap = loadEarned();
  let changed = false;
  const statuses = BADGES.map((badge) => {
    const nowEarned = isEarned(badge.id, ctx, earnedMap);
    if (nowEarned && !earnedMap[badge.id]) {
      earnedMap[badge.id] = Date.now();
      changed = true;
    }
    return {
      badge,
      earned: !!earnedMap[badge.id],
      earnedAt: earnedMap[badge.id] ?? null,
    };
  });
  if (changed) saveEarned(earnedMap);
  return statuses;
}

/* ════════ 1:1 badge rendering (1024×1024 canvas) ════════ */

function drawStar(cx: number, cy: number, r: number, points: number, ctx: CanvasRenderingContext2D) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = (Math.PI * i) / points - Math.PI / 2;
    const x = cx + Math.cos(a) * rad;
    const y = cy + Math.sin(a) * rad;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

function drawGlyph(glyph: BadgeGlyph, color: string, c: CanvasRenderingContext2D) {
  const cx = 512;
  const cy = 460;
  c.save();
  c.fillStyle = color;
  c.strokeStyle = color;
  c.lineWidth = 26;
  c.lineCap = "round";
  c.lineJoin = "round";
  switch (glyph) {
    case "star":
      drawStar(cx, cy, 150, 5, c);
      break;
    case "flame": {
      c.beginPath();
      c.moveTo(cx, cy - 170);
      c.bezierCurveTo(cx + 130, cy - 40, cx + 110, cy + 90, cx, cy + 160);
      c.bezierCurveTo(cx - 110, cy + 90, cx - 130, cy - 40, cx, cy - 170);
      c.closePath();
      c.fill();
      break;
    }
    case "code":
      c.font = "bold 200px 'JetBrains Mono', monospace";
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillText("</>", cx, cy);
      break;
    case "clock":
      c.beginPath();
      c.arc(cx, cy, 150, 0, Math.PI * 2);
      c.stroke();
      c.beginPath();
      c.moveTo(cx, cy);
      c.lineTo(cx, cy - 95);
      c.moveTo(cx, cy);
      c.lineTo(cx + 70, cy + 40);
      c.stroke();
      break;
    case "calendar": {
      const w = 260;
      const h = 230;
      c.lineWidth = 22;
      c.strokeRect(cx - w / 2, cy - h / 2, w, h);
      c.beginPath();
      c.moveTo(cx - w / 2, cy - h / 2 + 70);
      c.lineTo(cx + w / 2, cy - h / 2 + 70);
      c.stroke();
      c.beginPath(); // check mark
      c.moveTo(cx - 70, cy + 20);
      c.lineTo(cx - 15, cy + 80);
      c.lineTo(cx + 75, cy - 25);
      c.stroke();
      break;
    }
    case "bolt": {
      c.beginPath();
      c.moveTo(cx + 30, cy - 170);
      c.lineTo(cx - 95, cy + 30);
      c.lineTo(cx - 10, cy + 30);
      c.lineTo(cx - 35, cy + 175);
      c.lineTo(cx + 95, cy - 35);
      c.lineTo(cx + 5, cy - 35);
      c.closePath();
      c.fill();
      break;
    }
    case "medal": {
      c.beginPath();
      c.arc(cx, cy + 35, 120, 0, Math.PI * 2);
      c.fill();
      c.beginPath(); // ribbon
      c.moveTo(cx - 75, cy - 60);
      c.lineTo(cx - 110, cy - 180);
      c.lineTo(cx - 25, cy - 120);
      c.lineTo(cx + 25, cy - 120);
      c.lineTo(cx + 110, cy - 180);
      c.lineTo(cx + 75, cy - 60);
      c.closePath();
      c.fillStyle = color;
      c.globalAlpha = 0.75;
      c.fill();
      c.globalAlpha = 1;
      break;
    }
    case "book": {
      c.lineWidth = 24;
      c.strokeRect(cx - 140, cy - 140, 280, 280);
      c.beginPath();
      c.moveTo(cx, cy - 140);
      c.lineTo(cx, cy + 140);
      c.stroke();
      c.beginPath();
      c.moveTo(cx - 100, cy - 60);
      c.lineTo(cx - 30, cy - 60);
      c.moveTo(cx - 100, cy + 20);
      c.lineTo(cx - 30, cy + 20);
      c.moveTo(cx + 30, cy - 60);
      c.lineTo(cx + 100, cy - 60);
      c.moveTo(cx + 30, cy + 20);
      c.lineTo(cx + 100, cy + 20);
      c.stroke();
      break;
    }
  }
  c.restore();
}

/** Render one badge to a 1024×1024 canvas (1:1). */
export function renderBadgeCanvas(status: BadgeStatus, ownerName: string): HTMLCanvasElement {
  const size = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const c = canvas.getContext("2d")!;
  const { badge } = status;
  const color = status.earned ? badge.color : "#3d3830";

  // Background
  const bg = c.createRadialGradient(512, 420, 80, 512, 512, 760);
  bg.addColorStop(0, status.earned ? "#14171c" : "#0d0e10");
  bg.addColorStop(1, "#060708");
  c.fillStyle = bg;
  c.fillRect(0, 0, size, size);

  // Outer frame (1:1 card edge)
  c.strokeStyle = status.earned ? `${color}` : "#2a2520";
  c.lineWidth = 10;
  roundRect(c, 28, 28, size - 56, size - 56, 56);
  c.stroke();
  c.lineWidth = 3;
  c.globalAlpha = status.earned ? 0.5 : 0.3;
  roundRect(c, 54, 54, size - 108, size - 108, 40);
  c.stroke();
  c.globalAlpha = 1;

  // Ring behind glyph
  c.beginPath();
  c.arc(512, 460, 240, 0, Math.PI * 2);
  c.fillStyle = status.earned ? `${color}1a` : "#14151814";
  c.fill();
  c.strokeStyle = status.earned ? `${color}66` : "#2a2520";
  c.lineWidth = 6;
  c.stroke();

  drawGlyph(badge.glyph, color, c);

  // Name
  c.textAlign = "center";
  c.textBaseline = "alphabetic";
  c.fillStyle = status.earned ? "#e8dfc8" : "#6b6358";
  c.font = "700 64px Inter, sans-serif";
  c.fillText(fitText(c, badge.name, 880), 512, 810);

  // Description
  c.fillStyle = status.earned ? "#9a9182" : "#3d3830";
  c.font = "400 34px Inter, sans-serif";
  c.fillText(fitText(c, badge.description, 880), 512, 872);

  // Footer: owner · date (or how to earn)
  c.fillStyle = status.earned ? color : "#3d3830";
  c.font = "500 30px 'JetBrains Mono', monospace";
  const footer = status.earned && status.earnedAt
    ? `${ownerName || "CareerVerse"} · ${new Date(status.earnedAt).toLocaleDateString()}`
    : badge.how;
  c.fillText(fitText(c, footer, 880), 512, 946);

  if (!status.earned) {
    // LOCKED watermark
    c.save();
    c.translate(512, 460);
    c.rotate(-Math.PI / 8);
    c.fillStyle = "rgba(107, 99, 88, 0.35)";
    c.font = "800 92px Inter, sans-serif";
    c.textAlign = "center";
    c.fillText("LOCKED", 0, 30);
    c.restore();
  }
  return canvas;
}

function roundRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

function fitText(c: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (c.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 4 && c.measureText(`${t}…`).width > maxWidth) t = t.slice(0, -1);
  return `${t}…`;
}

/** Download a single badge as a 1024×1024 PNG. */
export function downloadBadge(status: BadgeStatus, ownerName: string): void {
  const canvas = renderBadgeCanvas(status, ownerName);
  const url = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = url;
  a.download = `careerverse-badge-${status.badge.id}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
