/* ═══════════════════════════════════════════
   AI-POWERED ONBOARDING ENGINE
   Generates personalized questions via Groq AI
   based on user responses. Determines domain,
   difficulty, and learning path.
   ═══════════════════════════════════════════ */

import { chatWithGroq, ChatMessage } from "./ai-client";

export interface OnboardingQuestion {
  id: string;
  senseiDialogue: string[];
  question: string;
  options: { id: string; label: string; description: string }[];
  multiSelect?: boolean;
}

export interface OnboardingProfile {
  name: string;
  answers: Record<string, string | string[]>;
  recommendedDomain: string;
  domainColor: string;
  difficultyLevel: "Beginner" | "Intermediate" | "Advanced";
  learningPathSummary: string;
  interests: string[];
  strengths: string[];
  suggestedTopics: string[];
}

/**
 * Safely extracts JSON payload from AI string response
 */
function extractJson<T>(response: string): T {
  let cleaned = response.replace(/```json/gi, "").replace(/```/gi, "").trim();
  const firstBrace = cleaned.search(/[\{\[]/);
  const lastBrace = Math.max(cleaned.lastIndexOf("}"), cleaned.lastIndexOf("]"));
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }
  return JSON.parse(cleaned) as T;
}

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
   Based only on the user's name — no prior context
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
   Generate the NEXT question based on all
   previous answers — fully personalized
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
    "which specific IT activities interest them most",
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
   Analyze all answers and produce a
   personalized profile recommendation
   ═══════════════════════════════════════════ */
export async function analyzeUserProfile(
  userName: string,
  answers: { question: string; answer: string }[]
): Promise<OnboardingProfile> {
  const answersContext = answers
    .map((a, i) => `Q${i + 1}: "${a.question}" → "${a.answer}"`)
    .join("\n");

  const systemPrompt: ChatMessage = {
    role: "system",
    content: `You are an expert IT career counselor analyzing a student's onboarding responses.

Student: "${userName}"
Responses:
${answersContext}

Based on these answers, determine:
1. The best-fit IT domain for this student
2. Their starting difficulty level
3. A brief learning path summary
4. Their key interests and strengths
5. 5 specific topics they should start learning

Available domains: "Frontend Development", "Backend Development", "Full-Stack Development", "DevOps & Cloud", "Data Science & Analytics", "AI & Machine Learning", "Mobile Development", "Cybersecurity"

Domain colors: Frontend=purple, Backend=teal, Full-Stack=blue, DevOps=amber, Data Science=emerald, AI & ML=rose, Mobile=blue, Cybersecurity=rose

Return ONLY a valid JSON object:
{
  "recommendedDomain": "The best domain name",
  "domainColor": "teal|purple|emerald|amber|rose|blue",
  "difficultyLevel": "Beginner" | "Intermediate" | "Advanced",
  "learningPathSummary": "2-3 sentences explaining why this domain fits and what they'll learn",
  "interests": ["interest1", "interest2", "interest3"],
  "strengths": ["strength1", "strength2"],
  "suggestedTopics": ["topic1", "topic2", "topic3", "topic4", "topic5"]
}

Use simple, encouraging language. Make the student feel excited about their recommended path.
Do NOT wrap in markdown backticks. Return raw JSON only.`,
  };

  try {
    const response = await chatWithGroq([systemPrompt, { role: "user", content: "Analyze now." }], 0.4);
    const parsed = extractJson<any>(response);

    const rawAnswers: Record<string, string | string[]> = {};
    answers.forEach((a, i) => {
      rawAnswers[`q${i}`] = a.answer;
    });

    return {
      name: userName,
      answers: rawAnswers,
      recommendedDomain: parsed.recommendedDomain || "Backend Development",
      domainColor: parsed.domainColor || "teal",
      difficultyLevel: parsed.difficultyLevel || "Beginner",
      learningPathSummary: parsed.learningPathSummary || "You're starting your IT journey — let's build a strong foundation together!",
      interests: parsed.interests || ["problem solving", "building things"],
      strengths: parsed.strengths || ["curiosity", "willingness to learn"],
      suggestedTopics: parsed.suggestedTopics || ["HTML & CSS basics", "Introduction to programming", "How the internet works", "Basic problem solving", "Version control with Git"],
    };
  } catch (err) {
    console.warn("AI profile analysis failed, using fallback:", err);
    const rawAnswers: Record<string, string | string[]> = {};
    answers.forEach((a, i) => {
      rawAnswers[`q${i}`] = a.answer;
    });

    return {
      name: userName,
      answers: rawAnswers,
      recommendedDomain: "Full-Stack Development",
      domainColor: "blue",
      difficultyLevel: "Beginner",
      learningPathSummary: "Based on your interests, Full-Stack Development is a great starting point. You'll learn to build complete web applications from scratch, covering both the visual side users see and the behind-the-scenes logic.",
      interests: ["web development", "problem solving", "building projects"],
      strengths: ["curiosity", "enthusiasm"],
      suggestedTopics: ["HTML & CSS fundamentals", "JavaScript basics", "How websites work", "Introduction to databases", "Building your first project"],
    };
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
      question: "What type of problem-solving excites you most?",
      options: [
        { id: "visual", label: "Visual & User Interface", description: "Designing things that look great and feel smooth to use" },
        { id: "logic", label: "Logic & Core Systems", description: "Building behind-the-scenes systems and server logic" },
        { id: "data", label: "Data & Insights", description: "Discovering patterns and insights hidden in data" },
        { id: "automation", label: "Automation & Cloud", description: "Automating workflows and managing cloud infrastructure" },
        { id: "others", label: "Others", description: "Other types of technical problem-solving" },
      ],
    },
    {
      id: "interests",
      senseiDialogue: [
        "Every domain in technology offers a unique superpower.",
        "Which of these areas catch your attention?",
      ],
      question: "Select the IT areas that interest you. (Pick multiple if you like)",
      options: [
        { id: "software_dev", label: "Software Development", description: "Creating applications, games, or systems" },
        { id: "data_analysis", label: "Data Analysis", description: "Working with data to identify trends and insights" },
        { id: "cybersecurity", label: "Cybersecurity", description: "Protecting computer systems and networks from threats" },
        { id: "networking", label: "Networking", description: "Designing and managing computer networks" },
        { id: "ai_ml", label: "Artificial Intelligence", description: "Developing intelligent systems that can think and learn" },
        { id: "others", label: "Others", description: "Exploring other IT fields or specialized technologies" },
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
