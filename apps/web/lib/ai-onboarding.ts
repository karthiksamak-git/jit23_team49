/* ═══════════════════════════════════════════
   AI-POWERED ONBOARDING ENGINE
   Generates personalized questions via Groq AI.
   Recommendations are produced by scoring every
   answer against the full CareerVerse taxonomy
   (career-taxonomy.ts). There is NO default
   "Full-Stack Development" fallback:
   • Strong matches → RANKED recommendations
   • Weak matches   → Sensei asks a free-text
     question, then re-analyzes
   • Interests outside engineering → honest
     suggestion, no forced roadmap
   ═══════════════════════════════════════════ */

import { chatWithGroq, ChatMessage } from "./ai-client";
import {
  CAREER_DOMAINS,
  CATEGORY_LABELS,
  CareerDomain,
  CareerCategoryId,
  getDomainById,
} from "./career-taxonomy";

export interface OnboardingQuestion {
  id: string;
  senseiDialogue: string[];
  question: string;
  options: { id: string; label: string; description: string }[];
  multiSelect?: boolean;
}

/* ── Ranked recommendation returned by the analysis engine ── */
export interface CareerRecommendation {
  domainId: string;
  domainName: string;
  category: CareerCategoryId;
  categoryLabel: string;
  color: string;
  /** 0–100 display strength */
  matchPercent: number;
  /** which answer signals matched this domain */
  evidence: string[];
  subdomains: string[];
  specializations: string[];
  entryRoles: string[];
  skills: string[];
  roadmap: string[];
  entryAccessibility: CareerDomain["entryAccessibility"];
}

export type ProfileStatus = "matched" | "needs-details" | "outside-engineering";

export interface OnboardingProfile {
  name: string;
  answers: Record<string, string | string[]>;
  status: ProfileStatus;
  /** top pick — kept for dashboard/world-map compatibility */
  recommendedDomain: string;
  domainColor: string;
  difficultyLevel: "Beginner" | "Intermediate" | "Advanced";
  learningPathSummary: string;
  interests: string[];
  strengths: string[];
  suggestedTopics: string[];
  /** full ranked list — top pick first */
  recommendations: CareerRecommendation[];
  /** provenance of the free-text follow-up (if any) */
  freeTextInterest?: string;
  /** suggestion text shown when interests are outside engineering */
  outOfEngineeringSuggestion?: string;
}

/**
 * Safely extracts JSON payload from AI string response
 */
