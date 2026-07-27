import { z } from "zod";

export const educationLevelSchema = z.enum([
  "HIGH_SCHOOL",
  "UNDERGRADUATE",
  "GRADUATE",
  "PROFESSIONAL",
]);

export const experienceLevelSchema = z.enum([
  "BEGINNER",
  "INTERMEDIATE",
  "ADVANCED",
  "EXPERT",
]);

export const learningStyleSchema = z.enum([
  "VISUAL",
  "AUDITORY",
  "READING",
  "KINESTHETIC",
  "MIXED",
]);

export const onboardingStepSchema = z.object({
  step: z.number().min(1).max(7),
  data: z.record(z.unknown()),
});

export const onboardingCompleteSchema = z.object({
  educationLevel: educationLevelSchema,
  experienceLevel: experienceLevelSchema,
  careerGoals: z.array(z.string()).min(1),
  interests: z.array(z.string()).min(1),
  learningStyle: learningStyleSchema,
  dailyTimeMinutes: z.number().min(15).max(480),
  preferredDomains: z.array(z.string()).min(1),
});

export const assessmentSubmitSchema = z.object({
  answers: z.array(
    z.object({
      questionId: z.string(),
      optionId: z.union([z.string(), z.array(z.string())]),
    })
  ),
});

export const missionCompleteSchema = z.object({
  quizAnswers: z
    .array(
      z.object({
        questionId: z.string(),
        optionId: z.string(),
      })
    )
    .optional(),
});

export const signUpSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type OnboardingCompleteInput = z.infer<typeof onboardingCompleteSchema>;
export type AssessmentSubmitInput = z.infer<typeof assessmentSubmitSchema>;
export type MissionCompleteInput = z.infer<typeof missionCompleteSchema>;
