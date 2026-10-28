/* ═══════════════════════════════════════════
   USER REPORT — downloadable learning report (PDF)
   Builds a real, multi-page PDF document with:
   • the CareerVerse project tag & branding
   • every user detail (identity, path, stats)
   • statistical tables + graphical charts
     (vector bar charts + activity heatmap)
   • badges, check-ins and the exact date & time
     the file was generated
   Data is only what real activity produced.
   Rendered with pdf-lib (vector text, prints
   and opens in any PDF reader).
   ═══════════════════════════════════════════ */

import type { PDFDocument, PDFFont, PDFPage } from "pdf-lib";
import { BadgeStatus } from "./badges";
import {
  getStreak,
  getCheckins,
  getTotalSeconds,
  getActiveDays,
  getDailyActivity,
  getSecondsOn,
  countEvents,
} from "./activity";

export interface ReportPlayer {
  characterName: string;
  email: string;
  level: number;
  xp: number;
  xpToNext: number;
  coins: number;
  realmName: string;
  recommendedDomain: string;
  capacityLevel: string;
  capacityScore: number;
  difficultyLevel: string;
  interests: string[];
  strengths: string[];
  suggestedTopics: string[];
  completedMissions: string[];
  onboardingComplete: boolean;
}

/* ── palette (light, print-friendly, gold-branded) ── */
const PAPER = "#ffffff";
const INK = "#221f19";
const MUTED = "#79715f";
const FAINT = "#a9a08d";
const GOLD = "#8a7343";
const GOLD_DEEP = "#b49b64";
const GOLD_SOFT = "#f2ecdd";
const RULE = "#e5e0d2";
const CARD = "#faf8f2";
const CARD_BORDER = "#e7e1d3";
const TEAL = "#0e7490";
const TEAL_HI = "#22d3ee";
const VIOLET = "#7c3aed";
const VIOLET_HI = "#a78bfa";
const GREEN = "#0f9d6e";
const AMBER = "#d97706";
const HEAT = ["#eceae2", "#0e7490", "#06b6d4", "#22d3ee"];

const PW = 595.28; // A4 width (pt)
const PH = 841.89; // A4 height (pt)
const M = 46; // page margin

/* WinAnsi-safe text: pdf-lib's standard fonts can only encode Latin-1. */
function latin(s: unknown): string {
  return String(s ?? "")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014\u2212]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\u2022|\u25CF/g, "-")
    .replace(/\u00A0/g, " ")
    .replace(/[^\u0020-\u007E\u00A1-\u00FF]/g, "?");
}

function fmtHours(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h === 0) return `${m} min`;
  return `${h}h ${m}m`;
}

function dayLabel(dateKey: string): string {
  const d = new Date(dateKey + "T12:00:00");
  return `${d.getDate()} ${d.toLocaleString("en", { month: "short" })}`;
}

