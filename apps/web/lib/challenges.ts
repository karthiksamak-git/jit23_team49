/* ═══════════════════════════════════════════
   CHALLENGE ENGINE — mixed quiz + coding
   The Practice Lab's LeetCode-style trainer:
   • a curated bank of problems/quizzes (tagged
     by career track) + AI-generated challenges
     tuned to the student's domain and level,
     cached so repeat sessions stay stable
   • a real judge: every coding submission runs
     through the local Piston engine (browser for
     JavaScript) against sample + hidden tests
   • an AI "explain my mistake" pass that tells
     the student exactly what is wrong
   No answer is ever judged by string-guessing
   alone: code is executed, output is compared.
   ═══════════════════════════════════════════ */

import { chatWithGroq, ChatMessage } from "./ai-client";
import { logEvent } from "./activity";
import { repairChallenge, DojoChallenge } from "./ai-dojo";
import { matchRealmId } from "./realm-match";
import {
  CODE_LANGUAGES,
  CodeLanguage,
  runProgram,
  RunResult,
} from "./code-runner";

/* ── Types ── */

export type QuizKind =
  | "multiple-choice"
  | "true-false"
  | "scenario"
  | "code-fill"
  | "bug-hunt"
  | "pseudocode-order"
  | "ranking"
  | "typed-answer";

export type QuizDifficulty = "Easier" | "Standard" | "Challenging" | "Expert";
export type CodeDifficulty = "Easy" | "Medium" | "Hard";

export interface QuizChallenge {
  kind: "quiz";
  id: string;
  quizKind: QuizKind;
  difficulty: QuizDifficulty;
  /** Question text (may contain line breaks) */
  prompt: string;
  /** Snippet shown for code-fill / bug-hunt */
  code?: string;
  /** Lines to put in order (pseudocode-order / ranking) */
  lines?: string[];
  /** Correct order: indices into `lines` */
  order?: number[];
  /** Choices for option-based kinds */
  options?: string[];
  /** Index of the correct option */
  correct?: number;
  /** Accepted spellings for typed-answer */
  accepted?: string[];
  /** Canonical answer shown after checking */
  answer?: string;
  explanation: string;
  concept: string;
  tags: string[];
  source: "bank" | "ai";
}

export interface TestCase {
  stdin: string;
  expected: string;
  /** Hidden tests only run on Submit (LeetCode-style) */
  hidden?: boolean;
}

export interface CodingChallenge {
  kind: "coding";
  id: string;
  title: string;
  difficulty: CodeDifficulty;
  tags: string[];
  statement: string;
  inputFormat: string;
  outputFormat: string;
  constraints: string[];
  tests: TestCase[];
  concept: string;
  source: "bank" | "ai";
}

export type Challenge = QuizChallenge | CodingChallenge;

export type Verdict =
  | "Accepted"
  | "Wrong Answer"
  | "Compile Error"
  | "Runtime Error"
  | "Time Limit Exceeded"
  | "Runtime Missing"
  | "Engine Offline"
  | "Judge Error";

export interface TestResult {
  label: string;
  stdin: string;
  expected: string;
  actual: string;
  passed: boolean;
  error?: string;
  compileFailed?: boolean;
  killed?: boolean;
}

export const QUIZ_KIND_LABELS: Record<QuizKind, string> = {
  "multiple-choice": "Multiple Choice",
  "true-false": "True or False",
  scenario: "Scenario",
  "code-fill": "Code Fill",
  "bug-hunt": "Bug Hunt",
  "pseudocode-order": "Pseudocode Order",
  ranking: "Ranking",
  "typed-answer": "Type the Answer",
};

/** Every format the Arena must show — a session covers ALL of them. */
export const QUIZ_KINDS: QuizKind[] = [
  "multiple-choice",
  "true-false",
  "scenario",
  "code-fill",
  "bug-hunt",
  "pseudocode-order",
  "ranking",
  "typed-answer",
];

/* ═══════════════════════════════════════════
   THE STUDENT'S LEARNING PATH
   The Arena is scoped by the path the student
   is actually following on the world map
   (starred or AI-forged paths included), not
   by the onboarding pick alone — that stays
   as background/fallback.
   ═══════════════════════════════════════════ */

interface StoredRealm {
  id?: string;
  name?: string;
  subtitle?: string;
  narrativeIntro?: string;
  isAiGenerated?: boolean;
  favorite?: boolean;
  missions?: { title?: string; lore?: string }[];
}

export interface LearningPath {
  /** Path/realm name the session is built from. */
  label: string;
  /** Onboarding recommendation — background context only. */
  track: string;
  /** Mission titles of the path, in roadmap order. */
  topics: string[];
  /** One-line lore of the path, when it has one. */
  blurb: string;
  /** True when a saved world-map path drove the session. */
  fromGeneratedPath: boolean;
  /** Cache namespace — one AI batch per path. */
  key: string;
}

/**
 * Resolve what the student is following right now.
 * Order: starred path → AI-forged path → realm matching the onboarding
 * recommendation → first saved path → the onboarding track alone.
 */
export function resolveLearningPath(track = ""): LearningPath {
  let realms: StoredRealm[] = [];
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("cv_world_realms");
      const parsed = raw ? JSON.parse(raw) : null;
      if (Array.isArray(parsed)) {
        realms = parsed.filter((r) => r && typeof r === "object" && typeof r.name === "string" && r.name.trim());
      }
    } catch {
      /* corrupt payload → fall through to the track */
    }
  }

  const named = realms.map((r) => ({ id: String(r.id || r.name), name: String(r.name) }));
  const matchedId = matchRealmId(track, named);
  const realm =
    realms.find((r) => r.favorite) ||
    realms.find((r) => r.isAiGenerated) ||
    (matchedId ? realms.find((r) => String(r.id || r.name) === matchedId) : undefined) ||
    realms[0];

  const fallbackTrack = track.trim() || "Software Engineering Foundations";
  if (!realm) {
    return {
      label: fallbackTrack,
      track: fallbackTrack,
      topics: [],
      blurb: "",
      fromGeneratedPath: false,
      key: `track:${fallbackTrack.toLowerCase()}`,
    };
  }

  const label = String(realm.name).trim();
  const topics = (Array.isArray(realm.missions) ? realm.missions : [])
    .map((m) => String(m?.title || "").trim())
    .filter(Boolean)
    .slice(0, 10);

  return {
    label,
    track: track.trim() || label,
    topics,
    blurb: String(realm.narrativeIntro || realm.subtitle || "").trim(),
    fromGeneratedPath: true,
    key: `path:${String(realm.id || label).toLowerCase()}`,
  };
}

/** Everything the Arena may draw on: path label, its mission topics, the track. */
function pathKeywords(path: LearningPath): string {
  return [path.label, path.track, ...path.topics].join(" ");
}

/* ── Grading helpers ── */

