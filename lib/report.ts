/**
 * Monthly Freedom Report.
 *
 * A month is an America/Chicago calendar month. The saved row is a snapshot of
 * the plan at generation time. Movement is read later by comparing that row
 * with the previous month's report, or with a weekly check-in from that
 * earlier month when no report was saved.
 *
 * Missing baselines stay "First report". Nothing here invents a delta.
 * The three actions are educational coaching. They are not investment advice
 * and they do not promise a result.
 */

import type { WeeklyCheckInView } from "./check-in";
import { formatMoney } from "./format";
import { bands } from "./milestones";
import { formatMonthLabel, previousMonthKey, weekInMonth } from "./month";
import { resolveGoals, totalsFromLines } from "./metrics";
import type { StoredMemberPlan } from "./plans";
import { assessFreedomQuality } from "./quality";
import type { GoalKind } from "./types";
import { formatWeekSpan } from "./week";

export { EDUCATION_PLACEHOLDER } from "./education";

export const EDUCATIONAL_LABEL =
  "Educational guidance. These steps come from the Freedom Gap, check-ins, and open goals. They are not investment, tax, or legal advice, and they do not promise a result.";

export interface ReportNumbers {
  freedomScore: number | null;
  gap: number | null;
  quality: number | null;
  passive: number | null;
  expenses: number | null;
  netWorth: number | null;
  yieldOnAssets: number | null;
}

export interface GoalStepSnapshot {
  id: string;
  title: string;
  done: boolean;
}

export interface GoalSummaryItem {
  id: string;
  title: string;
  kind: GoalKind;
  progress: number;
  stepsDone: number;
  stepsTotal: number;
  steps: GoalStepSnapshot[];
}

export interface MilestoneBandHit {
  threshold: number;
  title: string;
}

export interface MilestoneStepHit {
  id: string;
  title: string;
  goalTitle: string;
}

export interface MilestonesPayload {
  trackable: boolean;
  bands: MilestoneBandHit[];
  steps: MilestoneStepHit[];
  note: string;
}

export interface ReportAction {
  id: string;
  title: string;
  why: string;
  impact: string;
  difficulty: "Light" | "Moderate" | "Deeper";
  timeline: string;
  goalTie: string;
  /** Always true. The UI repeats that this is educational guidance. */
  educational: true;
}

export interface MonthlyReportDraft {
  monthKey: string;
  freedomScore: number | null;
  gap: number | null;
  quality: number | null;
  passive: number | null;
  expenses: number | null;
  netWorth: number | null;
  yieldOnAssets: number | null;
  goalsSummary: GoalSummaryItem[];
  milestones: MilestonesPayload;
  actions: ReportAction[];
  generatedAt: string;
}

export type DeltaStyle = "score" | "quality" | "yield" | "money" | "gap" | "expenses";

export interface MetricDelta {
  current: number | null;
  prior: number | null;
  /** "First report" when this figure has no earlier baseline. */
  label: string;
  tone: "up" | "down" | "flat" | "first";
  /** True when the move is the one a member is usually working toward. Null when we do not judge it. */
  favorable: boolean | null;
}

export type BaselineSource = "report" | "check-in" | "none";

export interface ReportBaseline {
  source: BaselineSource;
  monthKey: string;
  numbers: ReportNumbers;
  checkInWeekKey: string | null;
  title: string;
  detail: string;
}

export interface OpenStep {
  id: string;
  title: string;
  detail: string;
  goalTitle: string;
}

const EMPTY_NUMBERS: ReportNumbers = {
  freedomScore: null,
  gap: null,
  quality: null,
  passive: null,
  expenses: null,
  netWorth: null,
  yieldOnAssets: null,
};

export function numbersFromPlan(plan: StoredMemberPlan): ReportNumbers {
  const metrics = totalsFromLines(plan);
  const quality = assessFreedomQuality(plan);
  const hasExpenses = plan.expenses.length > 0;
  const hasStreams = plan.streams.length > 0;
  const hasBalanceSheet = plan.assets.length > 0 || plan.liabilities.length > 0;
  return {
    freedomScore: metrics.freedomScore,
    gap: hasExpenses || hasStreams ? metrics.monthlyFreedomGap : null,
    quality: quality.score,
    passive: hasStreams ? metrics.monthlyPassive : null,
    expenses: hasExpenses ? metrics.monthlyExpenses : null,
    netWorth: hasBalanceSheet ? metrics.netWorth : null,
    yieldOnAssets: plan.assets.length > 0 ? metrics.yieldOnAssets : null,
  };
}

