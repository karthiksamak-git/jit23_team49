/* ═══════════════════════════════════════════
   GROQ AI CLIENT LAYER
   Calls our own /api/ai proxy — the Groq API
   key stays on the server and is never shipped
   to the browser.
   ═══════════════════════════════════════════ */

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function chatWithGroq(messages: ChatMessage[], temperature = 0.7): Promise<string> {
  const MAX_ATTEMPTS = 2;
  let lastError = "AI unavailable";

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages, temperature }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.content) {
        return data.content as string;
      }

      lastError = data?.error || `AI proxy returned HTTP ${res.status}`;
      // 429 (rate limit) and 5xx are transient → one backoff retry, then give
      // up so the caller's built-in fallback content takes over.
      const retryable = res.status === 429 || res.status >= 500;
      if (!retryable || attempt === MAX_ATTEMPTS - 1) break;
    } catch (err: any) {
      lastError = err?.message || "AI unavailable";
      if (attempt === MAX_ATTEMPTS - 1) break;
    }
    await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
  }

  console.warn("Groq AI query unavailable, proceeding with fallback:", lastError);
  throw new Error(lastError);
}

/* ═══════════════════════════════════════════
   AI MENTOR RESPONSE
   Professional IT career mentor
   ═══════════════════════════════════════════ */
export async function getMentorResponse(
  userQuery: string,
  userContext: {
    characterName?: string;
    level?: number;
    realmName?: string;
    xp?: number;
    currentRoute?: string;
    completedMissions?: string[];
    interests?: string[];
    recommendedDomain?: string;
  },
  chatHistory: ChatMessage[] = []
): Promise<string> {
  const systemPrompt: ChatMessage = {
    role: "system",
    content: `You are an AI Career Mentor on CareerVerse — a platform that helps engineering students discover and prepare for IT careers.

The student is named '${userContext.characterName || "Learner"}' (Level ${userContext.level || 1}, studying ${userContext.recommendedDomain || userContext.realmName || "IT"}, ${userContext.xp || 0} XP).
Their interests: ${userContext.interests?.join(", ") || "exploring IT careers"}.
Current page: ${userContext.currentRoute || "/"}.

Guidelines:
1. Be friendly, encouraging, and professional. Use simple language.
2. Give practical, actionable advice for IT career development and learning.
3. Keep responses concise (2-4 sentences unless explaining something complex).
4. When relevant, suggest next steps on the platform (Learning Path, Practice Lab, Mock Interview, Jobs section).
5. Focus on helping them become job-ready in their domain of interest.`,
  };

  const messages: ChatMessage[] = [
    systemPrompt,
    ...chatHistory.slice(-6),
    { role: "user", content: userQuery },
  ];

  return await chatWithGroq(messages, 0.7);
}

/* ═══════════════════════════════════════════
   AI INTERVIEW EVALUATOR
   ═══════════════════════════════════════════ */
export interface InterviewScorecard {
  technicalScore: number;
  problemSolvingScore: number;
  systemDesignScore: number;
  communicationScore: number;
  overallScore: number;
  verdict: "Pass" | "Requires Practice" | "Mastery Achieved";
  strengths: string[];
  improvements: string[];
  feedback: string;
  xpAwarded: number;
}

export async function evaluateInterviewAnswer(
  role: string,
  question: string,
  userAnswer: string
): Promise<InterviewScorecard> {
  const systemPrompt: ChatMessage = {
    role: "system",
    content: `You are an experienced IT interviewer evaluating a candidate for '${role}'.
Evaluate their answer fairly and constructively. Use simple, clear feedback.

Question: "${question}"
Answer: "${userAnswer}"

Return ONLY a valid JSON object:
{
  "technicalScore": number (0-100),
  "problemSolvingScore": number (0-100),
  "systemDesignScore": number (0-100),
  "communicationScore": number (0-100),
  "overallScore": number (0-100),
  "verdict": "Pass" | "Requires Practice" | "Mastery Achieved",
  "strengths": ["strength 1", "strength 2"],
  "improvements": ["area to improve 1", "area to improve 2"],
  "feedback": "2-3 sentences of constructive feedback in simple language.",
  "xpAwarded": number (50-250)
}
Do NOT wrap in markdown backticks. Return raw JSON only.`,
  };

  const response = await chatWithGroq([systemPrompt, { role: "user", content: "Evaluate now." }], 0.2);

  try {
    const cleaned = response.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleaned) as InterviewScorecard;
  } catch (err) {
    console.error("Failed to parse interview scorecard:", response, err);
    return {
      technicalScore: 78,
      problemSolvingScore: 82,
      systemDesignScore: 75,
      communicationScore: 85,
      overallScore: 80,
      verdict: "Pass",
      strengths: ["Good understanding of core concepts", "Clear explanation structure"],
      improvements: ["Cover edge cases", "Add more specific examples"],
      feedback: "A solid answer showing good foundational knowledge. Try to include more concrete examples from real projects to strengthen your response.",
      xpAwarded: 150,
    };
  }
}

