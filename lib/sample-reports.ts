import { buildMonthlyReportDraft, type MonthlyReportDraft } from "./report";
import { monthEndIso, previousMonthKey, chicagoMonthKey } from "./month";
import type { StoredMemberPlan } from "./plans";
import { memberSeeds, type SeedMember } from "./sample-plans";
import type { Goal } from "./types";

/**
 * October-style snapshot for Alex, relative to `now`.
 * The spending plan is a little higher, duplex net rent and the duplex value
 * are a little lower, and one step that is done today was still open.
 * The current month can then show real movement instead of a flat first report.
 */
export function alexPriorReport(now = new Date()): MonthlyReportDraft {
  const plan = alexLivePlan();
  plan.expenses = plan.expenses.map((line) =>
    line.id === "personal" ? { ...line, monthly: line.monthly + 150 } : line,
  );
  plan.streams = plan.streams.map((line) =>
    line.id === "rent" ? { ...line, monthly: Math.max(0, line.monthly - 180) } : line,
  );
  plan.assets = plan.assets.map((line) =>
    line.id === "duplex" ? { ...line, balance: line.balance - 20_000 } : line,
  );
  plan.goals = plan.goals.map((goal) => ({
    ...goal,
    steps: goal.steps.map((step) => (step.id === "alex-nw-debt" ? { ...step, done: false } : step)),
  }));
  const monthKey = previousMonthKey(chicagoMonthKey(now));
  return buildMonthlyReportDraft({
    plan,
    monthKey,
    checkIns: [],
    prior: null,
    generatedAt: new Date(monthEndIso(monthKey)),
  });
}

export function alexLivePlan(): StoredMemberPlan {
  const alex = memberSeeds().find((member) => member.id === "alex");
  if (!alex) throw new Error("Alex Rivera is missing from the demo seed.");
  return toStored(alex);
}

function toStored(seed: SeedMember): StoredMemberPlan {
  return {
    id: seed.id,
    name: seed.name,
    email: seed.email,
    lastActive: seed.lastActive,
    coachingNote: seed.coachingNote,
    expenses: seed.plan.expenses.map(({ id, name, monthly, note }) => ({ id, name, monthly, note })),
    streams: seed.plan.streams.map(({ id, name, monthly, source }) => ({ id, name, monthly, source })),
    assets: seed.plan.assets.map((line) => ({
      id: line.id,
      name: line.name,
      institution: line.institution,
      group: line.group as StoredMemberPlan["assets"][number]["group"],
      balance: line.balance,
      valuation: line.valuation,
      confirmedAt: line.confirmedAt ? line.confirmedAt.toISOString() : null,
    })),
    liabilities: seed.plan.liabilities.map(({ id, name, balance, note }) => ({ id, name, balance, note })),
    goals: seed.plan.goals.map(toGoal),
  };
}

function toGoal(goal: SeedMember["plan"]["goals"][number]): Goal {
  return {
    id: goal.id,
    kind: goal.kind as Goal["kind"],
    title: goal.title,
    summary: goal.summary,
    progressSource: goal.progressSource as Goal["progressSource"],
    ...(goal.baseline == null ? {} : { baseline: goal.baseline }),
    ...(goal.baselineLabel ? { baselineLabel: goal.baselineLabel } : {}),
    ...(goal.target == null ? {} : { target: goal.target }),
    targetLabel: goal.targetLabel,
    checkpoints: goal.checkpoints.map((checkpoint) => ({
      year: asYear(checkpoint.year),
      calendarYear: checkpoint.calendarYear,
      label: checkpoint.label,
      ...(checkpoint.targetValue == null ? {} : { targetValue: checkpoint.targetValue }),
    })),
    steps: goal.steps.map(({ id, title, detail, done }) => ({ id, title, detail, done })),
  };
}

function asYear(value: number): 1 | 2 | 3 | 4 | 5 | 6 {
  if (value === 1 || value === 2 || value === 3 || value === 4 || value === 5 || value === 6) {
    return value;
  }
  throw new Error(`Checkpoint year must be 1 through 6, received ${value}.`);
}
