import type { ScoringRule, DimensionScore } from "./types.js";

export function calculateDimensionScores(
  rules: ScoringRule[],
  answers: { questionId: string; optionId: string | string[] }[]
): DimensionScore[] {
  const dimensionTotals: Record<string, { sum: number; count: number; weight: number }> = {};

  for (const rule of rules) {
    if (!dimensionTotals[rule.dimension]) {
      dimensionTotals[rule.dimension] = { sum: 0, count: 0, weight: rule.weight };
    }

    for (const answer of answers) {
      const optionIds = Array.isArray(answer.optionId)
        ? answer.optionId
        : [answer.optionId];

      for (const optionId of optionIds) {
        const condition = rule.conditions.find((c) => c.answerId === optionId);
        if (condition) {
          dimensionTotals[rule.dimension].sum += condition.points * rule.weight;
          dimensionTotals[rule.dimension].count += rule.weight;
        }
      }
    }
  }

  return Object.entries(dimensionTotals).map(([dimension, data]) => ({
    dimension,
    score: data.count > 0 ? Math.min(100, Math.round(data.sum / data.count)) : 0,
  }));
}

export function getTitleForXp(xp: number): string {
  const thresholds = [
    { xp: 15000, title: "Legend" },
    { xp: 5000, title: "Master" },
    { xp: 1500, title: "Architect" },
    { xp: 500, title: "Pathfinder" },
    { xp: 0, title: "Explorer" },
  ];

  for (const t of thresholds) {
    if (xp >= t.xp) return t.title;
  }
  return "Explorer";
}

export function getLevelForXp(xp: number): number {
  return Math.floor(Math.sqrt(xp / 100)) + 1;
}

export function computeCompatibilityScore(
  profileScores: Record<string, number>,
  careerRequirements: Record<string, number>,
  marketDemand: number
): number {
  const dimensions = Object.keys(careerRequirements);
  if (dimensions.length === 0) return 0;

  let totalMatch = 0;
  for (const dim of dimensions) {
    const userScore = profileScores[dim] ?? 0;
    const required = careerRequirements[dim];
    const match = Math.min(userScore / required, 1);
    totalMatch += match;
  }

  const profileMatch = (totalMatch / dimensions.length) * 70;
  const demandBonus = marketDemand * 30;
  return Math.round(profileMatch + demandBonus);
}

export function generateRecommendationReasons(
  careerName: string,
  profileScores: Record<string, number>,
  careerRequirements: Record<string, number>,
  skillGaps: { skill: string; current: number; required: number }[]
): string[] {
  const reasons: string[] = [];

  const strongMatches = Object.entries(careerRequirements)
    .filter(([dim, req]) => (profileScores[dim] ?? 0) >= req * 0.8)
    .map(([dim]) => dim);

  if (strongMatches.length > 0) {
    reasons.push(
      `Strong match: your ${strongMatches.slice(0, 2).join(" and ")} scores align with ${careerName}`
    );
  }

  const topGap = skillGaps.sort((a, b) => b.required - b.current - (a.required - a.current))[0];
  if (topGap && topGap.current < topGap.required) {
    reasons.push(
      `Gap to close: ${topGap.skill} (currently ${topGap.current}%, required ${topGap.required}%)`
    );
  }

  if (reasons.length === 0) {
    reasons.push(`${careerName} is a growing field with opportunities matching your profile`);
  }

  return reasons;
}
