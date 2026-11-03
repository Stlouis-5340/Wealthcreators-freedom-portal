/**
 * Freedom forecasting, version 1.
 *
 * Freedom Score at each month is still monthly passive income ÷ the spending plan.
 * Existing passive income stays flat. Only new contributions earn the assumed yield.
 * Expenses take the member's change immediately, then grow with the inflation rate.
 *
 * Results are ranges across scenarios. A date here is an estimate under stated
 * assumptions, not a guaranteed outcome and not investment advice.
 */

import { clampYield, freedomScorePercent } from "@/lib/gap";
import { AS_OF, formatDate, formatMoney } from "@/lib/format";

export const FORECAST_HORIZON_MONTHS = 480;
export const FORECAST_HORIZON_YEARS = FORECAST_HORIZON_MONTHS / 12;
export const DEFAULT_INFLATION_PERCENT = 2.5;
export const INFLATION_MAX = 10;
export const MILESTONES = [25, 50, 75, 100, 150, 200] as const;
export const CHECKPOINT_YEARS = [0, 1, 5, 10, 20, 40] as const;

export const CONSERVATIVE_EXPENSE_INCREASE = 200;
export const CONSERVATIVE_YIELD_DELTA = -2;
export const CONSERVATIVE_INFLATION_DELTA = 1;
export const ACCELERATED_EXTRA_CONTRIBUTION = 500;
export const ACCELERATED_EXPENSE_CUT = 250;
export const ACCELERATED_YIELD_DELTA = 1;
export const ACCELERATED_INFLATION_DELTA = -0.5;

export const WHAT_IFS = [
  {
    id: "cut-expenses",
    title: "Cut expenses by $500",
    detail:
      "Take $500 a month out of the spending plan, on top of the expense change already typed. Freedom Score uses that lower plan immediately.",
    statement:
      "This what-if cuts another $500 a month from the spending plan on top of the current trajectory.",
    expenseDelta: -500,
    passiveDelta: 0,
    contributionDelta: 0,
  },
  {
    id: "add-passive",
    title: "Add $1,000 of passive income",
    detail:
      "Add $1,000 a month of qualifying passive income you would actually tag. This is income, not a return on the monthly contribution.",
    statement:
      "This what-if adds $1,000 a month of qualifying passive income on top of the current trajectory.",
    expenseDelta: 0,
    passiveDelta: 1000,
    contributionDelta: 0,
  },
  {
    id: "extra-invest",
    title: "Invest an extra $1,000 a month",
    detail:
      "Add $1,000 a month to the contribution. Only that new money earns the assumed yield. The yield is still an illustration.",
    statement:
      "This what-if invests an extra $1,000 a month into income-producing assets on top of the current trajectory.",
    expenseDelta: 0,
    passiveDelta: 0,
    contributionDelta: 1000,
  },
] as const;

export type WhatIfId = (typeof WHAT_IFS)[number]["id"];
export type ScenarioId = "conservative" | "current" | "accelerated" | "what-if";

export interface ForecastInputs {
  monthlyPassive: number;
  monthlyExpenses: number;
  monthlyContribution: number;
  expenseChange: number;
  addedMonthlyPassive: number;
  assumedYieldPercent: number;
  inflationPercent: number;
}

export interface ScenarioPath {
  id: ScenarioId;
  label: string;
  summary: string;
  inputs: ForecastInputs;
  milestones: MilestoneHit[];
  checkpoints: PathCheckpoint[];
}

export interface MilestoneHit {
  threshold: number;
  monthIndex: number | null;
  date: string | null;
  fallsBack: boolean;
}

export interface PathCheckpoint {
  year: number;
  monthIndex: number;
  score: number | null;
  passive: number;
  expenses: number;
}

export interface MilestoneRange {
  threshold: number;
  hits: {
    scenarioId: ScenarioId;
    label: string;
    monthIndex: number;
    date: string;
    fallsBack: boolean;
  }[];
  misses: { scenarioId: ScenarioId; label: string }[];
  earliest: { label: string; monthIndex: number; date: string } | null;
  latest: { label: string; monthIndex: number; date: string } | null;
}

export interface ForecastBundle {
  kind: "forecast" | "what-if";
  presetId: WhatIfId | null;
  asOf: string;
  horizonMonths: number;
  statements: string[];
  scenarios: ScenarioPath[];
  ranges: MilestoneRange[];
}

function finiteOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function clampContribution(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1_000_000, Math.max(0, value));
}

function clampExpenseChange(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1_000_000, Math.max(-1_000_000, value));
}

export function clampInflation(percent: number): number {
  if (!Number.isFinite(percent)) return DEFAULT_INFLATION_PERCENT;
  return Math.min(INFLATION_MAX, Math.max(0, percent));
}

