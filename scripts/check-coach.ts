import { fullGuideAccess } from "../lib/access";
import { buildCoachContext } from "../lib/coach-context";
import { isCoachReady, resolveCoachModel, DEFAULT_COACH_MODEL } from "../lib/coach-config";
import {
  COACH_DISCLAIMER,
  COACH_PROMPTS,
  COACH_SYSTEM_RULES,
  encodeFreedomActions,
  grantAllowsCoachInsight,
  parseFreedomActions,
  planRefreshState,
  presentCoachInsight,
  redactCoachText,
} from "../lib/coach-plan";
import { alexCoachMessages, alexCoachPlans } from "../lib/sample-coach";
import { alexLivePlan } from "../lib/sample-reports";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

assert(resolveCoachModel(undefined) === DEFAULT_COACH_MODEL, "unset model uses the gateway default");
assert(resolveCoachModel("") === DEFAULT_COACH_MODEL, "blank model uses the gateway default");
assert(resolveCoachModel("openai/gpt-4.1-mini") === "openai/gpt-4.1-mini", "explicit gateway model is kept");
assert(resolveCoachModel("gpt-4.1-mini") === null, "a model without a provider prefix is missing");
assert(!isCoachReady("", DEFAULT_COACH_MODEL), "a blank key keeps the coach off");
assert(!isCoachReady("present", null), "a missing model keeps the coach off");
assert(isCoachReady("present", DEFAULT_COACH_MODEL), "key plus model is ready");

assert(COACH_DISCLAIMER.toLowerCase().includes("not financial, tax, legal, or investment advice"), "disclaimer names the boundary");
assert(COACH_SYSTEM_RULES.includes(COACH_DISCLAIMER), "the model rules carry the disclaimer");
assert(COACH_PROMPTS.length === 6, "the six coaching questions are offered");

const plans = alexCoachPlans("2026-11");
assert(plans.length === 2, "alex has this month and last month");
const current = plans.find((plan) => plan.monthKey === "2026-11");
assert(current && current.actions.length === 3, "the current plan has three actions");
assert(plans.every((plan) => plan.actions.every((action) => action.impact && action.goalLink)), "each action names impact and a goal");
const roundTrip = parseFreedomActions(JSON.parse(encodeFreedomActions(current.actions)) as unknown);
assert(roundTrip && roundTrip[0].title === current.actions[0].title, "actions round-trip through JSON");
assert(parseFreedomActions({ actions: current.actions.slice(0, 2) }) === null, "two actions are rejected");
assert(planRefreshState(null) === "missing", "no plan can be written");
assert(planRefreshState({ regeneratedAt: null }) === "ready", "a saved plan can be refreshed once");
assert(planRefreshState({ regeneratedAt: "2026-11-03T00:00:00.000Z" }) === "used", "a second refresh waits for next month");

const messages = alexCoachMessages();
assert(messages[0].role === "user" && messages[1].role === "assistant", "the sample thread has both sides");
assert(messages[1].body.toLowerCase().includes("not financial, tax, legal, or investment advice"), "the sample reply carries the disclaimer");
assert(!messages[1].body.includes("Vanguard") && !messages[1].body.includes("Fidelity"), "the sample reply has no institution");

const hidden = presentCoachInsight(
  { monthKey: "2026-11", generatedAt: "2026-11-02T15:00:00.000Z", regeneratedAt: null, actions: current.actions },
  { ...fullGuideAccess, goals: false },
);
assert(hidden === null, "goals off hides the action plan");
assert(!grantAllowsCoachInsight(null), "no grant means no coach insight");
assert(!grantAllowsCoachInsight({ ...fullGuideAccess, goals: false }), "a guide without goals cannot read the plan");

const redacted = presentCoachInsight(
  { monthKey: "2026-11", generatedAt: "2026-11-02T15:00:00.000Z", regeneratedAt: null, actions: current.actions },
  { ...fullGuideAccess, score: false, totals: false },
);
assert(redacted && redacted.actions.length === 3, "goals on still shows three actions");
assert(!JSON.stringify(redacted).includes("$"), "dollars stay off without score or totals");
assert(redacted.actions[0].goalLink.includes("Cover the life"), "the goal link remains when goals are shared");

const shown = presentCoachInsight(
  {
    monthKey: "2026-11",
    generatedAt: "2026-11-02T15:00:00.000Z",
    regeneratedAt: null,
    actions: [
      {
        ...current.actions[0],
        detail: "Move the Vanguard balance.",
      },
      current.actions[1],
      current.actions[2],
    ],
  },
  fullGuideAccess,
);
assert(shown && !JSON.stringify(shown).includes("Vanguard"), "a bank name is removed before a guide sees it");
assert(redactCoachText("Score 69.9% and gap $1,490.", false).includes("a score"), "scores redact with the dollars");

const context = buildCoachContext({
  plan: alexLivePlan(),
  checkIns: [],
  educationNote: "Finished 2 of 8 lessons. Finished: What the Freedom Score measures.",
  priorReport: {
    monthKey: "2026-10",
    freedomScore: 64.3,
    gap: 1820,
    quality: 70,
    passive: 3280,
    expenses: 5100,
  },
  priorPlan: plans[0].actions,
  currentPlan: current.actions,
  agenda: ["How an estimate on the duplex changes the Freedom Gap."],
  openTasks: ["Finish the Freedom Score lesson and bring one question"],
  guideName: "Jordan Lee",
});
assert(context.includes("Freedom Gap"), "context names the gap");
assert(context.includes("Cover the life you already live"), "context names a goal");
assert(context.includes("Freedom Quality"), "context names quality");
assert(context.includes("Jordan Lee"), "context names the guide");
assert(context.includes("What the Freedom Score measures"), "context includes the education note");
assert(!context.includes("Vanguard") && !context.includes("Fidelity") && !context.includes("TreasuryDirect"), "context omits institutions");
assert(!context.toLowerCase().includes("accesstoken") && !context.includes("mask"), "context has no token or mask");
assert(context.toLowerCase().includes("not financial, tax, legal, or investment advice"), "context repeats the disclaimer");

console.log("coach checks passed");
