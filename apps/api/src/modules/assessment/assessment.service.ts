import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { PrismaService } from "../../prisma/prisma.service";
import { AssessmentType } from "@careerverse/database";

@Injectable()
export class RuleEngineService {
  scoreAnswers(
    questions: {
      id: string;
      dimension: string | null;
      options: { id: string; points: number; dimension: string | null }[];
    }[],
    answers: { questionId: string; optionId: string | string[] }[]
  ): { dimension: string; score: number }[] {
    const dimensionTotals: Record<string, { sum: number; count: number }> = {};

    for (const answer of answers) {
      const question = questions.find((q) => q.id === answer.questionId);
      if (!question) continue;

      const optionIds = Array.isArray(answer.optionId)
        ? answer.optionId
        : [answer.optionId];

      for (const optionId of optionIds) {
        const option = question.options.find((o) => o.id === optionId);
        if (!option) continue;

        const dim = option.dimension || question.dimension || "general";
        if (!dimensionTotals[dim]) {
          dimensionTotals[dim] = { sum: 0, count: 0 };
        }
        dimensionTotals[dim].sum += option.points;
        dimensionTotals[dim].count += 1;
      }
    }

    return Object.entries(dimensionTotals).map(([dimension, data]) => ({
      dimension,
      score: data.count > 0 ? Math.min(100, Math.round(data.sum / data.count)) : 0,
    }));
  }
}

@Injectable()
export class AssessmentEngineService {
  constructor(
    private prisma: PrismaService,
    private ruleEngine: RuleEngineService,
    private eventEmitter: EventEmitter2
  ) {}

  async getAssessment(type: string) {
    const assessment = await this.prisma.assessment.findUnique({
      where: { type: type.toUpperCase() as AssessmentType },
      include: {
        questions: {
          orderBy: { order: "asc" },
          include: { options: true },
        },
      },
    });

    if (!assessment) return null;

    return {
      type: assessment.type,
      title: assessment.title,
      description: assessment.description,
      duration: assessment.duration,
      questions: assessment.questions.map((q) => ({
        id: q.id,
        text: q.text,
        type: q.questionType,
        dimension: q.dimension,
        options: q.options.map((o) => ({
          id: o.id,
          text: o.text,
          dimension: o.dimension,
        })),
      })),
    };
  }

  async submitAssessment(
    userId: string,
    type: string,
    answers: { questionId: string; optionId: string | string[] }[]
  ) {
    const assessment = await this.prisma.assessment.findUnique({
      where: { type: type.toUpperCase() as AssessmentType },
      include: {
        questions: { include: { options: true } },
      },
    });

    if (!assessment) throw new Error("Assessment not found");

    const dimensionScores = this.ruleEngine.scoreAnswers(
      assessment.questions,
      answers
    );

    const result = await this.prisma.assessmentResult.upsert({
      where: {
        userId_assessmentType: {
          userId,
          assessmentType: assessment.type,
        },
      },
      update: { dimensionScores, completedAt: new Date() },
      create: {
        userId,
        assessmentType: assessment.type,
        dimensionScores,
      },
    });

    this.eventEmitter.emit("assessment.finished", {
      userId,
      assessmentType: assessment.type,
    });

    return {
      assessmentType: result.assessmentType,
      dimensionScores,
      completedAt: result.completedAt.toISOString(),
    };
  }

  async getUserResults(userId: string) {
    return this.prisma.assessmentResult.findMany({
      where: { userId },
    });
  }
}
