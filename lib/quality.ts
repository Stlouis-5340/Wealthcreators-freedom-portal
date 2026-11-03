/**
 * Freedom Quality Score v1. Separate from Freedom Score.
 *
 * Freedom Score asks whether passive income covers the spending plan.
 * Quality asks whether that coverage looks durable, using only figures already
 * on the plan. It does not invent a tax rate, an inflation rate, or a return.
 *
 * Published weights (they sum to 100):
 * diversification 12, stability 12, liquidity 12, debt 10, concentration 10,
 * volatility 10, single-source dependence 8, protection 10, tax 8, inflation 8.
 *
 * When a factor lacks the lines it needs, it is held out. It is not scored as
 * zero. The displayed score is earned points ÷ points that could be scored,
 * scaled to 100. Confidence is the share of the 100-point model that had data.
 * Tax is always held out in v1: the plan has no bracket, withholding, or
 * filing status, and account types are not treated as a tax estimate.
 *
 * Roster members stored as one income total and one asset total do not get
 * made-up diversification, liquidity, or concentration scores. Those factors
 * say "limited data".
 */

export const QUALITY_WEIGHTS = {
  diversification: 12,
  stability: 12,
  liquidity: 12,
  debt: 10,
  concentration: 10,
  volatility: 10,
  singleSource: 8,
  protection: 10,
  tax: 8,
  inflation: 8,
} as const;

export interface QualityFactor {
  id: keyof typeof QUALITY_WEIGHTS;
  label: string;
  weight: number;
  /** Null when the factor is held out for limited data. */
  earned: number | null;
  limited: boolean;
  reason: string;
}

export interface FreedomQuality {
  /** 0–100, rescaled to factors that had data. Null when none could be scored. */
  score: number | null;
  /** Share of the 100-point model that had data, from 0 to 1. */
  confidence: number;
  limitedData: boolean;
  factors: QualityFactor[];
  /** Short phrases for the home card. */
  chips: string[];
}

export interface QualityInput {
  expenses: { id: string; name: string; monthly: number; note: string }[];
  streams: { id: string; name: string; monthly: number; source: string }[];
  assets: { id: string; name: string; group: string; balance: number }[];
  liabilities: { id: string; balance: number }[];
}

const VARIABLE_TAGS = ["royalty", "business", "crypto", "option", "commission", "bonus"];
const MODERATE_TAGS = ["rent", "lease", "rental"];
const STABLE_TAGS = ["treasury", "interest", "bond", "pension", "annuity", "dividend", "distribution", "cash"];
const RESILIENT_TAGS = ["rent", "lease", "rental", "dividend", "distribution", "royalty", "property"];
const FIXED_TAGS = ["interest", "treasury", "pension", "annuity", "bond", "cash"];

const GROUP_CALM: Record<string, number> = {
  Cash: 10,
  Retirement: 6,
  Property: 5,
  Investments: 4,
};

function weightSum(): number {
  return Object.values(QUALITY_WEIGHTS).reduce((sum, weight) => sum + weight, 0);
}

