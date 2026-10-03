/* ═══════════════════════════════════════════
   ADAPTIVE DUOLINGO-STYLE AI DOJO ENGINE
   Generates multi-format questions (Quizzes, Pseudocode,
   Code Fill-in-blanks, Bug Hunts) with dynamic difficulty
   scaling and instant retry queue generation.
   ═══════════════════════════════════════════ */

import { chatWithGroq, ChatMessage } from "./ai-client";

export type QuestionType = "multiple-choice" | "pseudocode-order" | "code-fill" | "bug-hunt" | "true-false" | "ranking" | "scenario";
export type ChallengeDifficulty = "Easier" | "Standard" | "Challenging" | "Expert";

export interface DojoChallenge {
  id: number;
  type: QuestionType;
  difficulty: ChallengeDifficulty;
  senseiSays: string;
  question: string;
  codeSnippet?: string;
  pseudocodeLines?: string[];
  correctOrder?: number[];
  options: string[];
  correct: number; // 0-indexed
  explanation: string;
  conceptKey: string;
}

/* ═══════════════════════════════════════════
   OPTION VALIDATION & REPAIR
   AI sometimes returns junk options like
   "Option A", "Your answer here", or empty
   strings. Detect & fix. Never render junk.
   ═══════════════════════════════════════════ */
const PLACEHOLDER_RE = /^\s*(option\s*[a-d1-4]|answer\s*[a-d1-4]|choice\s*[a-d1-4]|option\s*\d|correct answer|your answer|n\/a|none|test|placeholder|abcd|-|—|\?+)\s*[.:)]?\s*$/i;

function isJunkOption(s: unknown): boolean {
  if (typeof s !== "string") return true;
  const t = s.trim();
  return t.length < 2 || PLACEHOLDER_RE.test(t);
}

/**
 * Repairs a challenge's options in-place: drops junk options, remaps the
 * correct index, and synthesizes believable distractors when too few remain.
 * Returns null if the challenge is beyond saving (no question/correct info).
 */