/* ═══════════════════════════════════════════
   JOB & INTERNSHIP MATCHING ENGINE
   ═══════════════════════════════════════════ */
export interface JobOpportunity {
  id: string;
  title: string;
  company: string;
  type: "Job" | "Internship" | "Contract";
  location: string;
  salaryOrStipend: string;
  matchScore: number;
  requiredSkills: string[];
  userSkillsMet: string[];
  skillGaps: string[];
  reason: string;
  applyUrl: string;
}

export async function matchJobsWithUserSkills(
  userProfile: {
    characterName?: string;
    realmName?: string;
    level?: number;
    completedMissions?: string[];
    skills?: string[];
    interests?: string[];
    recommendedDomain?: string;
  }
): Promise<JobOpportunity[]> {
  const domain = userProfile.recommendedDomain || userProfile.realmName || "IT Fundamentals";
  const userSkillsStr = (userProfile.skills || ["HTML", "CSS", "JavaScript", "Problem Solving"]).join(", ");
  const interestsStr = (userProfile.interests || []).join(", ");

  const systemPrompt: ChatMessage = {
    role: "system",
    content: `You are an IT job matching advisor.
The student has these skills: [${userSkillsStr}].
Domain: ${domain}. Level: ${userProfile.level || 1}. Interests: ${interestsStr || "IT careers"}.

Generate 4 realistic IT job and internship recommendations suited to their level.
Include a mix of entry-level jobs and internships.
Use real company names where appropriate.

Return ONLY a valid JSON array:
[
  {
    "id": "job-1",
    "title": "Junior Developer",
    "company": "Company Name",
    "type": "Job" or "Internship",
    "location": "Remote / City",
    "salaryOrStipend": "$X / yr or $X / month",
    "matchScore": 85,
    "requiredSkills": ["skill1", "skill2"],
    "userSkillsMet": ["skill1"],
    "userSkillGaps": ["skill2"],
    "reason": "Why this job fits their profile in simple language.",
    "applyUrl": "https://careers.example.com"
  }
]
Do NOT wrap in markdown backticks. Return raw JSON only.`,
  };

  const response = await chatWithGroq([systemPrompt, { role: "user", content: "Match opportunities now." }], 0.3);

  try {
    const cleaned = response.replace(/```json/g, "").replace(/```/g, "").trim();
    const rawList = JSON.parse(cleaned);
    return rawList.map((item: any, idx: number) => ({
      id: item.id || `job-${idx + 1}`,
      title: item.title || "Software Developer Intern",
      company: item.company || "Tech Company",
      type: item.type || "Internship",
      location: item.location || "Remote",
      salaryOrStipend: item.salaryOrStipend || "$3,000 / month",
      matchScore: item.matchScore || 80,
      requiredSkills: item.requiredSkills || ["JavaScript", "Problem Solving"],
      userSkillsMet: item.userSkillsMet || ["JavaScript"],
      skillGaps: item.userSkillGaps || item.skillGaps || ["React"],
      reason: item.reason || "Your skills and interests align well with this role.",
      applyUrl: item.applyUrl || "https://careers.google.com",
    }));
  } catch (err) {
    console.error("Failed to parse job matches:", response, err);
    return [
      {
        id: "job-1",
        title: `Junior ${domain} Developer`,
        company: "Google",
        type: "Job",
        location: "Remote",
        salaryOrStipend: "$85,000 - $110,000 / yr",
        matchScore: 88,
        requiredSkills: ["JavaScript", "TypeScript", "REST APIs", "SQL"],
        userSkillsMet: ["JavaScript", "TypeScript"],
        skillGaps: ["System Design"],
        reason: "Your learning progress in this domain makes you a great fit for entry-level roles.",
        applyUrl: "https://careers.google.com",
      },
      {
        id: "job-2",
        title: `${domain} Intern`,
        company: "Microsoft",
        type: "Internship",
        location: "Remote / Hybrid",
        salaryOrStipend: "$5,000 / month",
        matchScore: 92,
        requiredSkills: ["HTML", "CSS", "JavaScript", "Git"],
        userSkillsMet: ["HTML", "CSS", "JavaScript"],
        skillGaps: ["CI/CD Pipelines"],
        reason: "Internship programs value enthusiasm and foundational skills — you're on the right track!",
        applyUrl: "https://careers.microsoft.com",
      },
      {
        id: "job-3",
        title: "Software Engineering Trainee",
        company: "Infosys",
        type: "Job",
        location: "Bangalore / Hybrid",
        salaryOrStipend: "₹4.5L - ₹6L / yr",
        matchScore: 85,
        requiredSkills: ["Programming Fundamentals", "Data Structures", "Problem Solving"],
        userSkillsMet: ["Programming Fundamentals", "Problem Solving"],
        skillGaps: ["Advanced Data Structures"],
        reason: "Training programs like this are perfect for fresh graduates building their career.",
        applyUrl: "https://www.infosys.com/careers/",
      },
      {
        id: "job-4",
        title: "Web Development Intern",
        company: "Flipkart",
        type: "Internship",
        location: "Remote",
        salaryOrStipend: "₹25,000 / month",
        matchScore: 90,
        requiredSkills: ["React", "JavaScript", "API Integration"],
        userSkillsMet: ["JavaScript", "API Integration"],
        skillGaps: ["React Advanced Patterns"],
        reason: "Your web development interests and practice lab completions align with this opportunity.",
        applyUrl: "https://www.flipkartcareers.com",
      },
    ];
  }
}