export function normalizeInputs(input: ForecastInputs): ForecastInputs {
  return {
    monthlyPassive: Math.max(0, finiteOr(input.monthlyPassive, 0)),
    monthlyExpenses: Math.max(0, finiteOr(input.monthlyExpenses, 0)),
    monthlyContribution: clampContribution(input.monthlyContribution),
    expenseChange: clampExpenseChange(input.expenseChange),
    addedMonthlyPassive: Math.max(0, finiteOr(input.addedMonthlyPassive, 0)),
    assumedYieldPercent: clampYield(input.assumedYieldPercent),
    inflationPercent: clampInflation(input.inflationPercent),
  };
}

export function addMonthsUtc(isoDate: string, months: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const cursor = new Date(Date.UTC(year, month - 1, 1));
  cursor.setUTCMonth(cursor.getUTCMonth() + months);
  const last = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 0)).getUTCDate();
  const clamped = Math.min(day, last);
  const y = cursor.getUTCFullYear();
  const m = String(cursor.getUTCMonth() + 1).padStart(2, "0");
  const d = String(clamped).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function scoreAtMonth(
  input: ForecastInputs,
  month: number,
): { passive: number; expenses: number; score: number | null } {
  const normalized = normalizeInputs(input);
  const yieldRate = normalized.assumedYieldPercent / 100;
  const inflation = normalized.inflationPercent / 100;
  const passive =
    normalized.monthlyPassive +
    normalized.addedMonthlyPassive +
    month * normalized.monthlyContribution * (yieldRate / 12);
  const level = Math.max(0, normalized.monthlyExpenses + normalized.expenseChange);
  const expenses = level * Math.pow(1 + inflation, month / 12);
  return {
    passive,
    expenses,
    score: freedomScorePercent(passive, expenses),
  };
}

function reached(score: number | null, threshold: number): boolean {
  return score != null && score + 1e-6 >= threshold;
}

export function projectPath(
  input: ForecastInputs,
  meta: { id: ScenarioId; label: string; summary: string },
  asOf = AS_OF,
): ScenarioPath {
  const normalized = normalizeInputs(input);
  const found = new Map<number, { monthIndex: number; fallsBack: boolean }>();
  for (const threshold of MILESTONES) found.set(threshold, { monthIndex: -1, fallsBack: false });
  const checkpointMonths = new Set<number>(CHECKPOINT_YEARS.map((year) => year * 12));
  const checkpoints: PathCheckpoint[] = [];

  for (let month = 0; month <= FORECAST_HORIZON_MONTHS; month += 1) {
    const point = scoreAtMonth(normalized, month);
    if (checkpointMonths.has(month)) {
      checkpoints.push({
        year: month / 12,
        monthIndex: month,
        score: point.score,
        passive: point.passive,
        expenses: point.expenses,
      });
    }
    for (const threshold of MILESTONES) {
      const row = found.get(threshold);
      if (!row) continue;
      const ok = reached(point.score, threshold);
      if (row.monthIndex < 0 && ok) row.monthIndex = month;
      else if (row.monthIndex >= 0 && !ok) row.fallsBack = true;
    }
  }

  return {
    ...meta,
    inputs: normalized,
    checkpoints,
    milestones: MILESTONES.map((threshold) => {
      const row = found.get(threshold)!;
      const monthIndex = row.monthIndex < 0 ? null : row.monthIndex;
      return {
        threshold,
        monthIndex,
        date: monthIndex == null ? null : addMonthsUtc(asOf, monthIndex),
        fallsBack: row.fallsBack,
      };
    }),
  };
}

export function rangesFor(scenarios: ScenarioPath[]): MilestoneRange[] {
  return MILESTONES.map((threshold) => {
    const hits = scenarios.flatMap((scenario) => {
      const hit = scenario.milestones.find((item) => item.threshold === threshold);
      if (!hit || hit.monthIndex == null || hit.date == null) return [];
      return [
        {
          scenarioId: scenario.id,
          label: scenario.label,
          monthIndex: hit.monthIndex,
          date: hit.date,
          fallsBack: hit.fallsBack,
        },
      ];
    });
    const hitIds = new Set(hits.map((hit) => hit.scenarioId));
    const misses = scenarios
      .filter((scenario) => !hitIds.has(scenario.id))
      .map((scenario) => ({ scenarioId: scenario.id, label: scenario.label }));
    const ordered = [...hits].sort((a, b) => a.monthIndex - b.monthIndex);
    return {
      threshold,
      hits,
      misses,
      earliest: ordered[0] ? { label: ordered[0].label, monthIndex: ordered[0].monthIndex, date: ordered[0].date } : null,
      latest: ordered.length
        ? {
            label: ordered[ordered.length - 1].label,
            monthIndex: ordered[ordered.length - 1].monthIndex,
            date: ordered[ordered.length - 1].date,
          }
        : null,
    };
  });
}