/** Loose match for prose/short answers: case, spacing, trailing punctuation. */
export function normalizeTyped(s: string): string {
  return s
    .toLowerCase()
    .replace(/\r?\n/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.,;:!?"'`]+$/g, "");
}

/** Tight match for code-ish answers: ignore all whitespace. */
export function normalizeCode(s: string): string {
  return normalizeTyped(s).replace(/\s+/g, "");
}

/** Typed-answer grading: accepts any spelling listed in `accepted`. */
export function gradeTyped(item: QuizChallenge, given: string): boolean {
  const loose = normalizeTyped(given);
  const tight = normalizeCode(given);
  if (!loose && !tight) return false;
  return (item.accepted || []).some((a) => {
    if (!a) return false;
    return normalizeTyped(a) === loose || normalizeCode(a) === tight;
  });
}

/** Compare program output: trailing spaces per line and trailing newlines ignored. */
export function normalizeOutput(s: string): string {
  return s
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => l.replace(/[ \t]+$/, ""))
    .join("\n")
    .replace(/\n+$/, "");
}

/* ── Difficulty / domain filtering ── */

function quizDifficulty(raw: unknown): QuizDifficulty {
  const s = String(raw || "").toLowerCase();
  if (s.includes("easy")) return "Easier";
  if (s.includes("hard")) return "Challenging";
  if (s.includes("expert")) return "Expert";
  return "Standard";
}

function codeDifficulty(raw: unknown): CodeDifficulty {
  const s = String(raw || "").toLowerCase();
  if (s.includes("easy") || s.includes("beginner")) return "Easy";
  if (s.includes("hard") || s.includes("advanced")) return "Hard";
  return "Medium";
}

function matchesDomain(tags: string[], domain: string): boolean {
  if (tags.includes("core")) return true;
  const d = domain.toLowerCase();
  return tags.some((t) => d.includes(t));
}

function levelAllows(level: string, difficulty: string): boolean {
  if (/beginner|easy|starter/i.test(level)) {
    // Beginners skip the hardest material
    return difficulty !== "Expert" && difficulty !== "Hard";
  }
  return true;
}

/* ═══════════════════════════════════════════
   CURATED BANK — written for a student's track
   Coding problems read stdin / write stdout so
   the same judge works for every language.
   First test of each problem is the visible
   sample; the rest are hidden.
   ═══════════════════════════════════════════ */

let uid = 0;

function coding(c: Omit<CodingChallenge, "kind" | "source" | "id">): CodingChallenge {
  return { kind: "coding", source: "bank", id: `bank-${(uid++).toString(36)}-${c.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 24)}`, ...c };
}

function quiz(q: Omit<QuizChallenge, "kind" | "source" | "id">): QuizChallenge {
  return { kind: "quiz", source: "bank", id: `bank-${(uid++).toString(36)}-${q.quizKind}`, ...q };
}

export const CODING_BANK: CodingChallenge[] = [
  coding({
    title: "FizzBuzz Prime",
    difficulty: "Easy",
    tags: ["core"],
    concept: "conditionals",
    statement:
      "Print the numbers from 1 to N, one per line. For every multiple of 3 print Fizz instead of the number, for every multiple of 5 print Buzz, and for multiples of both print FizzBuzz.",
    inputFormat: "A single integer N.",
    outputFormat: "N lines — each the number, Fizz, Buzz or FizzBuzz.",
    constraints: ["1 ≤ N ≤ 1000"],
    tests: [
      { stdin: "5", expected: "1\n2\nFizz\n4\nBuzz" },
      {
        stdin: "15",
        expected:
          "1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz",
        hidden: true,
      },
      { stdin: "1", expected: "1", hidden: true },
    ],
  }),
  coding({
    title: "Word Counter",
    difficulty: "Easy",
    tags: ["core"],
    concept: "strings",
    statement:
      "Count how many words appear in the given line of text. Words are separated by one or more spaces, and the line may start or end with spaces.",
    inputFormat: "One line of text (0–1000 characters).",
    outputFormat: "A single integer — the number of words.",
    constraints: ["Text contains no tabs or newlines"],
    tests: [
      { stdin: "the quick brown fox jumps", expected: "5" },
      { stdin: "  career   verse  ", expected: "2", hidden: true },
      { stdin: "hello", expected: "1", hidden: true },
    ],
  }),
  coding({
    title: "Log Level Tally",
    difficulty: "Easy",
    tags: ["devops", "sre", "linux"],
    concept: "log parsing",
    statement:
      "You are given N log lines from a service. Each line starts with exactly one level token: INFO, WARN or ERROR. Count how many lines start with each level.",
    inputFormat: "First line N, then N log lines.",
    outputFormat: "One line in the form INFO=<n> WARN=<n> ERROR=<n>.",
    constraints: ["1 ≤ N ≤ 1000", "Every line starts with INFO, WARN or ERROR"],
    tests: [
      {
        stdin: "4\nINFO boot ok\nERROR disk full\nWARN slow request\nINFO retry ok",
        expected: "INFO=2 WARN=1 ERROR=1",
      },
      {
        stdin: "2\nWARN cache miss\nWARN disk almost full",
        expected: "INFO=0 WARN=2 ERROR=0",
        hidden: true,
      },
      { stdin: "1\nERROR panic", expected: "INFO=0 WARN=0 ERROR=1", hidden: true },
    ],
  }),
  coding({
    title: "CPU Threshold Alert",
    difficulty: "Easy",
    tags: ["devops", "sre"],
    concept: "monitoring",
    statement:
      "A monitoring probe reports N CPU utilisation percentages. For each reading print OK when it is at most 70, WARM when it is between 71 and 90 inclusive, and HOT when it is above 90.",
    inputFormat: "First line N, then N integers between 0 and 100.",
    outputFormat: "N lines, one status per reading.",
    constraints: ["1 ≤ N ≤ 1000", "0 ≤ reading ≤ 100"],
    tests: [
      { stdin: "4\n50\n71\n91\n70", expected: "OK\nWARM\nHOT\nOK" },
      { stdin: "3\n0\n100\n90", expected: "OK\nHOT\nWARM", hidden: true },
      { stdin: "1\n70", expected: "OK", hidden: true },
    ],
  }),
  coding({
    title: "Anagram Check",
    difficulty: "Easy",
    tags: ["core"],
    concept: "string frequency",
    statement:
      "Decide whether the two given words are anagrams of each other — the same letters with the same frequencies, in any order. Words contain only lowercase letters.",
    inputFormat: "Two words on one line, separated by a single space.",
    outputFormat: "YES if they are anagrams, otherwise NO.",
    constraints: ["1 ≤ word length ≤ 1000"],
    tests: [
      { stdin: "listen silent", expected: "YES" },
      { stdin: "hello world", expected: "NO", hidden: true },
      { stdin: "abc cba", expected: "YES", hidden: true },
    ],
  }),
  coding({
    title: "Rotate the Fleet List",
    difficulty: "Medium",
    tags: ["core"],
    concept: "arrays",
    statement:
      "Rotate the list of n integers to the RIGHT by k positions. Elements that fall off the end wrap around to the front.",
    inputFormat: "First line: n and k separated by a space. Second line: n integers.",
    outputFormat: "A single line with the rotated list, space-separated.",
    constraints: ["1 ≤ n ≤ 1000", "0 ≤ k < n"],
    tests: [
      { stdin: "5 2\n1 2 3 4 5", expected: "4 5 1 2 3" },
      { stdin: "4 1\n10 20 30 40", expected: "40 10 20 30", hidden: true },
      { stdin: "3 0\n7 8 9", expected: "7 8 9", hidden: true },
    ],
  }),
  coding({
    title: "Bracket Validator",
    difficulty: "Medium",
    tags: ["core"],
    concept: "stacks",
    statement:
      "Check whether a string of brackets is balanced: every opening bracket must be closed by the same kind of bracket, in the correct nesting order.",
    inputFormat: "One line containing only the characters ( ) [ ] { }.",
    outputFormat: "VALID if the string is balanced, otherwise INVALID.",
    constraints: ["1 ≤ length ≤ 1000"],
    tests: [
      { stdin: "([{}])", expected: "VALID" },
      { stdin: "([)]", expected: "INVALID", hidden: true },
      { stdin: "{[()]}[]", expected: "VALID", hidden: true },
    ],
  }),
  coding({
    title: "Unique Open Ports",
    difficulty: "Medium",
    tags: ["devops", "sre", "linux"],
    concept: "parsing & sets",
    statement:
      "An access log contains host:port entries. Report every distinct port that appears, sorted in ascending numeric order.",
    inputFormat: "First line N, then N lines of host:port.",
    outputFormat: "One line with the unique ports, ascending, separated by single spaces.",
    constraints: ["1 ≤ N ≤ 1000", "1 ≤ port ≤ 65535"],
    tests: [
      {
        stdin: "4\nweb1.example.com:443\napi.internal:8080\ncdn.example.com:443\ndb.internal:5432",
        expected: "443 5432 8080",
      },
      { stdin: "2\nsvc-a:22\nsvc-b:22", expected: "22", hidden: true },
      { stdin: "1\nlocalhost:3000", expected: "3000", hidden: true },
    ],
  }),
  coding({
    title: "Exponential Retry Backoff",
    difficulty: "Medium",
    tags: ["devops", "sre"],
    concept: "sequencing",
    statement:
      "A service retries failed requests with exponential backoff. Given a base delay in milliseconds, print the first n retry delays: base, base×2, base×4, and so on.",
    inputFormat: "One line: base n (base ≥ 1, n ≥ 1).",
    outputFormat: "One line with n space-separated delay values.",
    constraints: ["1 ≤ base ≤ 1000", "1 ≤ n ≤ 30"],
    tests: [
      { stdin: "1 5", expected: "1 2 4 8 16" },
      { stdin: "10 3", expected: "10 20 40", hidden: true },
      { stdin: "500 1", expected: "500", hidden: true },
    ],
  }),
  coding({
    title: "Running Maximum",
    difficulty: "Medium",
    tags: ["core"],
    concept: "arrays",
    statement:
      "For every position of the list, print the maximum value seen so far, including the value at that position.",
    inputFormat: "First line n, second line n integers.",
    outputFormat: "One line with n space-separated running maximums.",
    constraints: ["1 ≤ n ≤ 1000"],
    tests: [
      { stdin: "5\n3 1 4 1 5", expected: "3 3 4 4 5" },
      { stdin: "4\n9 2 7 2", expected: "9 9 9 9", hidden: true },
      { stdin: "2\n-1 -5", expected: "-1 -1", hidden: true },
    ],
  }),
  coding({
    title: "Merge Deployment Windows",
    difficulty: "Hard",
    tags: ["core", "devops"],
    concept: "intervals",
    statement:
      "Merge overlapping (or touching) deployment windows. Two windows [a, b] and [c, d] overlap when c ≤ b. Print the merged windows sorted by start time.",
    inputFormat: "First line n, then n lines each containing start end.",
    outputFormat: "One merged window per line: start end, sorted by start.",
    constraints: ["1 ≤ n ≤ 1000", "0 ≤ start ≤ end ≤ 10^6"],
    tests: [
      { stdin: "4\n1 3\n2 6\n8 10\n15 18", expected: "1 6\n8 10\n15 18" },
      { stdin: "3\n1 4\n4 5\n5 6", expected: "1 6", hidden: true },
      { stdin: "1\n5 5", expected: "5 5", hidden: true },
    ],
  }),
];

