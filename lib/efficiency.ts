/**
 * Wealth Efficiency.
 *
 * Primary: annual qualifying passive income ÷ value of income-producing assets.
 * Secondary: Wealth Efficiency = annual qualifying passive income ÷ net worth.
 *
 * Yield on everything you own stays the existing yield-on-assets figure.
 * Freedom Score is not calculated here.
 *
 * Cash-flow yield is not total return. Appreciation is not added.
 * An empty capital role is an assumption from the holding type, and the member can replace it.
 */

export const CAPITAL_ROLES = ["income", "appreciation", "lifestyle"] as const;

export type CapitalRole = (typeof CAPITAL_ROLES)[number];

export const ROLE_LABEL: Record<CapitalRole, string> = {
  income: "Income-producing",
  appreciation: "Appreciating or deferred",
  lifestyle: "Lifestyle",
};

export function isCapitalRole(value: string): value is CapitalRole {
  return value === "income" || value === "appreciation" || value === "lifestyle";
}

export interface ClassifiedHolding {
  id: string;
  name: string;
  group: string;
  balance: number;
  role: CapitalRole;
  /** True when the member has not chosen a role and the portal assumed one. */
  assumed: boolean;
  reason: string;
  shareOfAssets: number | null;
  /** Share of the income-producing balance. Null when this holding is not in that base. */
  shareOfIncomeProducing: number | null;
}

export interface EfficiencyAnalysis {
  annualPassive: number;
  incomeProducingValue: number;
  appreciationValue: number;
  lifestyleValue: number;
  nonProductiveValue: number;
  /** Annual qualifying passive ÷ income-producing assets, in percent. Null when the base is 0. */
  primaryYield: number | null;
  /** Annual qualifying passive ÷ net worth, in percent. Null when net worth is not above 0. */
  wealthEfficiency: number | null;
  holdings: ClassifiedHolding[];
  largestIncome: ClassifiedHolding | null;
  largestNonProductive: ClassifiedHolding | null;
  assumptions: string[];
}

const BASE_ASSUMPTIONS = [
  "Primary yield is annual qualifying passive income divided by the value of holdings marked income-producing.",
  "Wealth Efficiency is annual qualifying passive income divided by net worth. It is secondary because liabilities shrink that base and can make the percentage look higher.",
  "Yield on assets, elsewhere in the portal, still divides annual passive income by everything you own. Freedom Score is monthly passive income divided by the spending plan, and this page does not change it.",
  "This is cash-flow yield. It is not total return. Appreciation is not added. Selling principal, return of capital, wages, gifts, and transfers are not income in this yield.",
  "Tagged passive streams are not matched to individual holdings. Income with no balance-sheet asset, such as a royalty, stays in the numerator and can make the yield look higher.",
  "A holding's share of income-producing capital is a share of the balance, not a share of the income.",
  "Nothing on this page is a guaranteed return. It is educational coaching, not investment advice.",
];

export function inferCapitalRole(asset: { name: string; group: string }): {
  role: CapitalRole;
  reason: string;
} {
  const name = asset.name.toLowerCase();
  if (asset.group === "Retirement") {
    return {
      role: "appreciation",
      reason:
        "Retirement accounts start as appreciating or deferred. They stay out of the primary yield until you mark them as paying qualifying passive income.",
    };
  }
  if (asset.group === "Property") {
    const rental = /\b(rent|rental|duplex|triplex|fourplex|tenant|lease)\b/.test(name);
    if (rental) {
      return {
        role: "income",
        reason: "This property name looks like a rental, so it starts as income-producing.",
      };
    }
    return {
      role: "lifestyle",
      reason:
        "Property without a rental-style name starts as lifestyle capital, including a primary home. Change it if this holding pays qualifying passive income.",
    };
  }
  if (asset.group === "Cash") {
    return {
      role: "income",
      reason:
        "Cash and treasuries start as income-producing because interest can be qualifying passive income. Change this if the balance is only a reserve.",
    };
  }
  if (asset.group === "Investments") {
    return {
      role: "income",
      reason:
        "Investments start as income-producing. That assumes dividends, interest, or distributions are already in your passive streams. Change this if the holding is only for appreciation.",
    };
  }
  return {
    role: "appreciation",
    reason: "This holding has no matching type, so it starts as appreciating capital and stays out of the primary yield.",
  };
}

