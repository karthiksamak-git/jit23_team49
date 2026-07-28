import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class GamificationService {
  private readonly logger = new Logger(GamificationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getUserStats(userId: string) {
    let stats = await this.prisma.userGamification.findUnique({
      where: { userId },
    });

    if (!stats) {
      stats = await this.prisma.userGamification.create({
        data: {
          userId,
          xp: 100,
          coins: 20,
          streak: 1,
          lastLoginDate: new Date(),
        },
      });
    }

    const achievements = await this.prisma.userAchievement.findMany({
      where: { userId },
      include: {
        achievement: true,
      },
    });

    return {
      ...stats,
      achievements,
    };
  }

  async getLeaderboard(limit = 50) {
    const entries = await this.prisma.userGamification.findMany({
      take: limit,
      orderBy: { xp: "desc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });

    return entries.map((entry, index) => ({
      rank: index + 1,
      userId: entry.userId,
      name: entry.user.name,
      avatar: entry.user.image,
      xp: entry.xp,
      coins: entry.coins,
      streak: entry.streak,
    }));
  }

  @OnEvent("mission.completed")
  async handleMissionCompleted(payload: { userId: string; missionId: string; xpReward: number; coinReward: number }) {
    this.logger.log(`Awarding rewards for mission completion to user ${payload.userId}`);
    const { userId, xpReward, coinReward } = payload;

    await this.prisma.userGamification.upsert({
      where: { userId },
      update: {
        xp: { increment: xpReward },
        coins: { increment: coinReward },
        lastLoginDate: new Date(),
      },
      create: {
        userId,
        xp: 100 + xpReward,
        coins: 20 + coinReward,
        streak: 1,
        lastLoginDate: new Date(),
      },
    });
  }

  @OnEvent("assessment.submitted")
  async handleAssessmentSubmitted(payload: { userId: string; assessmentType: string }) {
    this.logger.log(`Awarding XP for assessment completion to user ${payload.userId}`);
    const { userId } = payload;

    await this.prisma.userGamification.upsert({
      where: { userId },
      update: {
        xp: { increment: 150 },
        coins: { increment: 30 },
        lastLoginDate: new Date(),
      },
      create: {
        userId,
        xp: 250,
        coins: 50,
        streak: 1,
        lastLoginDate: new Date(),
      },
    });
  }
}