export function goalsSummaryFrom(plan: StoredMemberPlan): GoalSummaryItem[] {
  const metrics = totalsFromLines(plan);
  return resolveGoals(plan.goals, metrics).map((goal) => ({
    id: goal.id,
    title: goal.title,
    kind: goal.kind,
    progress: Math.round(goal.progress),
    stepsDone: goal.stepsDone,
    stepsTotal: goal.steps.length,
    steps: goal.steps.map((step) => ({ id: step.id, title: step.title, done: step.done })),
  }));
}

export function openStepsFrom(plan: StoredMemberPlan): OpenStep[] {
  return plan.goals.flatMap((goal) =>
    goal.steps
      .filter((step) => !step.done)
      .map((step) => ({
        id: step.id,
        title: step.title,
        detail: step.detail,
        goalTitle: goal.title,
      })),
  );
}

export function numbersOf(draft: Pick<MonthlyReportDraft, keyof ReportNumbers>): ReportNumbers {
  return {
    freedomScore: draft.freedomScore,
    gap: draft.gap,
    quality: draft.quality,
    passive: draft.passive,
    expenses: draft.expenses,
    netWorth: draft.netWorth,
    yieldOnAssets: draft.yieldOnAssets,
  };
}

export function checkInBaseline(
  checkIns: WeeklyCheckInView[],
  previousMonth: string,
): WeeklyCheckInView | null {
  const rows = checkIns
    .filter((checkIn) => weekInMonth(checkIn.weekKey, previousMonth))
    .sort((a, b) => b.weekKey.localeCompare(a.weekKey) || b.updatedAt.localeCompare(a.updatedAt));
  return rows[0] ?? null;
}

export function latestCheckInForMonth(
  checkIns: WeeklyCheckInView[],
  monthKey: string,
): WeeklyCheckInView | null {
  const inMonth = checkIns
    .filter((checkIn) => weekInMonth(checkIn.weekKey, monthKey))
    .sort((a, b) => b.weekKey.localeCompare(a.weekKey) || b.updatedAt.localeCompare(a.updatedAt));
  if (inMonth[0]) return inMonth[0];
  const earlier = checkIns
    .filter((checkIn) => checkIn.weekKey.slice(0, 7) <= monthKey)
    .sort((a, b) => b.weekKey.localeCompare(a.weekKey) || b.updatedAt.localeCompare(a.updatedAt));
  return earlier[0] ?? null;
}

export function resolveBaseline(input: {
  monthKey: string;
  prior: { numbers: ReportNumbers } | null;
  checkIns: WeeklyCheckInView[];
}): ReportBaseline {
  const monthKey = previousMonthKey(input.monthKey);
  if (input.prior) {
    return {
      source: "report",
      monthKey,
      numbers: input.prior.numbers,
      checkInWeekKey: null,
      title: `Since ${formatMonthLabel(monthKey)}`,
      detail: "Compared with the Freedom Report saved for that month.",
    };
  }
  const checkIn = checkInBaseline(input.checkIns, monthKey);
  if (checkIn) {
    return {
      source: "check-in",
      monthKey,
      numbers: {
        ...EMPTY_NUMBERS,
        freedomScore: checkIn.freedomScore,
        gap: checkIn.monthlyFreedomGap,
        quality: checkIn.qualityScore,
      },
      checkInWeekKey: checkIn.weekKey,
      title: `Since the check-in for ${formatWeekSpan(checkIn.weekKey)}`,
      detail:
        "That check-in saved Freedom Score, Freedom Gap, and Freedom Quality. Net worth, passive income, the spending plan, and yield were not on it, so those say First report.",
    };
  }
  return {
    source: "none",
    monthKey,
    numbers: { ...EMPTY_NUMBERS },
    checkInWeekKey: null,
    title: "First report",
    detail: "There is no earlier month on file, so this report does not invent a change.",
  };
}

export function describeDelta(
  current: number | null,
  prior: number | null,
  style: DeltaStyle,
): MetricDelta {
  if (prior == null || current == null) {
    return { current, prior, label: "First report", tone: "first", favorable: null };
  }
  const change = current - prior;
  const flat = style === "money" || style === "gap" || style === "expenses" ? Math.abs(change) < 0.5 : Math.abs(change) < 0.05;
  if (flat) {
    return { current, prior, label: "No change", tone: "flat", favorable: null };
  }
  const label =
    style === "money" || style === "gap" || style === "expenses"
      ? signedMoney(change)
      : signedPoints(change, style === "yield" ? 2 : style === "quality" ? 0 : 1);
  const tone = change > 0 ? "up" : "down";
  const favorable = style === "expenses" ? null : style === "gap" ? change < 0 : change > 0;
  return { current, prior, label, tone, favorable };
}

