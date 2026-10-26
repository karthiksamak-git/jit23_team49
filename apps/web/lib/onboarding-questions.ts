/* ═══════════════════════════════════════════
   SIX-QUESTION ADAPTIVE ONBOARDING TREE
   Deterministic state machine — every valid
   path is exactly 6 numbered questions:
     Q1 educationStage
     Q2 experienceLevel
     Q3 careerObjective
     Q4 careerDirection (7 options incl. Others)
     Q5 adaptive refinement (varies by Q4) —
        or the custom-description text field
        when Q4 = Others
     Q6 studyAvailability (no Others — final)
   The AI never generates question structure;
   it only personalises narration and, after
   Q6, analyses all six answers together.
   ═══════════════════════════════════════════ */

import type { OnboardingQuestion } from "./ai-onboarding";

export const TOTAL_QUESTIONS = 6;

/** Structured key stored for each numbered step */
export const ANSWER_KEYS = [
  "educationStage",
  "experienceLevel",
  "careerObjective",
  "careerDirection",
  "careerRefinement", // or customCareerDescription when free text is used
  "studyAvailability",
] as const;

export interface RecordedAnswer {
  /** structured key — educationStage, experienceLevel, … */
  answerKey: string;
  questionId: string;
  questionText: string;
  selectedIds: string[];
  selectedLabels: string[];
}

const OPT = (id: string, label: string, description: string) => ({ id, label, description });

/* ── QUESTION 1 — Education Stage ── */
function q1(userName: string): OnboardingQuestion {
  return {
    id: "education_stage",
    senseiDialogue: [
      `Welcome ${userName}. Six short questions — answered honestly, they map a real road for you.`,
      "First: where are you in your educational journey?",
    ],
    question: "Where are you in your educational journey?",
    options: [
      OPT("early_college", "Early College Student", "First or second year of college"),
      OPT("final_year", "Final-Year Student", "Approaching graduation and preparing for employment"),
      OPT("graduate", "Graduate", "Completed college and looking to enter IT or develop new skills"),
    ],
  };
}

/* ── QUESTION 2 — Current IT Knowledge ── */
function q2(prior: RecordedAnswer[]): OnboardingQuestion {
  const stage = prior[0]?.selectedLabels[0] || "your stage";
  return {
    id: "experience_level",
    senseiDialogue: [
      `${stage} — noted. Education is background, not ability.`,
      "Now, honestly: how would you describe your current knowledge of IT?",
    ],
    question: "How would you describe your current knowledge of IT?",
    options: [
      OPT("beginner", "Complete Beginner", "Little or no practical experience"),
      OPT("basic", "Basic Knowledge", "Understand some concepts but need practice"),
      OPT("intermediate", "Intermediate", "Can use technical tools or build small projects"),
      OPT("advanced", "Advanced", "Have substantial practical experience and want to deepen or specialize skills"),
    ],
  };
}

/* ── QUESTION 3 — Career Objective ── */
function q3(prior: RecordedAnswer[]): OnboardingQuestion {
  const exp = prior[1]?.selectedIds[0];
  const opener =
    exp === "beginner"
      ? "Everyone starts at line one — where you start does not decide where you finish."
      : exp === "advanced"
      ? "Strong footing. From here we aim at depth, not basics."
      : "Good — you already have ground to build on.";
  return {
    id: "career_objective",
    senseiDialogue: [opener, "What do you want to achieve through learning IT?"],
    question: "What do you want to achieve through learning IT?",
    options: [
      OPT("first_job", "Get My First IT Job", "Build skills for an entry-level position"),
      OPT("internship", "Secure an Internship", "Develop practical skills and prepare for internship applications"),
      OPT("choose_path", "Choose a Career Path", "Identify a suitable IT specialization"),
      OPT("advance_skills", "Advance My Technical Skills", "Develop deeper expertise in a technical area"),
      OPT("build_product", "Build My Own Product", "Create an application, software product, or technology-based business"),
    ],
  };
}