export function whenLabel(monthIndex: number | null, asOf = AS_OF): string {
  if (monthIndex == null) return `Not reached within ${FORECAST_HORIZON_YEARS} years`;
  if (monthIndex === 0) return `Already there on ${formatDate(asOf)}`;
  const years = Math.floor(monthIndex / 12);
  const months = monthIndex % 12;
  const span =
    years === 0 ? `${months} months` : months === 0 ? `${years} years` : `${years} years ${months} months`;
  return `${formatDate(addMonthsUtc(asOf, monthIndex))} · ${span}`;
}

export function rangeText(range: MilestoneRange, asOf = AS_OF): string {
  if (range.hits.length === 0) {
    return `Not reached within ${FORECAST_HORIZON_YEARS} years on these paths.`;
  }
  const parts: string[] = [];
  if (range.earliest && range.latest && range.earliest.monthIndex !== range.latest.monthIndex) {
    parts.push(
      `Illustrated range ${formatDate(range.earliest.date)} to ${formatDate(range.latest.date)}.`,
    );
  } else if (range.hits.length === 1) {
    parts.push("Only one of these paths reaches it. That is not a promised date.");
  } else {
    parts.push("These paths land together. That is still not a promised date.");
  }
  for (const hit of range.hits) {
    const back = hit.fallsBack
      ? " The illustrated score can fall back below this later if expenses grow faster than new income."
      : "";
    parts.push(`${hit.label}: ${whenLabel(hit.monthIndex, asOf)}.${back}`);
  }
  if (range.misses.length > 0) {
    parts.push(
      `Not reached within ${FORECAST_HORIZON_YEARS} years: ${range.misses.map((miss) => miss.label).join(", ")}.`,
    );
  }
  return parts.join(" ");
}

