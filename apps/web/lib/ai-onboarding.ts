/* ═══════════════════════════════════════════
   AI-POWERED ONBOARDING ENGINE
   The question flow is the deterministic six-
   question tree in onboarding-questions.ts.
   The AI validates free-text custom input and
   ranks paths from ALL answers together.
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
  /** "text" = free-text custom-description step (still one numbered question) */
  inputKind?: "text";
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
  /** custom heading for rejected (out-of-scope / unsafe) custom input */
  rejectionHeading?: string;
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
  // The structured Q2 experienceLevel label wins when present
  if (/\badvanced\b/.test(text)) return "Advanced";
  if (/intermediate/.test(text)) return "Intermediate";
  if (/complete beginner|basic knowledge|beginner/.test(text)) return "Beginner";
  if (experiencedText.test(text)) return "Advanced";
  if (projectText.test(text)) return "Intermediate";
  return "Beginner";
}
const experiencedText = /quite experienced|comfortable writing|advanced|experienced/;
const projectText = /some projects|built a few|moderate|few small projects|intermediate/;

/* Study availability shapes the SCHEDULE only — never the career choice. */
function studyNoteFromAnswers(answers: { question: string; answer: string }[]): string {
  const text = normalizeText(answers.map((a) => a.answer).join(" · "));
  if (text.includes("less than 1 hour")) return "Suggested pace: compact daily sessions — one focused topic per sitting.";
  if (text.includes("1–2 hours") || text.includes("1-2 hours")) return "Suggested pace: a steady daily session — one milestone every few days.";
  if (text.includes("2–4 hours") || text.includes("2-4 hours")) return "Suggested pace: a balanced daily schedule — theory, practice and a project block.";
  if (text.includes("more than 4 hours")) return "Suggested pace: an intensive schedule — fast milestones with substantial project work.";
  return "";
}

/* ═══════════════════════════════════════════
   PROFILE BUILDER (shared)
   ═══════════════════════════════════════════ */
