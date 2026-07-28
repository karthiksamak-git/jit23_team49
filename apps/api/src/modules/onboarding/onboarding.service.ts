import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { PrismaService } from "../../prisma/prisma.service";
import {
  EducationLevel,
  ExperienceLevel,
  LearningStyle,
} from "@careerverse/database";

@Injectable()
export class OnboardingService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2
  ) {}

  async getProgress(userId: string) {
    const progress = await this.prisma.onboardingProgress.findUnique({
      where: { userId },
    });
    return progress ?? { currentStep: 1, stepData: {} };
  }

  async saveStep(userId: string, step: number, data: Record<string, unknown>) {
    const existing = await this.prisma.onboardingProgress.findUnique({
      where: { userId },
    });

    const stepData = {
      ...((existing?.stepData as Record<string, unknown>) ?? {}),
      [`step${step}`]: data,
    };

    return this.prisma.onboardingProgress.upsert({
      where: { userId },
      update: { currentStep: step, stepData: stepData as any },
      create: { userId, currentStep: step, stepData: stepData as any },
    });
  }

  async complete(
    userId: string,
    data: {
      educationLevel: string;
      experienceLevel: string;
      careerGoals: string[];
      interests: string[];
      learningStyle: string;
      dailyTimeMinutes: number;
      preferredDomains: string[];
    }
  ) {
    const profile = await this.prisma.userProfile.upsert({
      where: { userId },
      update: {
        educationLevel: data.educationLevel as EducationLevel,
        experienceLevel: data.experienceLevel as ExperienceLevel,
        careerGoals: data.careerGoals,
        interests: data.interests,
        learningStyle: data.learningStyle as LearningStyle,
        dailyTimeMinutes: data.dailyTimeMinutes,
        preferredDomains: data.preferredDomains,
        onboardingComplete: true,
      },
      create: {
        userId,
        educationLevel: data.educationLevel as EducationLevel,
        experienceLevel: data.experienceLevel as ExperienceLevel,
        careerGoals: data.careerGoals,
        interests: data.interests,
        learningStyle: data.learningStyle as LearningStyle,
        dailyTimeMinutes: data.dailyTimeMinutes,
        preferredDomains: data.preferredDomains,
        onboardingComplete: true,
      },
    });

    await this.prisma.onboardingProgress.deleteMany({ where: { userId } });

    this.eventEmitter.emit("onboarding.completed", { userId });

    return profile;
  }
}
