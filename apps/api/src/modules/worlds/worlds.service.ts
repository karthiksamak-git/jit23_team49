import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { PrismaService } from "../../prisma/prisma.service";
import { MissionStatus } from "@careerverse/database";

@Injectable()
export class WorldsService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2
  ) {}

  async getAllWorlds(userId: string) {
    const worlds = await this.prisma.world.findMany({
      include: {
        progress: { where: { userId } },
        _count: { select: { levels: true } },
      },
    });

    return worlds.map((w) => ({
      id: w.id,
      name: w.name,
      slug: w.slug,
      description: w.description,
      domain: w.domain,
      icon: w.icon,
      color: w.color,
      totalLevels: w._count.levels,
      progress: w.progress[0] ?? null,
    }));
  }

  async getWorld(slug: string, userId: string) {
    const world = await this.prisma.world.findUnique({
      where: { slug },
      include: {
        levels: {
          orderBy: { number: "asc" },
          include: {
            regions: {
              orderBy: { order: "asc" },
              include: {
                missions: {
                  orderBy: { order: "asc" },
                  include: {
                    progress: { where: { userId } },
                  },
                },
              },
            },
          },
        },
        progress: { where: { userId } },
      },
    });

    if (!world) throw new NotFoundException("World not found");

    let userProgress = world.progress[0];
    if (!userProgress) {
      userProgress = await this.prisma.userWorldProgress.create({
        data: { userId, worldId: world.id, currentLevel: 1, regionsUnlocked: 1 },
      });
      await this.initializeMissionProgress(userId, world.id);
      this.eventEmitter.emit("world.entered", { userId, worldId: world.id });
    }

    return {
      ...world,
      progress: userProgress,
      levels: world.levels.map((level) => ({
        ...level,
        locked: level.number > userProgress.currentLevel + 1,
        regions: level.regions.map((region) => ({
          ...region,
          missions: region.missions.map((mission) => ({
            id: mission.id,
            title: mission.title,
            description: mission.description,
            type: mission.type,
            order: mission.order,
            xpReward: mission.xpReward,
            coinReward: mission.coinReward,
            status: mission.progress[0]?.status ?? (mission.order === 1 ? "AVAILABLE" : "LOCKED"),
            completedAt: mission.progress[0]?.completedAt,
          })),
        })),
      })),
    };
  }

  async getMission(slug: string, missionId: string, userId: string) {
    const world = await this.prisma.world.findUnique({ where: { slug } });
    if (!world) throw new NotFoundException("World not found");

    const mission = await this.prisma.mission.findUnique({
      where: { id: missionId },
      include: { progress: { where: { userId } } },
    });

    if (!mission) throw new NotFoundException("Mission not found");

    return {
      id: mission.id,
      title: mission.title,
      description: mission.description,
      type: mission.type,
      xpReward: mission.xpReward,
      coinReward: mission.coinReward,
      content: mission.content,
      quizQuestions: mission.quizData,
      status: mission.progress[0]?.status ?? "AVAILABLE",
    };
  }

  async completeMission(
    slug: string,
    missionId: string,
    userId: string,
    quizAnswers?: { questionId: string; optionId: string }[]
  ) {
    const mission = await this.prisma.mission.findUnique({
      where: { id: missionId },
      include: { progress: { where: { userId } } },
    });

    if (!mission) throw new NotFoundException("Mission not found");
    if (mission.progress[0]?.status === MissionStatus.COMPLETED) {
      return { alreadyCompleted: true };
    }

    if (mission.quizData && quizAnswers) {
      const quiz = mission.quizData as {
        questions: { id: string; correctOptionId: string }[];
      };
      const allCorrect = quiz.questions.every((q) => {
        const answer = quizAnswers.find((a) => a.questionId === q.id);
        return answer?.optionId === q.correctOptionId;
      });
      if (!allCorrect) {
        throw new BadRequestException("Incorrect answers. Try again!");
      }
    }

    await this.prisma.userMissionProgress.upsert({
      where: { userId_missionId: { userId, missionId } },
      update: { status: MissionStatus.COMPLETED, completedAt: new Date() },
      create: {
        userId,
        missionId,
        status: MissionStatus.COMPLETED,
        completedAt: new Date(),
      },
    });

    const world = await this.prisma.world.findUnique({ where: { slug } });
    if (world) {
      await this.prisma.userWorldProgress.update({
        where: { userId_worldId: { userId, worldId: world.id } },
        data: {
          xpEarned: { increment: mission.xpReward },
          missionsCompleted: { increment: 1 },
        },
      });
    }

    this.eventEmitter.emit("mission.completed", {
      userId,
      missionId,
      xpReward: mission.xpReward,
      coinReward: mission.coinReward,
      isBoss: mission.type === "BOSS",
    });

    return {
      success: true,
      xpEarned: mission.xpReward,
      coinsEarned: mission.coinReward,
    };
  }

  private async initializeMissionProgress(userId: string, worldId: string) {
    const firstMission = await this.prisma.mission.findFirst({
      where: { region: { level: { worldId } } },
      orderBy: [{ region: { level: { number: "asc" } } }, { order: "asc" }],
    });

    if (firstMission) {
      await this.prisma.userMissionProgress.upsert({
        where: { userId_missionId: { userId, missionId: firstMission.id } },
        update: {},
        create: { userId, missionId: firstMission.id, status: MissionStatus.AVAILABLE },
      });
    }
  }
}
