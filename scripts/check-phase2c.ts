import { fullGuideAccess, type GuideAccess } from "../lib/access";
import {
  challengeById,
  challengeCatalog,
  cleanGroupName,
  guideGroupName,
  initialEvidence,
  measureProgress,
  presentEnrollmentForGuide,
  streakSince,
} from "../lib/challenges";
import { parseLifeDraft, type LifeDraft } from "../lib/life";
import {
  achievementCatalog,
  cardLeaksMoney,
  presentAchievementForGuide,
  unlockedKeys,
} from "../lib/recognition";
import { alexDemoFacts, alexLifeSeed, demoAchievementVisibility } from "../lib/sample-community";
import { addCalendarDays, chicagoDateISO, chicagoWeekKey, previousWeekKey } from "../lib/week";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const durations = new Set(challengeCatalog.map((item) => item.durationDays));
assert(challengeCatalog.length >= 4 && challengeCatalog.length <= 6, "catalog has 4 to 6 challenges");
assert(durations.has(30) && durations.has(60) && durations.has(90), "catalog covers 30, 60, and 90 days");
assert(new Set(challengeCatalog.map((item) => item.id)).size === challengeCatalog.length, "challenge ids are unique");

const now = new Date("2026-11-03T18:00:00.000Z");
const facts = alexDemoFacts(now);
const unlocked = unlockedKeys(facts);
assert(unlocked.includes("first-report"), "a saved report unlocks");
assert(unlocked.includes("passive-1k"), "the first passive band unlocks when the plan supports it");
assert(unlocked.includes("score-25") && unlocked.includes("score-50"), "cleared score bands unlock");
assert(!unlocked.includes("score-75") && !unlocked.includes("score-100"), "later score bands stay locked");
assert(!unlocked.includes("first-goal"), "an unfinished six-year goal stays locked");
assert(!unlocked.includes("check-in-streak-4"), "one check-in is not a four-week streak");
assert(!unlocked.includes("first-lesson"), "no lesson is marked read in the seed");
const privateCount = unlocked.filter((key) => demoAchievementVisibility(key) === "private").length;
const sharedCount = unlocked.filter((key) => demoAchievementVisibility(key) === "guide").length;
assert(privateCount >= 2, "at least two seeded achievements stay private");
assert(sharedCount === 1 && demoAchievementVisibility("score-50") === "guide", "one achievement is shared with the Guide");

for (const item of achievementCatalog) {
  assert(!cardLeaksMoney(item), `${item.key} catalog copy has no dollar amount or account`);
}

const hidden: GuideAccess = {
  score: false,
  totals: false,
  goals: false,
  checkIns: false,
  tasks: true,
  education: false,
  legacy: false,
};
const scoreCard = presentAchievementForGuide(
  { key: "score-50", visibility: "guide", unlockedAt: "2026-11-03T18:00:00.000Z" },
  fullGuideAccess,
);
assert(scoreCard && !cardLeaksMoney(scoreCard), "shared score card is safe");
assert(
  presentAchievementForGuide(
    { key: "score-50", visibility: "guide", unlockedAt: "2026-11-03T18:00:00.000Z" },
    hidden,
  ) == null,
  "a shared score card stays off when the score is not shared",
);
assert(
  presentAchievementForGuide(
    { key: "score-50", visibility: "private", unlockedAt: "2026-11-03T18:00:00.000Z" },
    fullGuideAccess,
  ) == null,
  "private recognition is not loaded for a Guide",
);
assert(
  presentAchievementForGuide(
    { key: "passive-1k", visibility: "guide", unlockedAt: "2026-11-03T18:00:00.000Z" },
    { ...fullGuideAccess, totals: false },
  ) == null,
  "the passive band stays off when totals are not shared",
);

const prior = previousWeekKey(chicagoWeekKey(now));
const started = new Date(`${addCalendarDays(chicagoDateISO(now), -10)}T18:00:00.000Z`);
const streak = challengeById("check-in-streak");
assert(streak, "check-in challenge exists");
const seeded = measureProgress({
  definition: streak,
  status: "active",
  startedAt: started,
  evidence: initialEvidence("check-in-streak", { freedomScore: null, totalLiabilities: 0 }),
  facts: {
    freedomScore: facts.freedomScore,
    totalLiabilities: 100,
    checkInWeeks: [prior],
    completedLessonKeys: [],
    now,
  },
});
assert(seeded.progress === 25 && seeded.status === "active", "one check-in inside the window is 25 percent");
assert(streakSince([prior], "0000-01-01", now) === 1, "the open streak is one week");

const score = challengeById("score-up");
assert(score, "score challenge exists");
const rising = measureProgress({
  definition: score,
  status: "active",
  startedAt: started,
  evidence: { baselineScore: 40, baselineLiabilities: null, checks: {} },
  facts: {
    freedomScore: 43,
    totalLiabilities: 0,
    checkInWeeks: [],
    completedLessonKeys: [],
    now,
  },
});
assert(rising.progress === 60, "three of five points is 60 percent");

