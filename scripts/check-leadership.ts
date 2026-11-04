import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildLeadershipAnalytics,
  cohortLabel,
  formatPoints,
  formatReplyHours,
  guideReplySamples,
  median,
  type LeadershipInput,
  type LeadershipMemberInput,
} from "../lib/leadership";
import { cohortForMember, earlierScoreDrops } from "../lib/leadership-seed";
import { chicagoWeekKey, formatWeekSpan } from "../lib/week";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const now = new Date("2026-11-04T16:00:00.000Z");
const week = chicagoWeekKey(now);
assert(week === "2026-11-02", `expected the Nov 4 week, got ${week}`);

assert(cohortForMember("sam") === "Foundation", "Sam starts in Foundation");
assert(cohortForMember("marcus") === "Near the line", "Marcus starts near the line");
assert(cohortForMember("new-member") === "", "an unknown member is unassigned");
assert(cohortLabel("") === "Unassigned", "empty cohort reads as unassigned");
assert(!("drew" in earlierScoreDrops) && !("sam" in earlierScoreDrops), "Drew and Sam keep their existing score stories");
assert(earlierScoreDrops.alex > 0 && earlierScoreDrops.elena > 0, "other members get an earlier, lower snapshot");

const jordan = { id: "jordan", name: "Jordan Lee" };
const october = "2026-10-26";
const september = "2026-09-07";

function member(partial: Partial<LeadershipMemberInput> & Pick<LeadershipMemberInput, "id" | "name">): LeadershipMemberInput {
  return {
    cohort: "",
    guides: [jordan],
    isActive: true,
    lastActive: "2026-10-26",
    liveScore: null,
    goalBaseline: null,
    snapshots: [],
    stepsDone: 0,
    stepsTotal: 0,
    goalsFinished: 0,
    goalsTotal: 0,
    checkIns: [],
    coachThread: false,
    coachMemberMessages: 0,
    lessonsCompleted: 0,
    lessonsInProgress: 0,
    challengesActive: 0,
    challengesCompleted: 0,
    notes: [],
    sessions: [],
    tasksDone: 0,
    tasksOpen: 0,
    ...partial,
  };
}

const input: LeadershipInput = {
  now,
  lessonCatalog: 8,
  guides: [jordan],
  members: [
    member({
      id: "sam",
      name: "Sam Okonkwo",
      cohort: "Foundation",
      lastActive: "2026-09-18",
      liveScore: 28.4,
      goalBaseline: 5,
      stepsDone: 1,
      stepsTotal: 6,
      goalsTotal: 2,
    }),
    member({
      id: "drew",
      name: "Drew Patel",
      cohort: "Foundation",
      lastActive: "2026-10-12",
      liveScore: 47,
      goalBaseline: 35,
      snapshots: [
        {
          at: `${october}T18:00:00.000Z`,
          score: 52,
          label: `check-in for ${formatWeekSpan(october)}`,
        },
      ],
      checkIns: [{ weekKey: october, score: 52, submittedAt: `${october}T18:00:00.000Z` }],
      stepsDone: 1,
      stepsTotal: 7,
      goalsTotal: 2,
      notes: [{ guideId: "jordan" }],
    }),
    member({
      id: "alex",
      name: "Alex Rivera",
      cohort: "Building",
      liveScore: 70,
      goalBaseline: 40,
      snapshots: [
        {
          at: `${september}T18:00:00.000Z`,
          score: 64,
          label: `check-in for ${formatWeekSpan(september)}`,
        },
        {
          at: `${october}T18:00:00.000Z`,
          score: 70,
          label: `check-in for ${formatWeekSpan(october)}`,
        },
      ],
      checkIns: [
        { weekKey: september, score: 64, submittedAt: `${september}T18:00:00.000Z` },
        { weekKey: october, score: 70, submittedAt: `${october}T18:00:00.000Z` },
      ],
      stepsDone: 4,
      stepsTotal: 8,
      goalsTotal: 3,
      lessonsCompleted: 2,
      lessonsInProgress: 1,
      challengesActive: 1,
      coachThread: true,
      coachMemberMessages: 2,
      sessions: [{ guideId: "jordan" }],
      tasksDone: 1,
      tasksOpen: 1,
    }),
  ],
  turns: [
    { memberId: "alex", at: "2026-10-27T16:00:00.000Z", author: "guide", guideId: "jordan" },
    { memberId: "alex", at: "2026-10-28T16:00:00.000Z", author: "member", guideId: "jordan" },
    { memberId: "alex", at: "2026-10-29T16:00:00.000Z", author: "guide", guideId: "jordan" },
    { memberId: "elena", at: "2026-10-20T15:00:00.000Z", author: "member", guideId: "jordan" },
    { memberId: "elena", at: "2026-10-20T21:00:00.000Z", author: "guide", guideId: "jordan" },
    { memberId: "drew", at: "2026-10-10T15:00:00.000Z", author: "member", guideId: "jordan" },
    { memberId: "drew", at: "2026-10-12T17:00:00.000Z", author: "guide", guideId: "jordan" },
    { memberId: "sam", at: "2026-10-18T15:00:00.000Z", author: "member", guideId: "jordan" },
  ],
};

