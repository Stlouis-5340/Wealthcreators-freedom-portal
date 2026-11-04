import { formatMoney, formatPercent } from "@/lib/format";
import { totalsFromLines } from "@/lib/metrics";
import type { FreedomAction } from "@/lib/coach-plan";
import { encodeFreedomActions } from "@/lib/coach-plan";
import { alexLivePlan } from "@/lib/sample-reports";
import { previousMonthKey } from "@/lib/month";

export const ALEX_COACH_THREAD_ID = "alex-coach-thread";

export interface CoachPlanSeed {
  id: string;
  memberId: string;
  monthKey: string;
  actions: FreedomAction[];
  source: "seed";
  generatedAt: string;
}

export interface CoachMessageSeed {
  id: string;
  role: "user" | "assistant";
  body: string;
  createdAt: string;
}

/** Alex's demo plans for the prior month and the month the portal is showing. */
export function alexCoachPlans(currentMonth: string): CoachPlanSeed[] {
  const priorMonth = previousMonthKey(currentMonth);
  const rows: CoachPlanSeed[] = [
    {
      id: `alex-plan-${priorMonth}`,
      memberId: "alex",
      monthKey: priorMonth,
      actions: priorActions(),
      source: "seed",
      generatedAt: `${priorMonth}-27T18:00:00.000Z`,
    },
  ];
  if (currentMonth !== priorMonth) {
    rows.push({
      id: `alex-plan-${currentMonth}`,
      memberId: "alex",
      monthKey: currentMonth,
      actions: currentActions(),
      source: "seed",
      generatedAt: `${currentMonth}-02T15:00:00.000Z`,
    });
  }
  return rows;
}

export function alexCoachMessages(): CoachMessageSeed[] {
  const figures = alexFigures();
  return [
    {
      id: "alex-coach-user-1",
      role: "user",
      body: "What is the most important thing I should do financially this month?",
      createdAt: "2026-11-02T15:10:00.000Z",
    },
    {
      id: "alex-coach-assistant-1",
      role: "assistant",
      body: [
        `The most useful move on your plan this month is to name the next durable dollars, not to chase a higher rate.`,
        `Your Freedom Score is ${figures.score}. Qualifying passive income is ${figures.passive} against a spending plan of ${figures.expenses}, so the Freedom Gap is ${figures.gap} a month.`,
        `Duplex net rent is the largest stream. That concentration is a quality question, not a reason to sell. The open step on "Cover the life you already live" is still about adding about $200 a month from dividends or interest, or raising net rent by about $150.`,
        `Pick one of those and write the monthly dollars. Then take the duplex estimate to Jordan as a definition question: an estimate changes net worth, not the Freedom Score, unless a stream or the spending plan changes.`,
        `This is educational guidance only. It is not financial, tax, legal, or investment advice, and it is not a guaranteed return.`,
      ].join(" "),
      createdAt: "2026-11-02T15:10:05.000Z",
    },
  ];
}

function alexFigures() {
  const plan = alexLivePlan();
  const metrics = totalsFromLines(plan);
  return {
    score: formatPercent(metrics.freedomScore ?? 0, 1),
    passive: formatMoney(metrics.monthlyPassive),
    expenses: formatMoney(metrics.monthlyExpenses),
    gap: formatMoney(metrics.monthlyFreedomGap),
  };
}

function currentActions(): FreedomAction[] {
  const figures = alexFigures();
  return [
    {
      title: "Name the next durable dollars",
      detail: `The Freedom Gap is ${figures.gap} a month. The open step on Cover the life you already live is to add about $200 a month in dividends or interest, or to raise duplex net rent by about $150. Choose one stream you already have and write the monthly amount.`,
      impact: `Closing about $200 of the gap moves the ${figures.score} Freedom Score by a few points. That is arithmetic on the spending plan. It is not a promised return.`,
      difficulty: "Moderate",
      timeline: "This month",
      goalLink: "Cover the life you already live",
    },
    {
      title: "Separate the duplex estimate from cash you can spend",
      detail:
        "The duplex and the primary home are large balances. An estimate changes net worth and yield. It does not change this month's Freedom Score unless the spending plan or a passive stream changes. Write down what the duplex balance is for.",
      impact:
        "A clearer balance keeps Wealth Efficiency honest. It does not tell you to sell, refinance, or buy anything.",
      difficulty: "Light",
      timeline: "Before the next Guide session",
      goalLink: "Reach $1.5M with liabilities on purpose",
    },
    {
      title: "Bring one definition question to your Wealth Guide",
      detail:
        "The agenda already asks how an estimate on the duplex changes the Freedom Gap. Finish the Freedom Score lesson and say whether this month's priority is the $200 stream or the three-month cash step.",
      impact:
        "The session stays on the plan. Product, tax, and legal choices stay with a qualified professional.",
      difficulty: "Light",
      timeline: "This month",
      goalLink: "Four weeks away, principal untouched",
    },
  ];
}

function priorActions(): FreedomAction[] {
  return [
    {
      title: "Lock the spending plan",
      detail:
        "Last month the personal line was still loose. Write the housing, food, and personal amounts you intend to keep, and leave surprises off the denominator.",
      impact: "A stable spending plan is what the Freedom Score divides by. It is not a budget lecture and it is not advice to cut a specific bill.",
      difficulty: "Moderate",
      timeline: "That month",
      goalLink: "Cover the life you already live",
    },
    {
      title: "Tag what counts as passive",
      detail:
        "Dividends, interest, net rent, and the book royalty can count. Wages, gifts, and selling principal do not. Mark each stream before the next report.",
      impact: "The score only means something if the numerator is honest. Tagging a stream is not a recommendation to buy it.",
      difficulty: "Light",
      timeline: "That month",
      goalLink: "Cover the life you already live",
    },
    {
      title: "Hold the duplex balance as an estimate",
      detail:
        "The duplex value was still a guess. Label it estimated until you confirm it, so yield and net worth are not treated as exact.",
      impact: "An honest label keeps the quality of the numbers visible. It does not change the Freedom Score by itself.",
      difficulty: "Light",
      timeline: "That month",
      goalLink: "Reach $1.5M with liabilities on purpose",
    },
  ];
}

export function encodeSeedPlan(actions: FreedomAction[]): string {
  return encodeFreedomActions(actions);
}
