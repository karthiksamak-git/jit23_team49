/* ═══════════════════════════════════════════
   ACTIVITY LOG (real data, no fabrication)
   • event log  — XP gains, missions, check-ins,
     accepted code submissions (timestamped)
   • time track — seconds the app is actually
     visible, ticked every 30s and flushed on
     hide/unload, capped at 24h/day
   • check-ins  — one per calendar day, stored
     under keys signOut() never clears, so the
     record survives logout/login
   All storage is localStorage and SSR-safe.
   ═══════════════════════════════════════════ */

export type ActivityType = "xp" | "mission" | "checkin" | "code_solve";

export interface ActivityEvent {
  type: ActivityType;
  at: number; // epoch ms
  amount?: number;
  source?: string;
}

const EVENTS_KEY = "cv_activity_events";
const TIME_KEY = "cv_activity_time"; // { "YYYY-MM-DD": seconds }
const CHECKINS_KEY = "cv_checkins"; // ["YYYY-MM-DD", ...]
const MAX_EVENTS = 3000;

/** Local calendar day key (NOT UTC — a check-in at 1am must count for today). */
export function dayKey(d: Date | number = new Date()): string {
  const date = typeof d === "number" ? new Date(d) : d;
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${m}-${day}`;
}

export function daysAgoKey(n: number): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return dayKey(d);
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full — stats degrade gracefully */
  }
}

/* ── Event log ── */

export function getEvents(): ActivityEvent[] {
  const events = readJson<ActivityEvent[]>(EVENTS_KEY, []);
  return Array.isArray(events) ? events : [];
}

export function logEvent(type: ActivityType, extra?: { amount?: number; source?: string }) {
  if (typeof window === "undefined") return;
  const events = getEvents();
  events.push({ type, at: Date.now(), ...extra });
  writeJson(EVENTS_KEY, events.slice(-MAX_EVENTS));
}

/* ── Time tracking (real visible-app seconds) ── */

function readTimeMap(): Record<string, number> {
  return readJson<Record<string, number>>(TIME_KEY, {});
}

function addSecondsToday(seconds: number) {
  if (seconds <= 0) return;
  const map = readTimeMap();
  const key = dayKey();
  const next = Math.min(24 * 3600, (map[key] || 0) + Math.round(seconds));
  map[key] = next;
  writeJson(TIME_KEY, map);
}

let trackerTimer: ReturnType<typeof setInterval> | null = null;
let lastTick = 0;

function tick() {
  const now = Date.now();
  const elapsed = (now - lastTick) / 1000;
  lastTick = now;
  if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
  // ignore absurd gaps (laptop sleep): at most 2 minutes per tick
  addSecondsToday(Math.min(elapsed, 120));
}

/** Start measuring real study time. Returns a cleanup function; safe to call twice. */
export function startTimeTracking(): () => void {
  if (typeof window === "undefined") return () => {};
  if (trackerTimer) clearInterval(trackerTimer);
  lastTick = Date.now();

  const flush = () => {
    if (document.visibilityState === "hidden") tick();
  };

  trackerTimer = setInterval(tick, 30_000);
  document.addEventListener("visibilitychange", flush);
  window.addEventListener("pagehide", flush);

  return () => {
    tick();
    if (trackerTimer) clearInterval(trackerTimer);
    trackerTimer = null;
    document.removeEventListener("visibilitychange", flush);
    window.removeEventListener("pagehide", flush);
  };
}

export function getSecondsOn(dateKey: string): number {
  const map = readTimeMap();
  return Math.max(0, map[dateKey] || 0);
}

export function getTotalSeconds(): number {
  const map = readTimeMap();
  return Object.values(map).reduce((sum, s) => sum + (Math.max(0, s) || 0), 0);
}

/* ── Daily check-in (once per calendar day, survives logout) ── */

export function getCheckins(): string[] {
  const list = readJson<string[]>(CHECKINS_KEY, []);
  return Array.isArray(list) ? list.filter((d) => typeof d === "string") : [];
}

export function hasCheckedInToday(): boolean {
  return getCheckins().includes(dayKey());
}

export function checkInToday(): { ok: boolean; already: boolean; date: string } {
  const date = dayKey();
  const list = getCheckins();
  if (list.includes(date)) return { ok: true, already: true, date };
  list.push(date);
  writeJson(CHECKINS_KEY, list);
  logEvent("checkin");
  return { ok: true, already: false, date };
}

/* ── Derived stats ── */

/** Days with any real evidence of learning: tracked time, an event, or a check-in. */
export function getActiveDays(): Set<string> {
  const days = new Set<string>();
  for (const e of getEvents()) days.add(dayKey(e.at));
  for (const d of getCheckins()) days.add(d);
  const map = readTimeMap();
  for (const [d, s] of Object.entries(map)) if ((s || 0) >= 60) days.add(d);
  return days;
}

/** Consecutive active days ending today (or yesterday, if today hasn't happened yet). */
export function getStreak(): { current: number; longest: number } {
  const days = getActiveDays();
  if (days.size === 0) return { current: 0, longest: 0 };

  // current: walk back from today; a brand-new user with no activity today
  // still shows yesterday's run instead of a misleading 0/1.
  let current = 0;
  const cursor = new Date();
  cursor.setHours(12, 0, 0, 0);
  if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (days.has(dayKey(cursor))) {
    current++;
    cursor.setDate(cursor.getDate() - 1);
  }

  // longest: sort every active day and find the biggest run
  const sorted = [...days].sort();
  let longest = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1] + "T12:00:00");
    const cur = new Date(sorted[i] + "T12:00:00");
    const gap = Math.round((cur.getTime() - prev.getTime()) / 86_400_000);
    run = gap === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
  }
  if (current > 0) longest = Math.max(longest, current);
  return { current, longest };
}

export interface DayActivity {
  date: string;
  minutes: number;
  xp: number;
  checkin: boolean;
}

/** Per-day aggregates for the last `days` calendar days (oldest → newest). */
export function getDailyActivity(days = 14): DayActivity[] {
  const out: DayActivity[] = [];
  const events = getEvents();
  const checkins = new Set(getCheckins());
  for (let i = days - 1; i >= 0; i--) {
    const date = daysAgoKey(i);
    const xp = events
      .filter((e) => e.type === "xp" && dayKey(e.at) === date)
      .reduce((sum, e) => sum + (e.amount || 0), 0);
    out.push({
      date,
      minutes: Math.round(getSecondsOn(date) / 60),
      xp,
      checkin: checkins.has(date),
    });
  }
  return out;
}

export function countEvents(type: ActivityType): number {
  return getEvents().filter((e) => e.type === type).length;
}
