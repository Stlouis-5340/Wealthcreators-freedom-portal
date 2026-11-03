import { accessFromMemberToggles, fullGuideAccess, parseGuideAccess, serializeGuideAccess } from "../lib/access";
import { sanitizeMeta } from "../lib/audit";
import { applyGuideAccess, memberRow } from "../lib/roster";
import { memberSeeds } from "../lib/sample-plans";
import { currentTotpCode, generateTotpSecret, verifyTotp } from "../lib/totp";
import type { Goal } from "../lib/types";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const toggles = accessFromMemberToggles({ score: false, totals: true, goals: false, checkIns: true });
assert(toggles.tasks === true, "tasks stay on when a member saves visibility");
assert(serializeGuideAccess(toggles).includes('"tasks":true'), "saved scopes keep tasks on");
const parsed = parseGuideAccess(serializeGuideAccess({ ...fullGuideAccess, score: false, checkIns: false }));
assert(parsed.score === false && parsed.checkIns === false && parsed.totals === true, "scopes round-trip");

const secret = generateTotpSecret();
const now = Date.parse("2026-11-03T20:00:00.000Z");
assert(verifyTotp(secret, currentTotpCode(secret, now), now), "current code verifies");
assert(verifyTotp(secret, currentTotpCode(secret, now + 30_000), now), "one step of clock skew still verifies");
assert(!verifyTotp(secret, "000000", now) || currentTotpCode(secret, now) === "000000", "a random code does not verify");

const clean = sanitizeMeta({
  monthKey: "2026-10",
  accessToken: "should-drop",
  password: "nope",
  nested: { mfaSecret: "nope", score: false },
  note: "access_token=abc",
});
assert(!JSON.stringify(clean).includes("should-drop"), "token values are dropped");
assert(!JSON.stringify(clean).toLowerCase().includes("accesstoken"), "token keys are dropped");
assert(clean.monthKey === "2026-10", "safe meta remains");

const alex = memberSeeds().find((member) => member.id === "alex");
assert(alex, "alex seed exists");
const plan = {
  id: alex.id,
  name: alex.name,
  email: alex.email,
  lastActive: alex.lastActive,
  coachingNote: alex.coachingNote,
  expenses: alex.plan.expenses.map(({ id, name, monthly, note }) => ({ id, name, monthly, note })),
  streams: alex.plan.streams.map(({ id, name, monthly, source }) => ({ id, name, monthly, source })),
  assets: alex.plan.assets.map((line) => ({
    id: line.id,
    name: line.name,
    institution: line.institution,
    group: line.group as "Cash" | "Investments" | "Property" | "Retirement",
    balance: line.balance,
    valuation: line.valuation,
    confirmedAt: line.confirmedAt ? line.confirmedAt.toISOString() : null,
  })),
  liabilities: alex.plan.liabilities.map(({ id, name, balance, note }) => ({ id, name, balance, note })),
  goals: alex.plan.goals.map((goal) => ({
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
const hidden = applyGuideAccess(memberRow(plan), {
  score: false,
  totals: false,
  goals: false,
  checkIns: false,
  tasks: false,
});
const payload = JSON.stringify(hidden);
assert(!payload.includes(String(plan.assets[0]?.balance)), "hidden roster omits an asset balance");
assert(hidden.goals.length === 0 && hidden.checkIns.length === 0 && hidden.tasks.length === 0, "hidden sections are empty");
const parsedPayload = JSON.parse(payload) as { metrics: { netWorth: number | null; freedomScore: number | null } };
assert(parsedPayload.metrics.netWorth == null && parsedPayload.metrics.freedomScore == null, "hidden totals become null");

console.log("security checks passed");