const spend = challengeById("spend-under-plan");
assert(spend, "spending challenge exists");
const halfway = measureProgress({
  definition: spend,
  status: "active",
  startedAt: started,
  evidence: { baselineScore: null, baselineLiabilities: null, checks: { "week-1": true, "week-2": true } },
  facts: {
    freedomScore: null,
    totalLiabilities: 0,
    checkInWeeks: [],
    completedLessonKeys: [],
    now,
  },
});
assert(halfway.progress === 50 && halfway.checklist?.filter((item) => item.done).length === 2, "two of four checks");

const debt = challengeById("no-new-debt");
assert(debt, "debt challenge exists");
const debtStart = new Date(`${addCalendarDays("2026-11-03", -45)}T18:00:00.000Z`);
const held = measureProgress({
  definition: debt,
  status: "active",
  startedAt: debtStart,
  evidence: { baselineScore: null, baselineLiabilities: 241800, checks: {} },
  facts: {
    freedomScore: null,
    totalLiabilities: 241800,
    checkInWeeks: [],
    completedLessonKeys: [],
    now,
  },
});
assert(held.progress === 50, "a clean debt window is the share of days elapsed");
assert(held.memberNote.includes("$"), "the member can see their own total");
const broken = measureProgress({
  definition: debt,
  status: "active",
  startedAt: debtStart,
  evidence: { baselineScore: null, baselineLiabilities: 241800, checks: {} },
  facts: {
    freedomScore: null,
    totalLiabilities: 250000,
    checkInWeeks: [],
    completedLessonKeys: [],
    now,
  },
});
assert(broken.progress === 0, "new debt zeros the challenge");

const guideCard = presentEnrollmentForGuide(
  {
    id: "row",
    challengeId: "no-new-debt",
    status: "active",
    progress: held.progress,
    endsAt: new Date("2026-12-03T18:00:00.000Z"),
    evidence: JSON.stringify({ baselineLiabilities: 241800, note: "Vanguard accessToken" }),
  },
  { name: "Move the Vanguard account", size: 2 },
  fullGuideAccess,
);
const guideJson = JSON.stringify(guideCard);
assert(guideCard != null, "totals access shows the debt challenge");
assert(!guideJson.includes("241800"), "liability evidence stays off the Guide card");
assert(!guideJson.includes("Vanguard") && !guideJson.includes("accessToken"), "bank names and tokens stay off");
assert(guideCard.groupName === "Accountability group", "a bank name in the circle title is replaced");
assert(
  presentEnrollmentForGuide(
    {
      id: "row",
      challengeId: "no-new-debt",
      status: "active",
      progress: 50,
      endsAt: new Date("2026-12-03T18:00:00.000Z"),
      evidence: "{}",
    },
    null,
    hidden,
  ) == null,
  "the debt challenge stays off when totals are not shared",
);
assert(
  presentEnrollmentForGuide(
    {
      id: "row",
      challengeId: "check-in-streak",
      status: "active",
      progress: 25,
      endsAt: new Date("2026-12-03T18:00:00.000Z"),
      evidence: "{}",
    },
    null,
    hidden,
  ) == null,
  "the check-in challenge stays off when check-ins are not shared",
);
assert(
  presentEnrollmentForGuide(
    {
      id: "row",
      challengeId: "finish-lessons",
      status: "active",
      progress: 0,
      endsAt: new Date("2026-12-03T18:00:00.000Z"),
      evidence: "{}",
    },
    null,
    hidden,
  ) != null,
  "a lesson challenge has no financial scope",
);

assert(cleanGroupName("Vanguard circle") == null, "a circle cannot be named for a bank");
assert(guideGroupName("Quiet week circle") === "Quiet week circle", "a plain circle name is kept");

const life = parseLifeDraft({
  timeFreedomHours: alexLifeSeed().timeFreedomHours,
  familyPriority: alexLifeSeed().familyPriority,
  healthStreakDays: alexLifeSeed().healthStreakDays,
  experiencesPlanned: alexLifeSeed().experiencesPlanned,
});
assert(life.ok && sameLife(life.value, alexLifeSeed()), "Alex life measures are valid");
assert(!parseLifeDraft({ timeFreedomHours: 200, familyPriority: 4, healthStreakDays: 1, experiencesPlanned: "" }).ok, "hours above 168 are rejected");
assert(!parseLifeDraft({ timeFreedomHours: 12, familyPriority: 6, healthStreakDays: 1, experiencesPlanned: "" }).ok, "family priority stays 1 to 5");

const goalFacts = { ...facts, goalCompleted: true, consecutiveCheckIns: 4, lessonCompleted: true };
const more = unlockedKeys(goalFacts);
assert(more.includes("first-goal") && more.includes("check-in-streak-4") && more.includes("first-lesson"), "the other badges unlock from their own facts");

function sameLife(actual: LifeDraft, expected: LifeDraft): boolean {
  return (
    actual.timeFreedomHours === expected.timeFreedomHours &&
    actual.familyPriority === expected.familyPriority &&
    actual.healthStreakDays === expected.healthStreakDays &&
    actual.experiencesPlanned === expected.experiencesPlanned
  );
}

console.log("phase 2c checks passed");