function extractJson<T>(response: string): T {
  let cleaned = response.replace(/```json/gi, "").replace(/```/g, "").trim();
  const firstBrace = cleaned.search(/[\{\[]/);
  const lastBrace = Math.max(cleaned.lastIndexOf("}"), cleaned.lastIndexOf("]"));
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }
  return JSON.parse(cleaned) as T;
}

/* ═══════════════════════════════════════════
   DETERMINISTIC TAXONOMY SCORING
   Every answer label is scanned for domain
   keywords. Exact domain-name mentions count
   strongly. This guarantees that "Others"-only
   answers NEVER default to Full-Stack.
   ═══════════════════════════════════════════ */
export interface DomainScore {
  domain: CareerDomain;
  hits: string[];
  score: number;
}

/** Avoid scoring generic filler words as matches */
function normalizeText(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

export function scoreAnswersToDomains(
  answers: { question: string; answer: string }[]
): DomainScore[] {
  const joined = normalizeText(answers.map((a) => a.answer).join(" · "));

  const scored: DomainScore[] = [];
  for (const domain of CAREER_DOMAINS) {
    const hits: string[] = [];
    let score = 0;

    // Exact domain-name mention is a very strong signal (worth 3)
    const domainName = normalizeText(domain.name);
    if (joined.includes(domainName)) {
      hits.push(domain.name);
      score += 3;
    }

    for (const kw of domain.keywords) {
      if (joined.includes(kw)) {
        hits.push(kw);
        score += 1;
      }
    }

    // Multi-word keywords are stronger evidence — weight them
    for (const kw of domain.keywords) {
      if (kw.includes(" ") && joined.includes(kw)) score += 0.5;
    }

    if (score > 0) scored.push({ domain, hits, score });
  }

  scored.sort((a, b) => b.score - a.score || CAREER_DOMAINS.indexOf(a.domain) - CAREER_DOMAINS.indexOf(b.domain));
  return scored;
}

function toRecommendation(ds: DomainScore): CareerRecommendation {
  const percent = Math.max(38, Math.min(96, Math.round(58 + ds.score * 7)));
  return {
    domainId: ds.domain.id,
    domainName: ds.domain.name,
    category: ds.domain.category,
    categoryLabel: CATEGORY_LABELS[ds.domain.category],
    color: ds.domain.color,
    matchPercent: percent,
    evidence: ds.hits.slice(0, 4),
    subdomains: ds.domain.subdomains,
    specializations: ds.domain.specializations,
    entryRoles: ds.domain.entryRoles,
    skills: ds.domain.skills,
    roadmap: ds.domain.roadmap,
    entryAccessibility: ds.domain.entryAccessibility,
  };
}

function difficultyFromAnswers(answers: { question: string; answer: string }[]): OnboardingProfile["difficultyLevel"] {
  const text = normalizeText(answers.map((a) => a.answer).join(" "));
  if (experiencedText.test(text)) return "Advanced";
  if (projectText.test(text)) return "Intermediate";
  return "Beginner";
}
const experiencedText = /quite experienced|comfortable writing|advanced|experienced/;
const projectText = /some projects|built a few|moderate|few small projects|intermediate/;

/* ═══════════════════════════════════════════
   PROFILE BUILDER (shared)
   ═══════════════════════════════════════════ */
function buildProfileFromScores(
  userName: string,
  answers: { question: string; answer: string }[],
  scored: DomainScore[],
  options: { freeTextInterest?: string; outOfEngineeringSuggestion?: string } = {}
): OnboardingProfile {
  const rawAnswers: Record<string, string | string[]> = {};
  answers.forEach((a, i) => {
    rawAnswers[`q${i}`] = a.answer;
  });

  const top = scored[0];
  const difficulty = difficultyFromAnswers(answers);

  /* ── No signal at all → needs-details (never default). A single real keyword
     hit is enough to surface ranked suggestions instead of blocking the user. ── */
  if (!top || top.score < 1) {
    return {
      name: userName,
      answers: rawAnswers,
      status: "needs-details",
      recommendedDomain: "",
      domainColor: "teal",
      difficultyLevel: difficulty,
      learningPathSummary: "",
      interests: [],
      strengths: [],
      suggestedTopics: [],
      recommendations: [],
      ...options,
    };
  }

  const recs = scored.slice(0, 4).filter((s) => s.score >= Math.max(1, top.score * 0.35));
  const recommendations = recs.map((s) => toRecommendation(s));

  const domain = top.domain;
  return {
    name: userName,
    answers: rawAnswers,
    status: "matched",
    recommendedDomain: domain.name,
    domainColor: domain.color,
    difficultyLevel: difficulty,
    learningPathSummary:
      `${domain.name} matches your answers better than anything else in the taxonomy. ` +
      `Evidence from your responses: ${top.hits.slice(0, 3).join(", ")}. ` +
      `Your first milestones: ${domain.roadmap[0]} → ${domain.roadmap[1]}. ` +
      `Realistic entry roles: ${domain.entryRoles.slice(0, 2).join(", ")}.`,
    interests: recommendations
      .slice(0, 2)
      .flatMap((r) => [r.domainName, ...r.subdomains.slice(0, 1)]),
    strengths: [`${difficulty === "Advanced" ? "Strong" : "Growing"} technical foundation`, "Clear interest direction"],
    suggestedTopics: domain.skills.slice(0, 5),
    recommendations,
    ...options,
  };
}

const OUTSIDE_ENG_FALLBACK_SUGGESTION =
  "Your interests point outside core engineering — and that's okay. " +
  "CareerVerse can't build a roadmap for fields it doesn't train for, but every modern company needs people who can " +
  "communicate clearly, work with data and use technology well. Build those transferable skills, and consider keeping " +
  "one tech-adjacent skill (like data analysis or design) as a safety net for getting hired faster.";

/* ═══════════════════════════════════════════
   MAIN ANALYSIS — deterministic, ranked, honest
   ═══════════════════════════════════════════ */
export async function analyzeUserProfile(
  userName: string,
  answers: { question: string; answer: string }[]
): Promise<OnboardingProfile> {
  const scored = scoreAnswersToDomains(answers);
  return buildProfileFromScores(userName, answers, scored);
}

/* ═══════════════════════════════════════════
   FREE-TEXT FOLLOW-UP ANALYSIS
   Used when the option answers don't match any
   domain. Scans the student's own description
   of their interests; if still nothing matches,
   the AI classifies it as inside/outside
   engineering. Outside engineering → honest
   suggestion, no roadmap.
   ═══════════════════════════════════════════ */
export async function analyzeFreeText(
  userName: string,
  answers: { question: string; answer: string }[],
  freeText: string
): Promise<OnboardingProfile> {
  const cleaned = freeText.trim();
  if (!cleaned) {
    const scored = scoreAnswersToDomains(answers);
    return buildProfileFromScores(userName, answers, scored);
  }

  // 1. Deterministic keyword scan including the free text
  const withText = [...answers, { question: "What kind of work are you really interested in?", answer: cleaned }];
  const scored = scoreAnswersToDomains(withText);
  if (scored[0] && scored[0].score >= 2) {
    return buildProfileFromScores(userName, withText, scored, { freeTextInterest: cleaned });
  }

  // 2. Ask AI to classify (in-taxonomy vs outside engineering)
  try {
    const domainList = CAREER_DOMAINS.map((d) => `${d.id} (${d.name})`).join(", ");
    const systemPrompt: ChatMessage = {
      role: "system",
      content: `You are an IT career classifier. A student says what kind of work they are interested in.

Student statement: "${cleaned}"

The supported taxonomy domains are: ${domainList}

Classify the statement:
- If it clearly fits ONE of the taxonomy domains above, return {"decision":"domain","domainId":"<id>","reason":"one short sentence"}
- If the interest is NOT in the taxonomy and is not something an engineering job platform can train and place a student for (e.g. pure non-engineering profession), return {"decision":"outside-engineering","reason":"one short sentence"}
- Non-engineering does NOT include business, management, design, sales, marketing, finance or analysis roles — those ARE in the taxonomy. Outside-engineering means careers like medicine, law, pure science research unrelated to computing, arts/performance, etc.

Return ONLY raw JSON, no markdown backticks.`,
    };
    const response = await chatWithGroq([systemPrompt, { role: "user", content: "Classify this interest." }], 0.2);
    const parsed = extractJson<{ decision: string; domainId?: string; reason?: string }>(response);

    if (parsed.decision === "domain" && parsed.domainId && getDomainById(parsed.domainId)) {
      const domain = getDomainById(parsed.domainId)!;
      const forced: DomainScore[] = [
        { domain, hits: [cleaned.slice(0, 40)], score: 4 },
      ];
      return buildProfileFromScores(userName, withText, forced, { freeTextInterest: cleaned });
    }

    return {
      name: userName,
      answers: {},
      status: "outside-engineering",
      recommendedDomain: cleaned.slice(0, 60),
      domainColor: "rose",
      difficultyLevel: difficultyFromAnswers(answers),
      learningPathSummary: "",
      interests: [cleaned.slice(0, 60)],
      strengths: [],
      suggestedTopics: [],
      recommendations: [],
      freeTextInterest: cleaned,
      outOfEngineeringSuggestion:
        parsed.reason
          ? `Your interest — ${cleaned.slice(0, 60)} — points outside engineering: ${parsed.reason} ` + OUTSIDE_ENG_FALLBACK_SUGGESTION
          : OUTSIDE_ENG_FALLBACK_SUGGESTION,
    };
  } catch (err) {
    console.warn("AI free-text classification failed, treating as outside-engineering:", err);
    // Honest fallback: no match found → suggestion only, never a fake roadmap
    return {
      name: userName,
      answers: {},
      status: "outside-engineering",
      recommendedDomain: cleaned.slice(0, 60),
      domainColor: "rose",
      difficultyLevel: difficultyFromAnswers(answers),
      learningPathSummary: "",
      interests: [cleaned.slice(0, 60)],
      strengths: [],
      suggestedTopics: [],
      recommendations: [],
      freeTextInterest: cleaned,
      outOfEngineeringSuggestion: OUTSIDE_ENG_FALLBACK_SUGGESTION,
    };
  }
}

/* ═══════════════════════════════════════════
   CONVERTING AN ALTERNATE PICK INTO A PROFILE
   (clicking another recommended domain)
   ═══════════════════════════════════════════ */
export function profileFromRecommendation(
  base: OnboardingProfile,
  rec: CareerRecommendation
): OnboardingProfile {
  const domain = getDomainById(rec.domainId);
  if (!domain) return base;
  return {
    ...base,
    status: "matched",
    recommendedDomain: domain.name,
    domainColor: domain.color,
    learningPathSummary:
      `You chose ${domain.name} from your recommendations. ` +
      `This path fits your stated interests and has ${domain.entryAccessibility === "high" ? "strong" : "moderate"} entry-level accessibility. ` +
      `First milestones: ${domain.roadmap[0]} → ${domain.roadmap[1]}.`,
    suggestedTopics: domain.skills.slice(0, 5),
    recommendations: base.recommendations.map((r) =>
      r.domainId === rec.domainId ? { ...r, matchPercent: Math.max(r.matchPercent, 92) } : r
    ),
  };
}

/* ═══════════════════════════════════════════
   Fallback: still AI-assisted for question
   GENERATION only (kept from previous version)
   ═══════════════════════════════════════════ */

/**
 * Ensures an "Others" option is always included in question options
 */
function ensureOthersOption(q: OnboardingQuestion): OnboardingQuestion {
  if (!q.options || !Array.isArray(q.options)) return q;
  const hasOthers = q.options.some(
    (o) => o.id === "others" || o.label?.toLowerCase().includes("other")
  );
  if (!hasOthers) {
    return {
      ...q,
      options: [
        ...q.options,
        { id: "others", label: "Others", description: "Other topics or custom areas of interest" },
      ],
    };
  }
  return q;
}

/* ═══════════════════════════════════════════
   Generate the FIRST onboarding question
   ═══════════════════════════════════════════ */
export async function generateFirstQuestion(userName: string): Promise<OnboardingQuestion> {
  const systemPrompt: ChatMessage = {
    role: "system",
    content: `You are a friendly IT mentor introducing a new student named "${userName}" to IT career exploration.

Generate the FIRST onboarding question asking about their education background.
Include 2 short dialogue lines for the AI mentor narrator to say before showing the question.

Return ONLY a valid JSON object:
{
  "id": "background",
  "senseiDialogue": [
    "Welcome ${userName}! I'm glad you're taking the first step.",
    "Before we explore your career options, tell me about your background."
  ],
  "question": "Where are you in your studies right now?",
  "options": [
    { "id": "school", "label": "In High School", "description": "Still in high school or preparing for college" },
    { "id": "early_college", "label": "Early Engineering", "description": "First or second year of college/university" },
    { "id": "late_college", "label": "Final Year Student", "description": "Third or fourth year, getting ready for jobs" },
    { "id": "graduate", "label": "Graduated", "description": "Finished college and looking to learn/upskill" },
    { "id": "others", "label": "Others", "description": "Other education backgrounds" }
  ]
}

Rules:
- 2 short dialogue lines in senseiDialogue
- Always include an "others" option
- Simple, clear language
- Do NOT wrap in markdown backticks. Return raw JSON only.`,
  };

  try {
    const response = await chatWithGroq([systemPrompt, { role: "user", content: "Generate first question." }], 0.7);
    const parsed = extractJson<OnboardingQuestion>(response);
    return ensureOthersOption(parsed);
  } catch (err) {
    console.warn("AI first question failed, using fallback:", err);
    return getFallbackQuestion(userName, 1);
  }
}

/* ═══════════════════════════════════════════
   Generate the NEXT question — fully personalized
   ═══════════════════════════════════════════ */
export async function generateNextQuestion(
  userName: string,
  previousAnswers: { question: string; answer: string }[],
  questionNumber: number,
  totalQuestions: number
): Promise<OnboardingQuestion> {
  const answersContext = previousAnswers
    .map((a, i) => `Q${i + 1}: "${a.question}" → Answer: "${a.answer}"`)
    .join("\n");

  const questionTopics = [
    "their coding experience level",
    "what kind of problems they enjoy solving (visual vs logic vs data)",
    "which specific IT-career-related activities interest them most (be VERY concrete: name real fields like web development, mobile apps, data analysis, cybersecurity, AI, cloud, design, sales, marketing, product management, testing, etc.)",
    "how they prefer to learn new things",
    "how much time they can dedicate each day",
    "what their primary career goal is",
  ];

  const topicHint = questionTopics[questionNumber - 1] || "discovering their IT interests and goals";

  const systemPrompt: ChatMessage = {
    role: "system",
    content: `You are a friendly IT mentor assessing a student named "${userName}".
You are on question ${questionNumber} of ${totalQuestions}.

Previous answers:
${answersContext}

Generate the NEXT personalized question focusing on: ${topicHint}.
Include 2 short dialogue lines for the AI mentor narrator to speak before showing the question.

Return ONLY a valid JSON object:
{
  "id": "q_${questionNumber}",
  "senseiDialogue": [
    "First friendly reaction or transition based on their previous answers...",
    "Second dialogue line introducing this question..."
  ],
  "question": "Personalized simple question text",
  "options": [
    { "id": "opt1", "label": "Short Label", "description": "Brief explanation" },
    { "id": "others", "label": "Others", "description": "Other topics or custom interests" }
  ],
  "multiSelect": false
}

Rules:
- 2 short dialogue lines in senseiDialogue
- 3-5 options including an "Others" option
- For IT activities/interests topic, set multiSelect to true
- Option labels must clearly name real career fields, tools or technologies (these labels are scored against a career taxonomy)
- Use clear, simple language
- Do NOT wrap in markdown backticks. Return raw JSON only.`,
  };

  try {
    const response = await chatWithGroq([systemPrompt, { role: "user", content: "Generate next question." }], 0.8);
    const parsed = extractJson<OnboardingQuestion>(response);
    return ensureOthersOption(parsed);
  } catch (err) {
    console.warn(`AI question ${questionNumber} failed, using fallback:`, err);
    return getFallbackQuestion(userName, questionNumber);
  }
}

/* ═══════════════════════════════════════════
   FALLBACK QUESTIONS WITH NARRATOR DIALOGUE
   ═══════════════════════════════════════════ */
function getFallbackQuestion(userName: string, questionNumber: number): OnboardingQuestion {
  const fallbacks: OnboardingQuestion[] = [
    {
      id: "background",
      senseiDialogue: [
        `Welcome ${userName}! I'm glad you're taking the first step.`,
        "Before we explore your career options, tell me about your background.",
      ],
      question: "Where are you in your studies right now?",
      options: [
        { id: "school", label: "In High School", description: "Still in high school or preparing for college" },
        { id: "early_college", label: "Early Engineering", description: "First or second year of college/university" },
        { id: "late_college", label: "Final Year Student", description: "Third or fourth year, getting ready for jobs" },
        { id: "graduate", label: "Graduated", description: "Finished college and looking to learn/upskill" },
        { id: "others", label: "Others", description: "Other education backgrounds" },
      ],
    },
    {
      id: "coding_exp",
      senseiDialogue: [
        "I see. Everyone starts at line one.",
        "Now tell me — how much coding experience do you have?",
      ],
      question: "What is your current experience with programming?",
      options: [
        { id: "none", label: "Brand New", description: "I've never written code before — eager to learn!" },
        { id: "little", label: "A Little Bit", description: "I've done basic tutorials or small exercises" },
        { id: "moderate", label: "Some Projects", description: "I've built a few small projects on my own" },
        { id: "experienced", label: "Quite Experienced", description: "I feel comfortable writing code and building apps" },
        { id: "others", label: "Others", description: "Other practical or self-taught experience" },
      ],
    },
    {
      id: "problem_type",
      senseiDialogue: [
        "Good. Passion matters far more than starting point.",
        "What kind of challenges bring out your best focus?",
      ],
      question: "What type of work energizes you most?",
      options: [
        { id: "visual_web", label: "Websites & User Interfaces", description: "Designing and building things that look great and feel smooth to use" },
        { id: "logic_backend", label: "Servers & Databases", description: "Building behind-the-scenes systems, APIs and server logic" },
        { id: "data_insights", label: "Data Analysis", description: "Discovering patterns and insights hidden in data" },
        { id: "automation_cloud", label: "Cloud & Automation", description: "Automating workflows and managing cloud infrastructure" },
        { id: "others", label: "Others", description: "Other types of technical problem-solving" },
      ],
    },
    {
      id: "interests",
      senseiDialogue: [
        "Every domain in technology offers a unique superpower.",
        "Which of these career fields catch your attention?",
      ],
      question: "Select the career fields that interest you. (Pick multiple if you like)",
      options: [
        { id: "software_dev", label: "Software Development", description: "Creating applications for web, mobile, or desktop" },
        { id: "data_analysis", label: "Data Analysis & AI", description: "Working with data, analytics, statistics and machine learning" },
        { id: "cybersecurity", label: "Cybersecurity", description: "Protecting computer systems and networks from threats" },
        { id: "design_ux", label: "Design & Product", description: "UI/UX design, product design, or product management" },
        { id: "business_tech", label: "Tech Business Roles", description: "Project management, business analysis, sales or marketing for tech companies" },
        { id: "network_cloud", label: "Cloud & Networking", description: "Cloud platforms, networking, DevOps, or system administration" },
        { id: "others", label: "Others", description: "Exploring other fields or specialized technologies" },
      ],
      multiSelect: true,
    },
    {
      id: "learning_style",
      senseiDialogue: [
        "Understanding how you learn is key to making fast progress.",
        "How do you prefer to absorb new knowledge?",
      ],
      question: "What is your preferred learning style?",
      options: [
        { id: "hands_on", label: "Practical Projects", description: "Build real projects right away and learn by doing" },
        { id: "reading", label: "Structured Concepts", description: "Understand core theory first, then apply it" },
        { id: "mix", label: "Balanced Approach", description: "A mix of quick theory and hands-on practice" },
        { id: "others", label: "Others", description: "Other self-directed or visual learning styles" },
      ],
    },
    {
      id: "time_commitment",
      senseiDialogue: [
        "Consistency turns small steps into remarkable achievements.",
        "How much time can you dedicate each day?",
      ],
      question: "Set your daily learning commitment.",
      options: [
        { id: "15min", label: "15 Minutes / Day", description: "Quick daily practice to build a habit" },
        { id: "30min", label: "30 Minutes / Day", description: "Steady progress without feeling overwhelmed" },
        { id: "1hour", label: "1 Hour / Day", description: "Solid daily practice for fast skill growth" },
        { id: "2hours", label: "2+ Hours / Day", description: "Deep commitment to become job-ready quickly" },
        { id: "others", label: "Others", description: "Flexible or weekend schedule" },
      ],
    },
  ];

  const idx = Math.min(questionNumber - 1, fallbacks.length - 1);
  return fallbacks[idx];
}