/* ── QUESTION 4 — Career Direction ── */
function q4(prior: RecordedAnswer[]): OnboardingQuestion {
  const objective = prior[2]?.selectedIds[0];
  const opener =
    objective === "first_job"
      ? "Job readiness it is — every question from here serves that goal."
      : objective === "internship"
      ? "Internships reward fundamentals and shipped projects — keep that in mind."
      : objective === "choose_path"
      ? "Then this assessment exists for exactly that — we will compare paths honestly."
      : objective === "advance_skills"
      ? "We will prioritise depth and specialisation over basics."
      : objective === "build_product"
      ? "Building a product changes which skills matter — we will weight execution."
      : "Clear. Let us point the remaining questions at that goal.";
  return {
    id: "career_direction",
    senseiDialogue: [opener, "Which IT career area would you like to explore?"],
    question: "Which IT career area would you like to explore?",
    options: [
      OPT("software_dev", "Software Development", "Building applications and software"),
      OPT("data_ai", "Data & AI", "Working with data, analytics, AI, and machine learning"),
      OPT("cybersecurity", "Cybersecurity", "Protecting systems and investigating vulnerabilities"),
      OPT("cloud_devops", "Cloud & DevOps", "Managing infrastructure, cloud services, and deployment"),
      OPT("uiux_frontend", "UI/UX & Frontend Design", "Designing and building user-facing experiences"),
      OPT("qa_testing", "Quality Assurance & Testing", "Testing software and improving reliability"),
      OPT("others", "Others", "Describe the IT career or type of work you want in your own words"),
    ],
  };
}

/* ── QUESTION 5 — adaptive refinement per Q4 ── */
type Branch5 = { question: string; options: ReturnType<typeof OPT>[] };

const Q5_BRANCHES: Record<string, Branch5> = {
  software_dev: {
    question: "What type of software would you like to develop?",
    options: [
      OPT("web_apps", "Websites and web applications", "Browser-based products, front to back"),
      OPT("mobile_desktop", "Mobile or desktop applications", "Apps that run on devices"),
      OPT("software_systems", "Software systems and programming", "Core programming, libraries and systems work"),
      OPT("full_lifecycle", "Full applications, from development to deployment", "Build and ship complete products"),
      OPT("others", "Others", "Describe the kind of software you want to build"),
    ],
  },
  data_ai: {
    question: "Which area of data and AI interests you most?",
    options: [
      OPT("data_analysis", "Data analysis and visualization", "Turn numbers into decisions and charts"),
      OPT("data_engineering", "Data engineering and data pipelines", "Move, store and prepare data at scale"),
      OPT("ai_apps", "Building AI-powered applications", "Ship products that use AI models"),
      OPT("ml_models", "Machine learning and predictive models", "Train models that learn from data"),
      OPT("others", "Others", "Describe the data or AI work you want to do"),
    ],
  },
  cybersecurity: {
    question: "Which cybersecurity area would you like to explore?",
    options: [
      OPT("pentesting", "Penetration testing in authorized environments", "Find weaknesses before attackers do"),
      OPT("security_ops", "Security monitoring and incident response", "Detect and respond to attacks"),
      OPT("appsec", "Application security", "Secure software through the development lifecycle"),
      OPT("forensics", "Digital forensics", "Investigate incidents and trace attacker activity"),
      OPT("others", "Others", "Describe the security work you want to do"),
    ],
  },
  cloud_devops: {
    question: "Which area would you like to focus on?",
    options: [
      OPT("cloud_engineering", "Cloud engineering", "Design and run cloud infrastructure"),
      OPT("devops_cicd", "DevOps and CI/CD", "Automate build, test and release pipelines"),
      OPT("infra_automation", "Infrastructure automation", "Code your infrastructure instead of clicking consoles"),
      OPT("sre", "Site reliability engineering", "Keep systems available and scalable"),
      OPT("others", "Others", "Describe the infrastructure work you want to do"),
    ],
  },
  uiux_frontend: {
    question: "Which area would you like to focus on?",
    options: [
      OPT("ui_design", "UI design", "Visual design — layout, type, colour, components"),
      OPT("ux_research", "UX design and research", "Understand users and design flows that work"),
      OPT("frontend_dev", "Frontend development", "Turn designs into fast, accessible interfaces"),
      OPT("design_plus_dev", "Combining design and frontend development", "Own both the design and its implementation"),
      OPT("others", "Others", "Describe the design work you want to do"),
    ],
  },
  qa_testing: {
    question: "Which testing area would you like to explore?",
    options: [
      OPT("manual_testing", "Manual testing", "Explore software and find what breaks"),
      OPT("test_automation", "Test automation", "Write code that tests code"),
      OPT("api_testing", "API testing", "Verify services contracts and integrations"),
      OPT("performance_testing", "Performance testing", "Find bottlenecks under real load"),
      OPT("others", "Others", "Describe the testing work you want to do"),
    ],
  },
};

