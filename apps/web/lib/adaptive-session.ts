/* ═══════════════════════════════════════════
   ADAPTIVE SESSION ENGINE
   Two-layer question selection model:
   Layer A — Adaptive Difficulty: predicts P(correct)
             and picks questions in the 60–80% "productive zone".
   Layer B — Spaced Repetition: per-topic memory strength
             with half-life decay; weak topics re-queued.
   Plus end-of-lesson "Fix Your Mistakes" re-practice queue.
   ═══════════════════════════════════════════ */

import type { DojoChallenge } from "./ai-dojo";

/* ── Storage keys ── */
const TOPIC_KEY = "cv_topic_memory";
const SESSION_KEY = "cv_session_state";

/* ════════════════ Layer B: Topic memory (spaced repetition) ════════════════ */

export interface TopicMemory {
  topic: string;
  strength: number; // 0–100
  lastSeen: number; // epoch ms
  correct: number;
  incorrect: number;
  reviewCount: number; // successful recalls — drives spacing growth
  nextDue: number; // epoch ms
}

// Spacing ladder in days: each successful recall pushes the next review further out
const SPACING_DAYS = [1, 3, 7, 14, 30];
const HALF_LIFE_DAYS = 7; // strength decays to half in ~1 week
const REVIEW_THRESHOLD = 55; // below this, topic is re-queued for review

function loadTopicMemory(): Record<string, TopicMemory> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(TOPIC_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveTopicMemory(mem: Record<string, TopicMemory>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOPIC_KEY, JSON.stringify(mem));
}

function topicKey(conceptKey: string) {
  return conceptKey || "general";
}

/** Decay strength by half-life since last seen. */
function decayed(mem: TopicMemory): number {
  const daysSince = (Date.now() - mem.lastSeen) / 86_400_000;
  return mem.strength * Math.pow(0.5, daysSince / HALF_LIFE_DAYS);
}

export function getTopicMemory(conceptKey: string): TopicMemory {
  const all = loadTopicMemory();
  const key = topicKey(conceptKey);
  const existing = all[key];
  if (existing) {
    // Return with decay applied lazily (persisted on next update)
    return { ...existing, strength: decayed(existing) };
  }
  return {
    topic: key,
    strength: 50,
    lastSeen: Date.now(),
    correct: 0,
    incorrect: 0,
    reviewCount: 0,
    nextDue: 0,
  };
}

export function recordAnswer(conceptKey: string, correct: boolean, responseMs: number) {
  const all = loadTopicMemory();
  const key = topicKey(conceptKey);
  const prev = all[key]
    ? { ...all[key], strength: decayed(all[key]) }
    : { topic: key, strength: 50, lastSeen: Date.now(), correct: 0, incorrect: 0, reviewCount: 0, nextDue: 0 };

  // Fast correct answers reinforce memory more (recency + speed bonus)
  const speedBonus = correct ? Math.max(0, Math.min(8, 8000 / Math.max(responseMs, 500))) : 0;
  const delta = correct ? 12 + speedBonus : -18;
  const strength = Math.max(0, Math.min(100, prev.strength + delta));

  let reviewCount = prev.reviewCount;
  let nextDue = prev.nextDue;
  if (correct) {
    reviewCount += 1;
    const days = SPACING_DAYS[Math.min(reviewCount - 1, SPACING_DAYS.length - 1)];
    nextDue = Date.now() + days * 86_400_000;
  } else {
    // Missed a recall → short gap re-review (tomorrow)
    reviewCount = Math.max(0, reviewCount - 1);
    nextDue = Date.now() + 1 * 86_400_000;
  }

  all[key] = {
    topic: key,
    strength,
    lastSeen: Date.now(),
    correct: prev.correct + (correct ? 1 : 0),
    incorrect: prev.incorrect + (correct ? 0 : 1),
    reviewCount,
    nextDue,
  };
  saveTopicMemory(all);
}

/** Topics whose strength dropped below threshold — re-surface in later sessions. */
export function getWeakTopics(limit = 3): string[] {
  const all = loadTopicMemory();
  return Object.values(all)
    .filter((m) => m.strength < REVIEW_THRESHOLD || m.nextDue <= Date.now())
    .sort((a, b) => a.strength - b.strength)
    .slice(0, limit)
    .map((m) => m.topic);
}

/* ════════════════ Layer A: Adaptive difficulty (productive zone) ════════════════ */

const ZONE_MIN = 0.6; // don't go easier than 60% predicted success
const ZONE_MAX = 0.8; // don't go harder than 80% predicted success

export interface SessionState {
  proficiency: number; // 1–10 ability estimate
  recentResults: boolean[]; // last answers, most recent last
  recentResponseTimes: number[];
}

const DEFAULT_SESSION: SessionState = { proficiency: 4, recentResults: [], recentResponseTimes: [] };

function loadSessionState(): SessionState {
  if (typeof window === "undefined") return DEFAULT_SESSION;
  try {
    return { ...DEFAULT_SESSION, ...JSON.parse(localStorage.getItem(SESSION_KEY) || "{}") };
  } catch {
    return DEFAULT_SESSION;
  }
}

function saveSessionState(s: SessionState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SESSION_KEY, JSON.stringify(s));
}

export function getSessionState(): SessionState {
  return loadSessionState();
}

/**
 * Predicted probability the learner answers a question of the given
 * numeric difficulty correctly, given current proficiency (Rasch-style 1PL).
 */
function predictCorrect(proficiency: number, difficulty1to10: number): number {
  return 1 / (1 + Math.exp(1.1 * (difficulty1to10 - proficiency)));
}

