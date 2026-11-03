import { fullGuideAccess, type GuideAccess } from "./access";
import { daysSince } from "./format";
import { assessPlanIntegrity, type IntegritySummary } from "./integrity";
import { freedomProgress, resolveGoals, stepTotals, totalsFromLines } from "./metrics";
import type { StoredMemberPlan } from "./plans";
import { assessFreedomQuality, type FreedomQuality } from "./quality";
import type { WeeklyCheckInView } from "./check-in";
import type { CoachingNoteView, CoachingTaskView } from "./coaching";
import type { Metrics, ResolvedGoal } from "./types";

export interface MemberFlags {
  needsAttention: boolean;
  goalsBehind: boolean;
  nearLine: boolean;
  freedomPlus: boolean;
}

export interface StatusLabel {
  key: "freedom" | "near" | "attention" | "behind" | "track";
  label: string;
}

export interface RosterRow {
  id: string;
  name: string;
  lastActive: string;
  daysSinceActive: number;
  coachingNote: string;
  metrics: Metrics;
  sixYearProgress: number;
  stepsDone: number;
  stepsTotal: number;
  flags: MemberFlags;
  statuses: StatusLabel[];
  goals: ResolvedGoal[];
  integrity: IntegritySummary;
  quality: FreedomQuality;
  checkIns: WeeklyCheckInView[];
  notes: CoachingNoteView[];
  tasks: CoachingTaskView[];
  /** What the viewer is allowed to see. Members always have the full set. */
  access: GuideAccess;
}

export function flagsFor(input: {
  score: number | null;
  sixYear: number;
  stepsDone: number;
  stepsTotal: number;
  days: number;
}): MemberFlags {
  const score = input.score ?? 0;
  const ratio = input.stepsTotal > 0 ? input.stepsDone / input.stepsTotal : 1;
  return {
    needsAttention: score < 45 || input.days > 30 || input.stepsDone === 0,
    goalsBehind: input.sixYear < 25 || (ratio < 0.4 && score < 100),
    nearLine: score >= 85 && score < 100,
    freedomPlus: score >= 100,
  };
}

export function statusLabels(flags: MemberFlags): StatusLabel[] {
  const labels: StatusLabel[] = [];
  if (flags.freedomPlus) labels.push({ key: "freedom", label: "Freedom+" });
  if (flags.nearLine) labels.push({ key: "near", label: "Near the line" });
  if (flags.needsAttention) labels.push({ key: "attention", label: "Needs attention" });
  if (flags.goalsBehind) labels.push({ key: "behind", label: "Goals behind" });
  if (labels.length === 0) labels.push({ key: "track", label: "On track" });
  return labels;
}

function rowFrom(input: {
  id: string;
  name: string;
  lastActive: string;
  coachingNote: string;
  metrics: Metrics;
  goals: ResolvedGoal[];
  integrity: IntegritySummary;
  quality: FreedomQuality;
}): RosterRow {
  const steps = stepTotals(input.goals);
  const sixYearProgress = freedomProgress(input.goals);
  const days = daysSince(input.lastActive);
  const flags = flagsFor({
    score: input.metrics.freedomScore,
    sixYear: sixYearProgress,
    stepsDone: steps.done,
    stepsTotal: steps.total,
    days,
  });
  return {
    id: input.id,
    name: input.name,
    lastActive: input.lastActive,
    daysSinceActive: days,
    coachingNote: input.coachingNote,
    metrics: input.metrics,
    sixYearProgress,
    stepsDone: steps.done,
    stepsTotal: steps.total,
    flags,
    statuses: statusLabels(flags),
    goals: input.goals,
    integrity: input.integrity,
    quality: input.quality,
    checkIns: [],
    notes: [],
    tasks: [],
    access: { ...fullGuideAccess },
  };
}

const hiddenQuality: FreedomQuality = {
  score: null,
  confidence: 0,
  limitedData: true,
  factors: [],
  chips: [],
};