export const QUIZ_BANK: QuizChallenge[] = [
  quiz({
    quizKind: "multiple-choice",
    difficulty: "Easier",
    tags: ["devops", "linux"],
    concept: "linux tooling",
    prompt: "Which Linux command shows real-time system resource usage?",
    options: ["chmod", "grep", "top", "mount"],
    correct: 2,
    explanation:
      "top refreshes a live view of CPU, memory and the heaviest processes. grep searches file contents, chmod changes permissions, and mount attaches filesystems.",
  }),
  quiz({
    quizKind: "multiple-choice",
    difficulty: "Standard",
    tags: ["core"],
    concept: "algorithms",
    prompt: "What is the average time complexity of binary search on a sorted array?",
    options: ["O(n)", "O(log n)", "O(n²)", "O(1)"],
    correct: 1,
    explanation:
      "Each comparison halves the remaining search space, so the array of size n is cut in half about log₂(n) times.",
  }),
  quiz({
    quizKind: "multiple-choice",
    difficulty: "Easier",
    tags: ["web"],
    concept: "http status codes",
    prompt: "Which HTTP status code means the server could not find the requested page?",
    options: ["404 Not Found", "401 Unauthorized", "500 Internal Server Error", "301 Moved Permanently"],
    correct: 0,
    explanation:
      "404 says the URL is valid but no resource exists at it. 401 needs authentication, 500 is a server fault, 301 is a permanent redirect.",
  }),
  quiz({
    quizKind: "multiple-choice",
    difficulty: "Standard",
    tags: ["core"],
    concept: "data structures",
    prompt: "Which data structure follows the FIFO (first-in, first-out) principle?",
    options: ["Stack", "Queue", "Binary tree", "Hash set"],
    correct: 1,
    explanation:
      "A queue serves the oldest item first — like a line at a counter. A stack is LIFO, while trees and sets have no such ordering rule.",
  }),
  quiz({
    quizKind: "true-false",
    difficulty: "Standard",
    tags: ["devops", "sre"],
    concept: "http semantics",
    prompt:
      "A 503 Service Unavailable response always means the server has a permanent configuration bug.",
    options: ["True", "False"],
    correct: 1,
    explanation:
      "False. 503 signals a temporary condition — overload, maintenance or an exhausted upstream — and is expected to clear on its own.",
  }),
  quiz({
    quizKind: "scenario",
    difficulty: "Challenging",
    tags: ["devops", "sre"],
    concept: "incident triage",
    prompt:
      "Every request to your API returns 502 Bad Gateway, yet the backend pods report healthy and respond on their own. What is the most likely culprit?",
    options: [
      "The clients are holding stale DNS caches",
      "The database schema needs a migration",
      "The reverse proxy / load balancer cannot reach the backend",
      "The TLS certificate has expired",
    ],
    correct: 2,
    explanation:
      "502 is generated by the component in front of the backend when the upstream connection fails — so look at the proxy's upstream config, ports and network path first.",
  }),
  quiz({
    quizKind: "code-fill",
    difficulty: "Easier",
    tags: ["devops", "linux"],
    concept: "shell loops",
    prompt: "Which value completes the loop so the total actually prints?",
    code: "total=0\nfor i in 1 2 3 4 5; do\n  total=$((total + i))\ndone\necho ______",
    options: ["$total", "$i", "total", "5"],
    correct: 0,
    explanation:
      "$total expands the accumulated sum (15). $i would print only the last loop value 5, and bare total or 5 are not the running sum.",
  }),
  quiz({
    quizKind: "code-fill",
    difficulty: "Standard",
    tags: ["core", "web"],
    concept: "javascript",
    prompt: "Which method completes the snippet so it prints true?",
    code: "const nums = [3, 1, 2];\nnums.______();\nconsole.log(nums[0] === 1);",
    options: ["sort", "append", "reverse", "pop"],
    correct: 0,
    explanation:
      "sort() orders the array ascending to [1, 2, 3], so nums[0] is 1. append is not an array method, reverse would leave 3 first, and pop only removes the last item.",
  }),
  quiz({
    quizKind: "bug-hunt",
    difficulty: "Standard",
    tags: ["core"],
    concept: "off-by-one errors",
    prompt: "Which line causes the crash when this program runs?",
    code: "nums = [1, 2, 3, 4]\ntotal = 0\nfor i in range(len(nums) + 1):\n    total += nums[i]\nprint(total)",
    options: ["nums = [1, 2, 3, 4]", "total = 0", "for i in range(len(nums) + 1):", "print(total)"],
    correct: 2,
    explanation:
      "range(len(nums) + 1) produces indexes 0…4, but the last valid index is 3 — so nums[4] raises IndexError. It should be range(len(nums)).",
  }),
  quiz({
    quizKind: "pseudocode-order",
    difficulty: "Easier",
    tags: ["core"],
    concept: "pseudocode basics",
    prompt: "Put the steps in the order that correctly decides whether a number is even.",
    lines: [
      "Read the number n",
      "Compute r = n mod 2",
      "If r is 0 print EVEN else print ODD",
      "End",
    ],
    order: [0, 1, 2, 3],
    answer: "Read → compute remainder → branch on it → End",
    explanation:
      "You must read the input before you can compute anything, compute the remainder before testing it, and only then branch on the result.",
  }),
  quiz({
    quizKind: "ranking",
    difficulty: "Standard",
    tags: ["devops"],
    concept: "delivery pipeline",
    prompt: "Rank the deployment pipeline stages in the order they should run.",
    lines: [
      "Build the artifact",
      "Run automated tests",
      "Deploy to staging",
      "Run smoke checks",
      "Promote to production",
    ],
    order: [0, 1, 2, 3, 4],
    answer: "Build → test → staging → smoke checks → production",
    explanation:
      "Nothing should be deployed before it builds and passes tests, staging must come before promotion, and smoke checks gate the production release.",
  }),
  quiz({
    quizKind: "typed-answer",
    difficulty: "Standard",
    tags: ["devops", "linux"],
    concept: "linux tooling",
    prompt:
      "Type the Linux command that lists ALL files — including hidden ones — in long format.",
    accepted: [
      "ls -la", "ls -al", "ls -lah", "ls -alh", "ls -hal", "ls -h -al",
      "ls -l -a", "ls -a -l", "ls -l -a -h", "ls -a -l -h", "ls -lahl",
    ],
    answer: "ls -la  (or any flag order combining -l and -a)",
    explanation:
      "-l gives the long listing and -a includes dotfiles; -h makes sizes human-readable. The flag order is irrelevant to ls, so ls -al is equally correct.",
  }),
  quiz({
    quizKind: "typed-answer",
    difficulty: "Easier",
    tags: ["core"],
    concept: "complexity",
    prompt:
      "What is the average-case time complexity of binary search? Type it the standard way, e.g. O(...).",
    accepted: ["O(log n)", "log n", "O(logn)", "O(log2 n)", "log2 n", "lg n"],
    answer: "O(log n)",
    explanation:
      "Binary search halves the search range each step, so it needs about log₂(n) comparisons — O(log n).",
  }),
  quiz({
    quizKind: "typed-answer",
    difficulty: "Standard",
    tags: ["core"],
    concept: "pseudocode syntax",
    prompt:
      "Type a loop header in pseudocode that prints every integer from 1 to 5 inclusive. (Any standard notation works — the syntax must be correct.)",
    accepted: [
      "for i from 1 to 5",
      "for i = 1 to 5",
      "for i in 1 to 5",
      "for i in 1..5",
      "for i from 1 through 5",
      "for (i = 1; i <= 5; i++)",
      "for i in range(1, 6)",
      "for i =1 to 5",
      "fori=1to5",
    ],
    answer: "for i from 1 to 5   (C-style or range() forms also accepted)",
    explanation:
      "A counting loop needs a start, an inclusive end and a step: for i from 1 to 5. Languages write it as for (i = 1; i <= 5; i++) or for i in range(1, 6) — same semantics, correct syntax in each dialect.",
  }),
];