/* ═══════════════════════════════════════════
   ADAPTIVE QUESTION GENERATOR
   Generates questions that adapt to user progress
   ═══════════════════════════════════════════ */
export async function generateAdaptiveQuestion(
  domain: string,
  level: number,
  previousTopics: string[]
): Promise<{ question: string; options: string[]; correctIndex: number; explanation: string }> {
  const systemPrompt: ChatMessage = {
    role: "system",
    content: `Generate a skill-check question for a student learning ${domain} at level ${level}/10.
Previous topics: ${previousTopics.join(", ") || "None"}.
Use simple language. Test practical understanding.

Return ONLY valid JSON:
{
  "question": "Clear question text",
  "options": ["A", "B", "C", "D"],
  "correctIndex": 0,
  "explanation": "Brief explanation of the answer"
}
Do NOT wrap in markdown backticks.`,
  };

  try {
    const response = await chatWithGroq([systemPrompt, { role: "user", content: "Generate." }], 0.6);
    const cleaned = response.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return {
      question: `What is the main purpose of ${domain}?`,
      options: [
        "Building user-facing applications",
        "Managing server infrastructure",
        "Analyzing data patterns",
        "All of the above",
      ],
      correctIndex: 3,
      explanation: `${domain} encompasses many aspects of building technology solutions.`,
    };
  }
}

/* ═══════════════════════════════════════════
   LEARNING PATH RECOMMENDATION
   ═══════════════════════════════════════════ */
export async function recommendLearningPath(
  domain: string,
  level: number,
  interests: string[],
  completedTopics: string[]
): Promise<string[]> {
  const systemPrompt: ChatMessage = {
    role: "system",
    content: `Recommend 5 specific topics for a student to learn next.
Domain: ${domain}. Level: ${level}/10.
Interests: ${interests.join(", ")}.
Already completed: ${completedTopics.join(", ") || "Nothing yet"}.

Return ONLY a JSON array of 5 strings. Simple topic names.
Do NOT wrap in markdown backticks.`,
  };

  try {
    const response = await chatWithGroq([systemPrompt, { role: "user", content: "Recommend." }], 0.5);
    const cleaned = response.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return [
      `${domain} fundamentals`,
      "Building a small project",
      "Version control with Git",
      "Problem solving exercises",
      "Reading documentation effectively",
    ];
  }
}
