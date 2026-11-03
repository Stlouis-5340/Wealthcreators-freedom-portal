import { buildCheckInSummary, parseCheckInDraft } from "../lib/check-in";
import { attentionQueues, behindReason } from "../lib/command-center";
import { AS_OF_YEAR } from "../lib/format";
import type { StoredMemberPlan } from "../lib/plans";
import { memberRow } from "../lib/roster";
import { demoActivity } from "../lib/sample-activity";
import { memberSeeds, type SeedMember } from "../lib/sample-plans";
import type { Goal } from "../lib/types";
import { addCalendarDays, chicagoWeekKey } from "../lib/week";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function ids(items: { memberId: string }[]): string[] {
  return items.map((item) => item.memberId);
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
    liabilities: seed.plan.liabilities.map(({ id, name, balance, note }) => ({ id, name, balance, note })),
    goals: seed.plan.goals.map(toGoal),
  };
}

function toGoal(goal: SeedMember["plan"]["goals"][number]): Goal {
  return {
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
  };
}

const now = new Date("2026-11-03T18:00:00.000Z");
assert(chicagoWeekKey(now) === "2026-11-02", "Tuesday Nov 3 2026 UTC is the Chicago week of Nov 2");
assert(chicagoWeekKey(new Date("2026-11-09T05:30:00.000Z")) === "2026-11-02", "Sunday evening Chicago stays in the same week");
assert(chicagoWeekKey(new Date("2026-11-09T06:30:00.000Z")) === "2026-11-09", "Monday morning Chicago opens the next week");
assert(addCalendarDays("2026-11-02", 6) === "2026-11-08", "week ends Sunday");

const empty = parseCheckInDraft({
  win: "  ",
  challenge: "A tight week",
  actionStatus: "yes",
  commitment: "Name one stream",
  needsSupport: false,
  supportNote: "",
});
assert(!empty.ok, "blank win is rejected");
const badAction = parseCheckInDraft({
  win: "Saved the plan",
  challenge: "A tight week",
  actionStatus: "maybe",
  commitment: "Name one stream",
  needsSupport: true,
  supportNote: "",
});
assert(!badAction.ok, "unknown action is rejected");

const summary = buildCheckInSummary({
  weekKey: "2026-11-02",
  win: "Kept the plan flat",
  challenge: "A bonus looked like income",
  actionStatus: "partial",
  commitment: "Leave the plan unchanged",
  needsSupport: true,
  freedomScore: 40,
  monthlyFreedomGap: 6000,
  qualityScore: 72,
});
assert(summary.includes("Freedom Score 40.0%"), "summary includes the score");
assert(summary.includes("Freedom Gap"), "summary includes the gap");
assert(summary.includes("Freedom Quality 72/100"), "summary includes quality");
assert(summary.includes("partly done"), "summary includes the action");
assert(summary.includes("Support from the Wealth Guide was requested"), "summary includes support");
assert(!/guarantee/i.test(summary), "summary does not promise a result");

const activity = demoActivity(now);
const keys = new Set(activity.checkIns.map((checkIn) => `${checkIn.memberId}:${checkIn.weekKey}`));
assert(keys.size === activity.checkIns.length, "one check-in per member per week");
assert(!activity.checkIns.some((checkIn) => checkIn.memberId === "sam"), "Sam has not checked in");
const prose = JSON.stringify(activity);
for (const word of ["Vanguard", "Fidelity", "TreasuryDirect", "accessToken", "passwordHash", "guaranteed"]) {
  assert(!prose.includes(word), `demo activity included ${word}`);
}

const byMember = new Map<string, typeof activity.checkIns>();
for (const checkIn of activity.checkIns) {
  const list = byMember.get(checkIn.memberId) ?? [];
  list.push(checkIn);
  byMember.set(checkIn.memberId, list);
}
const notes = activity.notes;
const tasks = activity.tasks;
const rows = memberSeeds().map((member) => {
  const row = memberRow(toPlan(member));
  row.checkIns = byMember.get(member.id) ?? [];
  row.notes = notes.filter((note) => note.memberId === member.id);
  row.tasks = tasks.filter((task) => task.memberId === member.id);
  return row;
});

const queues = attentionQueues(rows, now);
assert(ids(queues.support).join(",") === "drew,elena", `support queue ${ids(queues.support)}`);
assert(ids(queues.missed).join(",") === "sam,drew,alex", `missed queue ${ids(queues.missed)}`);
assert(ids(queues.declining).join(",") === "drew", `declining queue ${ids(queues.declining)}`);
assert(ids(queues.behind).join(",") === "drew,sam,alex", `behind queue ${ids(queues.behind)}`);
assert(ids(queues.progress).join(",") === "marcus,amina", `progress queue ${ids(queues.progress)}`);
assert(queues.declining[0]?.reason.includes("no daily score history"), "decline is labeled as a snapshot comparison");
assert(queues.missed.find((item) => item.memberId === "sam")?.reason.includes("no earlier check-in"), "Sam has no prior check-in");
const samBehind = queues.behind.find((item) => item.memberId === "sam")?.reason ?? "";
assert(samBehind.includes("Name one passive stream"), "Sam's open task is named");
assert(samBehind.includes("was due"), "Sam's task uses its due date");
assert(!queues.behind.some((item) => /overdue step/i.test(item.reason)), "steps are not called overdue");

const missedPlan: StoredMemberPlan = {
  id: "case",
  name: "Case",
  email: "case@example.test",
  lastActive: "2026-10-20",
  coachingNote: "",
  expenses: [{ id: "e", name: "Plan", monthly: 1000, note: "" }],
  streams: [{ id: "s", name: "Income", monthly: 200, source: "interest" }],
  assets: [],
  liabilities: [],
  goals: [
    {
      id: "g",
      kind: "wealth",
      title: "Reach the line",
      summary: "A test goal.",
      progressSource: "freedom",
      baseline: 10,
      baselineLabel: "10%",
      target: 100,
      targetLabel: "the line",
      checkpoints: [
        { year: 1, calendarYear: AS_OF_YEAR - 1, label: "40% score", targetValue: 40 },
        { year: 2, calendarYear: AS_OF_YEAR, label: "60% score", targetValue: 60 },
      ],
      steps: [
        { id: "a", title: "Write the plan", detail: "Done.", done: true },
        { id: "b", title: "Name a stream", detail: "Open.", done: true },
        { id: "c", title: "Automate it", detail: "Open.", done: true },
      ],
    } satisfies Goal,
  ],
};
const missedRow = memberRow(missedPlan);
const missedText = behindReason(missedRow, "2026-11-03");
assert(missedText?.includes("was not met"), `missed checkpoint should flag, got ${missedText}`);
assert(!missedText?.toLowerCase().includes("overdue"), "a missed year is not called an overdue step");

console.log(
  `weekly checks passed (week ${chicagoWeekKey(now)}, support ${ids(queues.support).join("+")}, progress ${ids(queues.progress).join("+")})`,
);