/* ═══════════════════════════════════════════
   THE JUDGE — run code, compare output
   ═══════════════════════════════════════════ */

const VERDICT_RANK: Record<string, number> = {
  Accepted: 0,
  "Wrong Answer": 1,
  "Runtime Error": 2,
  "Time Limit Exceeded": 3,
  "Runtime Missing": 4,
  "Engine Offline": 5,
  "Judge Error": 6,
  "Compile Error": 7,
};

function engineIssue(message: string): Verdict | null {
  if (/runtime is unknown|no package|not installed/i.test(message)) return "Runtime Missing";
  if (/engine|unreachable|npm run engine|ECONNREFUSED/i.test(message)) return "Engine Offline";
  return null;
}

export function visibleSamples(ch: CodingChallenge): TestCase[] {
  const vis = ch.tests.filter((t) => !t.hidden);
  return vis.length ? vis : ch.tests.slice(0, 1);
}

/**
 * Execute the submission against the challenge's tests.
 * `run` judges only the visible samples; `submit` runs everything.
 */
export async function judgeCoding(
  challenge: CodingChallenge,
  lang: CodeLanguage,
  source: string,
  mode: "run" | "submit",
  onProgress?: (done: number, total: number) => void
): Promise<{ verdict: Verdict; results: TestResult[]; message?: string }> {
  const tests = mode === "run" ? visibleSamples(challenge) : challenge.tests;
  const results: TestResult[] = [];
  let verdict: Verdict = "Accepted";
  let message: string | undefined;

  const raise = (v: Verdict, msg?: string) => {
    if (VERDICT_RANK[v] > VERDICT_RANK[verdict]) {
      verdict = v;
      message = msg;
    }
  };

  for (let i = 0; i < tests.length; i++) {
    const t = tests[i];
    const label = t.hidden ? `Hidden ${i + 1}` : `Sample ${i + 1}`;
    let res: RunResult;
    try {
      res = await runProgram(lang, source, t.stdin);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const v = engineIssue(msg);
      return { verdict: v || "Judge Error", results, message: msg };
    }

    if (typeof res.compileCode === "number" && res.compileCode !== 0) {
      results.push({
        label, stdin: t.stdin, expected: t.expected, actual: "",
        passed: false, error: res.stderr || "Compilation failed", compileFailed: true,
      });
      raise("Compile Error", res.stderr || "Compilation failed");
      break; // every test would fail identically
    }
    if (res.killed) {
      results.push({
        label, stdin: t.stdin, expected: t.expected, actual: res.stdout,
        passed: false, error: "Exceeded the engine's time or memory limit.", killed: true,
      });
      raise("Time Limit Exceeded");
      continue;
    }
    if (res.code !== 0) {
      const err = res.stderr || `Program exited with code ${res.code}`;
      results.push({ label, stdin: t.stdin, expected: t.expected, actual: res.stdout, passed: false, error: err });
      raise("Runtime Error", err);
      continue;
    }
    const passed = normalizeOutput(res.stdout) === normalizeOutput(t.expected);
    results.push({ label, stdin: t.stdin, expected: t.expected, actual: res.stdout, passed });
    if (!passed) raise("Wrong Answer");
    onProgress?.(i + 1, tests.length);
  }

  /* Feed the real activity log: an accepted SUBMIT is measurable evidence
     of practice (drives the Collection's coding badges and profile stats).
     Deduped per problem so re-submitting an already-solved challenge can
     never inflate the count. */
  if (mode === "submit" && verdict === "Accepted") {
    try {
      const raw = localStorage.getItem("cv_solved_challenges");
      const solved: string[] = raw ? JSON.parse(raw) : [];
      if (!solved.includes(challenge.id)) {
        solved.push(challenge.id);
        localStorage.setItem("cv_solved_challenges", JSON.stringify(solved));
        logEvent("code_solve", { source: challenge.id });
      }
    } catch {
      /* storage unavailable — skip the stat rather than miscount */
    }
  }

  return { verdict, results, message };
}

