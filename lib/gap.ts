/**
 * Freedom Gap and the scenario illustration.
 *
 * Monthly Freedom Gap = max(0, monthly expenses − monthly qualifying passive income).
 * Freedom Score stays monthly passive income ÷ monthly expenses × 100, and can pass 100%.
 * A gap of $0 means the spending plan is already covered. It does not by itself say the
 * income is diversified or durable. That question is Freedom Quality.
 *
 * The asset lever uses an assumed annual yield the member can edit. The default is an
 * illustration only. It is not a forecast and it is not a guaranteed return.
 */

export const ILLUSTRATIVE_YIELD_PERCENT = 6;
export const ILLUSTRATIVE_YIELD_MAX = 20;

export interface GapScenarioInput {
  monthlyExpenses: number;
  monthlyPassive: number;
  expenseReduction: number;
  addedPassive: number;
  addedAssets: number;
  assumedYieldPercent: number;
}

export interface GapProjection {
  monthlyExpenses: number;
  monthlyPassive: number;
  /** Passive income implied by the asset lever. Illustrative, not guaranteed. */
  monthlyFromAssets: number;
  monthlyFreedomGap: number;
  freedomScore: number | null;
}

export function freedomScorePercent(
  monthlyPassive: number,
  monthlyExpenses: number,
): number | null {
  if (
    !(monthlyExpenses > 0) ||
    !Number.isFinite(monthlyPassive) ||
    !Number.isFinite(monthlyExpenses)
  ) {
    return null;
  }
  return (monthlyPassive / monthlyExpenses) * 100;
}

export function monthlyFreedomGap(monthlyExpenses: number, monthlyPassive: number): number {
  const expenses = Number.isFinite(monthlyExpenses) ? monthlyExpenses : 0;
  const passive = Number.isFinite(monthlyPassive) ? monthlyPassive : 0;
  return Math.max(0, expenses - passive);
}

function nonNegative(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, value);
}

export function clampYield(percent: number): number {
  if (!Number.isFinite(percent)) return ILLUSTRATIVE_YIELD_PERCENT;
  return Math.min(ILLUSTRATIVE_YIELD_MAX, Math.max(0, percent));
}

/** Monthly income implied by a lump of assets at an assumed annual yield. */
export function illustrativeMonthlyIncome(assets: number, annualYieldPercent: number): number {
  return (nonNegative(assets) * (clampYield(annualYieldPercent) / 100)) / 12;
}

export function projectGap(input: GapScenarioInput): GapProjection {
  const monthlyExpenses = Math.max(0, nonNegative(input.monthlyExpenses) - nonNegative(input.expenseReduction));
  const monthlyFromAssets = illustrativeMonthlyIncome(input.addedAssets, input.assumedYieldPercent);
  const monthlyPassive =
    nonNegative(input.monthlyPassive) + nonNegative(input.addedPassive) + monthlyFromAssets;
  return {
    monthlyExpenses,
    monthlyPassive,
    monthlyFromAssets,
    monthlyFreedomGap: monthlyFreedomGap(monthlyExpenses, monthlyPassive),
    freedomScore: freedomScorePercent(monthlyPassive, monthlyExpenses),
  };
}
