import { demoActivity } from "../lib/sample-activity";
import { chicagoMonthKey, previousMonthKey, weekInMonth } from "../lib/month";
import {
  buildMonthlyReportDraft,
  deltasFor,
  EDUCATION_PLACEHOLDER,
  EDUCATIONAL_LABEL,
  encodeReportJson,
  numbersOf,
  parseActions,
  parseGoalsSummary,
  parseMilestones,
  resolveBaseline,
} from "../lib/report";
import { alexLivePlan, alexPriorReport } from "../lib/sample-reports";
import type { StoredMemberPlan } from "../lib/plans";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const now = new Date("2026-11-03T18:00:00.000Z");
assert(chicagoMonthKey(now) === "2026-11", "November 3, 2026 is November in Chicago");
assert(previousMonthKey("2026-11") === "2026-10", "previous month");
assert(previousMonthKey("2026-01") === "2025-12", "previous month wraps the year");
assert(weekInMonth("2026-10-26", "2026-10"), "October week");
assert(!weekInMonth("2026-11-02", "2026-10"), "November week is not October");

const prior = alexPriorReport(now);
const live = alexLivePlan();
const checkIns = demoActivity(now).checkIns.filter((checkIn) => checkIn.memberId === "alex");
assert(prior.monthKey === "2026-10", "Alex's seeded snapshot is the prior month");
assert(checkIns.length === 1 && checkIns[0].weekKey === "2026-10-26", "Alex's demo check-in is in October");

const current = buildMonthlyReportDraft({
  plan: live,
  monthKey: "2026-11",
  checkIns,
  prior: { numbers: numbersOf(prior), goals: prior.goalsSummary },
  generatedAt: now,
});

assert(prior.expenses != null && current.expenses != null && prior.expenses === current.expenses + 150, "prior plan was higher");
assert(prior.passive != null && current.passive != null && prior.passive === current.passive - 180, "prior passive was lower");
assert(prior.netWorth != null && current.netWorth != null && prior.netWorth === current.netWorth - 20_000, "prior net worth was lower");
assert(prior.gap != null && current.gap != null && prior.gap === current.gap + 330, "prior gap was wider");
assert(prior.freedomScore != null && current.freedomScore != null && prior.freedomScore < current.freedomScore, "score rose");
assert(prior.yieldOnAssets != null && current.yieldOnAssets != null && prior.yieldOnAssets < current.yieldOnAssets, "yield rose");

const compared = resolveBaseline({
  monthKey: current.monthKey,
  prior: { numbers: numbersOf(prior) },
  checkIns,
});
assert(compared.source === "report", "a saved month beats a check-in");
assert(compared.title === "Since October 2026", "comparison names the prior month");
const deltas = deltasFor(numbersOf(current), compared);
for (const key of ["freedomScore", "gap", "passive", "expenses", "netWorth", "yieldOnAssets", "quality"] as const) {
  assert(deltas[key].label !== "First report", `${key} has a real baseline`);
}
assert(deltas.freedomScore.favorable === true, "a higher score is the direction being worked toward");
assert(deltas.gap.favorable === true && deltas.gap.label.includes("330"), "the gap narrowed by the plan change");
assert(deltas.netWorth.label.includes("20,000"), "net worth movement is the duplex change");

assert(current.milestones.trackable, "milestones are trackable against the prior month");
assert(
  current.milestones.steps.some((step) => step.id === "alex-nw-debt" && step.title === "Take on no new consumer debt"),
  "the step that closed this month is named",
);
assert(current.milestones.bands.length === 0, "the score did not cross a new band");
assert(!prior.milestones.trackable, "the first saved month does not invent milestones");

assert(current.actions.length === 3, "three actions");
assert(current.actions.every((item) => item.educational), "each action is marked educational");
assert(current.actions.map((item) => item.id).join(",") === "commitment,gap-spending,goal-alex-freedom-sleeve", "commitment, gap, and the open step");
assert(EDUCATIONAL_LABEL.toLowerCase().includes("not investment"), "the section is labeled educational");
assert(EDUCATION_PLACEHOLDER.toLowerCase().includes("not in the portal yet"), "education is a placeholder");

const checkInOnly = resolveBaseline({ monthKey: "2026-11", prior: null, checkIns });
assert(checkInOnly.source === "check-in", "a prior-month check-in is the fallback");
const checkInDeltas = deltasFor(numbersOf(current), checkInOnly);
assert(checkInDeltas.freedomScore.label !== "First report", "score can move from a check-in");
assert(checkInDeltas.gap.label !== "First report", "gap can move from a check-in");
assert(checkInDeltas.quality.label !== "First report", "quality can move from a check-in");
for (const key of ["passive", "expenses", "netWorth", "yieldOnAssets"] as const) {
  assert(checkInDeltas[key].label === "First report", `${key} stays First report without a monthly snapshot`);
}

const none = resolveBaseline({ monthKey: "2026-11", prior: null, checkIns: [] });
assert(none.source === "none" && none.title === "First report", "no baseline is called First report");
for (const delta of Object.values(deltasFor(numbersOf(current), none))) {
  assert(delta.label === "First report", "no field invents a delta");
}

const emptyPlan: StoredMemberPlan = {
  id: "empty",
  name: "Empty",
  email: "empty@example.com",
  lastActive: "",
  coachingNote: "",
  expenses: [],
  streams: [],
  assets: [],
  liabilities: [],
  goals: [],
};
const empty = buildMonthlyReportDraft({
  plan: emptyPlan,
  monthKey: "2026-11",
  checkIns: [],
  prior: null,
  generatedAt: now,
});
assert(empty.actions.length === 3, "a thin plan still gets three educational steps");
assert(empty.freedomScore == null && empty.gap == null && empty.netWorth == null, "missing inputs stay empty");

const encoded = encodeReportJson(current);
assert(parseGoalsSummary(encoded.goalsSummary).some((goal) => goal.steps.some((step) => step.id === "alex-nw-debt" && step.done)), "goals round-trip");
assert(parseMilestones(encoded.milestones).steps.some((step) => step.id === "alex-nw-debt"), "milestones round-trip");
assert(parseActions(encoded.actions).length === 3, "actions round-trip");
assert(parseActions("not json").length === 0, "bad actions do not throw");
assert(!parseMilestones("{").trackable, "bad milestones do not throw");

const visible = JSON.stringify({ prior, current, guidance: EDUCATIONAL_LABEL });
for (const word of ["Vanguard", "Fidelity", "TreasuryDirect", "accessToken", "passwordHash", "guaranteed", "guarantee"]) {
  assert(!visible.includes(word), `report copy included ${word}`);
}

console.log(
  `monthly report checks passed (score ${current.freedomScore?.toFixed(1)} from ${prior.freedomScore?.toFixed(1)}, gap ${current.gap} from ${prior.gap})`,
);