export function deltasFor(current: ReportNumbers, baseline: ReportBaseline): Record<keyof ReportNumbers, MetricDelta> {
  return {
    freedomScore: describeDelta(current.freedomScore, baseline.numbers.freedomScore, "score"),
    gap: describeDelta(current.gap, baseline.numbers.gap, "gap"),
    quality: describeDelta(current.quality, baseline.numbers.quality, "quality"),
    passive: describeDelta(current.passive, baseline.numbers.passive, "money"),
    expenses: describeDelta(current.expenses, baseline.numbers.expenses, "expenses"),
    netWorth: describeDelta(current.netWorth, baseline.numbers.netWorth, "money"),
    yieldOnAssets: describeDelta(current.yieldOnAssets, baseline.numbers.yieldOnAssets, "yield"),
  };
}

export function milestonesBetween(input: {
  currentScore: number | null;
  priorScore: number | null;
  currentGoals: GoalSummaryItem[];
  priorGoals: GoalSummaryItem[] | null;
}): MilestonesPayload {
  const scoreKnown = input.priorScore != null && input.currentScore != null;
  const stepsKnown = input.priorGoals != null;
  if (!scoreKnown && !stepsKnown) {
    return {
      trackable: false,
      bands: [],
      steps: [],
      note: "Milestones this month are not tracked yet. This is the first saved picture, so earlier bands and steps are not guessed.",
    };
  }

  const crossed = scoreKnown
    ? bands
        .filter(
          (band) =>
            (input.priorScore as number) < band.threshold &&
            (input.currentScore as number) >= band.threshold,
        )
        .map((band) => ({ threshold: band.threshold, title: band.title }))
    : [];

  const priorDone = new Set(
    (input.priorGoals ?? []).flatMap((goal) => goal.steps.filter((step) => step.done).map((step) => step.id)),
  );
  const steps = stepsKnown
    ? input.currentGoals.flatMap((goal) =>
        goal.steps
          .filter((step) => step.done && !priorDone.has(step.id))
          .map((step) => ({
            id: step.id,
            title: step.title,
            goalTitle: goal.title,
          })),
      )
    : [];

  const parts: string[] = [];
  if (!scoreKnown) parts.push("Freedom Score bands need an earlier score, so they are not listed.");
  if (!stepsKnown) parts.push("Goal steps were not on the earlier snapshot, so new completions are not listed.");
  if (crossed.length === 0 && steps.length === 0 && parts.length === 0) {
    parts.push("No new Freedom Score band, and no newly completed step, since the last saved month.");
  }
  return {
    trackable: true,
    bands: crossed,
    steps,
    note: parts.join(" "),
  };
}

