/* ═══════════════════════════════════════════
   AI CONTINUOUS LEARNING ENGINE
   Generates adaptive recommendations,
   skill assessments, and job readiness checks
   based on user progress and interests.
   ═══════════════════════════════════════════ */

import { chatWithGroq, ChatMessage } from "./ai-client";

export interface LearningRecommendation {
  id: string;
  title: string;
  description: string;
  difficulty: "Easy" | "Medium" | "Hard";
  timeEstimate: string;
  domain: string;
  color: string;
}

export interface SkillAssessmentQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  topic: string;
}

export interface JobReadinessReport {
  readyPercentage: number;
  strongSkills: string[];
  skillGaps: string[];
  recommendedNextSteps: string[];
  suggestedRoles: { title: string; matchPercent: number; company: string }[];
  summary: string;
}

/* ═══════════════════════════════════════════
   Generate daily personalized learning
   recommendations based on user profile
   ═══════════════════════════════════════════ */
export async function generateDailyRecommendations(
  userProfile: {
    name: string;
    domain: string;
    level: number;
    interests: string[];
    completedTopics: string[];
  }
): Promise<LearningRecommendation[]> {
  const systemPrompt: ChatMessage = {
    role: "system",
    content: `You are an IT learning advisor. Generate 4 personalized learning recommendations for today.

Student: "${userProfile.name}"
Domain: ${userProfile.domain}
Level: ${userProfile.level}
Interests: ${userProfile.interests.join(", ")}
Already completed: ${userProfile.completedTopics.join(", ") || "Nothing yet"}

Generate 4 specific, actionable learning tasks for today. Mix difficulties.
Use simple language. Each task should be something a student can do in one sitting.

Return ONLY a valid JSON array:
[
  {
    "id": "task-1",
    "title": "Short task title",
    "description": "1-2 sentence description of what to learn/do",
    "difficulty": "Easy" | "Medium" | "Hard",
    "timeEstimate": "15 min" | "30 min" | "1 hour",
    "domain": "specific sub-topic",
    "color": "teal|purple|emerald|amber|rose|blue"
  }
]
Do NOT wrap in markdown backticks. Return raw JSON only.`,
  };

  try {
    const response = await chatWithGroq([systemPrompt, { role: "user", content: "Generate today's recommendations." }], 0.7);
    const cleaned = response.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleaned) as LearningRecommendation[];
  } catch (err) {
    console.error("Failed to generate recommendations:", err);
    return [
      { id: "r1", title: "Learn the Basics", description: `Start with the fundamentals of ${userProfile.domain}. Read an introductory article and take notes.`, difficulty: "Easy", timeEstimate: "20 min", domain: userProfile.domain, color: "teal" },
      { id: "r2", title: "Try a Mini Project", description: "Build something small to practice what you've learned so far.", difficulty: "Medium", timeEstimate: "45 min", domain: userProfile.domain, color: "purple" },
      { id: "r3", title: "Watch a Tutorial", description: `Watch a beginner-friendly video on ${userProfile.domain} concepts.`, difficulty: "Easy", timeEstimate: "30 min", domain: userProfile.domain, color: "emerald" },
      { id: "r4", title: "Solve a Problem", description: "Try solving a simple coding challenge related to your interests.", difficulty: "Medium", timeEstimate: "30 min", domain: userProfile.domain, color: "amber" },
    ];
  }
}

/* ═══════════════════════════════════════════
   Generate a skill assessment question
   adapted to user's current level
   ═══════════════════════════════════════════ */
export async function generateSkillQuestion(
  domain: string,
  level: number,
  previousTopics: string[]
): Promise<SkillAssessmentQuestion> {
  const systemPrompt: ChatMessage = {
    role: "system",
    content: `Generate a simple skill-check question for an IT student.

Domain: ${domain}
Level: ${level} (1=beginner, 5=intermediate, 10=advanced)
Previous topics covered: ${previousTopics.join(", ") || "None"}

Create a multiple-choice question appropriate for their level.
Use simple language. The question should test practical understanding, not memorization.

Return ONLY a valid JSON object:
{
  "question": "A clear, simple question",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctIndex": 0,
  "explanation": "A brief explanation of why the correct answer is right",
  "topic": "What this question tests"
}
Do NOT wrap in markdown backticks. Return raw JSON only.`,
  };

  try {
    const response = await chatWithGroq([systemPrompt, { role: "user", content: "Generate question." }], 0.6);
    const cleaned = response.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleaned) as SkillAssessmentQuestion;
  } catch (err) {
    console.error("Failed to generate skill question:", err);
    return {
      question: "What does HTML stand for?",
      options: [
        "HyperText Markup Language",
        "High Tech Modern Language",
        "Home Tool Markup Language",
        "HyperText Modern Links",
      ],
      correctIndex: 0,
      explanation: "HTML stands for HyperText Markup Language. It's the standard language used to create web pages.",
      topic: "Web Basics",
    };
  }
}