function buildProfileFromScores(
  userName: string,
  answers: { question: string; answer: string }[],
  scored: DomainScore[],
  options: { freeTextInterest?: string; outOfEngineeringSuggestion?: string; aiExplanation?: string } = {}
): OnboardingProfile {
  const rawAnswers: Record<string, string | string[]> = {};
  answers.forEach((a, i) => {
    rawAnswers[`q${i}`] = a.answer;
  });

  const top = scored[0];
  const difficulty = difficultyFromAnswers(answers);
  const pace = studyNoteFromAnswers(answers);

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
      `Realistic entry roles: ${domain.entryRoles.slice(0, 2).join(", ")}.` +
      (options.aiExplanation ? ` ${options.aiExplanation}` : "") +
      (pace ? ` ${pace}` : ""),
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
  const deterministic = scoreAnswersToDomains(answers);
  let scored = deterministic;
  let aiExplanation = "";

  /* ── AI pass: analyse ALL answers together and rank taxonomy domains.
     The selected direction is evidence of interest, not proof it is the
     best fit — the AI may surface a better-fitting related role.
     Falls back to deterministic scoring when the AI is unavailable. ── */
  try {
    const domainList = CAREER_DOMAINS.map((d) => `${d.id}: ${d.name}`).join("\n");
    const answerBlock = answers
      .map((a, i) => `Answer ${i + 1} — ${a.question}\n${a.answer}`)
      .join("\n\n");
    const systemPrompt: ChatMessage = {
      role: "system",
      content: `You are a senior IT career advisor analysing a student's complete onboarding responses.

All answers:
${answerBlock}

Taxonomy domains — rank ONLY using these exact ids:
${domainList}

Rules:
- Analyse all answers together; do not map a single answer directly to a role.
- The selected career direction is evidence of stated interest, not proof it is the best fit; recommend a related role when the evidence supports it.
- Daily study availability affects the learning schedule only, never the domain choice.
- Consider the student's experience level and objective when ranking.
- Where the answers are thin, say so honestly in the explanation rather than inventing certainty.

Return ONLY raw JSON:
{"rankings":[{"domainId":"<id>","reason":"one short sentence"}],"explanation":"2-3 sentences on why these paths fit, plus any uncertainty"}
Rank 1 to 3 domains.`,
    };
    const response = await chatWithGroq(
      [systemPrompt, { role: "user", content: "Rank the best-fitting career domains for this student." }],
      0.3
    );
    const parsed = extractJson<{ rankings?: { domainId: string; reason?: string }[]; explanation?: string }>(response);
    const valid = (parsed.rankings || []).filter((r) => getDomainById(r.domainId));
    if (valid.length > 0) {
      const remaining = new Map(deterministic.map((d) => [d.domain.id, d] as const));
      const merged: DomainScore[] = [];
      valid.forEach((r, i) => {
        const domain = getDomainById(r.domainId)!;
        const base = remaining.get(domain.id);
        remaining.delete(domain.id);
        const reason = (r.reason || "").trim().slice(0, 90);
        merged.push({
          domain,
          hits: [...(base?.hits || []), ...(reason ? [reason] : [])],
          score: Math.max(base?.score || 0, 8 - i),
        });
      });
      deterministic.forEach((d) => {
        if (remaining.has(d.domain.id)) merged.push(d);
      });
      scored = merged;
      aiExplanation = (parsed.explanation || "").trim().slice(0, 400);
    }
  } catch (err) {
    console.warn("AI ranking unavailable — using taxonomy scoring:", err);
  }

  return buildProfileFromScores(userName, answers, scored, aiExplanation ? { aiExplanation } : {});
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
   CUSTOM-INPUT VALIDATION ("Others" description)
   Returns one of the four spec outcomes. An
   "ambiguous" clarification is attached to the
   custom-input step — never a new numbered
   question. Out-of-scope and unsafe outcomes
   stop the recommendation flow.
   ═══════════════════════════════════════════ */
export type CustomInputOutcome =
  | "relevant"
  | "ambiguous"
  | "out_of_scope"
  | "unsafe_or_disallowed";

export interface CustomInputResult {
  outcome: CustomInputOutcome;
  /** clarification or explanation shown to the student */
  message: string;
}

export async function validateCustomInput(
  userName: string,
  text: string,
  contextAnswers: { question: string; answer: string }[]
): Promise<CustomInputResult> {
  const cleaned = text.trim();
  if (!cleaned) {
    return {
      outcome: "ambiguous",
      message: "Please describe the kind of work you want in a little more detail.",
    };
  }

  const context = contextAnswers.map((a) => `${a.question} → ${a.answer}`).join("\n");

  try {
    const domainList = CAREER_DOMAINS.map((d) => `${d.id} (${d.name})`).join(", ");
    const systemPrompt: ChatMessage = {
      role: "system",
      content: `You validate a custom career description from a student named "${userName}" during IT career onboarding.

Student's description: "${cleaned}"
Previous answers:
${context}

Supported IT taxonomy domains: ${domainList}

Classify the description and return EXACTLY one of these outcomes:
- "relevant": it describes (or clearly relates to) an IT/technology career or goal. Examples: building an AI assistant that answers questions about PDF files; creating a mobile app for managing personal expenses; analysing cricket match statistics; automating business workflows using software.
- "ambiguous": too vague to identify any career direction (e.g. "I want to do something with computers").
- "out_of_scope": a clearly non-IT goal. Examples: becoming a professional cricket player, becoming a chef, learning professional cooking.
- "unsafe_or_disallowed": a request that facilitates harmful or illegal activity.

Return ONLY raw JSON:
{"outcome":"<outcome>","message":"one short sentence — a clarifying question for ambiguous, a polite explanation for out_of_scope, a safe redirect for unsafe_or_disallowed, empty for relevant"}`,
    };
    const response = await chatWithGroq(
      [systemPrompt, { role: "user", content: "Classify this custom description." }],
      0.2
    );
    const parsed = extractJson<{ outcome?: string; message?: string }>(response);
    const allowed: CustomInputOutcome[] = ["relevant", "ambiguous", "out_of_scope", "unsafe_or_disallowed"];
    if (parsed.outcome && allowed.includes(parsed.outcome as CustomInputOutcome)) {
      const outcome = parsed.outcome as CustomInputOutcome;
      const fallbacks: Record<CustomInputOutcome, string> = {
        relevant: "",
        ambiguous: "Could you describe it in a little more detail — what kind of work do you want to do?",
        out_of_scope:
          "CareerVerse specialises in IT careers and technology-focused learning paths, so we cannot build a roadmap for that goal.",
        unsafe_or_disallowed:
          "We can't help with that. CareerVerse focuses on safe, legitimate technical careers such as software development, cybersecurity defense and data engineering.",
      };
      return { outcome, message: (parsed.message || "").trim() || fallbacks[outcome] };
    }
    throw new Error("unrecognised outcome");
  } catch (err) {
    // Deterministic fallback when the classifier is unavailable:
    // taxonomy keyword hits decide; never a fake roadmap from nothing.
    console.warn("AI custom-input validation failed, using keyword fallback:", err);
    const scored = scoreAnswersToDomains([{ question: "Custom goal", answer: cleaned }]);
    if (scored[0] && scored[0].score >= 2) return { outcome: "relevant", message: "" };
    if (scored[0] && scored[0].score >= 1)
      return {
        outcome: "ambiguous",
        message: "Could you describe that a little more concretely — which technology or task do you have in mind?",
      };
    return {
      outcome: "out_of_scope",
      message:
        "CareerVerse specialises in IT careers and technology-focused learning paths, so we cannot build a roadmap for that goal. If your interests do involve technology, revise your description and try again.",
    };
  }
}