/* ═══════════════════════════════════════════
   AI-GENERATED CHALLENGES
   Tuned to the student's track and level,
   validated field-by-field, and self-checked:
   a coding problem only ships if its own
   reference solution passes every test on the
   local engine.
   ═══════════════════════════════════════════ */

const AI_CACHE_KEY = "cv_challenge_ai_v1";
const AI_CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

interface AiCacheEntry { at: number; items: Challenge[] }

function loadAiCache(domain: string): Challenge[] | null {
  try {
    const raw = localStorage.getItem(AI_CACHE_KEY);
    if (!raw) return null;
    const all = JSON.parse(raw) as Record<string, AiCacheEntry>;
    const entry = all[domain];
    if (!entry || !Array.isArray(entry.items) || !entry.items.length) return null;
    if (Date.now() - entry.at > AI_CACHE_TTL) return null;
    return entry.items;
  } catch {
    return null;
  }
}

function saveAiCache(domain: string, items: Challenge[]): void {
  try {
    const raw = localStorage.getItem(AI_CACHE_KEY);
    const all = raw ? (JSON.parse(raw) as Record<string, AiCacheEntry>) : {};
    all[domain] = { at: Date.now(), items };
    localStorage.setItem(AI_CACHE_KEY, JSON.stringify(all));
  } catch {
    /* quota/privacy mode → session simply regenerates next time */
  }
}