/* ═══════════════════════════════════════════
   Generate learning milestones from
   current level to job-ready
   ═══════════════════════════════════════════ */
export async function generateLearningMilestones(
  domain: string,
  currentLevel: number,
  interests: string[]
): Promise<{ id: string; title: string; description: string; skills: string[]; estimatedWeeks: number }[]> {
  const systemPrompt: ChatMessage = {
    role: "system",
    content: `Create a learning roadmap for an engineering student to become job-ready in ${domain}.

Current level: ${currentLevel} (1=beginner, 10=advanced)
Interests: ${interests.join(", ")}

Generate 6 milestones from their current level to job-ready.
Each milestone should build on the previous one.
Use simple, clear language.

Return ONLY a valid JSON array:
[
  {
    "id": "m1",
    "title": "Milestone title",
    "description": "What the student will learn and be able to do",
    "skills": ["skill1", "skill2"],
    "estimatedWeeks": 2
  }
]
Do NOT wrap in markdown backticks. Return raw JSON only.`,
  };

  try {
    const response = await chatWithGroq([systemPrompt, { role: "user", content: "Generate roadmap." }], 0.5);
    const cleaned = response.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.error("Failed to generate milestones:", err);
    return [
      { id: "m1", title: "Foundation", description: "Learn the core concepts and tools used in your domain", skills: ["Basic concepts", "Development tools"], estimatedWeeks: 2 },
      { id: "m2", title: "First Project", description: "Build your first small project to apply what you've learned", skills: ["Project setup", "Basic coding"], estimatedWeeks: 3 },
      { id: "m3", title: "Going Deeper", description: "Explore intermediate concepts and best practices", skills: ["Design patterns", "Problem solving"], estimatedWeeks: 4 },
      { id: "m4", title: "Real-World Skills", description: "Learn industry tools and workflows used by professionals", skills: ["Version control", "Collaboration tools"], estimatedWeeks: 3 },
      { id: "m5", title: "Portfolio Project", description: "Build a substantial project that showcases your skills", skills: ["Full project lifecycle", "Documentation"], estimatedWeeks: 4 },
      { id: "m6", title: "Job Ready", description: "Prepare for interviews and start applying to roles", skills: ["Interview prep", "Resume building"], estimatedWeeks: 2 },
    ];
  }
}

/* ═══════════════════════════════════════════
   Check job readiness and recommend roles
   ═══════════════════════════════════════════ */
export async function checkJobReadiness(
  userProfile: {
    name: string;
    domain: string;
    level: number;
    skills: string[];
    completedMilestones: number;
    totalMilestones: number;
  }
): Promise<JobReadinessReport> {
  const systemPrompt: ChatMessage = {
    role: "system",
    content: `Evaluate if this IT student is ready for entry-level jobs or internships.

Student: "${userProfile.name}"
Domain: ${userProfile.domain}
Level: ${userProfile.level}/10
Skills: ${userProfile.skills.join(", ")}
Progress: ${userProfile.completedMilestones}/${userProfile.totalMilestones} milestones completed

Assess their job readiness honestly but encouragingly.
If they're not ready yet, tell them what to focus on.
If they are ready, suggest specific roles to apply for.

Return ONLY a valid JSON object:
{
  "readyPercentage": 65,
  "strongSkills": ["skill1", "skill2"],
  "skillGaps": ["gap1", "gap2"],
  "recommendedNextSteps": ["step1", "step2", "step3"],
  "suggestedRoles": [
    { "title": "Job Title", "matchPercent": 80, "company": "Example Company" }
  ],
  "summary": "2-3 sentences summarizing their readiness status"
}
Do NOT wrap in markdown backticks. Return raw JSON only.`,
  };

  try {
    const response = await chatWithGroq([systemPrompt, { role: "user", content: "Evaluate now." }], 0.3);
    const cleaned = response.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleaned) as JobReadinessReport;
  } catch (err) {
    console.error("Failed to check job readiness:", err);
    const progress = userProfile.completedMilestones / Math.max(userProfile.totalMilestones, 1);
    const ready = Math.round(progress * 100);
    return {
      readyPercentage: ready,
      strongSkills: userProfile.skills.slice(0, 3),
      skillGaps: ["Advanced problem solving", "System design basics"],
      recommendedNextSteps: [
        "Complete your remaining learning milestones",
        "Build a portfolio project",
        "Practice mock interviews",
      ],
      suggestedRoles: ready >= 60
        ? [
            { title: `Junior ${userProfile.domain} Developer`, matchPercent: ready, company: "Various Companies" },
            { title: `${userProfile.domain} Intern`, matchPercent: Math.min(ready + 10, 100), company: "Tech Startups" },
          ]
        : [],
      summary: ready >= 60
        ? `Great progress, ${userProfile.name}! You're ${ready}% ready. A few more milestones and you'll be strong enough to apply.`
        : `Keep going, ${userProfile.name}! You're making progress. Focus on completing your current milestones and building projects.`,
    };
  }
}