if (weightSum() !== 100) {
  throw new Error("Freedom Quality weights must sum to 100.");
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function isRollupAsset(assets: QualityInput["assets"]): boolean {
  return assets.length === 1 && (assets[0].name === "Assets" || assets[0].id.endsWith("-assets"));
}

function isRollupStream(streams: QualityInput["streams"]): boolean {
  return (
    streams.length === 1 &&
    (streams[0].name === "Passive income" || streams[0].id.endsWith("-passive"))
  );
}

function isRollupExpense(expenses: QualityInput["expenses"]): boolean {
  return (
    expenses.length === 1 &&
    (expenses[0].name === "Spending plan" || expenses[0].id.endsWith("-plan"))
  );
}

function textOf(stream: QualityInput["streams"][number]): string {
  return `${stream.name} ${stream.source}`.toLowerCase();
}

function hasTag(text: string, tags: string[]): boolean {
  return tags.some((tag) => text.includes(tag));
}

function stabilityOf(stream: QualityInput["streams"][number]): number | null {
  const text = textOf(stream);
  if (hasTag(text, VARIABLE_TAGS)) return 0.35;
  if (hasTag(text, MODERATE_TAGS)) return 0.65;
  if (hasTag(text, STABLE_TAGS)) return 1;
  return null;
}

function inflationClass(stream: QualityInput["streams"][number]): "resilient" | "fixed" | "mixed" | "unknown" {
  const text = textOf(stream);
  const resilient = hasTag(text, RESILIENT_TAGS);
  const fixed = hasTag(text, FIXED_TAGS);
  if (resilient && fixed) return "mixed";
  if (resilient) return "resilient";
  if (fixed) return "fixed";
  return "unknown";
}

function factor(
  id: QualityFactor["id"],
  label: string,
  earned: number | null,
  limited: boolean,
  reason: string,
): QualityFactor {
  return {
    id,
    label,
    weight: QUALITY_WEIGHTS[id],
    earned: earned == null ? null : round1(Math.min(QUALITY_WEIGHTS[id], Math.max(0, earned))),
    limited,
    reason,
  };
}

function held(id: QualityFactor["id"], label: string, reason: string): QualityFactor {
  return factor(id, label, null, true, reason);
}

function diversification(input: QualityInput): QualityFactor {
  const label = "Diversification";
  if (input.streams.length === 0) {
    return held("diversification", label, "No passive streams are on file.");
  }
  if (isRollupStream(input.streams)) {
    return held("diversification", label, "Passive income is one total, so sources are not listed.");
  }
  const producing = input.streams.filter((stream) => stream.monthly > 0).length;
  const earned = producing <= 0 ? 0 : producing === 1 ? 3 : producing === 2 ? 6 : producing === 3 ? 9 : 12;
  const reason =
    producing <= 0
      ? "No stream is producing income."
      : producing === 1
        ? "One income source."
        : producing >= 4
          ? "Four or more income sources."
          : `${producing} income sources.`;
  return factor("diversification", label, earned, false, reason);
}

function stability(input: QualityInput): QualityFactor {
  const label = "Stability";
  const producing = input.streams.filter((stream) => stream.monthly > 0);
  if (producing.length === 0 || isRollupStream(input.streams)) {
    return held("stability", label, "Named income streams are not on file, so stability is not scored.");
  }
  const scores = producing.map(stabilityOf);
  const known = scores.filter((score): score is number => score != null);
  if (known.length !== scores.length || known.length === 0) {
    return held("stability", label, "A stream has no stability tag, so this factor is held out.");
  }
  const average = known.reduce((sum, score) => sum + score, 0) / known.length;
  const earned = average * QUALITY_WEIGHTS.stability;
  const reason =
    average >= 0.85
      ? "Tagged streams are mostly interest, dividends, or similar steady sources."
      : average >= 0.6
        ? "Tagged streams mix steady sources with rent or less predictable income."
        : "Tagged streams include royalties or other less predictable income.";
  return factor("stability", label, earned, false, reason);
}

function liquidity(input: QualityInput): QualityFactor {
  const label = "Liquidity";
  const expenses = input.expenses.reduce((sum, line) => sum + line.monthly, 0);
  if (isRollupAsset(input.assets) || input.assets.length === 0) {
    return held("liquidity", label, "Assets are not broken out, so cash is not visible.");
  }
  if (!(expenses > 0)) {
    return held("liquidity", label, "No spending plan, so months of cash are unknown.");
  }
  const cash = input.assets
    .filter((asset) => asset.group === "Cash")
    .reduce((sum, asset) => sum + asset.balance, 0);
  const months = cash / expenses;
  const earned = months >= 6 ? 12 : months >= 3 ? 9 : months >= 1 ? 5 : cash > 0 ? 2 : 0;
  const reason =
    months >= 6
      ? "Cash covers six months of the plan or more."
      : months >= 3
        ? "Cash covers at least three months of the plan."
        : months >= 1
          ? "Cash covers about a month of the plan."
          : cash > 0
            ? "Cash covers less than a month of the plan."
            : "No cash balance is on file.";
  return factor("liquidity", label, earned, false, reason);
}

function debt(input: QualityInput): QualityFactor {
  const label = "Debt";
  const assets = input.assets.reduce((sum, line) => sum + line.balance, 0);
  const liabilities = input.liabilities.reduce((sum, line) => sum + line.balance, 0);
  if (input.assets.length === 0 || input.liabilities.length === 0 || !(assets > 0)) {
    return held("debt", label, "Assets or liabilities are missing, so debt is not scored as zero.");
  }
  const ratio = liabilities / assets;
  const earned = ratio <= 0 ? 10 : ratio <= 0.25 ? 8 : ratio <= 0.5 ? 6 : ratio <= 0.75 ? 3 : 1;
  const reason =
    ratio <= 0
      ? "No debt is on file."
      : ratio <= 0.25
        ? "Debt is under a quarter of assets."
        : ratio <= 0.5
          ? "Debt is under half of assets."
          : ratio <= 0.75
            ? "Debt is a large share of assets."
            : "Debt is most of the balance sheet.";
  return factor("debt", label, earned, false, reason);
}

function concentration(input: QualityInput): QualityFactor {
  const label = "Concentration";
  const total = input.assets.reduce((sum, line) => sum + line.balance, 0);
  if (isRollupAsset(input.assets) || input.assets.length === 0 || !(total > 0)) {
    return held("concentration", label, "Holdings are not listed, so concentration is not visible.");
  }
  const largest = Math.max(...input.assets.map((asset) => asset.balance));
  const share = largest / total;
  const earned = share <= 0.3 ? 10 : share <= 0.45 ? 7 : share <= 0.6 ? 4 : 1;
  const percent = Math.round(share * 100);
  const reason =
    share <= 0.3
      ? `The largest holding is ${percent}% of assets.`
      : share <= 0.45
        ? `The largest holding is ${percent}% of assets.`
        : share <= 0.6
          ? `The largest holding is ${percent}% of assets.`
          : `One holding is ${percent}% of assets.`;
  return factor("concentration", label, earned, false, reason);
}

function volatility(input: QualityInput): QualityFactor {
  const label = "Volatility";
  const total = input.assets.reduce((sum, line) => sum + line.balance, 0);
  if (isRollupAsset(input.assets) || input.assets.length === 0 || !(total > 0)) {
    return held("volatility", label, "Holdings are not listed, so volatility is not visible.");
  }
  if (input.assets.some((asset) => GROUP_CALM[asset.group] == null)) {
    return held("volatility", label, "An asset group is unrecognized, so volatility is held out.");
  }
  const weighted = input.assets.reduce(
    (sum, asset) => sum + asset.balance * GROUP_CALM[asset.group],
    0,
  );
  const earned = weighted / total;
  const reason =
    earned >= 8
      ? "Most holdings are in calmer groups such as cash."
      : earned >= 6
        ? "Holdings lean toward calmer groups, with some market exposure."
        : earned >= 4
          ? "Holdings include a meaningful share of market or property values."
          : "Holdings are concentrated in groups that can move around.";
  return factor("volatility", label, earned, false, reason);
}

function singleSource(input: QualityInput): QualityFactor {
  const label = "Single-source dependence";
  const producing = input.streams.filter((stream) => stream.monthly > 0);
  const total = producing.reduce((sum, stream) => sum + stream.monthly, 0);
  if (isRollupStream(input.streams) || producing.length === 0 || !(total > 0)) {
    return held(
      "singleSource",
      label,
      "Separate income streams are not on file, so dependence is not scored.",
    );
  }
  const largest = Math.max(...producing.map((stream) => stream.monthly));
  const share = largest / total;
  const earned = share <= 0.4 ? 8 : share <= 0.6 ? 5 : share <= 0.8 ? 3 : 1;
  const reason =
    producing.length === 1
      ? "All passive income is one source."
      : share <= 0.4
        ? "No stream is more than 40% of passive income."
        : share <= 0.6
          ? "The largest stream is under 60% of passive income."
          : share <= 0.8
            ? "One stream is most of the passive income."
            : "One stream is nearly all of the passive income.";
  return factor("singleSource", label, earned, false, reason);
}

function protection(input: QualityInput): QualityFactor {
  const label = "Protection";
  const expenses = input.expenses.reduce((sum, line) => sum + line.monthly, 0);
  if (
    isRollupAsset(input.assets) ||
    isRollupExpense(input.expenses) ||
    input.assets.length === 0 ||
    !(expenses > 0)
  ) {
    return held("protection", label, "Reserves or insurance are not broken out on this plan.");
  }
  const cash = input.assets
    .filter((asset) => asset.group === "Cash")
    .reduce((sum, asset) => sum + asset.balance, 0);
  const months = cash / expenses;
  const insured = input.expenses.some(
    (line) =>
      line.monthly > 0 &&
      (/insurance/i.test(line.name) || /insurance/i.test(line.note)),
  );
  let earned = 1;
  let reason = "No multi-month cash reserve and no insurance line are on the plan.";
  if (months >= 3 && insured) {
    earned = 10;
    reason = "A cash reserve covers at least three months, and insurance is on the plan.";
  } else if (months >= 3) {
    earned = 6;
    reason = "A cash reserve covers at least three months. No insurance line is on the plan.";
  } else if (months >= 1 && insured) {
    earned = 5;
    reason = "Insurance is on the plan. Cash covers less than three months.";
  } else if (insured) {
    earned = 4;
    reason = "Insurance is on the plan. Cash covers less than a month.";
  } else if (months >= 1) {
    earned = 2;
    reason = "Cash covers less than three months, and no insurance line is on the plan.";
  }
  return factor("protection", label, earned, false, reason);
}

function tax(): QualityFactor {
  return held(
    "tax",
    "Tax",
    "No tax rate, withholding, or filing status is on the plan.",
  );
}

function inflation(input: QualityInput): QualityFactor {
  const label = "Inflation";
  const producing = input.streams.filter((stream) => stream.monthly > 0);
  const total = producing.reduce((sum, stream) => sum + stream.monthly, 0);
  if (isRollupStream(input.streams) || producing.length === 0 || !(total > 0)) {
    return held("inflation", label, "Income is not broken out, so inflation exposure is not scored.");
  }
  const classes = producing.map(inflationClass);
  if (classes.some((kind) => kind === "unknown")) {
    return held("inflation", label, "A stream has no inflation tag, so this factor is held out.");
  }
  const resilient = producing.reduce((sum, stream) => {
    const kind = inflationClass(stream);
    const share = kind === "resilient" ? 1 : kind === "mixed" ? 0.5 : 0;
    return sum + stream.monthly * share;
  }, 0);
  const ratio = resilient / total;
  const earned = ratio >= 0.75 ? 8 : ratio >= 0.5 ? 5 : ratio >= 0.25 ? 3 : 1;
  const reason =
    ratio >= 0.75
      ? "Most passive income is tagged as rent, dividends, or royalties. This is not an inflation forecast."
      : ratio >= 0.5
        ? "About half of passive income is tagged as more able to adjust. This is not an inflation forecast."
        : "Most passive income is tagged as fixed interest or cash. This is not an inflation forecast.";
  return factor("inflation", label, earned, false, reason);
}

function buildChips(factors: QualityFactor[]): string[] {
  const drags = factors
    .filter((item) => !item.limited && item.earned != null && item.weight > 0)
    .sort((a, b) => a.earned! / a.weight - b.earned! / b.weight)
    .slice(0, 3)
    .map((item) => item.reason);
  const limited = factors.filter((item) => item.limited).map((item) => item.label);
  const chips = [...drags];
  if (limited.length > 0) chips.push(`Limited data: ${limited.join(", ")}`);
  return chips.slice(0, 4);
}

export function assessFreedomQuality(input: QualityInput): FreedomQuality {
  const factors = [
    diversification(input),
    stability(input),
    liquidity(input),
    debt(input),
    concentration(input),
    volatility(input),
    singleSource(input),
    protection(input),
    tax(),
    inflation(input),
  ];
  const available = factors.filter((item) => !item.limited).reduce((sum, item) => sum + item.weight, 0);
  const earned = factors
    .filter((item) => !item.limited)
    .reduce((sum, item) => sum + (item.earned ?? 0), 0);
  const score = available > 0 ? Math.round((earned / available) * 100) : null;
  return {
    score: score == null ? null : Math.min(100, Math.max(0, score)),
    confidence: available / weightSum(),
    limitedData: factors.some((item) => item.limited),
    factors,
    chips: buildChips(factors),
  };
}
