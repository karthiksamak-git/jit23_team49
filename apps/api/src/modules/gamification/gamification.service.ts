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
      include: {
        achievements: {
          include: {
            achievement: true,
          },
        },
      },
    });

    if (!stats) {
      stats = await this.prisma.userGamification.create({
        data: {
          userId,
          xp: 100,
          coins: 20,
          streak: 1,
          lastActiveAt: new Date(),
        },
        include: {
          achievements: {
            include: {
              achievement: true,
            },
          },
        },
      });
    }

    return stats;
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
        lastActiveAt: new Date(),
      },
      create: {
        userId,
        xp: 100 + xpReward,
        coins: 20 + coinReward,
        streak: 1,
        lastActiveAt: new Date(),
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
        lastActiveAt: new Date(),
      },
      create: {
        userId,
        xp: 250,
        coins: 50,
        streak: 1,
        lastActiveAt: new Date(),
      },
    });
  }
}