function rate(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function assumptionStatements(input: {
  kind: "forecast" | "what-if";
  presetId: WhatIfId | null;
  base: ForecastInputs;
}): string[] {
  const base = normalizeInputs({ ...input.base, addedMonthlyPassive: 0 });
  const preset = WHAT_IFS.find((item) => item.id === input.presetId) ?? null;
  const lines = [
    `Starting qualifying passive income is ${formatMoney(base.monthlyPassive)} a month.`,
    `Starting spending plan is ${formatMoney(base.monthlyExpenses)} a month.`,
    `Current trajectory adds ${formatMoney(base.monthlyContribution)} a month to income-producing assets.`,
    `Current trajectory changes the spending plan by ${formatMoney(base.expenseChange)} a month before inflation. A negative amount is a cut.`,
    `Assumed yield on new contributions is ${rate(base.assumedYieldPercent)} a year. This is an illustration, not a forecast, and it is not guaranteed.`,
    `Inflation on the spending plan is ${rate(base.inflationPercent)} a year. After n months the plan is multiplied by (1 + that rate) raised to the power of n divided by 12.`,
    "Qualifying passive income already on the plan stays flat. It does not compound, and appreciation is not added to it.",
    "Only new contributions earn the assumed yield. In month n, extra monthly income equals n times the monthly contribution times the annual yield divided by 12. Month 0 is the plan today, before that extra contribution.",
    "The expense change applies in month 0. Inflation applies as the months pass.",
    "Return of capital, selling an asset, wages, gifts, and transfers are not added as passive income.",
    `The window is ${FORECAST_HORIZON_YEARS} years from ${formatDate(AS_OF)}. A milestone with no date is not reached inside that window.`,
    "Conservative keeps the contribution you typed, then uses a lower assumed yield and higher inflation.",
    "Accelerated adds to the contribution, lowers the spending plan, uses a slightly higher assumed yield, and uses slightly lower inflation.",
    `Conservative dollar shifts: the spending plan is ${formatMoney(CONSERVATIVE_EXPENSE_INCREASE)} a month higher, assumed yield is ${Math.abs(CONSERVATIVE_YIELD_DELTA)} points lower, and inflation is ${CONSERVATIVE_INFLATION_DELTA} point higher.`,
    `Accelerated dollar shifts: the contribution is ${formatMoney(ACCELERATED_EXTRA_CONTRIBUTION)} a month higher, the spending plan is ${formatMoney(ACCELERATED_EXPENSE_CUT)} a month lower, assumed yield is ${ACCELERATED_YIELD_DELTA} point higher, and inflation is ${Math.abs(ACCELERATED_INFLATION_DELTA)} points lower.`,
    "Freedom Score stays monthly passive income divided by the spending plan. This illustration does not change that score.",
    "Dates are estimates under these assumptions. They are not guaranteed, and this is educational coaching, not investment advice.",
  ];
  if (!(base.monthlyExpenses + base.expenseChange > 0)) {
    lines.push("A spending plan that lands at zero has no Freedom Score, because the score divides by that plan.");
  }
  if (input.kind === "what-if" && preset) {
    lines.push(preset.statement);
    lines.push(`This comparison uses the ${preset.title} preset on top of the current trajectory.`);
  }
  return lines;
}

const CURRENT_SUMMARY =
  "The four numbers you typed: monthly contribution, expense change, assumed yield, and inflation.";
const CONSERVATIVE_SUMMARY =
  "Same contribution as current trajectory, a higher spending plan, a lower assumed yield, and higher inflation.";
const ACCELERATED_SUMMARY =
  "A larger contribution, a lower spending plan, a slightly higher assumed yield, and slightly lower inflation.";

export function scenarioInputs(base: ForecastInputs): {
  conservative: ForecastInputs;
  current: ForecastInputs;
  accelerated: ForecastInputs;
} {
  const current = normalizeInputs({ ...base, addedMonthlyPassive: 0 });
  return {
    current,
    conservative: normalizeInputs({
      ...current,
      expenseChange: current.expenseChange + CONSERVATIVE_EXPENSE_INCREASE,
      assumedYieldPercent: current.assumedYieldPercent + CONSERVATIVE_YIELD_DELTA,
      inflationPercent: current.inflationPercent + CONSERVATIVE_INFLATION_DELTA,
    }),
    accelerated: normalizeInputs({
      ...current,
      monthlyContribution: current.monthlyContribution + ACCELERATED_EXTRA_CONTRIBUTION,
      expenseChange: current.expenseChange - ACCELERATED_EXPENSE_CUT,
      assumedYieldPercent: current.assumedYieldPercent + ACCELERATED_YIELD_DELTA,
      inflationPercent: current.inflationPercent + ACCELERATED_INFLATION_DELTA,
    }),
  };
}

export function buildForecast(base: ForecastInputs): ForecastBundle {
  const inputs = scenarioInputs(base);
  const scenarios = [
    projectPath(inputs.conservative, {
      id: "conservative",
      label: "Conservative",
      summary: CONSERVATIVE_SUMMARY,
    }),
    projectPath(inputs.current, {
      id: "current",
      label: "Current trajectory",
      summary: CURRENT_SUMMARY,
    }),
    projectPath(inputs.accelerated, {
      id: "accelerated",
      label: "Accelerated",
      summary: ACCELERATED_SUMMARY,
    }),
  ];
  return {
    kind: "forecast",
    presetId: null,
    asOf: AS_OF,
    horizonMonths: FORECAST_HORIZON_MONTHS,
    statements: assumptionStatements({ kind: "forecast", presetId: null, base: inputs.current }),
    scenarios,
    ranges: rangesFor(scenarios),
  };
}

export function whatIfPreset(id: string): (typeof WHAT_IFS)[number] | null {
  return WHAT_IFS.find((item) => item.id === id) ?? null;
}

export function whatIfInputs(base: ForecastInputs, presetId: WhatIfId): ForecastInputs {
  const preset = whatIfPreset(presetId);
  const current = normalizeInputs({ ...base, addedMonthlyPassive: 0 });
  if (!preset) return current;
  return normalizeInputs({
    ...current,
    expenseChange: current.expenseChange + preset.expenseDelta,
    addedMonthlyPassive: preset.passiveDelta,
    monthlyContribution: current.monthlyContribution + preset.contributionDelta,
  });
}

export function buildWhatIf(base: ForecastInputs, presetId: WhatIfId): ForecastBundle {
  const preset = whatIfPreset(presetId);
  const currentInputs = normalizeInputs({ ...base, addedMonthlyPassive: 0 });
  const adjusted = whatIfInputs(base, presetId);
  const scenarios = [
    projectPath(currentInputs, {
      id: "current",
      label: "Current trajectory",
      summary: CURRENT_SUMMARY,
    }),
    projectPath(adjusted, {
      id: "what-if",
      label: preset?.title ?? "What-if",
      summary: preset?.detail ?? "A preset change on top of the current trajectory.",
    }),
  ];
  return {
    kind: "what-if",
    presetId,
    asOf: AS_OF,
    horizonMonths: FORECAST_HORIZON_MONTHS,
    statements: assumptionStatements({ kind: "what-if", presetId, base: currentInputs }),
    scenarios,
    ranges: rangesFor(scenarios),
  };
}
