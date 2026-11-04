/**
 * Demo rows for Alex Rivera. Jordan sees the shared card and the enrollment.
 * Morgan has no member plan, so none of this is attached to the admin account.
 */

import { streakSince } from "@/lib/challenges";
import type { LifeDraft } from "@/lib/life";
import { resolveGoals, totalsFromLines } from "@/lib/metrics";
import type { AchievementFacts, AchievementVisibility } from "@/lib/recognition";
import { alexLivePlan } from "@/lib/sample-reports";
import { chicagoWeekKey, previousWeekKey } from "@/lib/week";

export const ALEX_ENROLLMENT_ID = "alex-enroll-check-in-streak";
export const ALEX_GROUP_ID = "alex-group-check-in-streak";
export const ALEX_CHALLENGE_ID = "check-in-streak";
export const ALEX_GROUP_NAME = "Quiet week circle";

/** The 50% band is the one shared with Jordan. Everything else stays private. */
export function demoAchievementVisibility(key: string): AchievementVisibility {
  return key === "score-50" ? "guide" : "private";
}

export function alexLifeSeed(): LifeDraft {
  return {
    timeFreedomHours: 12,
    familyPriority: 4,
    healthStreakDays: 6,
    experiencesPlanned: "A long weekend with family in the spring. Dates are not booked.",
  };
}

/** Facts implied by Alex's seeded plan, one prior-week check-in, and the saved prior report. */
export function alexDemoFacts(now = new Date("2026-11-03T18:00:00.000Z")): AchievementFacts {
  const plan = alexLivePlan();
  const metrics = totalsFromLines(plan);
  const priorWeek = previousWeekKey(chicagoWeekKey(now));
  return {
    hasReport: true,
    monthlyPassive: metrics.monthlyPassive,
    freedomScore: metrics.freedomScore,
    goalCompleted: resolveGoals(plan.goals, metrics).some((goal) => goal.progress >= 100),
    consecutiveCheckIns: streakSince([priorWeek], "0000-01-01", now),
    lessonCompleted: false,
  };
}
