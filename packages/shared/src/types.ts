export type UserRole = "LEARNER" | "MENTOR" | "ADMIN";

export type EducationLevel =
  | "HIGH_SCHOOL"
  | "UNDERGRADUATE"
  | "GRADUATE"
  | "PROFESSIONAL";

export type ExperienceLevel =
  | "BEGINNER"
  | "INTERMEDIATE"
  | "ADVANCED"
  | "EXPERT";

export type LearningStyle =
  | "VISUAL"
  | "AUDITORY"
  | "READING"
  | "KINESTHETIC"
  | "MIXED";

export type AssessmentType =
  | "INTEREST"
  | "PERSONALITY"
  | "SKILL"
  | "LOGICAL"
  | "APTITUDE"
  | "COMMUNICATION"
  | "CODING"
  | "BEHAVIORAL";

export type MissionType = "READ" | "QUIZ" | "PROJECT" | "BOSS";

export type MissionStatus = "LOCKED" | "AVAILABLE" | "IN_PROGRESS" | "COMPLETED";

export interface DimensionScore {
  dimension: string;
  score: number;
}

export interface ScoringRule {
  dimension: string;
  weight: number;
  conditions: { answerId: string; points: number }[];
}

export interface CareerRecommendationResult {
  careerId: string;
  careerName: string;
  slug: string;
  compatibilityScore: number;
  reasons: string[];
  skillGaps: { skill: string; current: number; required: number }[];
  marketDemand: number;
}

export interface GamificationProfile {
  xp: number;
  coins: number;
  streak: number;
  title: string;
  level: number;
  achievements: AchievementInfo[];
}

export interface AchievementInfo {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt?: string;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  xp: number;
  avatarUrl?: string;
}

export interface WorldProgress {
  worldId: string;
  worldName: string;
  slug: string;
  currentLevel: number;
  totalLevels: number;
  xpEarned: number;
  missionsCompleted: number;
  totalMissions: number;
  regionsUnlocked: number;
}

export interface MissionContent {
  id: string;
  title: string;
  description: string;
  type: MissionType;
  xpReward: number;
  coinReward: number;
  content: string;
  quizQuestions?: QuizQuestion[];
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: { id: string; text: string }[];
  correctOptionId: string;
}

export interface OnboardingData {
  educationLevel?: EducationLevel;
  experienceLevel?: ExperienceLevel;
  careerGoals?: string[];
  interests?: string[];
  learningStyle?: LearningStyle;
  dailyTimeMinutes?: number;
  preferredDomains?: string[];
}

export interface AssessmentQuestion {
  id: string;
  text: string;
  type: "LIKERT" | "MCQ" | "MULTI_SELECT";
  options: { id: string; text: string; dimension?: string }[];
}

export interface AssessmentSubmission {
  answers: { questionId: string; optionId: string | string[] }[];
}

export interface AssessmentResult {
  assessmentType: AssessmentType;
  dimensionScores: DimensionScore[];
  completedAt: string;
}