export function recommendActions(input: {
  numbers: ReportNumbers;
  openSteps: OpenStep[];
  checkIn: Pick<WeeklyCheckInView, "commitment" | "needsSupport" | "supportNote" | "actionStatus"> | null;
}): ReportAction[] {
  const chosen: ReportAction[] = [];
  const checkIn = input.checkIn;

  if (checkIn?.needsSupport) {
    chosen.push(
      action({
        id: "support",
        title: "Bring your support request to your Wealth Guide",
        why: checkIn.supportNote.trim()
          ? `You asked for support: ${clip(checkIn.supportNote)}`
          : "You asked for support on a check-in.",
        impact:
          "The conversation is for understanding your plan. Your Guide is not choosing an investment for you.",
        difficulty: "Light",
        timeline: "This week",
        goalTie: "Weekly check-in",
      }),
    );
  } else if (checkIn && checkIn.commitment.trim() && checkIn.actionStatus !== "yes") {
    chosen.push(
      action({
        id: "commitment",
        title: "Keep the commitment from your check-in",
        why: `You wrote: ${clip(checkIn.commitment)}`,
        impact: "A written commitment is a coaching step. Finishing it does not promise a higher Freedom Score.",
        difficulty: "Moderate",
        timeline: "Before your next check-in",
        goalTie: "Weekly check-in",
      }),
    );
  } else if (checkIn && checkIn.commitment.trim()) {
    chosen.push(
      action({
        id: "commitment-next",
        title: "Choose the next commitment now that the last one is done",
        why: `The last commitment was completed: ${clip(checkIn.commitment)}`,
        impact: "The next check-in needs a new sentence you can finish. It is a planning habit, not a product.",
        difficulty: "Light",
        timeline: "This week",
        goalTie: "Weekly check-in",
      }),
    );
  }

  const gap = input.numbers.gap;
  if (gap != null && gap > 0 && input.numbers.expenses != null) {
    chosen.push(
      action({
        id: "gap-spending",
        title: "Look at one spending-plan category you could lower on purpose",
        why: `The Freedom Gap is ${formatMoney(gap)} a month. The spending plan is the denominator of Freedom Score.`,
        impact: "A smaller plan changes the score only if you live on it. This is a planning question, not a product to buy.",
        difficulty: "Moderate",
        timeline: "This month",
        goalTie: "Freedom Gap",
      }),
    );
  } else if (gap != null && gap > 0) {
    chosen.push(
      action({
        id: "gap-income",
        title: "Name the monthly dollars of one qualifying passive stream",
        why: "Freedom Score counts dividends, interest, net rent, royalties, and similar streams. Salary, gifts, and selling principal do not.",
        impact: "Naming the dollars makes the gap a project. No return is promised, and this is not a recommendation to buy anything.",
        difficulty: "Deeper",
        timeline: "This month",
        goalTie: "Freedom Gap",
      }),
    );
  } else if (gap === 0 && input.numbers.expenses != null) {
    chosen.push(
      action({
        id: "gap-surplus",
        title: "Give the surplus a job with your Wealth Guide",
        why: "Passive income already covers the spending plan. The extra needs a written job so it does not leak into unplanned spending.",
        impact: "Resilience, generosity, or time are planning choices. None of them is an investment instruction.",
        difficulty: "Moderate",
        timeline: "This month",
        goalTie: "Freedom Gap",
      }),
    );
  } else if (input.numbers.expenses == null) {
    chosen.push(
      action({
        id: "plan-start",
        title: "Write a spending plan above zero",
        why: "Freedom Score needs a denominator. Card noise is not the plan.",
        impact: "A written plan makes the next report comparable. It does not promise a score.",
        difficulty: "Moderate",
        timeline: "This month",
        goalTie: "Spending plan",
      }),
    );
  }

  const step = input.openSteps[0];
  if (step) {
    chosen.push(
      action({
        id: `goal-${step.id}`,
        title: step.title,
        why: step.detail.trim() || `This step is still open on ${step.goalTitle}.`,
        impact: "This step is already on your six-year plan. It is educational planning, not an instruction to buy an investment.",
        difficulty: "Moderate",
        timeline: "This year",
        goalTie: step.goalTitle,
      }),
    );
  }

  if (input.numbers.yieldOnAssets != null || input.numbers.netWorth != null) {
    chosen.push(
      action({
        id: "efficiency",
        title: "Separate what produces income from what mostly sits",
        why: "Yield on assets is annual passive income divided by everything you own. It is not total return, and it is not a forecast.",
        impact: "Seeing the difference is educational. It is not advice to sell, buy, or move money.",
        difficulty: "Moderate",
        timeline: "This month",
        goalTie: "Yield on assets",
      }),
    );
  }

  chosen.push(
    action({
      id: "stream-start",
      title: "Name one stream that counts as passive",
      why: "Dividends, interest, net rent, royalties, lending yield, and pension-like income can count. Salary, gifts, and selling principal do not.",
      impact:
        "A named stream gives the next report something real to compare. It is not a recommendation to buy a product.",
      difficulty: "Moderate",
      timeline: "This month",
      goalTie: "Passive income",
    }),
  );

  chosen.push(
    action({
      id: "guide-talk",
      title: "Walk through this report with your Wealth Guide",
      why: "Three numbers are enough to start: Freedom Score, Freedom Gap, and one open step.",
      impact: "Use the meeting to understand your plan. It is not a session for product recommendations.",
      difficulty: "Light",
      timeline: "This month",
      goalTie: "Coaching",
    }),
  );

  const unique: ReportAction[] = [];
  const seen = new Set<string>();
  for (const item of chosen) {
    if (seen.has(item.title)) continue;
    seen.add(item.title);
    unique.push(item);
    if (unique.length === 3) break;
  }
  return unique;
}