function dateKeyOf(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/* ═══════════════════════════════════════════
   PDF builder
   ═══════════════════════════════════════════ */

class Report {
  private lib: typeof import("pdf-lib");
  private doc!: PDFDocument;
  private page!: PDFPage;
  private helv!: PDFFont;
  private bold!: PDFFont;
  private ital!: PDFFont;
  private y = PH - M; // top of the free area on the current page
  private pageStamps: string[] = [];

  constructor(lib: typeof import("pdf-lib")) {
    this.lib = lib;
  }

  private rgb(hex: string) {
    const h = hex.replace("#", "");
    const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
    const n = parseInt(full, 16);
    return this.lib.rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
  }

  private newPage() {
    this.page = this.doc.addPage([PW, PH]);
    this.page.drawRectangle({ x: 0, y: 0, width: PW, height: PH, color: this.rgb(PAPER) });
    this.y = PH - M;
    this.pageStamps.push(latin(this.pageStamp));
  }

  private pageStamp = "";

  /* never let content collide with the footer */
  private ensure(h: number) {
    if (this.y - h < M + 34) this.newPage();
  }

  private w(text: string, size: number, font: PDFFont): number {
    return font.widthOfTextAtSize(latin(text), size);
  }

  private draw(
    text: string,
    x: number,
    baseline: number,
    opts: { size?: number; font?: PDFFont; color?: string; tracking?: number; align?: "left" | "right" } = {}
  ) {
    const size = opts.size ?? 9;
    const font = opts.font ?? this.helv;
    const color = this.rgb(opts.color ?? INK);
    const s = latin(text);
    let sx = x;
    if (opts.align === "right") sx = x - this.w(s, size, font);
    if ((opts.tracking ?? 0) > 0) {
      const tr = opts.tracking as number;
      let cx = sx;
      for (const ch of s) {
        this.page.drawText(ch, { x: cx, y: baseline, size, font, color });
        cx += font.widthOfTextAtSize(ch, size) + tr;
      }
    } else {
      this.page.drawText(s, { x: sx, y: baseline, size, font, color });
    }
  }

  private wrap(text: string, maxW: number, size: number, font: PDFFont): string[] {
    const words = latin(text).split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let cur = "";
    for (const word of words) {
      const test = cur ? `${cur} ${word}` : word;
      if (this.w(test, size, font) <= maxW) {
        cur = test;
        continue;
      }
      if (cur) {
        lines.push(cur);
        cur = "";
      }
      if (this.w(word, size, font) <= maxW) {
        cur = word;
        continue;
      }
      let chunk = "";
      for (const ch of word) {
        if (chunk && this.w(chunk + ch, size, font) > maxW) {
          lines.push(chunk);
          chunk = ch;
        } else {
          chunk += ch;
        }
      }
      cur = chunk;
    }
    if (cur) lines.push(cur);
    return lines.length ? lines : [""];
  }

  /* paragraph: wraps to width, advances the cursor */
  private para(
    text: string,
    opts: { x?: number; width?: number; size?: number; font?: PDFFont; color?: string; leading?: number; gap?: number }
  ) {
    const size = opts.size ?? 9;
    const font = opts.font ?? this.helv;
    const x = opts.x ?? M;
    const width = opts.width ?? PW - 2 * M;
    const leading = opts.leading ?? size * 1.45;
    const lines = this.wrap(text, width, size, font);
    this.ensure(lines.length * leading + 4);
    let base = this.y - size;
    for (const ln of lines) {
      this.draw(ln, x, base, { size, font, color: opts.color });
      base -= leading;
    }
    this.y -= lines.length * leading + (opts.gap ?? 0);
  }

  /* gold, letter-spaced section heading with a rule under it */
  private section(title: string) {
    this.ensure(76);
    this.y -= 24;
    this.draw(title.toUpperCase(), M, this.y - 9.5, {
      size: 9.5,
      font: this.bold,
      color: GOLD,
      tracking: 1.7,
    });
    this.y -= 5;
    this.page.drawLine({
      start: { x: M, y: this.y },
      end: { x: PW - M, y: this.y },
      thickness: 0.9,
      color: this.rgb(GOLD_DEEP),
    });
    this.y -= 13;
  }

  /* key / value row with a hairline separator */
  private row(key: string, value: string, opts: { keyW?: number; valueColor?: string; font?: PDFFont } = {}) {
    const keyW = opts.keyW ?? 148;
    const size = 9.2;
    const font = opts.font ?? this.helv;
    const lines = this.wrap(value, PW - 2 * M - keyW, size, font);
    const leading = 12.4;
    const h = Math.max(lines.length * leading, 12.4) + 9;
    this.ensure(h);
    const top = this.y;
    this.draw(key, M, top - 9.2, { size: 8.6, font: this.helv, color: MUTED });
    let base = top - 9.4;
    for (const ln of lines) {
      this.draw(ln, M + keyW, base, { size, font, color: opts.valueColor ?? INK });
      base -= leading;
    }
    this.y = top - h;
    this.page.drawLine({
      start: { x: M, y: this.y },
      end: { x: PW - M, y: this.y },
      thickness: 0.5,
      color: this.rgb(RULE),
    });
  }

  /* boxed card: draws the background, then lets `inner` draw inside it */
  private card(height: number, inner: (top: number) => void, fill = CARD) {
    this.ensure(height + 8);
    const top = this.y - 4;
    this.page.drawRectangle({
      x: M,
      y: top - height,
      width: PW - 2 * M,
      height,
      color: this.rgb(fill),
      borderColor: this.rgb(CARD_BORDER),
      borderWidth: 0.8,
    });
    inner(top);
    this.y = top - height - 12;
  }

  /* ── brand header ── */
  private header(player: ReportPlayer, generatedAt: Date) {
    const top = this.y;
    this.page.drawRectangle({
      x: M,
      y: top - 42,
      width: 42,
      height: 42,
      color: this.rgb(GOLD_DEEP),
      borderColor: this.rgb(GOLD),
      borderWidth: 1,
    });
    const mono = "CV";
    const monoW = this.w(mono, 15, this.bold);
    this.draw(mono, M + (42 - monoW) / 2, top - 27, { size: 15, font: this.bold, color: "#1b1608" });

    const tx = M + 54;
    this.draw("CAREERVERSE", tx, top - 19, { size: 18, font: this.bold, color: INK, tracking: 2.4 });
    this.draw("PROJECT TAG · CAREERVERSE LEARNING PLATFORM · careerverse.report", tx, top - 33, {
      size: 7.2,
      font: this.helv,
      color: MUTED,
      tracking: 0.5,
    });

    /* foil chip */
    const chipText = "OFFICIAL LEARNING REPORT";
    const chipSize = 7.2;
    const chipW = this.w(chipText, chipSize, this.bold) + 2.6 * chipText.length + 20;
    const chipX = PW - M - chipW;
    this.page.drawRectangle({
      x: chipX,
      y: top - 30,
      width: chipW,
      height: 17,
      color: this.rgb("#1c1a14"),
      borderColor: this.rgb(GOLD_DEEP),
      borderWidth: 0.8,
    });
    this.draw(chipText, chipX + 10, top - 24, {
      size: chipSize,
      font: this.bold,
      color: GOLD_DEEP,
      tracking: 1.3,
    });

    this.y = top - 42;
    this.page.drawLine({
      start: { x: M, y: this.y },
      end: { x: PW - M, y: this.y },
      thickness: 1.4,
      color: this.rgb(GOLD),
    });
    this.y -= 20;

    this.draw(
      `Generated: ${generatedAt.toLocaleDateString()} at ${generatedAt.toLocaleTimeString()} (${Intl.DateTimeFormat().resolvedOptions().timeZone})`,
      PW - M,
      this.y - 8,
      { size: 8, font: this.helv, color: MUTED, align: "right" }
    );
    this.y -= 18;
    this.draw(`Learning report for ${player.characterName}`, M, this.y - 8, {
      size: 8,
      font: this.ital,
      color: FAINT,
    });
    this.y -= 6;
  }

  /* ── grouped bar chart (x = left edge; pass an offset for the right half) ── */
  private chart(
    title: string,
    points: { label: string; value: number }[],
    colorA: string,
    colorB: string,
    unit: string,
    x = M,
    reserve = true
  ) {
    const boxW = (PW - 2 * M - 14) / 2;
    const boxH = 154;
    if (reserve) this.ensure(boxH + 8);
    const top = this.y - 4;
    this.page.drawRectangle({
      x,
      y: top - boxH,
      width: boxW,
      height: boxH,
      color: this.rgb(CARD),
      borderColor: this.rgb(CARD_BORDER),
      borderWidth: 0.8,
    });
    this.draw(title.toUpperCase(), x + 10, top - 15, { size: 7.6, font: this.bold, color: MUTED, tracking: 1 });

    const pad = { l: 30, r: 10, t: 26, b: 24 };
    const plotW = boxW - pad.l - pad.r;
    const plotH = boxH - pad.t - pad.b;
    const max = Math.max(1, ...points.map((p) => p.value));
    const niceMax = Math.ceil(max / 4) * 4 || 4;
    const originY = top - pad.t - plotH;

    for (let g = 0; g <= 4; g++) {
      const v = (niceMax / 4) * g;
      const gy = originY + (v / niceMax) * plotH;
      this.page.drawLine({
        start: { x: x + pad.l, y: gy },
        end: { x: x + boxW - pad.r, y: gy },
        thickness: g === 0 ? 0.7 : 0.4,
        color: this.rgb(g === 0 ? "#cfc8b6" : RULE),
      });
      this.draw(String(v), x + pad.l - 5, gy - 3, { size: 6, font: this.helv, color: FAINT, align: "right" });
    }

    const bw = plotW / points.length;
    points.forEach((p, i) => {
      const bh = (p.value / niceMax) * plotH;
      const bx = x + pad.l + i * bw + bw * 0.2;
      const bWidth = Math.max(2, bw * 0.6);
      this.page.drawRectangle({
        x: bx,
        y: originY,
        width: bWidth,
        height: Math.max(0.8, bh),
        color: this.rgb(p.value > 0 ? colorB : "#e0dcd0"),
      });
      this.page.drawRectangle({
        x: bx,
        y: originY + Math.max(0.8, bh) * 0.45,
        width: bWidth,
        height: Math.max(0.4, bh * 0.55),
        color: this.rgb(p.value > 0 ? colorA : "#d5d0c2"),
      });
    });    this.draw(points[0]?.label ?? "", x + pad.l, top - boxH + 9, { size: 6.4, font: this.helv, color: FAINT });
    this.draw(`max ${niceMax} ${unit}`, x + pad.l + plotW / 2, top - boxH + 9, {
      size: 6.4,
      font: this.helv,
      color: FAINT,
    });
    this.draw("today", x + boxW - pad.r, top - boxH + 9, {
      size: 6.4,
      font: this.helv,
      color: FAINT,
      align: "right",
    });
    this.y = top - boxH - 10;
  }

  /* ═══ document ═══ */
  async build(player: ReportPlayer, badges: BadgeStatus[]): Promise<Uint8Array> {
    this.doc = await this.lib.PDFDocument.create();
    this.doc.setTitle(`CareerVerse Learning Report — ${player.characterName}`);
    this.doc.setSubject("Official learning report generated by CareerVerse");
    this.doc.setCreator("CareerVerse · careerverse.report");
    this.doc.setProducer("CareerVerse report engine (pdf-lib)");
    this.helv = await this.doc.embedFont(this.lib.StandardFonts.Helvetica);
    this.bold = await this.doc.embedFont(this.lib.StandardFonts.HelveticaBold);
    this.ital = await this.doc.embedFont(this.lib.StandardFonts.HelveticaOblique);

    const generatedAt = new Date();
    this.pageStamp = `${generatedAt.toLocaleDateString()} ${generatedAt.toLocaleTimeString()}`;
    this.newPage();

    /* real data */
    const streak = getStreak();
    const checkins = getCheckins();
    const totalSeconds = getTotalSeconds();
    const activeDays = getActiveDays().size;
    const daily = getDailyActivity(14);
    const solved = countEvents("code_solve");
    const earned = badges.filter((b) => b.earned);
    const checkinSet = new Set(checkins);

    this.header(player, generatedAt);

    /* ── User details ── */
    this.section("User Details");
    this.row("Name", player.characterName);
    this.row("Email", player.email || "—");
    this.row("Level / XP", `Lv.${player.level} · ${player.xp.toLocaleString()} / ${player.xpToNext.toLocaleString()} XP`);
    this.row("Learning path", player.recommendedDomain || player.realmName || "Exploring");
    this.row("Capacity", `${player.capacityLevel} · ${player.capacityScore}/100`);
    this.row("Difficulty", player.difficultyLevel || "Beginner");
    this.row("Onboarding", player.onboardingComplete ? "Completed" : "Not completed");

    if (player.interests.length) {
      this.y -= 12;
      this.draw("INTERESTS", M, this.y - 8, { size: 7.6, font: this.bold, color: GOLD, tracking: 1.2 });
      this.y -= 14;
      let cx = M;
      let cy = this.y;
      const pillH = 15;
      for (const interest of player.interests) {
        const label = latin(interest);
        const w = this.w(label, 8, this.helv) + 18;
        if (cx + w > PW - M) {
          cx = M;
          cy -= pillH + 5;
        }
        this.ensure(pillH + 6);
        this.page.drawRectangle({
          x: cx,
          y: cy - pillH,
          width: w,
          height: pillH,
          color: this.rgb("#eaf7fa"),
          borderColor: this.rgb("#a9dbe6"),
          borderWidth: 0.7,
        });
        this.draw(label, cx + 9, cy - 10.5, { size: 8, font: this.helv, color: TEAL });
        cx += w + 6;
      }
      this.y = cy - pillH - 8;
    }

    if (player.strengths.length) {
      this.para(`Strengths: ${player.strengths.join(" · ")}`, {
        size: 8.6,
        font: this.ital,
        color: GREEN,
        gap: 3,
      });
    }
    if (player.suggestedTopics.length) {
      this.para(`Next topics: ${player.suggestedTopics.join(" · ")}`, {
        size: 8.6,
        font: this.ital,
        color: TEAL,
        gap: 3,
      });
    }

    /* ── Statistics ── */
    this.section("Statistics");
    const stats: [string, string][] = [
      ["Experience (XP)", player.xp.toLocaleString()],
      ["Level", String(player.level)],
      [
        "Current streak",
        `${streak.current} ${streak.current === 1 ? "day" : "days"} (best ${streak.longest})`,
      ],
      ["Time spent", `${fmtHours(totalSeconds)} of tracked study time`],
      ["Active days", String(activeDays)],
      ["Topics mastered", String(player.completedMissions.length)],
      ["Coins", player.coins.toLocaleString()],
      ["Check-ins", String(checkins.length)],
      ["Code accepted", `${solved} accepted submissions`],
      ["Badges", `${earned.length} of ${badges.length} earned`],
    ];
    for (const [k, v] of stats) this.row(k, v, { font: this.bold });

    /* ── Graphical data ── */
    this.section("Graphical Data · last 14 days");
    this.chart(
      "Minutes learned",
      daily.map((d) => ({ label: dayLabel(d.date), value: d.minutes })),
      TEAL_HI,
      TEAL,
      "min"
    );
    // second chart on the right half of the same band
    this.chart(
      "XP earned",
      daily.map((d) => ({ label: dayLabel(d.date), value: d.xp })),
      VIOLET_HI,
      VIOLET,
      "XP",
      M + (PW - 2 * M - 14) / 2 + 14,
      false
    );
    this.y -= 6;

    /* ── Activity calendar ── */
    this.section("Activity Calendar · last 12 weeks");
    const todayD = new Date();
    const startD = new Date(todayD);
    startD.setDate(startD.getDate() - 83);
    startD.setDate(startD.getDate() - startD.getDay()); // back up to Sunday
    const heatDates: string[] = [];
    const cur = new Date(startD);
    while (cur <= todayD) {
      heatDates.push(dateKeyOf(cur));
      cur.setDate(cur.getDate() + 1);
    }
    const cols = Math.ceil(heatDates.length / 7);
    const cell = 13;
    const step = 16;
    const gridW = cols * step;
    const gridH = 7 * step;

    this.card(gridH + 46, (top) => {
      const labelY = top - 18;
      ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].forEach((d, i) => {
        this.draw(d, M + 40, labelY - i * step + 4, { size: 6, font: this.helv, color: FAINT, align: "right" });
      });
      const gx = M + 46;
      const gy = top - 24;
      for (let col = 0; col < cols; col++) {
        for (let row = 0; row < 7; row++) {
          const i = col * 7 + row;
          if (i >= heatDates.length) break;
          const date = heatDates[i];
          const min = Math.round(getSecondsOn(date) / 60);
          const lvl = min >= 60 ? 3 : min >= 30 ? 2 : min >= 5 ? 1 : 0;
          const cx = gx + col * step;
          const cy = gy + row * step;
          this.page.drawRectangle({
            x: cx,
            y: cy,
            width: cell,
            height: cell,
            color: this.rgb(HEAT[lvl]),
            borderColor: this.rgb("#d8d3c4"),
            borderWidth: 0.4,
          });
          if (checkinSet.has(date)) {
            this.page.drawCircle({ x: cx + cell - 3, y: cy + cell - 3, size: 2.4, color: this.rgb(AMBER) });
          }
          if (date === dateKeyOf(todayD)) {
            this.page.drawRectangle({
              x: cx - 1.2,
              y: cy - 1.2,
              width: cell + 2.4,
              height: cell + 2.4,
              borderColor: this.rgb(GOLD),
              borderWidth: 1.1,
            });
          }
        }
      }
      /* legend */
      const ly = gy + gridH + 6;
      this.draw("Less", gx, ly, { size: 6.4, font: this.helv, color: FAINT });
      HEAT.forEach((c, i) => {
        this.page.drawRectangle({
          x: gx + 22 + i * 12,
          y: ly - 1,
          width: 9,
          height: 9,
          color: this.rgb(c),
          borderColor: this.rgb("#d8d3c4"),
          borderWidth: 0.4,
        });
      });
      this.draw("More", gx + 22 + HEAT.length * 12 + 4, ly, { size: 6.4, font: this.helv, color: FAINT });
      this.page.drawCircle({ x: gx + 92, y: ly + 3, size: 2.6, color: this.rgb(AMBER) });
      this.draw("= daily check-in", gx + 99, ly, { size: 6.4, font: this.helv, color: FAINT });
      this.page.drawRectangle({
        x: gx + 168,
        y: ly - 1,
        width: 9,
        height: 9,
        borderColor: this.rgb(GOLD),
        borderWidth: 1.1,
      });
      this.draw("= today", gx + 182, ly, { size: 6.4, font: this.helv, color: FAINT });
      void gridW;
    });
    this.para(
      `All values are real tracked time. Total tracked time: ${fmtHours(totalSeconds)} · gold dot = daily check-in · blue = 60+ minutes that day.`,
      { size: 8, font: this.ital, color: MUTED, gap: 4 }
    );

    /* ── Badges ── */
    this.section(`Badges (${earned.length}/${badges.length})`);
    this.draw("BADGE", M, this.y - 8, { size: 7, font: this.bold, color: FAINT, tracking: 1 });
    this.draw("STATUS", M + 210, this.y - 8, { size: 7, font: this.bold, color: FAINT, tracking: 1 });
    this.draw("EARNED ON / HOW", M + 280, this.y - 8, { size: 7, font: this.bold, color: FAINT, tracking: 1 });
    this.y -= 12;
    for (const b of badges) {
      const when = b.earned && b.earnedAt ? new Date(b.earnedAt).toLocaleString() : b.badge.how;
      const lines = this.wrap(when, PW - 2 * M - 280, 8.4, this.helv);
      const h = Math.max(lines.length * 11, 11) + 8;
      this.ensure(h);
      const top = this.y;
      this.draw(b.badge.name, M, top - 9, { size: 8.6, font: this.bold, color: INK });
      this.draw(b.earned ? "Earned" : "Locked", M + 210, top - 9, {
        size: 8.4,
        font: this.bold,
        color: b.earned ? GREEN : FAINT,
      });
      let base = top - 9;
      for (const ln of lines) {
        this.draw(ln, M + 280, base, { size: 8.4, font: this.helv, color: MUTED });
        base -= 11;
      }
      this.y = top - h;
      this.page.drawLine({
        start: { x: M, y: this.y },
        end: { x: PW - M, y: this.y },
        thickness: 0.5,
        color: this.rgb(RULE),
      });
    }

    /* ── Check-ins ── */
    this.section(`Daily Check-Ins (${checkins.length})`);
    if (checkins.length) {
      const sorted = checkins.slice().sort().reverse();
      this.para(sorted.map((d) => new Date(d + "T12:00:00").toLocaleDateString()).join("  ·  "), {
        size: 8.6,
        color: INK,
        gap: 6,
      });
    } else {
      this.para("No check-ins recorded yet.", { size: 8.6, color: MUTED, font: this.ital });
    }

    /* ── footers + page numbers ── */
    const pages = this.doc.getPages();
    const total = pages.length;
    pages.forEach((p, i) => {
      p.drawLine({
        start: { x: M, y: 42 },
        end: { x: PW - M, y: 42 },
        thickness: 0.6,
        color: this.rgb(RULE),
      });
      p.drawText("CareerVerse · Learning Report · project tag: careerverse.report", {
        x: M,
        y: 31,
        size: 7,
        font: this.helv,
        color: this.rgb(FAINT),
      });
      const stamp = `Generated ${this.pageStamps[i] || this.pageStamp} · all figures derived from recorded activity`;
      p.drawText(latin(stamp), {
        x: PW - M - this.w(stamp, 7, this.helv),
        y: 31,
        size: 7,
        font: this.helv,
        color: this.rgb(FAINT),
      });
      const pageNo = `Page ${i + 1} / ${total}`;
      p.drawText(pageNo, {
        x: (PW - this.w(pageNo, 7, this.bold)) / 2,
        y: 19,
        size: 7,
        font: this.bold,
        color: this.rgb(GOLD),
      });
    });

    return this.doc.save();
  }

}

/** Build the report PDF and return its bytes. */
export async function buildReportPdf(
  player: ReportPlayer,
  badges: BadgeStatus[]
): Promise<Uint8Array> {
  const lib = await import("pdf-lib");
  const report = new Report(lib);
  return report.build(player, badges);
}

/** Build the report and trigger a .pdf download in the browser. */
export async function downloadReport(
  player: ReportPlayer,
  badges: BadgeStatus[]
): Promise<void> {
  const bytes = await buildReportPdf(player, badges);
  const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  // local time, so the filename matches the timestamp printed inside the PDF
  const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}-${pad(now.getMinutes())}`;
  const a = document.createElement("a");
  a.href = url;
  a.download = `careerverse-report-${stamp}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