const analytics = buildLeadershipAnalytics(input);
assert(analytics.improving.improved === 1 && analytics.improving.declined === 1, "one member up, one down");
assert(analytics.improving.compared === 2 && analytics.improving.unscored === 1, "Sam is left out of the percentage");
assert(analytics.improving.percent === 50, `expected 50 percent, got ${analytics.improving.percent}`);
assert(analytics.improving.averagePoints === 0.5, `expected average 0.5, got ${analytics.improving.averagePoints}`);
assert(analytics.milestones.reachedFirst === 3, "all three live scores have reached 25%");
assert(analytics.milestones.bands.map((band) => band.members).join(",") === "3,1,0,0,0", "bands narrow as the threshold rises");
assert(analytics.retention.quietNames.join(",") === "Sam Okonkwo", "Sam is the quiet member");
assert(analytics.retention.active === 2, "Drew and Alex are inside 30 days");
assert(analytics.goals.stepsDone === 6 && analytics.goals.stepsTotal === 21, "steps are summed from the roster");
assert(analytics.coaching.medianReplyHours === 24, `expected a 24 hour median, got ${analytics.coaching.medianReplyHours}`);
assert(analytics.coaching.waiting === 1 && analytics.coaching.replies === 3, "one thread is still waiting");
assert(analytics.coaching.notes === 1 && analytics.coaching.sessions === 1, "notes and sessions are counts");
assert(analytics.engagement.coachMembers === 1 && analytics.engagement.coachMemberMessages === 2, "coach usage is counted");
assert(analytics.recentDeclines.length === 0, "Drew's drop is the first snapshot, so it is not a later reversal");

const drew = analytics.roster.find((row) => row.id === "drew");
const sam = analytics.roster.find((row) => row.id === "sam");
const alex = analytics.roster.find((row) => row.id === "alex");
assert(drew?.changeLabel.startsWith("Down") && drew.recentLabel === "", "Drew is down from the only saved score");
assert(sam?.changeLabel === "No saved score" && sam.goalBaseline === 5, "Sam's baseline stays visible and out of the percentage");
assert(alex?.direction === "up" && alex.recentLabel.startsWith("Flat since"), "Alex is up from September and flat since October");
assert(analytics.roster.map((row) => row.id).join(",") === "alex,drew,sam", "roster is alphabetical, not by score");
assert(analytics.cohorts.map((row) => row.cohort).join(",") === "Foundation,Building", "cohorts follow starting circumstance");
assert(analytics.guides[0]?.name === "Jordan Lee", "the guide row is present");
assert(analytics.guides[0]?.cohortMix === "2 Foundation, 1 Building", `mix was ${analytics.guides[0]?.cohortMix}`);
assert(analytics.caveat.toLowerCase().includes("not ranked"), "the page says guides are not ranked");
assert(analytics.methods.some((method) => method.includes("not loaded")), "message text stays off the page");