/** Pull a JSON array out of a model reply (handles code fences and prose). */
function extractJson<T>(text: string): T | null {
  const unfenced = text.replace(/```(?:json)?/gi, "");
  const start = unfenced.indexOf("[");
  const end = unfenced.lastIndexOf("]");
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(unfenced.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}

interface RawItem {
  kind?: string;
  quizKind?: string;
  type?: string;
  prompt?: string;
  question?: string;
  options?: string[];
  correct?: number;
  code?: string;
  codeSnippet?: string;
  lines?: string[];
  order?: number[];
  accepted?: string[];
  answer?: string;
  explanation?: string;
  concept?: string;
  difficulty?: string;
  title?: string;
  statement?: string;
  inputFormat?: string;
  outputFormat?: string;
  constraints?: string[];
  tests?: { stdin?: string; expected?: string; hidden?: boolean }[];
  reference?: string;
}

const OPTION_KINDS: QuizKind[] = [
  "multiple-choice", "true-false", "scenario", "code-fill", "bug-hunt",
];
const ORDER_KINDS: QuizKind[] = ["pseudocode-order", "ranking"];

function toDojo(q: QuizChallenge, idx: number): DojoChallenge {
  return {
    id: idx + 1,
    // only called for option-based kinds, which are all Dojo question types
    type: q.quizKind as DojoChallenge["type"],
    difficulty: q.difficulty,
    senseiSays: "",
    question: q.prompt,
    codeSnippet: q.code,
    pseudocodeLines: q.lines,
    correctOrder: q.order,
    options: q.options || [],
    correct: typeof q.correct === "number" ? q.correct : 0,
    explanation: q.explanation,
    conceptKey: q.concept,
  };
}

/**
 * Practice Lab quiz → the Dojo's question shape, so the trial engine
 * (adaptive picking, Fix-Your-Mistakes rewrites) can serve either store.
 * `id` is a placeholder: `fromDojo` re-attaches the real challenge id.
 */
export function toArenaQuiz(q: QuizChallenge): DojoChallenge {
  return {
    id: 0,
    type: q.quizKind as DojoChallenge["type"],
    difficulty: q.difficulty,
    senseiSays: "",
    question: q.prompt,
    codeSnippet: q.code,
    pseudocodeLines: q.lines,
    correctOrder: q.order,
    options: q.options || [],
    correct: q.correct ?? 0,
    explanation: q.explanation,
    conceptKey: q.concept,
  };
}

/** The Dojo's shape back into a Practice Lab quiz — keeps the original id so
 *  mistake bookkeeping (resolveMistake) still matches what was queued. */
export function fromDojo(d: DojoChallenge, id: string | number): QuizChallenge {
  return {
    kind: "quiz",
    id: String(id),
    quizKind: (d.type as QuizKind) || "multiple-choice",
    difficulty: d.difficulty,
    prompt: d.question,
    code: d.codeSnippet,
    lines: d.pseudocodeLines,
    order: d.correctOrder,
    options: d.options,
    correct: d.correct,
    explanation: d.explanation,
    concept: d.conceptKey,
    tags: [],
    source: "ai",
  };
}

function validateQuiz(raw: RawItem, idx: number): QuizChallenge | null {
  const asStrings = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((s): s is string => typeof s === "string" && s.trim().length > 0) : [];
  const isPermutation = (o: unknown, n: number): boolean =>
    Array.isArray(o) && o.length === n && [...o].sort((a, b) => a - b).every((v, i) => v === i);

  /* The model doesn't always emit the exact shape the schema asks for: steps
     under `options`, a typed answer instead of choices, no [True, False] pair,
     no `order`. Normalise those shapes instead of dropping the question —
     otherwise every path-specific AI item falls back to the generic bank. */
  const r: RawItem = { ...raw };
  let quizKind = (r.quizKind || r.type || "") as QuizKind;
  const prompt = String(r.prompt || r.question || "").trim();
  if (prompt.length < 8) return null;

  const answer = String(r.answer || "").trim();
  let options = asStrings(r.options);
  let lines = asStrings(r.lines);

  // Ordering items sometimes carry their steps in `options`
  if (ORDER_KINDS.includes(quizKind) && lines.length < 3 && options.length >= 3) {
    lines = options;
    options = [];
    r.lines = lines;
    r.options = undefined;
  }
  // Ordering item with no `order` → the steps were listed in the right order
  if (ORDER_KINDS.includes(quizKind) && lines.length >= 3 && !isPermutation(r.order, lines.length)) {
    r.order = lines.map((_, i) => i);
  }

  // Choice item with no choices:
  if (OPTION_KINDS.includes(quizKind) && options.length < 2) {
    if (quizKind === "true-false") {
      options = ["True", "False"];
      r.options = options;
    } else if (answer && lines.length < 3) {
      // Model wrote a fill-in / identify question with a literal answer
      quizKind = "typed-answer";
      r.quizKind = "typed-answer";
      r.accepted = [answer];
    } else if (lines.length >= 3) {
      // Model wrote ordered steps instead of choices
      quizKind = "pseudocode-order";
      r.quizKind = "pseudocode-order";
      if (!isPermutation(r.order, lines.length)) r.order = lines.map((_, i) => i);
    }
  }
  // Choice item whose correct answer came through as text rather than an index
  if (OPTION_KINDS.includes(quizKind) && typeof r.correct !== "number" && answer) {
    const found = options.findIndex((o) => o.trim().toLowerCase() === answer.toLowerCase());
    if (found >= 0) r.correct = found;
  }

  const base = {
    kind: "quiz" as const,
    id: `ai-quiz-${idx}`,
    difficulty: quizDifficulty(r.difficulty),
    prompt,
    explanation: String(r.explanation || "").trim() || "Review the concept and try the next one.",
    concept: String(r.concept || "concept").trim().slice(0, 60),
    tags: [] as string[],
    source: "ai" as const,
  };
  const code = r.codeSnippet || r.code || undefined;

  // True/False is never handed to repairChallenge — it would top the pair up
  // to three options with a junk distractor.
  if (quizKind === "true-false") {
    const tf = options.length >= 2 ? options.slice(0, 2) : ["True", "False"];
    if (typeof r.correct !== "number" || (r.correct !== 0 && r.correct !== 1)) {
      const hit = tf.findIndex((o) => o.trim().toLowerCase() === answer.toLowerCase());
      if (hit < 0) return null; // never guess whether the statement is true
      return { ...base, quizKind, options: tf, correct: hit, code };
    }
    return { ...base, quizKind, options: tf, correct: r.correct, code };
  }

  if (OPTION_KINDS.includes(quizKind)) {
    const repaired = repairChallenge(toDojo({ ...base, quizKind, options: r.options, correct: r.correct, code } as QuizChallenge, idx), "");
    if (!repaired || !repaired.options?.length) return null;
    return {
      ...base,
      quizKind,
      code: repaired.codeSnippet || code,
      options: repaired.options,
      correct: repaired.correct,
      explanation: repaired.explanation || base.explanation,
      concept: repaired.conceptKey || base.concept,
    };
  }

  if (ORDER_KINDS.includes(quizKind)) {
    if (lines.length < 3 || lines.length > 8) return null;
    const order = Array.isArray(r.order) ? r.order : [];
    if (!isPermutation(order, lines.length)) return null;
    return { ...base, quizKind, lines, order, code, answer: answer || undefined };
  }

  if (quizKind === "typed-answer") {
    const accepted = asStrings(r.accepted).slice(0, 12);
    if (answer && !accepted.includes(answer)) accepted.unshift(answer);
    if (!accepted.length) return null;
    return { ...base, quizKind, code, accepted, answer: answer || undefined };
  }

  return null;
}

function validateCoding(raw: RawItem, idx: number): { challenge: CodingChallenge; reference: string } | null {
  const title = String(raw.title || "").trim();
  const statement = String(raw.statement || "").trim();
  if (title.length < 4 || statement.length < 40) return null;

  const rawTests = Array.isArray(raw.tests) ? raw.tests : [];
  const tests: TestCase[] = [];
  for (const t of rawTests) {
    if (!t || typeof t.stdin !== "string" || typeof t.expected !== "string") continue;
    tests.push({ stdin: t.stdin.slice(0, 4000), expected: t.expected.slice(0, 4000), hidden: t.hidden !== false });
    if (tests.length >= 6) break;
  }
  if (tests.length < 2) return null;
  // The first test is always the visible sample
  tests[0] = { ...tests[0], hidden: false };

  const reference = String(raw.reference || "").trim();
  if (reference.length < 30) return null;

  return {
    challenge: {
      kind: "coding",
      id: `ai-code-${idx}`,
      title: title.slice(0, 70),
      difficulty: codeDifficulty(raw.difficulty),
      tags: [],
      statement: statement.slice(0, 2000),
      inputFormat: String(raw.inputFormat || "See the sample input.").trim().slice(0, 500),
      outputFormat: String(raw.outputFormat || "See the sample output.").trim().slice(0, 500),
      constraints: (Array.isArray(raw.constraints) ? raw.constraints : []).filter((c) => typeof c === "string").slice(0, 6),
      tests,
      concept: String(raw.concept || "problem solving").trim().slice(0, 60),
      source: "ai",
    },
    reference,
  };
}

let engineProbe: Promise<boolean> | null = null;

/** One cheap execution to learn whether the local engine is usable. */
function engineAvailable(): Promise<boolean> {
  if (!engineProbe) {
    engineProbe = runProgram(
      CODE_LANGUAGES.find((l) => l.id === "python") || CODE_LANGUAGES[0],
      "print(sum(map(int, input().split())))",
      "1 2"
    )
      .then((r) => r.code === 0 && normalizeOutput(r.stdout) === "3")
      .catch(() => false)
      .finally(() => { engineProbe = null; }) as Promise<boolean>;
  }
  return engineProbe;
}

/** Run the reference solution over every test; false = broken problem. */
async function verifyCoding(ch: CodingChallenge, reference: string): Promise<boolean> {
  const py = CODE_LANGUAGES.find((l) => l.id === "python");
  if (!py) return false;
  for (const t of ch.tests) {
    let res: RunResult;
    try {
      res = await runProgram(py, reference, t.stdin);
    } catch {
      return false;
    }
    if (typeof res.compileCode === "number" && res.compileCode !== 0) return false;
    if (res.code !== 0 || res.killed) return false;
    if (normalizeOutput(res.stdout) !== normalizeOutput(t.expected)) return false;
  }
  return true;
}

/**
 * Generate a fresh mixed set for this track and level.
 * Returns `{ items, verified }` — unverified items (engine down) are usable
 * for the session but must not be cached.
 */
export async function generateAiChallenges(
  path: LearningPath,
  level: string
): Promise<{ items: Challenge[]; verified: boolean }> {
  const scope = `LEARNING PATH (primary syllabus): ${path.label}
PATH TOPICS — draw every question from these, in roadmap order:
${path.topics.length ? path.topics.map((t, i) => `${i + 1}. ${t}`).join("\n") : "(no saved path yet — use the track below)"}
${path.blurb ? `PATH LORE: ${path.blurb}` : ""}
ONBOARDING TRACK (background only): ${path.track}
STUDENT LEVEL: ${level || "Beginner"}`;

  const system: ChatMessage = {
    role: "system",
    content: `You write practice challenges for an engineering student on the platform CareerVerse.

${scope}

Return ONLY a raw JSON array — no markdown fences, no commentary. Each element is one of:

QUIZ item:
{"kind":"quiz","quizKind":"multiple-choice"|"true-false"|"scenario"|"code-fill"|"bug-hunt"|"pseudocode-order"|"ranking"|"typed-answer","difficulty":"Easier"|"Standard"|"Challenging"|"Expert","prompt":"question text","code":"snippet (code-fill / bug-hunt only)","lines":["step 1","step 2","step 3"],"order":[0,1,2],"options":["a","b","c"],"correct":2,"accepted":["spelling 1","spelling 2"],"answer":"canonical answer","explanation":"why, in 1-2 sentences","concept":"concept_name"}

CODING item (a real, judgeable problem):
{"kind":"coding","title":"Problem Title","difficulty":"Easy"|"Medium"|"Hard","statement":"What to solve, in 2-4 sentences","inputFormat":"how input is read from stdin","outputFormat":"exact output shape","constraints":["..."],"tests":[{"stdin":"sample input","expected":"exact expected output"},{"stdin":"hidden input","expected":"exact expected output","hidden":true}],"reference":"a complete, correct Python 3 solution that reads stdin and prints the answer","concept":"concept_name"}

Rules:
- 10 items total: EXACTLY 8 QUIZ items — exactly one for EACH quizKind ("multiple-choice", "true-false", "scenario", "code-fill", "bug-hunt", "pseudocode-order", "ranking", "typed-answer"), never two of the same kind — plus exactly 2 CODING problems.
- Every item must come from the LEARNING PATH above: use its mission topics, tools, stack and scenarios. The onboarding track is background only. Never drift into an unrelated domain.
- A quiz question must be answerable by a student working through those path topics in order — never about a topic the path does not mention.
- Coding problems read stdin and write stdout so any language can solve them. Input/output must be unambiguous; expected outputs must be exact (no extra spaces). The FIRST test is the visible sample; mark every later test "hidden":true.
- "reference" must actually solve the problem and pass every test you wrote.
- For typed-answer: list every reasonable spelling in "accepted" and put the canonical one in "answer".
- For option quizzes: 3-4 options, exactly one "correct" index — and VARY which index is correct across items (a mix of 0, 1, 2, 3): never every answer first.
- "true-false": make roughly half of the statements FALSE (correct: 1) — never every statement true. Always supply options ["True","False"].
- explanation must teach the why, not restate the answer.`,
  };

  const response = await chatWithGroq(
    [system, { role: "user", content: "Generate the 10 challenges now: 8 quiz (one per quizKind) + 2 coding." }],
    0.5
  );
  const raw = extractJson<RawItem[]>(response);
  if (!Array.isArray(raw)) throw new Error("Model returned no JSON");

  const items: Challenge[] = [];
  const coded: { challenge: CodingChallenge; reference: string }[] = [];

  for (let i = 0; i < raw.length; i++) {
    const r = raw[i];
    if (!r) continue;
    if (r.kind === "coding") {
      const c = validateCoding(r, i);
      if (c) coded.push(c);
      else console.warn(`Dropping AI coding item #${i} ("${String(r.title || "untitled").slice(0, 50)}") — failed validation.`);
    } else {
      const q = validateQuiz(r, i);
      if (q) items.push(q);
      else {
        console.warn(`Dropping AI quiz item #${i} (quizKind="${String(r.quizKind || r.type || "?")}") — failed validation.`);
        console.warn("  raw:", JSON.stringify(r).slice(0, 500));
      }
    }
    if (items.length + coded.length >= 10) break;
  }

  if (items.length + coded.length < Math.min(10, raw.filter(Boolean).length)) {
    console.warn(
      `Challenge generation kept ${items.length} quiz + ${coded.length} coding of ${raw.filter(Boolean).length} raw items — model output failed validation.`
    );
  }

  const engineUp = coded.length ? await engineAvailable() : false;

  for (const c of coded) {
    // Each coding problem is verified on its own; survivors are individually
    // proven, so only an unreachable engine makes the batch uncacheable.
    if (engineUp && !(await verifyCoding(c.challenge, c.reference))) {
      console.warn(
        `Dropping AI coding problem "${c.challenge.title}" — its reference solution failed its own tests.`
      );
      continue;
    }
    items.push(c.challenge);
  }

  const verified = coded.length === 0 || engineUp;
  return { items, verified };
}

