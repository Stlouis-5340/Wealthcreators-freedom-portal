import { isSyncedLine } from "@/lib/plaid-labels";

/**
 * Labels for member financial figures: verified, estimated, stale, or missing.
 *
 * Stale window: a connected balance or a dated manual confirmation is stale when
 * it is older than STALE_AFTER_MS (14 days). Fourteen days is long enough that a
 * normal week does not flicker, and short enough that a forgotten property value
 * or a quiet bank connection is not still called current.
 *
 * Comparison is strict (`>`). A figure confirmed exactly 14 days ago is still
 * inside the window. One millisecond past 14 days is stale.
 *
 * Manual balances with no confirmation timestamp are not stale. There is no
 * refresh clock to age, so they keep the member's estimated/verified flag.
 * Connected balances always use PlaidItem.refreshedAt. A connected line with no
 * refresh time is stale rather than verified.
 *
 * Missing means the portal has no lines for that figure. Empty debt is not
 * stored as zero, and empty income is not stored as zero.
 *
 * Rollup: a total is missing when it has no lines (or a derived figure cannot
 * be computed). Otherwise the total takes the worst label among its parts.
 * Worst order: missing, then stale, then estimated, then verified.
 */

export const STALE_AFTER_MS = 14 * 24 * 60 * 60 * 1000;

export type DataIntegrity = "verified" | "estimated" | "stale" | "missing";

export interface IntegritySummary {
  passiveIncome: DataIntegrity;
  spendingPlan: DataIntegrity;
  totalAssets: DataIntegrity;
  totalLiabilities: DataIntegrity;
  netWorth: DataIntegrity;
  freedomScore: DataIntegrity;
  yieldOnAssets: DataIntegrity;
  yieldOnNetWorth: DataIntegrity;
  freedomGap: DataIntegrity;
  annualPassive: DataIntegrity;
}

export interface IntegrityAsset {
  id: string;
  balance: number;
  valuation?: string | null;
  confirmedAt?: string | null;
  refreshedAt?: string | null;
}

export interface IntegrityLiability {
  id: string;
  balance: number;
  refreshedAt?: string | null;
}

const rank: Record<DataIntegrity, number> = {
  verified: 0,
  estimated: 1,
  stale: 2,
  missing: 3,
};

export function staleWindowDays(): number {
  return STALE_AFTER_MS / 86_400_000;
}

export function integrityLabel(status: DataIntegrity): string {
  if (status === "verified") return "Verified";
  if (status === "estimated") return "Estimated";
  if (status === "stale") return "Stale";
  return "Missing";
}

export function integrityDetail(status: DataIntegrity): string {
  const days = staleWindowDays();
  if (status === "verified") {
    return `Confirmed by a connected account in the last ${days} days, or marked verified by you and dated inside that window.`;
  }
  if (status === "estimated") {
    return "Entered on the plan. It is not a fresh connected balance or a dated verified confirmation.";
  }
  if (status === "stale") {
    return `The last refresh or confirmation is older than ${days} days.`;
  }
  return "Nothing is on file, so this figure is not shown as zero.";
}

export function isPastStaleWindow(iso: string | null | undefined, now = Date.now()): boolean {
  if (!iso) return false;
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) return false;
  return now - then > STALE_AFTER_MS;
}

export function worstIntegrity(statuses: DataIntegrity[]): DataIntegrity {
  if (statuses.length === 0) return "missing";
  return statuses.reduce((worst, status) => (rank[status] > rank[worst] ? status : worst));
}

export function refreshIntegrity(
  refreshedAt: string | null | undefined,
  now = Date.now(),
): DataIntegrity {
  if (!refreshedAt || isPastStaleWindow(refreshedAt, now)) return "stale";
  return "verified";
}

export function assetIntegrity(asset: IntegrityAsset, now = Date.now()): DataIntegrity {
  if (isSyncedLine(asset.id)) return refreshIntegrity(asset.refreshedAt, now);
  if (asset.confirmedAt && isPastStaleWindow(asset.confirmedAt, now)) return "stale";
  return asset.valuation === "verified" ? "verified" : "estimated";
}

export function liabilityIntegrity(item: IntegrityLiability, now = Date.now()): DataIntegrity {
  if (isSyncedLine(item.id)) return refreshIntegrity(item.refreshedAt, now);
  return "estimated";
}

function enteredIntegrity(count: number): DataIntegrity {
  return count === 0 ? "missing" : "estimated";
}

export function assessPlanIntegrity(
  input: {
    expenses: { id: string; monthly: number }[];
    streams: { id: string; monthly: number }[];
    assets: IntegrityAsset[];
    liabilities: IntegrityLiability[];
  },
  now = Date.now(),
): { summary: IntegritySummary; lines: Record<string, DataIntegrity> } {
  const lines: Record<string, DataIntegrity> = {};
  for (const expense of input.expenses) lines[expense.id] = "estimated";
  for (const stream of input.streams) lines[stream.id] = "estimated";
  for (const asset of input.assets) lines[asset.id] = assetIntegrity(asset, now);
  for (const item of input.liabilities) lines[item.id] = liabilityIntegrity(item, now);

  const spendingPlan = enteredIntegrity(input.expenses.length);
  const passiveIncome = enteredIntegrity(input.streams.length);
  const totalAssets =
    input.assets.length === 0
      ? "missing"
      : worstIntegrity(input.assets.map((asset) => lines[asset.id]));
  const totalLiabilities =
    input.liabilities.length === 0
      ? "missing"
      : worstIntegrity(input.liabilities.map((item) => lines[item.id]));

  const expenseTotal = input.expenses.reduce((sum, line) => sum + line.monthly, 0);
  const assetsBalance = input.assets.reduce((sum, line) => sum + line.balance, 0);
  const liabilityBalance = input.liabilities.reduce((sum, line) => sum + line.balance, 0);

  const netWorth =
    totalAssets === "missing" || totalLiabilities === "missing"
      ? "missing"
      : worstIntegrity([totalAssets, totalLiabilities]);

  const scoreInputsMissing = spendingPlan === "missing" || passiveIncome === "missing" || !(expenseTotal > 0);
  const freedomScore = scoreInputsMissing
    ? "missing"
    : worstIntegrity([spendingPlan, passiveIncome]);
  const freedomGap = freedomScore;

  const yieldOnAssets =
    totalAssets === "missing" || passiveIncome === "missing" || !(assetsBalance > 0)
      ? "missing"
      : worstIntegrity([totalAssets, passiveIncome]);

  const net = assetsBalance - liabilityBalance;
  const yieldOnNetWorth =
    netWorth === "missing" || passiveIncome === "missing" || !(net > 0)
      ? "missing"
      : worstIntegrity([netWorth, passiveIncome]);

  return {
    lines,
    summary: {
      passiveIncome,
      spendingPlan,
      totalAssets,
      totalLiabilities,
      netWorth,
      freedomScore,
      yieldOnAssets,
      yieldOnNetWorth,
      freedomGap,
      annualPassive: passiveIncome,
    },
  };
}