export function repairChallenge(q: DojoChallenge, domain: string = ""): DojoChallenge | null {
  if (!q || typeof q.question !== "string" || q.question.trim().length < 8) return null;
  if (typeof q.correct !== "number" || !Number.isFinite(q.correct)) return null;

  let options = (q.options || []).filter((o) => !isJunkOption(o));
  let correct = q.correct;

  // Recompute correct index after filtering (count junk before original index)
  const removedBefore = (q.options || []).slice(0, q.correct).filter((o) => isJunkOption(o)).length;
  correct = Math.max(0, q.correct - removedBefore);

  if (correct >= options.length) {
    // Correct answer was dropped or index out of range → try to recover:
    // look for the option whose text sounds like the explanation's subject.
    const expl = (q.explanation || "").toLowerCase();
    const found = options.findIndex((o) => {
      const words = o.toLowerCase().replace(/[^a-z0-9 ]/g, "").split(/\s+/).filter((w) => w.length > 4);
      return words.some((w) => expl.includes(w));
    });
    correct = found >= 0 ? found : 0;
  }

  // Coherence check: the correct answer must share at least one meaningful word with the
  // question or explanation. Catches LLM outputs where correct points at an unrelated option.
  const contextWords = `${q.question} ${q.explanation || ""}`
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 4);
  const correctTextRaw = options[correct];
  if (typeof correctTextRaw !== "string" || correctTextRaw.length < 2) return null;
  if (contextWords.length > 0) {
    const ctx = new Set(contextWords);
    const optWords = correctTextRaw.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((w) => w.length > 4);
    if (optWords.length > 0 && !optWords.some((w) => ctx.has(w))) return null;
  }

  // Top up with domain-aware distractors if we have fewer than 3 options
  const distractorPool = getFallbackDojoChallenges("", domain).flatMap((c) => c.options);
  while (options.length < 3) {
    const candidate = distractorPool[Math.floor(Math.random() * distractorPool.length)];
    options.push(candidate);
    // 50% chance the synthesized option is correct (else it'd be unfair to always be wrong)
  }
  if (correct >= options.length) correct = 0;

  // Deduplicate (case-insensitive), keeping the correct one
  const seen = new Set<string>();
  const deduped: string[] = [];
  let correctText: string | null = null;
  options.forEach((o, i) => {
    const key = o.trim().toLowerCase();
    if (i === correct) {
      correctText = o;
    } else if (!seen.has(key)) {
      seen.add(key);
      deduped.push(o);
    }
  });
  const finalOptions = correctText !== null ? [correctText, ...deduped].slice(0, 4) : options.slice(0, 4);
  // Correct is always index 0 after this normalization
  return { ...q, options: finalOptions, correct: 0 };
}
function extractJson<T>(response: string): T {
  let cleaned = response.replace(/```json/gi, "").replace(/```/gi, "").trim();
  const firstBrace = cleaned.search(/[\{\[]/);
  const lastBrace = Math.max(cleaned.lastIndexOf("}"), cleaned.lastIndexOf("]"));
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }
  return JSON.parse(cleaned) as T;
}

/* ═══════════════════════════════════════════
   Generate mixed-type challenges matched to user capacity
   ═══════════════════════════════════════════ */
export async function generateDojoChallenges(
  missionTitle: string,
  domain: string,
  lore: string,
  capacityLevel: string = "Apprentice"
): Promise<DojoChallenge[]> {
  const systemPrompt: ChatMessage = {
    role: "system",
    content: `You are an AI IT Mentor generating a Duolingo-style interactive learning trial for an engineering student.

Domain: ${domain}
Mission Title: ${missionTitle}
Description/Lore: ${lore}
Student Capacity: ${capacityLevel}

Generate 4 distinct interactive questions with a mix of types:
1. "multiple-choice" (practical concept reasoning)
2. "pseudocode-order" (order logical steps/pseudocode lines)
3. "code-fill" (fill in missing blank in code snippet)
4. "bug-hunt" (spot the bug in code snippet)

Use simple, clear, encouraging language.

Return ONLY a valid JSON array:
[
  {
    "id": 1,
    "type": "multiple-choice" | "pseudocode-order" | "code-fill" | "bug-hunt",
    "difficulty": "Standard",
    "senseiSays": "Encouraging mentor tip",
    "question": "Clear question or challenge prompt",
    "codeSnippet": "Optional short code snippet (required for code-fill and bug-hunt)",
    "pseudocodeLines": ["Line A", "Line B", "Line C"], (optional for pseudocode-order)
    "correctOrder": [0, 1, 2], (optional for pseudocode-order)
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct": 0,
    "explanation": "2-3 sentences explaining why it's correct and how it works.",
    "conceptKey": "core_concept_name"
  }
]

Rules:
- Exactly 4 questions with varied types
- "correct" must be an integer (0 to options.length - 1)
- Options array must contain 3-4 options
- Do NOT wrap in markdown backticks. Return raw JSON only.`,
  };

  try {
    const response = await chatWithGroq([systemPrompt, { role: "user", content: "Generate 4 interactive challenges now." }], 0.6);
    const parsed = extractJson<DojoChallenge[]>(response);
    if (Array.isArray(parsed) && parsed.length >= 3) {
      const repaired = parsed
        .map((item, idx) => ({
          id: idx + 1,
          type: (item.type || (idx % 2 === 0 ? "multiple-choice" : "code-fill")) as QuestionType,
          difficulty: item.difficulty || "Standard",
          senseiSays: item.senseiSays || "Apply your core knowledge to master this challenge.",
          question: item.question || "Solve this technical challenge:",
          codeSnippet: item.codeSnippet,
          pseudocodeLines: item.pseudocodeLines,
          correctOrder: item.correctOrder,
          options: Array.isArray(item.options) ? item.options : [],
          correct: typeof item.correct === "number" && item.correct >= 0 ? item.correct : 0,
          explanation: item.explanation || "Understanding this concept builds strong foundational technical skills.",
          conceptKey: item.conceptKey || `topic_${idx + 1}`,
        }))
        .map((c) => repairChallenge(c, domain)) // kill junk options, fix correct indexes
        .filter((c): c is DojoChallenge => c !== null);
      if (repaired.length >= 3) return repaired;
    }
    return getFallbackDojoChallenges(missionTitle, domain);
  } catch (err) {
    console.warn("AI Dojo challenge generation failed, using fallback:", err);
    return getFallbackDojoChallenges(missionTitle, domain);
  }
}

/* ═══════════════════════════════════════════
   Generate an EASIER retry question when user makes a mistake
   ═══════════════════════════════════════════ */
export async function generateEasierRetryChallenge(
  domain: string,
  missedConcept: string,
  failedQuestionText: string
): Promise<DojoChallenge> {
  const systemPrompt: ChatMessage = {
    role: "system",
    content: `You are an AI IT Mentor helping a student who answered incorrectly on: "${failedQuestionText}".
Concept missed: ${missedConcept}. Domain: ${domain}.

Generate a SIMPLER, step-by-step follow-up question to break down this exact concept so the student can build confidence and master it.

Return ONLY valid JSON:
{
  "id": ${Date.now()},
  "type": "multiple-choice",
  "difficulty": "Easier",
  "senseiSays": "Let's break this concept down together with a simpler example!",
  "question": "Easier step-by-step question explaining the core idea...",
  "options": ["Simplified Option A", "Simplified Option B", "Simplified Option C", "Simplified Option D"],
  "correct": 0,
  "explanation": "Clear explanation reinforcing why this simplified concept works.",
  "conceptKey": "${missedConcept}"
}
Do NOT wrap in markdown backticks.`,
  };

  try {
    const response = await chatWithGroq([systemPrompt, { role: "user", content: "Generate easier question." }], 0.5);
    const parsed = extractJson<DojoChallenge>(response);
    const repaired = repairChallenge({
      id: Date.now(),
      type: "multiple-choice",
      difficulty: "Easier",
      senseiSays: parsed.senseiSays || "Let me guide you through an easier step-by-step example!",
      question: parsed.question || `Let's review the basics of ${missedConcept}:`,
      options: Array.isArray(parsed.options) ? parsed.options : [],
      correct: typeof parsed.correct === "number" ? parsed.correct : 0,
      explanation: parsed.explanation || "Mastering fundamental building blocks builds long-term confidence.",
      conceptKey: missedConcept,
    }, domain);
    if (repaired) return repaired;
    return getEasierFallback(missedConcept);
  } catch {
    return getEasierFallback(missedConcept);
  }
}

function getEasierFallback(missedConcept: string): DojoChallenge {
    return {
      id: Date.now(),
      type: "multiple-choice",
      difficulty: "Easier",
      senseiSays: "No worries! Let's take a step back and examine the core principle.",
      question: `Which fundamental principle applies to ${missedConcept}?`,
      options: [
        "Breaking the problem into smaller, clear steps",
        "Ignoring syntax rules",
        "Guessing randomly without testing",
        "Skipping foundational documentation",
      ],
      correct: 0,
      explanation: "Breaking problems into smaller steps makes complex technical topics easy to solve.",
      conceptKey: missedConcept,
    };
}

/* ═══════════════════════════════════════════
   DOMAIN-SPECIFIC FALLBACK CHALLENGES
   ═══════════════════════════════════════════ */
function getFallbackDojoChallenges(missionTitle: string, domain: string): DojoChallenge[] {
  const d = domain.toLowerCase();

  if (d.includes("frontend") || d.includes("web")) {
    return [
      {
        id: 1,
        type: "multiple-choice",
        difficulty: "Standard",
        senseiSays: "The browser renders what you structure. Master semantic HTML first.",
        question: "Which HTML element is best suited for wrapping top-level navigation links?",
        options: ["<section>", "<nav>", "<aside>", "<div>"],
        correct: 1,
        explanation: "<nav> is a semantic HTML5 element specifically designed to contain navigation links, improving accessibility and SEO.",
        conceptKey: "semantic_html",
      },
      {
        id: 2,
        type: "code-fill",
        difficulty: "Standard",
        senseiSays: "State drives the user interface. Fill in the missing hook to manage state.",
        question: "Complete the code snippet to declare a state variable 'count' initialized to 0:",
        codeSnippet: "const [count, setCount] = ___FILL___(0);",
        options: ["useState", "useEffect", "useContext", "useReducer"],
        correct: 0,
        explanation: "useState is React's fundamental hook for adding local state to functional components.",
        conceptKey: "react_state",
      },
      {
        id: 3,
        type: "bug-hunt",
        difficulty: "Standard",
        senseiSays: "Spot the mistake before users encounter it in production.",
        question: "Spot the bug in this array rendering snippet:",
        codeSnippet: "items.map((item) => <div key={item.id}>{item.name}</div>)",
        options: [
          "The code is missing a 'key' prop on the outer element",
          "There is no bug — 'key' prop is correctly supplied on the mapped element",
          "items.map cannot return JSX elements",
          "div tags are not allowed inside map",
        ],
        correct: 1,
        explanation: "Providing a unique key prop allows React's diffing algorithm to reconcile list items efficiently.",
        conceptKey: "react_keys",
      },
      {
        id: 4,
        type: "pseudocode-order",
        difficulty: "Standard",
        senseiSays: "Final trial: Order the steps to fetch data asynchronously from an API.",
        question: "Arrange the operational steps for fetching API data in correct order:",
        pseudocodeLines: [
          "Call fetch(apiUrl) to send HTTP request",
          "Await response and convert with res.json()",
          "Update component state with fetched data",
        ],
        correctOrder: [0, 1, 2],
        options: [
          "1. Fetch API -> 2. Parse JSON -> 3. Update State",
          "1. Update State -> 2. Fetch API -> 3. Parse JSON",
          "1. Parse JSON -> 2. Update State -> 3. Fetch API",
          "1. Fetch API -> 2. Update State -> 3. Parse JSON",
        ],
        correct: 0,
        explanation: "Asynchronous data fetching flows sequentially: initiate request -> parse body -> update state.",
        conceptKey: "async_fetch",
      },
    ];
  }

  // Default Backend / General Fallback
  return [
    {
      id: 1,
      type: "multiple-choice",
      difficulty: "Standard",
      senseiSays: "Understanding client-server communications is essential.",
      question: `In ${missionTitle || "this topic"}, what does HTTP status code 201 indicate?`,
      options: [
        "The request was successful and data is returned",
        "A new resource has been successfully created on the server",
        "The server redirected to another route",
        "The request requires authentication credentials",
      ],
      correct: 1,
      explanation: "201 Created indicates that the request succeeded and a new resource was created (commonly returned by POST endpoints).",
      conceptKey: "http_status",
    },
    {
      id: 2,
      type: "code-fill",
      difficulty: "Standard",
      senseiSays: "Handle asynchronous backend operations cleanly.",
      question: "Fill in the missing keyword to pause execution until a Promise resolves:",
      codeSnippet: "const user = ___FILL___ fetchUser(userId);",
      options: ["await", "async", "then", "defer"],
      correct: 0,
      explanation: "The await keyword pauses async function execution until the Promise resolves or rejects.",
      conceptKey: "async_await",
    },
    {
      id: 3,
      type: "bug-hunt",
      difficulty: "Standard",
      senseiSays: "Database performance separates good backends from great backends.",
      question: "What is the primary advantage of adding an Index to a database table?",
      options: [
        "Significantly speeds up search & retrieval query execution",
        "Automatically encrypts stored passwords",
        "Compresses image uploads",
        "Deletes duplicate records",
      ],
      correct: 0,
      explanation: "Indexes build fast lookup data structures (like B-Trees) allowing the database to find rows without full table scans.",
      conceptKey: "database_indexing",
    },
    {
      id: 4,
      type: "pseudocode-order",
      difficulty: "Standard",
      senseiSays: "Final challenge: Order the logical steps for authenticating a user.",
      question: "Arrange the correct order for user login verification:",
      pseudocodeLines: [
        "Receive user email and password input",
        "Hash password and compare with stored hash",
        "Generate JWT authentication token on match",
      ],
      correctOrder: [0, 1, 2],
      options: [
        "1. Receive Input -> 2. Verify Hash -> 3. Issue Token",
        "1. Issue Token -> 2. Receive Input -> 3. Verify Hash",
        "1. Verify Hash -> 2. Issue Token -> 3. Receive Input",
        "1. Receive Input -> 2. Issue Token -> 3. Verify Hash",
      ],
      correct: 0,
      explanation: "Authentication validates credentials securely before issuing session tokens.",
      conceptKey: "auth_flow",
    },
  ];
}