/* ═══════════════════════════════════════════
   SESSION BUILD — curated bank + AI, mixed
   ═══════════════════════════════════════════ */

function pickBank(path: LearningPath, level: string): Challenge[] {
  const kw = pathKeywords(path);
  const codingPool = CODING_BANK.filter(
    (c) => matchesDomain(c.tags, kw) && levelAllows(level, c.difficulty)
  );

  // ONE item per question type — the Arena must show every format. Domain and
  // level filters run first; if they would drop a format entirely we relax the
  // domain, then the level, rather than hiding the type behind a filter.
  const quizPool: QuizChallenge[] = [];
  const taken = new Set<string>();
  for (const kind of QUIZ_KINDS) {
    const hit =
      QUIZ_BANK.find((q) => q.quizKind === kind && !taken.has(q.id) && matchesDomain(q.tags, kw) && levelAllows(level, q.difficulty)) ||
      QUIZ_BANK.find((q) => q.quizKind === kind && !taken.has(q.id) && levelAllows(level, q.difficulty)) ||
      QUIZ_BANK.find((q) => q.quizKind === kind && !taken.has(q.id));
    if (hit) {
      quizPool.push(hit);
      taken.add(hit.id);
    }
  }

  // Fill the remainder with anything else that fits the path
  const rest = QUIZ_BANK.filter(
    (q) => !taken.has(q.id) && matchesDomain(q.tags, kw) && levelAllows(level, q.difficulty)
  );

  return [...codingPool.slice(0, 3), ...quizPool, ...rest.slice(0, Math.max(0, 9 - quizPool.length))];
}

/**
 * Build a mixed session: coding and quiz challenges alternating,
 * AI items woven through the curated bank.
 */
export async function buildSession(path: LearningPath, level: string): Promise<Challenge[]> {
  const bank = pickBank(path, level);

  let ai: Challenge[] = loadAiCache(path.key) || [];
  if (!ai.length) {
    try {
      const gen = await generateAiChallenges(path, level);
      ai = gen.items;
      if (gen.verified && ai.length) saveAiCache(path.key, ai);
    } catch (err) {
      console.warn("AI challenge generation unavailable, using the curated bank:", err);
    }
  }

  const aiQuiz = ai.filter((c): c is QuizChallenge => c.kind === "quiz");
  const bankQuiz = bank.filter((c): c is QuizChallenge => c.kind === "quiz");

  // Path-specific AI problems first, curated ones behind them
  const codingPool = [
    ...ai.filter((c) => c.kind === "coding"),
    ...bank.filter((c) => c.kind === "coding"),
  ].slice(0, 3);

  // EVERY question type, exactly once — an AI item of that kind if the path
  // generated one, otherwise the curated bank. A session never hides a format.
  const quizPool: QuizChallenge[] = [];
  const taken = new Set<string>();
  for (const kind of QUIZ_KINDS) {
    const hit =
      aiQuiz.find((q) => q.quizKind === kind && !taken.has(q.id)) ||
      bankQuiz.find((q) => q.quizKind === kind && !taken.has(q.id));
    if (hit) {
      quizPool.push(hit);
      taken.add(hit.id);
    }
  }
  // One extra for variety — path items first
  for (const q of [...aiQuiz, ...bankQuiz]) {
    if (quizPool.length >= 9 || taken.has(q.id)) continue;
    quizPool.push(q);
    taken.add(q.id);
  }

  const out: Challenge[] = [];
  let ci = 0;
  let qi = 0;
  while (ci < codingPool.length || qi < quizPool.length) {
    if (ci < codingPool.length) out.push(codingPool[ci++]);
    if (qi < quizPool.length) out.push(quizPool[qi++]);
  }
  return out;
}

