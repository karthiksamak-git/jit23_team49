import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class PortfolioService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserPortfolio(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        gamification: true,
        achievements: {
          include: { achievement: true },
        },
        worldProgress: {
          include: { world: true },
        },
      },
    });

    return {
      userId,
      name: user?.name || "Learner Explorer",
      email: user?.email,
      title: "Backend & Systems Guild Member",
      level: 3,
      xp: user?.gamification?.xp || 450,
      streak: user?.gamification?.streak || 5,
      verifiedBadges: [
        {
          id: "b1",
          title: "Backend API Architect",
          category: "Backend World",
          issuedAt: "2026-07-26",
          score: "98/100",
        },
        {
          id: "b2",
          title: "PostgreSQL Query Master",
          category: "Database Systems",
          issuedAt: "2026-07-25",
          score: "92/100",
        },
        {
          id: "b3",
          title: "Logical Reasoning Aptitude",
          category: "Assessment Discovery",
          issuedAt: "2026-07-24",
          score: "85/100",
        },
      ],
      skillRadar: [
        { skill: "RESTful APIs", level: 90 },
        { skill: "PostgreSQL & SQL", level: 85 },
        { skill: "System Architecture", level: 75 },
        { skill: "Redis Caching", level: 60 },
        { skill: "Docker & Linux", level: 70 },
      ],
    };
  }
}
