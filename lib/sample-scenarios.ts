import { buildForecast, buildWhatIf, normalizeInputs } from "@/lib/forecast";
import { ILLUSTRATIVE_YIELD_PERCENT } from "@/lib/gap";
import { totalsFromLines } from "@/lib/metrics";
import { assumptionsFromBundle, encodeAssumptions, encodeOutputs } from "@/lib/scenarios";
import { memberSeeds } from "@/lib/sample-plans";

export interface DemoScenarioRow {
  id: string;
  memberId: string;
  name: string;
  assumptions: string;
  outputs: string;
  sharedWithGuide: boolean;
}

/** Alex's seeded runs. One is shared with Jordan. The private what-if is not. */
export function demoScenarioRows(): DemoScenarioRow[] {
  const alex = memberSeeds().find((member) => member.id === "alex");
  if (!alex) return [];
  const metrics = totalsFromLines({
    streams: alex.plan.streams,
    expenses: alex.plan.expenses,
    assets: alex.plan.assets,
    liabilities: alex.plan.liabilities,
  });
  const base = normalizeInputs({
    monthlyPassive: metrics.monthlyPassive,
    monthlyExpenses: metrics.monthlyExpenses,
    monthlyContribution: 0,
    expenseChange: 0,
    addedMonthlyPassive: 0,
    assumedYieldPercent: ILLUSTRATIVE_YIELD_PERCENT,
    inflationPercent: 2.5,
  });
  const forecast = buildForecast(base);
  const whatIf = buildWhatIf(base, "cut-expenses");
  return [
    {
      id: "alex-scenario-shared",
      memberId: "alex",
      name: "Alex illustrated path",
      assumptions: encodeAssumptions(assumptionsFromBundle(forecast, base)),
      outputs: encodeOutputs(forecast),
      sharedWithGuide: true,
    },
    {
      id: "alex-scenario-private",
      memberId: "alex",
      name: "Alex private expense cut",
      assumptions: encodeAssumptions(assumptionsFromBundle(whatIf, base)),
      outputs: encodeOutputs(whatIf),
      sharedWithGuide: false,
    },
  ];
}