/* ═══════════════════════════════════════════
   STARTER TEMPLATES — every supported language
   Reads stdin the idiomatic way; the student
   fills in the solve step.
   ═══════════════════════════════════════════ */

type TemplateFn = (ch: CodingChallenge) => string;

function header(ch: CodingChallenge, comment: string): string {
  const lines = [
    `${ch.title} (${ch.difficulty})`,
    "",
    ch.statement,
    "",
    `Input:  ${ch.inputFormat}`,
    `Output: ${ch.outputFormat}`,
    "",
    "Read the test case from stdin and print the answer to stdout.",
  ];
  return lines.map((l) => (l ? `${comment} ${l}` : comment)).join("\n");
}

const JS_BODY: TemplateFn = (ch) => `${header(ch, "//")}
// The test input is provided in the \`stdin\` variable.
const tokens = stdin.trim().split(/\\s+/).filter(Boolean);

// TODO: solve the problem, then print the answer
// console.log(answer);
`;

const TEMPLATES: Record<string, TemplateFn> = {
  javascript: JS_BODY,
  typescript: (ch) => `${header(ch, "//")}
import { readFileSync } from "node:fs";

const tokens = readFileSync(0, "utf8").trim().split(/\\s+/).filter(Boolean);

// TODO: solve, then print the answer
// console.log(answer);
`,
  python: (ch) => `${header(ch, "#")}
import sys

tokens = sys.stdin.read().split()

# TODO: solve, then print the answer
`,
  java: (ch) => `${header(ch, "//")}
import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        // TODO: read with sc.next() / sc.nextInt(), solve, print
    }
}
`,
  c: (ch) => `${header(ch, "//")}
#include <stdio.h>

int main(void) {
    // TODO: read with scanf, solve, print with printf
    return 0;
}
`,
  cpp: (ch) => `${header(ch, "//")}
#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    // TODO: read from cin, solve, print to cout
    return 0;
}
`,
  csharp: (ch) => `${header(ch, "//")}
using System;

class Program {
    static void Main() {
        // TODO: read with Console.ReadLine(), solve, print
    }
}
`,
  go: (ch) => `${header(ch, "//")}
package main

import (
	"bufio"
	"fmt"
	"os"
)

func main() {
	in := bufio.NewScanner(os.Stdin)
	_ = in
	// TODO: call in.Scan() / in.Text() to read, solve, fmt.Println(...)
	_ = fmt.Println
}
`,
  rust: (ch) => `${header(ch, "//")}
use std::io::{self, Read};

fn main() {
    let mut input = String::new();
    io::stdin().read_to_string(&mut input).unwrap();
    let tokens: Vec<&str> = input.split_whitespace().collect();
    // TODO: solve, then println!("{}", answer)
}
`,
  php: (ch) => `${header(ch, "//")}
<?php
$tokens = preg_split('/\\s+/', trim(file_get_contents("php://stdin")));
// TODO: solve, then echo the answer . "\\n";
`,
  ruby: (ch) => `${header(ch, "#")}
tokens = STDIN.read.split
# TODO: solve, then puts answer
`,
  kotlin: (ch) => `${header(ch, "//")}
fun main() {
    val tokens = readLine()!!.split(Regex("\\\\s+"))
    // TODO: solve, then println(answer)
}
`,
  swift: (ch) => `${header(ch, "//")}
import Foundation

let input = readLine() ?? ""
let tokens = input.split(separator: " ").map(String.init)
// TODO: solve, then print(answer)
`,
  bash: (ch) => `${header(ch, "#")}
input="$(cat)"
# TODO: solve (read -r, awk, ...), then echo the answer
`,
  lua: (ch) => `${header(ch, "--")}
local input = io.read("a")
local tokens = {}
for w in input:gmatch("%S+") do tokens[#tokens + 1] = w end
-- TODO: solve, then print(answer)
`,
  r: (ch) => `${header(ch, "#")}
tokens <- scan("stdin", what = character(), quiet = TRUE)
# TODO: solve, then cat(answer, "\\n")
`,
  dart: (ch) => `${header(ch, "//")}
import 'dart:io';

void main() {
  final tokens = stdin.readLineSync()!.split(RegExp(r'\\s+'));
  // TODO: solve, then print(answer);
}
`,
  perl: (ch) => `${header(ch, "#")}
my $input = do { local $/; <STDIN> };
my @tokens = split /\\s+/, $input;
# TODO: solve, then print "$answer\\n";
`,
};

/** Starter code for a problem in a given language (template with the problem header). */
export function starterFor(ch: CodingChallenge, lang: CodeLanguage): string {
  const fn = TEMPLATES[lang.id];
  return fn ? fn(ch) : JS_BODY(ch);
}

/* ═══════════════════════════════════════════
   MISTAKE EXPLAINER — "what did I do wrong?"
   ═══════════════════════════════════════════ */

export async function explainCodingMistake(args: {
  challenge: CodingChallenge;
  languageLabel: string;
  source: string;
  verdict: Verdict;
  results: TestResult[];
  message?: string;
}): Promise<string> {
  const { challenge, languageLabel, source, verdict, results, message } = args;
  const failed = results.find((r) => !r.passed) || results[0];
  const clip = (s: string, n: number) => (s && s.length > n ? `${s.slice(0, n)}…` : s || "(empty)");

  const user: ChatMessage = {
    role: "user",
    content: `Problem: ${challenge.title}
Difficulty: ${challenge.difficulty}

${challenge.statement}

Input format: ${challenge.inputFormat}
Output format: ${challenge.outputFormat}

Language: ${languageLabel}
Verdict: ${verdict}${message ? ` (${clip(message, 300)})` : ""}

${failed ? `Failing test "${failed.label}":
input:    ${clip(failed.stdin, 400)}
expected: ${clip(failed.expected, 400)}
actual:   ${clip(failed.actual, 400)}${failed.error ? `\nerror:\n${clip(failed.error, 600)}` : ""}` : ""}

Student's submission:
\`\`\`${languageLabel.toLowerCase()}
${clip(source, 4000)}
\`\`\`

Explain the mistake precisely: name the line or step that is wrong, why it fails, and how to fix it (a short corrected snippet is fine). If the code is logically right, point out the exact output-formatting difference. Maximum 150 words, plain text, no markdown headers.`,
  };

  return chatWithGroq(
    [
      {
        role: "system",
        content:
          "You are a precise, encouraging coding mentor. You diagnose bugs from a failing test case and explain the root cause in plain language a beginner can act on immediately. Never say only 'check your code' — point at the exact line, condition or format.",
      },
      user,
    ],
    0.3
  );
}
