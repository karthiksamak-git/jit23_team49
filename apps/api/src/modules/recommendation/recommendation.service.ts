import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { Neo4jService } from "../../neo4j/neo4j.service";
import { RedisService } from "../../redis/redis.service";
import {
  computeCompatibilityScore,
  generateRecommendationReasons,
} from "@careerverse/shared";

@Injectable()
export class RecommendationService {
  constructor(
    private prisma: PrismaService,
    private neo4j: Neo4jService,
    private redis: RedisService
  ) {}

  async getRecommendations(userId: string) {
    const cacheKey = `recommendations:${userId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const profile = await this.prisma.userProfile.findUnique({ where: { userId } });
    const assessmentResults = await this.prisma.assessmentResult.findMany({
      where: { userId },
    });

    const profileScores = this.buildProfileScores(profile, assessmentResults);

    let recommendations = await this.getFromNeo4j(profileScores, profile?.preferredDomains ?? []);

    if (recommendations.length === 0) {
      recommendations = await this.getFromPostgres(profileScores, profile?.preferredDomains ?? []);
    }

    await this.saveRecommendations(userId, recommendations);
    await this.redis.set(cacheKey, JSON.stringify(recommendations), 86400);

    return recommendations;
  }

  private buildProfileScores(
    profile: { interests: string[]; preferredDomains: string[] } | null,
    results: { dimensionScores: unknown }[]
  ): Record<string, number> {
    const scores: Record<string, number> = {};

    for (const result of results) {
      const dims = result.dimensionScores as { dimension: string; score: number }[];
      for (const d of dims) {
        scores[d.dimension] = Math.max(scores[d.dimension] ?? 0, d.score);
      }
    }

    if (profile) {
      if (profile.interests.includes("Problem Solving")) scores["analytical"] = (scores["analytical"] ?? 50) + 10;
      if (profile.interests.includes("Creative Design")) scores["creative"] = (scores["creative"] ?? 50) + 10;
      if (profile.interests.includes("Technology")) scores["technical"] = (scores["technical"] ?? 50) + 10;
      if (profile.interests.includes("Data Analysis")) scores["analytical"] = (scores["analytical"] ?? 50) + 10;
      if (profile.interests.includes("Leadership")) scores["leadership"] = (scores["leadership"] ?? 50) + 10;
    }

    return scores;
  }

  private async getFromNeo4j(
    profileScores: Record<string, number>,
    preferredDomains: string[]
  ) {
    if (!this.neo4j.isConnected()) return [];

    const careers = await this.neo4j.runQuery<{
      c: { slug: string; name: string; domain: string; marketDemand: number };
    }>(
      `MATCH (c:Career) RETURN c`
    );

    const results = [];

    for (const record of careers) {
      const career = record.c;
      if (!career) continue;

      const skills = await this.neo4j.runQuery<{
        s: { slug: string; name: string };
        level: number;
      }>(
        `MATCH (c:Career {slug: $slug})-[r:REQUIRES]->(s:Skill) RETURN s, r.level as level`,
        { slug: career.slug }
      );

      const requirements: Record<string, number> = {};
      const skillGaps: { skill: string; current: number; required: number }[] = [];

      for (const sk of skills) {
        const skillName = sk.s?.name ?? sk.s?.slug ?? "unknown";
        const reqLevel = sk.level ?? 70;
        requirements[sk.s?.slug ?? skillName] = reqLevel;
        const current = profileScores[sk.s?.slug ?? ""] ?? profileScores["technical"] ?? 50;
        skillGaps.push({ skill: skillName, current, required: reqLevel });
      }

      const domainBonus = preferredDomains.includes(career.domain) ? 10 : 0;
      const score = computeCompatibilityScore(profileScores, requirements, career.marketDemand ?? 0.5) + domainBonus;

      results.push({
        careerId: career.slug,
        careerName: career.name,
        slug: career.slug,
        compatibilityScore: Math.min(100, score),
        reasons: generateRecommendationReasons(career.name, profileScores, requirements, skillGaps),
        skillGaps: skillGaps.filter((g) => g.current < g.required).slice(0, 3),
        marketDemand: career.marketDemand ?? 0.5,
      });
    }

    return results.sort((a, b) => b.compatibilityScore - a.compatibilityScore);
  }

  private async getFromPostgres(
    profileScores: Record<string, number>,
    preferredDomains: string[]
  ) {
    const careers = await this.prisma.career.findMany({
      include: {
        requirements: { include: { skill: true } },
      },
    });

    const results = [];

    for (const career of careers) {
      const requirements: Record<string, number> = {};
      const skillGaps: { skill: string; current: number; required: number }[] = [];

      for (const req of career.requirements) {
        requirements[req.skill.slug] = req.requiredLevel;
        const current = profileScores[req.skill.slug] ?? profileScores["technical"] ?? 50;
        skillGaps.push({
          skill: req.skill.name,
          current,
          required: req.requiredLevel,
        });
      }

      const domainBonus = preferredDomains.includes(career.domain) ? 10 : 0;
      const score =
        computeCompatibilityScore(profileScores, requirements, career.marketDemand) + domainBonus;

      results.push({
        careerId: career.id,
        careerName: career.name,
        slug: career.slug,
        compatibilityScore: Math.min(100, score),
        reasons: generateRecommendationReasons(career.name, profileScores, requirements, skillGaps),
        skillGaps: skillGaps.filter((g) => g.current < g.required).slice(0, 3),
        marketDemand: career.marketDemand,
      });
    }

    return results.sort((a, b) => b.compatibilityScore - a.compatibilityScore);
  }

  private async saveRecommendations(
    userId: string,
    recommendations: {
      careerId: string;
      careerName: string;
      slug: string;
      compatibilityScore: number;
      reasons: string[];
      skillGaps: unknown;
    }[]
  ) {
    for (const rec of recommendations.slice(0, 10)) {
      const career = await this.prisma.career.findFirst({
        where: { OR: [{ id: rec.careerId }, { slug: rec.slug }] },
      });
      if (!career) continue;

      await this.prisma.careerRecommendation.upsert({
        where: { userId_careerId: { userId, careerId: career.id } },
        update: {
          compatibilityScore: rec.compatibilityScore,
          reasons: rec.reasons,
          skillGaps: rec.skillGaps as object,
        },
        create: {
          userId,
          careerId: career.id,
          compatibilityScore: rec.compatibilityScore,
          reasons: rec.reasons,
          skillGaps: rec.skillGaps as object,
        },
      });
    }
  }
}
