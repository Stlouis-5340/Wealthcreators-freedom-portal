import { analyzeEfficiency, inferCapitalRole } from "../lib/efficiency";
import {
  buildForecast,
  buildWhatIf,
  normalizeInputs,
  scoreAtMonth,
} from "../lib/forecast";
import { fullGuideAccess } from "../lib/access";
import { totalsFromLines } from "../lib/metrics";
import { demoScenarioRows } from "../lib/sample-scenarios";
import { memberSeeds } from "../lib/sample-plans";
import { bundleHasInstitutionLeak, encodeOutputs, presentScenarioForGuide } from "../lib/scenarios";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function close(actual: number, expected: number, message: string) {
  assert(Math.abs(actual - expected) < 0.0001, `${message} (${actual} vs ${expected})`);
}

const alex = memberSeeds().find((member) => member.id === "alex");
assert(alex, "alex seed exists");
const metrics = totalsFromLines({
  streams: alex.plan.streams,
  expenses: alex.plan.expenses,
  assets: alex.plan.assets,
  liabilities: alex.plan.liabilities,
});
const passive = 1180 + 420 + 1650 + 210;
const expenses = 2400 + 850 + 420 + 310 + 240 + 180 + 350 + 200;
assert(metrics.monthlyPassive === passive, "passive income total");
assert(metrics.monthlyExpenses === expenses, "spending plan total");
close(metrics.freedomScore ?? -1, (passive / expenses) * 100, "freedom score is unchanged");
assert(metrics.incomeProducingAssets === 285400 + 96200 + 410000, "income-producing base");
assert(metrics.totalAssets - metrics.incomeProducingAssets === 168500 + 525000, "non-productive base");
close(
  metrics.yieldOnIncomeAssets ?? -1,
  ((passive * 12) / metrics.incomeProducingAssets) * 100,
  "primary yield",
);
close(
  metrics.yieldOnNetWorth ?? -1,
  ((passive * 12) / metrics.netWorth) * 100,
  "wealth efficiency matches yield on net worth",
);
close(
  metrics.yieldOnAssets ?? -1,
  ((passive * 12) / metrics.totalAssets) * 100,
  "yield on all assets stays the old formula",
);

const analysis = analyzeEfficiency({
  annualPassive: metrics.annualPassive,
  netWorth: metrics.netWorth,
  totalAssets: metrics.totalAssets,
  assets: alex.plan.assets,
});
assert(analysis.largestIncome?.name === "Duplex", "largest income-producing holding");
assert(analysis.largestNonProductive?.name === "Primary home", "largest non-productive holding");
assert(analysis.assumptions.some((line) => /guaranteed return/i.test(line)), "yield disclaimer");
assert(inferCapitalRole({ name: "Primary home", group: "Property" }).role === "lifestyle", "home inference");
assert(inferCapitalRole({ name: "Duplex", group: "Property" }).role === "income", "rental inference");
assert(inferCapitalRole({ name: "401k", group: "Retirement" }).role === "appreciation", "retirement inference");

const simple = normalizeInputs({
  monthlyPassive: 4000,
  monthlyExpenses: 10000,
  monthlyContribution: 1000,
  expenseChange: 0,
  addedMonthlyPassive: 0,
  assumedYieldPercent: 6,
  inflationPercent: 0,
});
const at200 = scoreAtMonth(simple, 200);
close(at200.passive, 5000, "contribution income after 200 months");
close(at200.score ?? -1, 50, "50% at month 200");
const simpleForecast = buildForecast(simple);
const current50 = simpleForecast.scenarios
  .find((scenario) => scenario.id === "current")
  ?.milestones.find((item) => item.threshold === 50);
assert(current50?.monthIndex === 200, "current path reaches 50% at month 200");
const current75 = simpleForecast.scenarios
  .find((scenario) => scenario.id === "current")
  ?.milestones.find((item) => item.threshold === 75);
assert(current75?.monthIndex == null, "75% stays outside 40 years when contributions are modest");

