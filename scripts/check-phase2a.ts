import { freedomScorePercent, monthlyFreedomGap, projectGap } from "../lib/gap";
import { assessPlanIntegrity, STALE_AFTER_MS } from "../lib/integrity";
import type { StoredMemberPlan } from "../lib/plans";
import { assessFreedomQuality, QUALITY_WEIGHTS } from "../lib/quality";
import { memberRow } from "../lib/roster";
import { memberSeeds, type SeedMember } from "../lib/sample-plans";
import type { Goal } from "../lib/types";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function toPlan(seed: SeedMember): StoredMemberPlan {
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
    liabilities: seed.plan.liabilities.map(({ id, name, balance, note }) => ({
      id,
      name,
      balance,
      note,
    })),
    goals: seed.plan.goals.map((goal) => ({
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
        year: checkpoint.year as Goal["checkpoints"][number]["year"],
        calendarYear: checkpoint.calendarYear,
        label: checkpoint.label,
        ...(checkpoint.targetValue == null ? {} : { targetValue: checkpoint.targetValue }),
      })),
      steps: goal.steps.map(({ id, title, detail, done }) => ({ id, title, detail, done })),
    })),
  };
}

const weights = Object.values(QUALITY_WEIGHTS).reduce((sum, weight) => sum + weight, 0);
assert(weights === 100, "quality weights must sum to 100");
assert(STALE_AFTER_MS === 14 * 24 * 60 * 60 * 1000, "stale window is 14 days");

assert(monthlyFreedomGap(10000, 4000) === 6000, "gap example");
assert(freedomScorePercent(4000, 10000) === 40, "score example");
assert(monthlyFreedomGap(4000, 10000) === 0, "covered plan has a zero gap");
assert(freedomScorePercent(10000, 4000) === 250, "score can pass 100");

const combined = projectGap({
  monthlyExpenses: 10000,
  monthlyPassive: 4000,
  expenseReduction: 1500,
  addedPassive: 1000,
  addedAssets: 100000,
  assumedYieldPercent: 6,
});
assert(combined.monthlyFromAssets === 500, "6% of 100000 is 500 a month");
assert(combined.monthlyExpenses === 8500, "expense lever");
assert(combined.monthlyPassive === 5500, "income plus illustrated asset income");
assert(combined.monthlyFreedomGap === 3000, "combined gap");
assert(combined.freedomScore === (5500 / 8500) * 100, "combined score");

const now = Date.parse("2026-11-03T12:00:00.000Z");
const seeds = memberSeeds();
const alexSeed = seeds.find((member) => member.id === "alex");
const samSeed = seeds.find((member) => member.id === "sam");
assert(alexSeed && samSeed, "demo members");
const alex = toPlan(alexSeed);
const sam = toPlan(samSeed);

const alexIntegrity = assessPlanIntegrity(alex, now);
assert(alexIntegrity.lines.duplex === "stale", "dated manual duplex is stale");
assert(alexIntegrity.lines.cash === "verified", "recent verified cash stays verified");
assert(alexIntegrity.lines.home === "estimated", "undated manual home stays estimated");
assert(alexIntegrity.summary.netWorth === "stale", "one stale holding makes net worth stale");
assert(alexIntegrity.summary.passiveIncome === "estimated", "typed streams are estimated");
assert(alexIntegrity.summary.spendingPlan === "estimated", "typed plan is estimated");
assert(alexIntegrity.summary.freedomGap === "estimated", "gap follows its inputs");

const empty = assessPlanIntegrity({ expenses: [], streams: [], assets: [], liabilities: [] }, now);
assert(empty.summary.netWorth === "missing", "no lines means missing, not zero");
assert(empty.summary.freedomGap === "missing", "gap is missing without a plan");

const alexQuality = assessFreedomQuality(alex);
assert(alexQuality.score != null && alexQuality.score > 50 && alexQuality.score < 100, "alex quality is partial");
assert(alexQuality.confidence === 0.92, "tax weight is held out");
assert(alexQuality.factors.find((factor) => factor.id === "tax")?.limited === true, "tax is limited data");
assert(alexQuality.chips.some((chip) => chip.startsWith("Limited data")), "home chip names limited data");

const samQuality = assessFreedomQuality(sam);
assert((samQuality.factors.find((factor) => factor.id === "diversification")?.limited) === true, "rollup income is limited");
assert(samQuality.factors.find((factor) => factor.id === "debt")?.limited === false, "debt can use totals");
assert(samQuality.limitedData, "thin plans say limited data");

const alexRow = memberRow(alex);
assert(alexRow.metrics.monthlyFreedomGap === 4950 - 3460, "alex gap from the sample plan");
const guideJson = JSON.stringify(alexRow);
for (const word of ["Vanguard", "Fidelity", "TreasuryDirect", "accessToken", "passwordHash", "plaid-"]) {
  assert(!guideJson.includes(word), `guide row leaked ${word}`);
}
const samJson = JSON.stringify(memberRow(sam));
for (const word of ["Vanguard", "Fidelity", "TreasuryDirect", "accessToken"]) {
  assert(!samJson.includes(word), `sam row leaked ${word}`);
}

console.log(
  `phase 2a checks passed (alex quality ${alexQuality.score}, confidence ${alexQuality.confidence}, gap ${alexRow.metrics.monthlyFreedomGap})`,
);