/** Remove figures a Guide is not allowed to see before the roster is sent to the browser. */
export function applyGuideAccess(row: RosterRow, access: GuideAccess): RosterRow {
  const metrics = { ...row.metrics };
  if (!access.score) {
    metrics.freedomScore = Number.NaN;
    metrics.monthlyFreedomGap = Number.NaN;
  }
  if (!access.totals) {
    metrics.monthlyPassive = Number.NaN;
    metrics.monthlyExpenses = Number.NaN;
    metrics.annualPassive = Number.NaN;
    metrics.totalAssets = Number.NaN;
    metrics.totalLiabilities = Number.NaN;
    metrics.netWorth = Number.NaN;
    metrics.yieldOnAssets = Number.NaN;
    metrics.yieldOnNetWorth = Number.NaN;
    metrics.monthlySurplus = Number.NaN;
  }
  const flags: MemberFlags = {
    needsAttention: access.score ? row.flags.needsAttention : false,
    nearLine: access.score ? row.flags.nearLine : false,
    freedomPlus: access.score ? row.flags.freedomPlus : false,
    goalsBehind: access.goals ? row.flags.goalsBehind : false,
  };
  const statuses = statusLabels(flags).filter((status) => access.score || status.key === "behind");
  return {
    ...row,
    access: { ...access, tasks: access.tasks },
    metrics,
    flags,
    statuses: access.score || (access.goals && flags.goalsBehind) ? statuses : [],
    quality: access.score ? row.quality : hiddenQuality,
    goals: access.goals ? row.goals : [],
    sixYearProgress: access.goals ? row.sixYearProgress : Number.NaN,
    stepsDone: access.goals ? row.stepsDone : 0,
    stepsTotal: access.goals ? row.stepsTotal : 0,
    checkIns: access.checkIns ? row.checkIns : [],
    tasks: access.tasks ? row.tasks : [],
    coachingNote:
      access.score && access.goals
        ? row.coachingNote
        : "The short coaching line is hidden because it summarizes a score or goals this member has not shared.",
  };
}

export function coachingNoteFromOpenSteps(row: Pick<RosterRow, "goals" | "metrics">): string {
  const open = row.goals.flatMap((goal) => goal.steps).filter((step) => !step.done);
  const score =
    row.metrics.freedomScore == null
      ? "no score yet"
      : `${row.metrics.freedomScore.toFixed(1)}%`;
  if (open.length === 0) {
    return `Freedom Score is ${score}. This year steps are complete. Look ahead to the next checkpoint.`;
  }
  const preview = open
    .slice(0, 2)
    .map((step) => step.title)
    .join("; ");
  return `Freedom Score is ${score}. Still open this year: ${preview}.`;
}

export function memberRow(plan: StoredMemberPlan): RosterRow {
  const metrics = totalsFromLines(plan);
  const goals = resolveGoals(plan.goals, metrics);
  const row = rowFrom({
    id: plan.id,
    name: plan.name,
    lastActive: plan.lastActive,
    coachingNote: plan.coachingNote,
    metrics,
    goals,
    integrity: assessPlanIntegrity(plan).summary,
    quality: assessFreedomQuality(plan),
  });
  if (!plan.coachingNote.trim()) {
    row.coachingNote = coachingNoteFromOpenSteps(row);
  }
  return row;
}

export type RosterFilter =
  | "all"
  | "needs_attention"
  | "goals_behind"
  | "near_line"
  | "freedom_plus";

export const rosterFilters: { id: RosterFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "needs_attention", label: "Needs attention" },
  { id: "goals_behind", label: "Goals behind" },
  { id: "near_line", label: "Near the line" },
  { id: "freedom_plus", label: "Freedom+" },
];

export function matchesFilter(row: RosterRow, filter: RosterFilter): boolean {
  if (filter === "all") return true;
  if (filter === "needs_attention") return row.flags.needsAttention;
  if (filter === "goals_behind") return row.flags.goalsBehind;
  if (filter === "near_line") return row.flags.nearLine;
  return row.flags.freedomPlus;
}