const faster = buildForecast({
  ...simple,
  monthlyPassive: passive,
  monthlyExpenses: expenses,
  monthlyContribution: 5000,
  assumedYieldPercent: 6,
  inflationPercent: 0,
});
const hundred = faster.scenarios
  .find((scenario) => scenario.id === "current")
  ?.milestones.find((item) => item.threshold === 100);
assert(hundred?.monthIndex === 60, "a larger contribution reaches 100% at month 60 with no inflation");

const alexBase = normalizeInputs({
  monthlyPassive: metrics.monthlyPassive,
  monthlyExpenses: metrics.monthlyExpenses,
  monthlyContribution: 0,
  expenseChange: 0,
  addedMonthlyPassive: 0,
  assumedYieldPercent: 6,
  inflationPercent: 2.5,
});
const alexPaths = buildForecast(alexBase);
const alex50 = alexPaths.scenarios
  .find((scenario) => scenario.id === "current")
  ?.milestones.find((item) => item.threshold === 50);
assert(alex50?.monthIndex === 0 && alex50.fallsBack, "50% is already true and can fall back as expenses inflate");
const cut = buildWhatIf(alexBase, "cut-expenses");
const cut75 = cut.scenarios
  .find((scenario) => scenario.id === "what-if")
  ?.milestones.find((item) => item.threshold === 75);
assert(cut75?.monthIndex === 0, "cutting $500 reaches 75% immediately for Alex");
assert(alexPaths.statements.some((line) => line.includes("not investment advice")), "forecast disclaimer");
assert(alexPaths.statements.some((line) => line.includes("$")), "dollar assumptions are visible");
assert(!bundleHasInstitutionLeak(alexPaths, ["Vanguard", "Fidelity", "TreasuryDirect"]), "forecast has no bank names");

const demos = demoScenarioRows();
assert(demos.filter((row) => row.sharedWithGuide).length === 1, "one shared demo scenario");
assert(demos.filter((row) => !row.sharedWithGuide).length === 1, "one private demo scenario");
const shared = demos.find((row) => row.sharedWithGuide);
assert(shared, "shared demo exists");
assert(!shared.outputs.includes("Vanguard") && !shared.assumptions.includes("Fidelity"), "saved JSON omits institutions");

const full = presentScenarioForGuide(
  { ...shared, updatedAt: "2026-10-27T00:00:00.000Z" },
  fullGuideAccess,
);
assert(full && full.ranges.length === 6, "guide with score access sees every milestone");
assert(full.statements.some((line) => line.includes("$")), "guide with totals sees dollar assumptions");

const hiddenTotals = presentScenarioForGuide(
  { ...shared, updatedAt: "2026-10-27T00:00:00.000Z" },
  { score: true, totals: false },
);
assert(hiddenTotals, "hidden totals still returns a card");
assert(!hiddenTotals.statements.join(" ").includes("$"), "dollar lines stay off without totals");
assert(hiddenTotals.ranges.length === 6, "score dates remain when the score is shared");

const hiddenScore = presentScenarioForGuide(
  { ...shared, updatedAt: "2026-10-27T00:00:00.000Z" },
  { score: false, totals: true },
);
assert(hiddenScore && hiddenScore.ranges.length === 0, "score dates stay off when the score is not shared");

const poisonedOutputs = JSON.parse(shared.outputs) as { statements: string[] };
poisonedOutputs.statements.push("Move the Vanguard account.");
const poisoned = presentScenarioForGuide(
  {
    id: shared.id,
    name: "Vanguard path",
    updatedAt: "2026-10-27T00:00:00.000Z",
    assumptions: shared.assumptions,
    outputs: JSON.stringify(poisonedOutputs),
  },
  fullGuideAccess,
);
const poisonedText = JSON.stringify(poisoned);
assert(poisoned?.name === "Shared scenario", "a bank name in the title is replaced");
assert(!poisonedText.includes("Vanguard"), "bank names are not shown to a guide");
assert(!encodeOutputs(alexPaths).includes("accessToken"), "outputs have no token field");

console.log("phase 2b checks passed");