export function buildMonthlyReportDraft(input: {
  plan: StoredMemberPlan;
  monthKey: string;
  checkIns: WeeklyCheckInView[];
  prior: { numbers: ReportNumbers; goals: GoalSummaryItem[] } | null;
  generatedAt: Date;
}): MonthlyReportDraft {
  const numbers = numbersFromPlan(input.plan);
  const goalsSummary = goalsSummaryFrom(input.plan);
  const baseline = resolveBaseline({
    monthKey: input.monthKey,
    prior: input.prior,
    checkIns: input.checkIns,
  });
  const priorGoals = input.prior?.goals ?? null;
  const milestones = milestonesBetween({
    currentScore: numbers.freedomScore,
    priorScore: baseline.numbers.freedomScore,
    currentGoals: goalsSummary,
    priorGoals,
  });
  const checkIn = latestCheckInForMonth(input.checkIns, input.monthKey);
  const actions = recommendActions({
    numbers,
    openSteps: openStepsFrom(input.plan),
    checkIn,
  });
  return {
    monthKey: input.monthKey,
    ...numbers,
    goalsSummary,
    milestones,
    actions,
    generatedAt: input.generatedAt.toISOString(),
  };
}

export function encodeReportJson(draft: MonthlyReportDraft): {
  goalsSummary: string;
  milestones: string;
  actions: string;
} {
  return {
    goalsSummary: JSON.stringify(draft.goalsSummary),
    milestones: JSON.stringify(draft.milestones),
    actions: JSON.stringify(draft.actions),
  };
}

export function parseGoalsSummary(raw: string): GoalSummaryItem[] {
  const value = parseJson(raw);
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!isRecord(item)) return [];
    const id = asString(item.id);
    const title = asString(item.title);
    const kind = item.kind === "personal" ? "personal" : item.kind === "wealth" ? "wealth" : null;
    if (!id || !title || !kind) return [];
    const steps = Array.isArray(item.steps)
      ? item.steps.flatMap((step) => {
          if (!isRecord(step)) return [];
          const stepId = asString(step.id);
          const stepTitle = asString(step.title);
          if (!stepId || !stepTitle || typeof step.done !== "boolean") return [];
          return [{ id: stepId, title: stepTitle, done: step.done }];
        })
      : [];
    return [
      {
        id,
        title,
        kind,
        progress: asNumber(item.progress) ?? 0,
        stepsDone: asNumber(item.stepsDone) ?? steps.filter((step) => step.done).length,
        stepsTotal: asNumber(item.stepsTotal) ?? steps.length,
        steps,
      },
    ];
  });
}

export function parseMilestones(raw: string): MilestonesPayload {
  const value = parseJson(raw);
  if (!isRecord(value)) {
    return {
      trackable: false,
      bands: [],
      steps: [],
      note: "This saved milestone list could not be read.",
    };
  }
  const bandsHit = Array.isArray(value.bands)
    ? value.bands.flatMap((item) => {
        if (!isRecord(item)) return [];
        const threshold = asNumber(item.threshold);
        const title = asString(item.title);
        if (threshold == null || !title) return [];
        return [{ threshold, title }];
      })
    : [];
  const steps = Array.isArray(value.steps)
    ? value.steps.flatMap((item) => {
        if (!isRecord(item)) return [];
        const id = asString(item.id);
        const title = asString(item.title);
        const goalTitle = asString(item.goalTitle);
        if (!id || !title || !goalTitle) return [];
        return [{ id, title, goalTitle }];
      })
    : [];
  return {
    trackable: value.trackable === true,
    bands: bandsHit,
    steps,
    note: asString(value.note) ?? "",
  };
}

export function parseActions(raw: string): ReportAction[] {
  const value = parseJson(raw);
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!isRecord(item)) return [];
    const id = asString(item.id);
    const title = asString(item.title);
    const why = asString(item.why);
    const impact = asString(item.impact);
    const timeline = asString(item.timeline);
    const goalTie = asString(item.goalTie);
    const difficulty = item.difficulty;
    if (!id || !title || !why || !impact || !timeline || !goalTie) return [];
    if (difficulty !== "Light" && difficulty !== "Moderate" && difficulty !== "Deeper") return [];
    return [
      {
        id,
        title,
        why,
        impact,
        difficulty,
        timeline,
        goalTie,
        educational: true,
      },
    ];
  });
}

function action(input: Omit<ReportAction, "educational">): ReportAction {
  return { ...input, educational: true };
}

function signedMoney(change: number): string {
  if (change > 0) return `+${formatMoney(change)}`;
  return formatMoney(change);
}

function signedPoints(change: number, digits: number): string {
  const abs = Math.abs(change).toFixed(digits);
  return `${change > 0 ? "+" : "−"}${abs} points`;
}

function clip(value: string, max = 180): string {
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

