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
/**
 * Deterministically move the correct ANSWER (its text and index together) to a
 * slot derived from the question, so correct choices stay spread across
 * A/B/C/D instead of clustering in one position. The answer truth itself is
 * untouched — only where it sits in the list changes.
 */
function spreadCorrect(q: DojoChallenge): DojoChallenge {
  if (!Array.isArray(q.options) || q.options.length < 2 || typeof q.correct !== "number") return q;
  const opts = [...q.options];
  const correct = Math.min(Math.max(q.correct, 0), opts.length - 1);
  let h = 0;
  const seed = (q.question || "").trim().toLowerCase();
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const target = h % opts.length;
  if (target === correct) return { ...q, options: opts, correct };
  [opts[target], opts[correct]] = [opts[correct], opts[target]];
  return { ...q, options: opts, correct: target };
}

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

  // Deduplicate (case-insensitive) while KEEPING the correct option in place —
  // the correct choice must stay spread across A/B/C/D, never pinned to A.
  const seen = new Set<string>();
  const keep = options.map((o) => {
    const key = o.trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  if (!keep[correct]) {
    // The correct option duplicates an earlier one → grade the first occurrence.
    const key = options[correct].trim().toLowerCase();
    const firstIdx = options.findIndex((o, i) => keep[i] && o.trim().toLowerCase() === key);
    if (firstIdx >= 0) {
      keep[correct] = false;
      correct = firstIdx;
    } else {
      keep[correct] = true;
    }
  }
  const droppedBefore = keep.slice(0, correct).filter((f) => !f).length;
  let finalCorrect = correct - droppedBefore;
  let kept = options.filter((_, i) => keep[i]);

  // Cap at 4 options without ever losing the correct answer
  if (kept.length > 4) {
    const chosen = new Set<number>([finalCorrect]);
    for (let i = 0; i < kept.length && chosen.size < 4; i++) {
      if (i !== finalCorrect) chosen.add(i);
    }
    const remap = new Map<number, number>();
    const capped: string[] = [];
    kept.forEach((o, i) => {
      if (chosen.has(i)) {
        remap.set(i, capped.length);
        capped.push(o);
      }
    });
    finalCorrect = remap.get(finalCorrect) ?? 0;
    kept = capped;
  }

  return spreadCorrect({ ...q, options: kept, correct: finalCorrect });
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
   DIFFICULTY CALIBRATION
   Questions must match the student's onboarding
   level — a Beginner gets beginner-friendly items.
   ═══════════════════════════════════════════ */
interface DifficultyBand {
  labels: ChallengeDifficulty[];
  guidance: string;
}

function difficultyBand(capacityLevel: string, studentLevel: string): DifficultyBand {
  const c = capacityLevel.toLowerCase();
  const l = studentLevel.toLowerCase();
  if (l.includes("begin") || c.includes("novice")) {
    return {
      labels: ["Easier", "Standard"],
      guidance: "BEGINNER-FRIENDLY REQUIRED: test only the absolute fundamentals of the chosen domain that a total beginner meets in their first days. Use plain everyday language, explain any technical term inline, keep code snippets under 3 lines, and avoid tricky \"gotcha\" distractors.",
    };
  }
  if (l.includes("advanc") || c.includes("master")) {
    return {
      labels: ["Challenging", "Expert"],
      guidance: "Advanced student: favour multi-step reasoning, edge cases and production-level pitfalls.",
    };
  }
  return {
    labels: ["Standard", "Challenging"],
    guidance: "Intermediate student: balance fundamentals with light real-world complexity.",
  };
}

function clampDifficulty(d: unknown, band: DifficultyBand): ChallengeDifficulty {
  const v = typeof d === "string" ? (d as ChallengeDifficulty) : undefined;
  if (v && band.labels.includes(v)) return v;
  return band.labels.includes("Standard") ? "Standard" : band.labels[0];
}

/* ═══════════════════════════════════════════
   Generate mixed-type challenges matched to user capacity
   ═══════════════════════════════════════════ */
export async function generateDojoChallenges(
  missionTitle: string,
  domain: string,
  lore: string,
  capacityLevel: string = "Apprentice",
  studentLevel: string = ""
): Promise<DojoChallenge[]> {
  const band = difficultyBand(capacityLevel, studentLevel);
  const systemPrompt: ChatMessage = {
    role: "system",
    content: `You are an AI IT Mentor generating a Duolingo-style interactive learning trial for an engineering student.

Domain: ${domain}
Mission Title: ${missionTitle}
Description/Lore: ${lore}
Student Capacity: ${capacityLevel}
Student Career Level: ${studentLevel || "Beginner"}

DOMAIN STICKINESS RULE: every question MUST be strictly about "${domain}" — the exact path this student chose. Never ask about any other technology domain, even if the mission lore is broad.

${band.guidance}

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
    "correct": 2,
    "explanation": "2-3 sentences explaining why it's correct and how it works.",
    "conceptKey": "core_concept_name"
  }
]

Rules:
- Exactly 4 questions with varied types
- "difficulty" must be one of: ${band.labels.join(", ")}
- "correct" must be an integer (0 to options.length - 1) and its POSITION must vary across the 4 questions (a mix of indexes) — never every answer at the same position
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
          difficulty: clampDifficulty(item.difficulty, band),
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
    return getFallbackDojoChallenges(missionTitle, domain).map(spreadCorrect);
  } catch (err) {
    console.warn("AI Dojo challenge generation failed, using fallback:", err);
    return getFallbackDojoChallenges(missionTitle, domain).map(spreadCorrect);
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
  "correct": 2,
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
    return spreadCorrect(getEasierFallback(missedConcept));
  } catch {
    return spreadCorrect(getEasierFallback(missedConcept));
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

  // Full-Stack (checked before "web" so "Full-Stack Web Development" stays full-stack)
  if (d.includes("full")) {
    return [
      {
        id: 1,
        type: "multiple-choice",
        difficulty: "Standard",
        senseiSays: "Full-stack means both sides of the wire. Start where the data enters the UI.",
        question: "In a React form, how does a text input stay in sync with component state?",
        options: [
          "Set its value from state and update that state in the onChange handler",
          "Write the value directly into the DOM with innerHTML",
          "Only store a ref — state is never needed",
          "Re-mount the component on every keystroke",
        ],
        correct: 0,
        explanation: "A controlled input derives its value from React state, and onChange updates that state — one source of truth.",
        conceptKey: "controlled_inputs",
      },
      {
        id: 2,
        type: "code-fill",
        difficulty: "Standard",
        senseiSays: "The server side of your app decides what each endpoint does.",
        question: "Which HTTP method should create a new task and answer with 201 Created?",
        codeSnippet: "___FILL___(\"/api/tasks\", (req, res) => res.status(201).json(task));",
        options: ["app.post", "app.get", "app.delete", "app.head"],
        correct: 0,
        explanation: "POST is the semantics for creating a resource; 201 Created tells the client a new resource exists.",
        conceptKey: "rest_endpoints",
      },
      {
        id: 3,
        type: "bug-hunt",
        difficulty: "Standard",
        senseiSays: "Never trust the browser — and never store secrets in the clear.",
        question: "Spot the security bug in this signup handler:",
        codeSnippet: "await db.users.insert({ email, password }); // password saved as plain text",
        options: [
          "Passwords must be hashed (e.g. with bcrypt) before storing them",
          "There is no bug — plain text passwords are faster",
          "The insert call must remove the await keyword",
          "email should be stored as a number",
        ],
        correct: 0,
        explanation: "Plaintext passwords leak in breaches; servers store a salted hash so the real password is never persisted.",
        conceptKey: "password_hashing",
      },
      {
        id: 4,
        type: "multiple-choice",
        difficulty: "Standard",
        senseiSays: "Tokens need a home — pick the safest one you can.",
        question: "Where should a web app keep a login token to be safer than localStorage?",
        options: [
          "In an httpOnly cookie set by the server",
          "In localStorage on the client",
          "In the URL query string",
          "In a global JavaScript variable",
        ],
        correct: 0,
        explanation: "httpOnly cookies are inaccessible to JavaScript, so an XSS bug cannot read the token out of the page.",
        conceptKey: "token_storage",
      },
    ];
  }

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

  // Cybersecurity
  if (d.includes("cyber") || d.includes("security")) {
    return [
      {
        id: 1,
        type: "multiple-choice",
        difficulty: "Standard",
        senseiSays: "Every security decision balances these three goals.",
        question: "Which trio is known as the CIA triad of information security?",
        options: [
          "Confidentiality, Integrity, Availability",
          "Code, Internet, Access",
          "Cloud, Identity, Authentication",
          "Control, Isolation, Audit",
        ],
        correct: 0,
        explanation: "The CIA triad frames all security work: keep data secret (confidentiality), trustworthy (integrity) and reachable (availability).",
        conceptKey: "cia_triad",
      },
      {
        id: 2,
        type: "scenario",
        difficulty: "Standard",
        senseiSays: "Humans are the most attacked component of any system.",
        question: "An email urges you to click a link and 'confirm your password'. What do you do?",
        options: [
          "Ignore it and report it as phishing",
          "Click the link and enter the password",
          "Reply to the email with your password",
          "Forward it to the whole team",
        ],
        correct: 0,
        explanation: "Urgent credential requests are classic phishing; report it and verify through an official channel instead.",
        conceptKey: "phishing",
      },
      {
        id: 3,
        type: "code-fill",
        difficulty: "Standard",
        senseiSays: "Servers store proofs of passwords, never passwords themselves.",
        question: "Fill in the bcrypt call that hashes a password before storing it:",
        codeSnippet: "const hash = await bcrypt.___FILL___(password, 10);",
        options: ["hash", "encrypt", "plainify", "sign"],
        correct: 0,
        explanation: "bcrypt.hash(password, saltRounds) produces a salted hash; bcrypt is one-way, so the original password cannot be recovered.",
        conceptKey: "password_hashing",
      },
      {
        id: 4,
        type: "multiple-choice",
        difficulty: "Standard",
        senseiSays: "Perimeter defence starts with traffic rules.",
        question: "What is the primary job of a firewall?",
        options: [
          "Allow or block network traffic based on rules",
          "Encrypt the files on disk",
          "Generate strong passwords for users",
          "Speed up the CPU",
        ],
        correct: 0,
        explanation: "A firewall inspects packets and applies rules — permitting or dropping traffic between networks.",
        conceptKey: "firewall",
      },
    ];
  }

  // Mobile App Development
  if (d.includes("mobile") || d.includes("android") || d.includes("ios")) {
    return [
      {
        id: 1,
        type: "multiple-choice",
        difficulty: "Standard",
        senseiSays: "One codebase, two stores. That is the mobile superpower.",
        question: "Which framework builds both Android and iOS apps from a single codebase?",
        options: ["Flutter", "XAMPP", "MongoDB Compass", "Postman"],
        correct: 0,
        explanation: "Flutter compiles one Dart codebase to native Android and iOS apps.",
        conceptKey: "cross_platform",
      },
      {
        id: 2,
        type: "scenario",
        difficulty: "Standard",
        senseiSays: "Mobile apps live on borrowed time — the system can pause them anytime.",
        question: "What happens to a mobile app when the user switches to another app?",
        options: [
          "The OS may pause it, and later restores its saved state",
          "The app is permanently deleted",
          "All of its variables are instantly wiped",
          "The screen stays on until the battery dies",
        ],
        correct: 0,
        explanation: "Mobile OSes pause background apps to save battery; good apps persist state so it can be restored on return.",
        conceptKey: "app_lifecycle",
      },
      {
        id: 3,
        type: "code-fill",
        difficulty: "Standard",
        senseiSays: "Small settings belong on the device, not the server.",
        question: "Fill in the AsyncStorage call that stores the value \"dark\" under the key \"theme\":",
        codeSnippet: "await AsyncStorage.___FILL___(\"theme\", \"dark\");",
        options: ["setItem", "storeLocal", "saveKey", "persist"],
        correct: 0,
        explanation: "AsyncStorage.setItem(key, value) writes a small string to the device's persistent local storage.",
        conceptKey: "local_storage",
      },
      {
        id: 4,
        type: "pseudocode-order",
        difficulty: "Standard",
        senseiSays: "Every data screen follows the same dance: load, fetch, render.",
        question: "Order the steps of a mobile screen that loads data from an API:",
        pseudocodeLines: [
          "Screen mounts and shows a loading indicator",
          "Fetch the data from the API",
          "Store data in state and render the list",
        ],
        correctOrder: [0, 1, 2],
        options: [
          "1. Show Loading -> 2. Fetch API -> 3. Render List",
          "1. Render List -> 2. Fetch API -> 3. Show Loading",
          "1. Fetch API -> 2. Render List -> 3. Show Loading",
          "1. Show Loading -> 2. Render List -> 3. Fetch API",
        ],
        correct: 0,
        explanation: "The screen shows feedback first, fetches once mounted, then renders the fetched data.",
        conceptKey: "screen_data_flow",
      },
    ];
  }

  // DevOps & Cloud
  if (d.includes("devops") || d.includes("cloud") || d.includes("docker")) {
    return [
      {
        id: 1,
        type: "multiple-choice",
        difficulty: "Standard",
        senseiSays: "Containers are the shipping crates of software.",
        question: "Which statement correctly describes a Docker image vs a container?",
        options: [
          "An image is a read-only template; a container is a running instance of it",
          "A container is the template; an image is what is running",
          "They are two names for the same thing",
          "An image runs directly without any runtime",
        ],
        correct: 0,
        explanation: "You build an image once, then start as many isolated containers from it as you need.",
        conceptKey: "docker_basics",
      },
      {
        id: 2,
        type: "code-fill",
        difficulty: "Standard",
        senseiSays: "CI runs your tests so humans do not have to remember.",
        question: "Which YAML key defines the shell command for a CI step?",
        codeSnippet: "steps:\n  - ___FILL___ npm test",
        options: ["run", "exec", "start", "cmd"],
        correct: 0,
        explanation: "In GitHub Actions each step uses 'run:' followed by the shell command to execute.",
        conceptKey: "ci_pipeline",
      },
      {
        id: 3,
        type: "pseudocode-order",
        difficulty: "Standard",
        senseiSays: "Ship small, verify, then ship everywhere.",
        question: "Order the steps of a safe rolling deployment:",
        pseudocodeLines: [
          "Deploy the new version to a small subset of servers",
          "Run health checks against the new version",
          "Shift 100% of traffic to the new version",
        ],
        correctOrder: [0, 1, 2],
        options: [
          "1. Canary Release -> 2. Health Checks -> 3. Full Rollout",
          "1. Full Rollout -> 2. Canary Release -> 3. Health Checks",
          "1. Health Checks -> 2. Full Rollout -> 3. Canary Release",
          "1. Canary Release -> 2. Full Rollout -> 3. Health Checks",
        ],
        correct: 0,
        explanation: "Start small, verify with health checks, then roll out widely — bad releases never reach all users.",
        conceptKey: "rolling_deploy",
      },
      {
        id: 4,
        type: "multiple-choice",
        difficulty: "Standard",
        senseiSays: "Where your servers live still matters in the cloud.",
        question: "What does choosing a 'region' on a cloud provider mean?",
        options: [
          "The physical datacenter location where your resources run",
          "The programming language runtime",
          "Your billing plan tier",
          "The number of CPU cores",
        ],
        correct: 0,
        explanation: "A region is a geographic datacenter area — closer regions mean lower latency for your users.",
        conceptKey: "cloud_regions",
      },
    ];
  }

  // AI & Machine Learning
  if (d.includes("machine") || d.includes("artificial") || d.includes("neural") || /\bai\b/.test(d)) {
    return [
      {
        id: 1,
        type: "multiple-choice",
        difficulty: "Standard",
        senseiSays: "Labels turn examples into lessons for the model.",
        question: "You have 10,000 emails labelled 'spam' or 'not spam'. Which approach fits?",
        options: [
          "Supervised learning — train on the labelled examples",
          "Unsupervised clustering — labels are not needed",
          "Reinforcement learning — reward the inbox",
          "No learning — rules are always better",
        ],
        correct: 0,
        explanation: "Supervised learning trains on input/output pairs, which is exactly what labelled emails provide.",
        conceptKey: "supervised_learning",
      },
      {
        id: 2,
        type: "multiple-choice",
        difficulty: "Standard",
        senseiSays: "Memorising is not understanding — watch the gap.",
        question: "A model scores 99% on training data but 60% on new data. What is this called?",
        options: [
          "Overfitting — it memorised the training data",
          "Underfitting — it needs more epochs on the same data",
          "Perfect deployment",
          "Data labelling",
        ],
        correct: 0,
        explanation: "A large train/test gap means overfitting; regularization or more data helps the model generalise.",
        conceptKey: "overfitting",
      },
      {
        id: 3,
        type: "code-fill",
        difficulty: "Standard",
        senseiSays: "Reproducible experiments need fixed randomness.",
        question: "Fill in the parameter that makes this train/test split reproducible:",
        codeSnippet: "train_test_split(X, y, test_size=0.2, ___FILL___=42)",
        options: ["random_state", "seed_fn", "shuffle_seed", "variance"],
        correct: 0,
        explanation: "random_state fixes the shuffle seed, so every run splits the data identically.",
        conceptKey: "reproducibility",
      },
      {
        id: 4,
        type: "multiple-choice",
        difficulty: "Standard",
        senseiSays: "Honest evaluation needs unseen data.",
        question: "Why keep a test set separate from the training data?",
        options: [
          "To measure performance on data the model has never seen",
          "To make training faster",
          "To increase the dataset size",
          "To store the labels safely",
        ],
        correct: 0,
        explanation: "Testing on unseen data estimates how the model will behave on real-world examples.",
        conceptKey: "test_set",
      },
    ];
  }

  // Data Science & Analytics
  if (d.includes("data")) {
    return [
      {
        id: 1,
        type: "multiple-choice",
        difficulty: "Standard",
        senseiSays: "Group, then aggregate — the bread and butter of analysis.",
        question: "In pandas, what does df.groupby('city')['sales'].sum() produce?",
        options: [
          "Total sales for each city",
          "A list of cities sorted alphabetically",
          "A chart of sales over time",
          "Only the unique city names",
        ],
        correct: 0,
        explanation: "groupby splits rows by city, and sum() aggregates the sales column within each group.",
        conceptKey: "groupby",
      },
      {
        id: 2,
        type: "scenario",
        difficulty: "Standard",
        senseiSays: "Correlation is a clue, not a verdict.",
        question: "Ice-cream sales and drownings both rise in summer. What can you conclude?",
        options: [
          "A third factor (summer) likely drives both — correlation is not causation",
          "Eating ice cream causes drowning",
          "Drowning causes ice-cream sales",
          "The dataset must be broken",
        ],
        correct: 0,
        explanation: "Two trends moving together do not prove cause and effect; investigate confounding factors first.",
        conceptKey: "correlation_causation",
      },
      {
        id: 3,
        type: "code-fill",
        difficulty: "Standard",
        senseiSays: "Aggregation across rows needs one specific clause.",
        question: "Fill in the SQL clause that counts users per city:",
        codeSnippet: "SELECT city, COUNT(*) FROM users ___FILL___ city;",
        options: ["GROUP BY", "SORT BY", "UNIQUE BY", "TOTAL BY"],
        correct: 0,
        explanation: "GROUP BY collapses rows sharing a city so aggregate functions like COUNT(*) run per group.",
        conceptKey: "sql_grouping",
      },
      {
        id: 4,
        type: "multiple-choice",
        difficulty: "Standard",
        senseiSays: "Pick the chart that answers the question being asked.",
        question: "Which chart best shows how a metric changes over time?",
        options: ["A line chart", "A pie chart", "A word cloud", "A choropleth map"],
        correct: 0,
        explanation: "Line charts connect points in time, making trends and seasonality easy to spot.",
        conceptKey: "chart_choice",
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
