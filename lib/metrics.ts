import { AS_OF_YEAR, clamp, formatMoney, formatPercentOrDash, sum } from "./format";
import type {
  CheckpointStatus,
  Goal,
  GoalStep,
  Metrics,
  ResolvedGoal,
} from "./types";

export function computeMetrics(input: {
  monthlyPassive: number;
  monthlyExpenses: number;
  totalAssets: number;
  totalLiabilities: number;
}): Metrics {
  const annualPassive = input.monthlyPassive * 12;
  const netWorth = input.totalAssets - input.totalLiabilities;
  return {
    monthlyPassive: input.monthlyPassive,
    monthlyExpenses: input.monthlyExpenses,
    annualPassive,
    totalAssets: input.totalAssets,
    totalLiabilities: input.totalLiabilities,
    netWorth,
    freedomScore:
      input.monthlyExpenses > 0
        ? (input.monthlyPassive / input.monthlyExpenses) * 100
        : null,
    yieldOnAssets:
      input.totalAssets > 0 ? (annualPassive / input.totalAssets) * 100 : null,
    yieldOnNetWorth:
      netWorth > 0 ? (annualPassive / netWorth) * 100 : null,
    monthlySurplus: input.monthlyPassive - input.monthlyExpenses,
  };
}

export function passiveNeededFor(
  targetScore: number,
  monthlyExpenses: number,
  monthlyPassive: number,
): number {
  return Math.max(0, (targetScore / 100) * monthlyExpenses - monthlyPassive);
}

function stepDone(step: GoalStep, overrides?: Record<string, boolean>): boolean {
  if (overrides && Object.prototype.hasOwnProperty.call(overrides, step.id)) {
    return overrides[step.id];
  }
  return step.done;
}

function ratioProgress(current: number, baseline: number, target: number): number {
  if (target === baseline) return current >= target ? 100 : 0;
  return ((current - baseline) / (target - baseline)) * 100;
}

function checkpointStatus(
  goal: Goal,
  checkpoint: Goal["checkpoints"][number],
  current: number | null,
  steps: GoalStep[],
): CheckpointStatus {
  if (goal.progressSource === "journey") {
    if (checkpoint.calendarYear < AS_OF_YEAR) return "complete";
    if (checkpoint.calendarYear > AS_OF_YEAR) return "upcoming";
    return steps.length > 0 && steps.every((step) => step.done)
      ? "complete"
      : "current";
  }

  const met =
    current != null &&
    checkpoint.targetValue != null &&
    current >= checkpoint.targetValue;

  if (checkpoint.calendarYear < AS_OF_YEAR) return met ? "complete" : "missed";
  if (checkpoint.calendarYear === AS_OF_YEAR) return met ? "complete" : "current";
  return met ? "ahead" : "upcoming";
}

export function resolveGoal(
  goal: Goal,
  metrics: Metrics,
  overrides?: Record<string, boolean>,
): ResolvedGoal {
  const steps = goal.steps.map((step) => ({
    ...step,
    done: stepDone(step, overrides),
  }));
  const stepsDone = steps.filter((step) => step.done).length;
  const currentValue =
    goal.progressSource === "freedom"
      ? metrics.freedomScore
      : goal.progressSource === "netWorth"
        ? metrics.netWorth
        : null;

  let raw = 0;
  if (
    goal.progressSource !== "journey" &&
    currentValue != null &&
    goal.baseline != null &&
    goal.target != null
  ) {
    raw = ratioProgress(currentValue, goal.baseline, goal.target);
  } else if (goal.progressSource === "journey") {
    const prior = goal.checkpoints.filter(
      (checkpoint) => checkpoint.calendarYear < AS_OF_YEAR,
    ).length;
    const ratio = steps.length > 0 ? stepsDone / steps.length : 0;
    raw =
      goal.checkpoints.length > 0
        ? ((prior + ratio) / goal.checkpoints.length) * 100
        : 0;
  }

  const yearNumber =
    goal.checkpoints.findIndex(
      (checkpoint) => checkpoint.calendarYear === AS_OF_YEAR,
    ) + 1;

  let progressNote = `From ${goal.baselineLabel ?? "the starting line"} toward ${goal.targetLabel}.`;
  if (goal.progressSource === "journey") {
    progressNote = `Year ${Math.max(yearNumber, 1)} of ${goal.checkpoints.length}. This year's steps complete the current checkpoint.`;
  } else if (raw >= 100) {
    progressNote = "Six-year target reached.";
  } else if (raw <= 0) {
    progressNote = `Below the starting line (${goal.baselineLabel ?? "baseline"}).`;
  }

  const currentLabel =
    goal.progressSource === "freedom"
      ? formatPercentOrDash(metrics.freedomScore, 1)
      : goal.progressSource === "netWorth"
        ? formatMoney(metrics.netWorth)
        : `${stepsDone} of ${steps.length} this year`;

  return {
    ...goal,
    progress: clamp(raw),
    progressNote,
    currentLabel,
    steps,
    stepsDone,
    checkpoints: goal.checkpoints.map((checkpoint) => ({
      ...checkpoint,
      status: checkpointStatus(goal, checkpoint, currentValue, steps),
    })),
  };
}

export function resolveGoals(
  goals: Goal[],
  metrics: Metrics,
  overrides?: Record<string, boolean>,
): ResolvedGoal[] {
  return goals.map((goal) => resolveGoal(goal, metrics, overrides));
}

export function freedomProgress(goals: ResolvedGoal[]): number {
  return goals.find((goal) => goal.progressSource === "freedom")?.progress ?? 0;
}

export function stepTotals(goals: ResolvedGoal[]): {
  done: number;
  total: number;
} {
  const steps = goals.flatMap((goal) => goal.steps);
  return {
    done: steps.filter((step) => step.done).length,
    total: steps.length,
  };
}

export function totalsFromLines(input: {
  streams: { monthly: number }[];
  expenses: { monthly: number }[];
  assets: { balance: number }[];
  liabilities: { balance: number }[];
}): Metrics {
  return computeMetrics({
    monthlyPassive: sum(input.streams.map((stream) => stream.monthly)),
    monthlyExpenses: sum(input.expenses.map((expense) => expense.monthly)),
    totalAssets: sum(input.assets.map((asset) => asset.balance)),
    totalLiabilities: sum(input.liabilities.map((item) => item.balance)),
  });
}