const replies = guideReplySamples(input.turns);
assert(replies.filter((sample) => sample.waiting).length === 1, "waiting sample");
assert(median(replies.flatMap((sample) => (sample.hours == null ? [] : [sample.hours]))) === 24, "median helper");
assert(formatReplyHours(24) === "24 hours", "reply hours read as hours");
assert(formatPoints(-5) === "−5" && formatPoints(6) === "+6", "points keep a sign");

const sorted = buildLeadershipAnalytics({
  now,
  lessonCatalog: 1,
  guides: [
    { id: "zara", name: "Zara Quinn" },
    { id: "amy", name: "Amy Brooks" },
  ],
  members: [
    member({
      id: "high",
      name: "High Start",
      guides: [{ id: "zara", name: "Zara Quinn" }],
      cohort: "Near the line",
      liveScore: 90,
      snapshots: [{ at: "2026-09-07T18:00:00.000Z", score: 70, label: "check-in for Sep 7, 2026 – Sep 13, 2026" }],
      checkIns: [{ weekKey: "2026-09-07", score: 70, submittedAt: "2026-09-07T18:00:00.000Z" }],
    }),
    member({
      id: "early",
      name: "Early Start",
      guides: [{ id: "amy", name: "Amy Brooks" }],
      cohort: "Foundation",
      liveScore: 30,
      snapshots: [{ at: "2026-09-07T18:00:00.000Z", score: 32, label: "check-in for Sep 7, 2026 – Sep 13, 2026" }],
      checkIns: [{ weekKey: "2026-09-07", score: 32, submittedAt: "2026-09-07T18:00:00.000Z" }],
    }),
  ],
  turns: [],
});
assert(sorted.guides.map((guide) => guide.name).join(",") === "Amy Brooks,Zara Quinn", "guides sort by name, not by score change");
assert((sorted.guides[0]?.medianScoreChange ?? 0) < (sorted.guides[1]?.medianScoreChange ?? 0), "the first guide is not the larger gain");

const root = resolve(__dirname, "..");
const store = readFileSync(resolve(root, "lib/leadership-store.ts"), "utf8");
assert(!store.includes("body:"), "analytics query does not select message or note text");
assert(!store.includes("supportNote"), "analytics query does not select support notes");
assert(!store.includes("coachingNote"), "analytics query does not select the roster coaching note");
assert(!store.includes("evidence:"), "analytics query does not select challenge evidence");

const proxy = readFileSync(resolve(root, "proxy.ts"), "utf8");
assert(proxy.includes('pathname.startsWith("/admin/")'), "/admin/analytics stays inside the admin path check");
const layout = readFileSync(resolve(root, "app/(portal)/admin/layout.tsx"), "utf8");
assert(layout.includes('role !== "admin"'), "the admin layout redirects members and guides");
const page = readFileSync(resolve(root, "app/(portal)/admin/analytics/page.tsx"), "utf8");
assert(page.includes("requireAdmin") && page.includes('redirect("/login")'), "the page checks the admin role again");
const shell = readFileSync(resolve(root, "components/app-shell.tsx"), "utf8");
assert(shell.includes('href: "/admin/analytics"'), "leadership is in the admin nav");
const memberNav = shell.slice(shell.indexOf("const memberNav"), shell.indexOf("const guideNav"));
const guideNav = shell.slice(shell.indexOf("const guideNav"), shell.indexOf("const adminNav"));
assert(!memberNav.includes("/admin/analytics") && !guideNav.includes("/admin/analytics"), "members and guides have no leadership link");

console.log(
  `leadership checks passed (${analytics.improving.percent}% improving, median reply ${analytics.coaching.medianReplyHours}h, guides by name)`,
);