export function resolveCapitalRole(asset: {
  name: string;
  group: string;
  capitalRole?: string;
}): { role: CapitalRole; assumed: boolean; reason: string } {
  if (asset.capitalRole && isCapitalRole(asset.capitalRole)) {
    return {
      role: asset.capitalRole,
      assumed: false,
      reason: "You set this role. The yield follows your choice until you change it.",
    };
  }
  const inferred = inferCapitalRole(asset);
  return { role: inferred.role, assumed: true, reason: inferred.reason };
}

function finite(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

export function analyzeEfficiency(input: {
  annualPassive: number;
  netWorth: number;
  totalAssets: number;
  assets: { id: string; name: string; group: string; balance: number; capitalRole?: string }[];
}): EfficiencyAnalysis {
  const annualPassive = finite(input.annualPassive);
  const totalAssets = finite(input.totalAssets);
  const netWorth = finite(input.netWorth);
  const classified = input.assets.map((asset) => {
    const resolved = resolveCapitalRole(asset);
    const balance = Math.max(0, finite(asset.balance));
    return {
      id: asset.id,
      name: asset.name,
      group: asset.group,
      balance,
      role: resolved.role,
      assumed: resolved.assumed,
      reason: resolved.reason,
    };
  });
  const incomeProducingValue = classified
    .filter((holding) => holding.role === "income")
    .reduce((sum, holding) => sum + holding.balance, 0);
  const appreciationValue = classified
    .filter((holding) => holding.role === "appreciation")
    .reduce((sum, holding) => sum + holding.balance, 0);
  const lifestyleValue = classified
    .filter((holding) => holding.role === "lifestyle")
    .reduce((sum, holding) => sum + holding.balance, 0);
  const holdings: ClassifiedHolding[] = classified
    .map((holding) => ({
      ...holding,
      shareOfAssets: totalAssets > 0 ? (holding.balance / totalAssets) * 100 : null,
      shareOfIncomeProducing:
        holding.role === "income" && incomeProducingValue > 0
          ? (holding.balance / incomeProducingValue) * 100
          : null,
    }))
    .sort((a, b) => b.balance - a.balance || a.name.localeCompare(b.name));

  const assumptions = [...BASE_ASSUMPTIONS];
  if (holdings.some((holding) => holding.assumed)) {
    assumptions.push(
      "A holding without a role you chose uses the assumption printed under its name. Cash and taxable investments start as income-producing. Retirement starts as deferred. A primary home and other non-rental property start as lifestyle capital.",
    );
  }
  if (!(incomeProducingValue > 0)) {
    assumptions.push("No holding is marked income-producing, so the primary yield is left blank.");
  }
  if (!(netWorth > 0)) {
    assumptions.push("Net worth is not above zero, so Wealth Efficiency is left blank.");
  }

  const incomeHoldings = holdings.filter((holding) => holding.role === "income");
  const otherHoldings = holdings.filter((holding) => holding.role !== "income");
  return {
    annualPassive,
    incomeProducingValue,
    appreciationValue,
    lifestyleValue,
    nonProductiveValue: appreciationValue + lifestyleValue,
    primaryYield: incomeProducingValue > 0 ? (annualPassive / incomeProducingValue) * 100 : null,
    wealthEfficiency: netWorth > 0 ? (annualPassive / netWorth) * 100 : null,
    holdings,
    largestIncome: incomeHoldings[0] ?? null,
    largestNonProductive: otherHoldings[0] ?? null,
    assumptions,
  };
}
