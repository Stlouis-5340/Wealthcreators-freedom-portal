/**
 * Recognition unlocked from data already on file.
 *
 * Cards use this catalog copy. Rows store a key and a visibility flag, not
 * dollar amounts. Visibility is private or shared with the assigned Guide.
 * There is no public feed. Guide cards still follow GuideAccessGrant.
 */

import type { GuideAccess } from "@/lib/access";
import { bands } from "@/lib/milestones";

export type AchievementVisibility = "private" | "guide";

export interface AchievementFacts {
  hasReport: boolean;
  monthlyPassive: number;
  freedomScore: number | null;
  /** A six-year goal whose progress is already at the target. */
  goalCompleted: boolean;
  /** Consecutive weekly check-ins ending this week or last week. */
  consecutiveCheckIns: number;
  lessonCompleted: boolean;
}

export interface AchievementDefinition {
  key: string;
  title: string;
  detail: string;
  unlocked: (facts: AchievementFacts) => boolean;
  /** Which grant must be on before an assigned Guide can see a shared card. */
  guideNeeds: (access: GuideAccess) => boolean;
}

const scoreBands = [25, 50, 75, 100] as const;

const scoreDefinitions: AchievementDefinition[] = scoreBands.map((threshold) => {
  const band = bands.find((item) => item.threshold === threshold);
  return {
    key: `score-${threshold}`,
    title: `${threshold}% Freedom Score`,
    detail: band
      ? `Freedom Score reached the ${threshold}% band, ${band.title}. This card does not show balances.`
      : `Freedom Score reached the ${threshold}% band. This card does not show balances.`,
    unlocked: (facts) => facts.freedomScore != null && facts.freedomScore >= threshold,
    guideNeeds: (access) => access.score,
  };
});

export const achievementCatalog: AchievementDefinition[] = [
  {
    key: "first-report",
    title: "First Freedom Report",
    detail: "A monthly Freedom Report is on file. Totals stay on the report, not on this card.",
    unlocked: (facts) => facts.hasReport,
    guideNeeds: (access) => access.score || access.totals,
  },
  {
    key: "passive-1k",
    title: "First passive-income band",
    detail:
      "Qualifying monthly passive income reached the first recognition band. The dollar amount stays off this card.",
    unlocked: (facts) => facts.monthlyPassive >= 1000,
    guideNeeds: (access) => access.totals,
  },
  ...scoreDefinitions,
  {
    key: "first-goal",
    title: "First six-year goal completed",
    detail: "A six-year goal reached its target. Figures stay on Goals, not on this card.",
    unlocked: (facts) => facts.goalCompleted,
    guideNeeds: (access) => access.goals,
  },
  {
    key: "check-in-streak-4",
    title: "Four weekly check-ins",
    detail: "Four America/Chicago weeks in a row have a saved check-in.",
    unlocked: (facts) => facts.consecutiveCheckIns >= 4,
    guideNeeds: (access) => access.checkIns,
  },
  {
    key: "first-lesson",
    title: "First lesson completed",
    detail: "A lesson on the challenge list is marked read. This is not a course certificate.",
    unlocked: (facts) => facts.lessonCompleted,
    guideNeeds: () => true,
  },
];

const byKey = new Map(achievementCatalog.map((item) => [item.key, item]));

export function achievementByKey(key: string): AchievementDefinition | null {
  return byKey.get(key) ?? null;
}

export function unlockedKeys(facts: AchievementFacts): string[] {
  return achievementCatalog.filter((item) => item.unlocked(facts)).map((item) => item.key);
}

export interface AchievementCard {
  key: string;
  title: string;
  detail: string;
  visibility: AchievementVisibility;
  unlockedAt: string;
}

export function presentAchievement(
  row: { key: string; visibility: string; unlockedAt: string },
): AchievementCard | null {
  const definition = achievementByKey(row.key);
  if (!definition) return null;
  const visibility = row.visibility === "guide" ? "guide" : row.visibility === "private" ? "private" : null;
  if (!visibility) return null;
  return {
    key: definition.key,
    title: definition.title,
    detail: definition.detail,
    visibility,
    unlockedAt: row.unlockedAt,
  };
}

/** Shared cards only, and only the parts the grant allows. Private rows are not returned. */
export function presentAchievementForGuide(
  row: { key: string; visibility: string; unlockedAt: string },
  access: GuideAccess,
): AchievementCard | null {
  if (row.visibility !== "guide") return null;
  const definition = achievementByKey(row.key);
  if (!definition || !definition.guideNeeds(access)) return null;
  const card = presentAchievement(row);
  if (!card) return null;
  if (cardLeaksMoney(card)) return null;
  return card;
}

const moneyLeak = /\$|access[_-]?token|vanguard|fidelity|treasurydirect|\bplaid\b|\bnet worth\b/i;

export function cardLeaksMoney(card: Pick<AchievementCard, "title" | "detail">): boolean {
  return moneyLeak.test(`${card.title} ${card.detail}`);
}

export function isVisibility(value: string): value is AchievementVisibility {
  return value === "private" || value === "guide";
}