/** Numeric difficulty from the AI's label (Easier→harder scale 1–10). */
export function difficultyToNumber(d: DojoChallenge["difficulty"]): number {
  switch (d) {
    case "Easier": return 2;
    case "Standard": return 4;
    case "Challenging": return 6.5;
    case "Expert": return 9;
    default: return 4;
  }
}

/** Update proficiency after each answer (simple Elo-style delta). */
export function updateProficiency(correct: boolean, responseMs: number): number {
  const s = loadSessionState();
  const predicted = predictCorrect(s.proficiency, difficultyToNumber("Standard"));
  const surprise = (correct ? 1 : 0) - predicted;
  // Fast correct answers move the estimate more; slow ones count less
  const speedFactor = correct
    ? responseMs < 10_000 ? 1.2 : 0.8
    : responseMs > 25_000 ? 0.8 : 1.0;
  s.proficiency = Math.max(1, Math.min(10, s.proficiency + surprise * 1.4 * speedFactor));
  s.recentResults = [...s.recentResults, correct].slice(-10);
  s.recentResponseTimes = [...s.recentResponseTimes, responseMs].slice(-10);
  saveSessionState(s);
  return s.proficiency;
}

/** True if picking a question of this difficulty lands in the 60–80% zone. */
export function isInProductiveZone(difficulty: DojoChallenge["difficulty"]): boolean {
  const s = loadSessionState();
  const p = predictCorrect(s.proficiency, difficultyToNumber(difficulty));
  return p >= ZONE_MIN && p <= ZONE_MAX;
}

/**
 * Pick the best next question from a pool:
 * 1. Prefer topics that are weak / due for review (Layer B).
 * 2. Among the rest, prefer the question whose predicted P(correct)
 *    sits closest to the middle of the productive zone (Layer A).
 */
export function pickNextChallenge(pool: DojoChallenge[], usedIds: Set<number>): DojoChallenge | null {
  const remaining = pool.filter((q) => !usedIds.has(q.id));
  if (remaining.length === 0) return null;

  const s = loadSessionState();
  const weak = new Set(getWeakTopics(5));

  let best: DojoChallenge | null = null;
  let bestScore = -Infinity;

  for (const q of remaining) {
    const p = predictCorrect(s.proficiency, difficultyToNumber(q.difficulty));
    // Distance from the ideal mid-zone (~70% success)
    let score = -Math.abs(p - 0.7) * 10;

    // Boost questions on weak / due topics
    if (weak.has(q.conceptKey)) score += 3;
    // Type variety: alternate formats keeps engagement high
    if (s.recentResults.length && usedIds.size % 2 === 1 && q.type !== "multiple-choice") score += 0.5;

    if (score > bestScore) {
      bestScore = score;
      best = q;
    }
  }
  return best;
}

/* ════════════════ End-of-lesson: "Fix Your Mistakes" ════════════════ */

export interface SessionMistake {
  challenge: DojoChallenge;
  userAnswer: number;
  retried: boolean; // presented in the end-of-lesson section already
}

export interface SessionRecord {
  lessonKey: string; // missionId
  mistakes: SessionMistake[];
  startedAt: number;
}

function loadSessionRecord(): SessionRecord {
  if (typeof window === "undefined") return { lessonKey: "", mistakes: [], startedAt: Date.now() };
  try {
    const raw = localStorage.getItem("cv_session_record");
    if (raw) return JSON.parse(raw);
    return { lessonKey: "", mistakes: [], startedAt: Date.now() };
  } catch {
    return { lessonKey: "", mistakes: [], startedAt: Date.now() };
  }
}

function saveSessionRecord(r: SessionRecord) {
  if (typeof window === "undefined") return;
  localStorage.setItem("cv_session_record", JSON.stringify(r));
}

export function startSession(lessonKey: string) {
  saveSessionRecord({ lessonKey, mistakes: [], startedAt: Date.now() });
}

/** Queue a missed question for the end-of-lesson re-practice section. */
export function queueMistake(challenge: DojoChallenge, userAnswer: number) {
  const r = loadSessionRecord();
  // Avoid duplicate queueing of the same question
  if (!r.mistakes.some((m) => m.challenge.id === challenge.id)) {
    r.mistakes.push({ challenge, userAnswer, retried: false });
  }
  saveSessionRecord(r);
}

export function getMistakes(): SessionMistake[] {
  return loadSessionRecord().mistakes;
}

/** Mark a mistake as resolved (answered correctly in re-practice). */
export function resolveMistake(challengeId: number) {
  const r = loadSessionRecord();
  r.mistakes = r.mistakes.filter((m) => m.challenge.id !== challengeId);
  saveSessionRecord(r);
}

/**
 * Mistakes that failed AGAIN in the re-practice section stay flagged
 * for future sessions (long-term spaced-repetition queue). Weaker
 * strength values from recordAnswer() already re-surface them via
 * getWeakTopics() — this marks them so the UI can say "we'll review
 * this again soon".
 */
export function flagForFutureReview(challengeId: number) {
  const r = loadSessionRecord();
  const m = r.mistakes.find((x) => x.challenge.id === challengeId);
  if (m) {
    m.retried = true;
    saveSessionRecord(r);
  }
}

/** Format helper for UI badges. */
export function nextReviewLabel(conceptKey: string): string {
  const mem = loadTopicMemory()[topicKey(conceptKey)];
  if (!mem) return "new topic";
  const days = Math.max(0, Math.ceil((mem.nextDue - Date.now()) / 86_400_000));
  if (mem.strength < REVIEW_THRESHOLD) return "queued for review";
  return days === 0 ? "due today" : `review in ${days}d`;
}