/* ── QUESTION 6 — Daily Study Availability (always final, no Others) ── */
function q6(prior: RecordedAnswer[]): OnboardingQuestion {
  const direction = prior[3]?.selectedLabels[0] || "this direction";
  return {
    id: "study_availability",
    senseiDialogue: [
      `One question left on ${direction}.`,
      "How many hours per day can you dedicate to studying IT topics?",
    ],
    question: "How many hours per day can you dedicate to studying IT topics?",
    options: [
      OPT("lt_1h", "Less than 1 hour", "A small, consistent daily session"),
      OPT("h_1_2", "1–2 hours", "A steady session most days"),
      OPT("h_2_4", "2–4 hours", "Substantial daily practice"),
      OPT("gt_4h", "More than 4 hours", "An intensive, fast-paced schedule"),
    ],
  };
}

/** The custom-description text step (Q5 when the branch calls for free text) */
function customStep(prior: RecordedAnswer[]): OnboardingQuestion {
  const fromQ4 = prior[3]?.selectedIds[0] === "others";
  return {
    id: "custom_career",
    inputKind: "text",
    senseiDialogue: fromQ4
      ? [
          "No predefined box fits you — that is fine. Precision beats a label.",
          "Describe the IT career or type of work you want, in your own words.",
        ]
      : [
          "Write your own description — job title optional.",
          "Tell me the kind of work you want, and I will map it.",
        ],
    question: fromQ4
      ? "Describe the IT career or type of work you want — in your own words."
      : "Describe what you want in this area — in your own words.",
    options: [],
  };
}

/**
 * Returns the question for a numbered step (0-indexed).
 * Only prior answers with index < step are read, so re-entering a step
 * after a change always recalculates the correct branch.
 */
export function getQuestion(
  step: number,
  priorAnswers: RecordedAnswer[],
  userName: string
): OnboardingQuestion {
  const prior = priorAnswers.slice(0, step);
  switch (step) {
    case 0:
      return q1(userName);
    case 1:
      return q2(prior);
    case 2:
      return q3(prior);
    case 3:
      return q4(prior);
    case 4: {
      const direction = prior[3]?.selectedIds[0];
      if (!direction || direction === "others") return customStep(prior);
      const branch = Q5_BRANCHES[direction];
      if (!branch) return customStep(prior);
      const dirLabel = prior[3]?.selectedLabels[0] || "your direction";
      return {
        id: `refine_${direction}`,
        senseiDialogue: [
          `${dirLabel} — good ground. Now we separate its paths.`,
          branch.question,
        ],
        question: branch.question,
        options: branch.options,
      };
    }
    case 5:
    default:
      return q6(prior);
  }
}

/** Does this option open the free-text field instead of advancing? */
export function opensCustomText(step: number, optionId: string): boolean {
  return step === 4 && optionId === "others";
}

/** Structured key for the answer recorded at a step (Q5 depends on the branch) */
export function answerKeyForStep(step: number, selection: string[], prior: RecordedAnswer[]): string {
  if (step === 4) {
    const direction = prior[3]?.selectedIds[0];
    if (direction === "others" || selection[0] === "others") return "customCareerDescription";
    return "careerRefinement";
  }
  return ANSWER_KEYS[step] || `q${step}`;
}
