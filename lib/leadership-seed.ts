import { buildCheckInSummary } from "@/lib/check-in";
import {
  challengeById,
  encodeEvidence,
  measureProgress,
  windowEnd,
  type ChallengeEvidence,
} from "@/lib/challenges";
import { ensureChallengeCatalog } from "@/lib/community-store";
import { prisma } from "@/lib/db";
import { totalsFromLines } from "@/lib/metrics";
import { assessFreedomQuality } from "@/lib/quality";
import { guideSeed, memberSeeds, type SeedMember } from "@/lib/sample-plans";
import { chicagoWeekKey, previousWeekKey } from "@/lib/week";

/** Monday of a week before the seeded October and November check-ins. */
export const EARLIER_SCORE_WEEK = "2026-09-07";

/**
 * Points below the live Freedom Score on that September check-in.
 * Drew and Sam are omitted on purpose: Drew's later snapshot is already higher
 * than the live score, and Sam has no check-in at all.
 */
export const earlierScoreDrops: Record<string, number> = {
  alex: 6,
  elena: 4,
  amina: 5,
  priya: 3,
  marcus: 4,
};

/** Starting circumstance. Not a performance tier and not a Guide rank. */
export const cohortLabels: Record<string, string> = {
  sam: "Foundation",
  drew: "Foundation",
  alex: "Building",
  elena: "Building",
  amina: "Building",
  priya: "Near the line",
  marcus: "Near the line",
};

export function cohortForMember(id: string): string {
  return cohortLabels[id] ?? "";
}

const earlierStories: Record<string, { win: string; challenge: string; commitment: string }> = {
  alex: {
    win: "Named the dividend stream and left wages off the score.",
    challenge: "The property figure was still an estimate.",
    commitment: "Keep the spending plan flat while that figure is reviewed.",
  },
  elena: {
    win: "Wrote net rent as its own line.",
    challenge: "I was not sure a repair belonged in the plan.",
    commitment: "Bring one question about that line, not a product.",
  },
  amina: {
    win: "Held the plan flat through a bonus month.",
    challenge: "The bonus looked like a new stream.",
    commitment: "Leave one-time money out of passive income.",
  },
  priya: {
    win: "Wrote the gap to the line as a monthly number.",
    challenge: "A slightly larger plan looked reasonable.",
    commitment: "Hold the plan flat for the rest of the month.",
  },
  marcus: {
    win: "Gave the surplus three jobs: resilience, giving, and time.",
    challenge: "The extra coverage made a larger lifestyle look easy.",
    commitment: "Leave the spending plan unchanged.",
  },
};

/**
 * Cohort labels plus earlier score snapshots, learning rows, workspace timing,
 * coach usage, and challenge enrollments. Re-running replaces these rows only.
 * It does not rewrite Alex's October check-in, report, or coach thread.
 */
export async function seedLeadershipSignals(memberIds: string[]): Promise<void> {
  const wanted = new Set(memberIds);
  if (wanted.size === 0) return;
  const members = memberSeeds().filter((member) => wanted.has(member.id));
  const guide = guideSeed();
  for (const member of members) {
    const existing = await prisma.user.findUnique({ where: { id: member.id }, select: { id: true } });
    if (!existing) continue;
    await prisma.user.update({
      where: { id: member.id },
      data: { cohort: cohortForMember(member.id) },
    });
  }
  await seedEarlierCheckIns(members);
  await seedLearning(members);
  await seedWorkspace(members, guide.id);
  await seedCoachUsage(members);
  await seedChallenges(members);
}

async function seedEarlierCheckIns(members: SeedMember[]): Promise<void> {
  const current = chicagoWeekKey(new Date());
  if (EARLIER_SCORE_WEEK === current || EARLIER_SCORE_WEEK === previousWeekKey(current)) return;
  const rows = members.flatMap((member) => {
    const drop = earlierScoreDrops[member.id];
    const story = earlierStories[member.id];
    if (drop == null || !story) return [];
    const metrics = totalsFromLines(member.plan);
    if (metrics.freedomScore == null) return [];
    const freedomScore = round1(metrics.freedomScore - drop);
    if (freedomScore < 0) return [];
    const quality = assessFreedomQuality(member.plan);
    const summary = buildCheckInSummary({
      weekKey: EARLIER_SCORE_WEEK,
      win: story.win,
      challenge: story.challenge,
      actionStatus: "partial",
      commitment: story.commitment,
      needsSupport: false,
      freedomScore,
      monthlyFreedomGap: metrics.monthlyFreedomGap,
      qualityScore: quality.score,
    });
    const submittedAt = new Date(`${EARLIER_SCORE_WEEK}T18:00:00.000Z`);
    return [
      {
        id: `lead-checkin-${member.id}`,
        memberId: member.id,
        weekKey: EARLIER_SCORE_WEEK,
        win: story.win,
        challenge: story.challenge,
        actionStatus: "partial",
        commitment: story.commitment,
        needsSupport: false,
        supportNote: "",
        summary,
        freedomScore,
        monthlyFreedomGap: metrics.monthlyFreedomGap,
        qualityScore: quality.score,
        submittedAt,
        updatedAt: submittedAt,
      },
    ];
  });
  if (rows.length === 0) return;
  await prisma.weeklyCheckIn.deleteMany({
    where: { memberId: { in: rows.map((row) => row.memberId) }, weekKey: EARLIER_SCORE_WEEK },
  });
  await prisma.weeklyCheckIn.createMany({ data: rows });
}

async function seedLearning(members: SeedMember[]): Promise<void> {
  const wanted = new Set(members.map((member) => member.id));
  const rows = learningRows.filter((row) => wanted.has(row.memberId));
  if (rows.length === 0) return;
  await prisma.lessonProgress.deleteMany({
    where: { OR: rows.map((row) => ({ memberId: row.memberId, lessonId: row.lessonId })) },
  });
  await prisma.lessonProgress.createMany({
    data: rows.map((row) => ({
      id: row.id,
      memberId: row.memberId,
      lessonId: row.lessonId,
      status: row.status,
      completedAt: row.completedAt ? new Date(row.completedAt) : null,
      exerciseDone: row.exerciseDone,
      updatedAt: new Date(row.completedAt ?? row.updatedAt),
    })),
  });
}

async function seedWorkspace(members: SeedMember[], guideId: string): Promise<void> {
  const wanted = new Set(members.map((member) => member.id));
  const messages = workspaceMessages.filter((message) => wanted.has(message.memberId));
  const sessions = workspaceSessions.filter((session) => wanted.has(session.memberId));
  const notes = workspaceNotes.filter((note) => wanted.has(note.memberId));
  if (messages.length > 0) {
    await prisma.hubMessage.deleteMany({ where: { id: { in: messages.map((message) => message.id) } } });
    await prisma.hubMessage.createMany({
      data: messages.map((message) => ({
        id: message.id,
        memberId: message.memberId,
        authorId: message.authorId === "guide" ? guideId : message.memberId,
        body: message.body,
        createdAt: new Date(message.createdAt),
      })),
    });
    const latest = new Map<string, string>();
    for (const message of messages) {
      const prev = latest.get(message.memberId);
      if (!prev || message.createdAt > prev) latest.set(message.memberId, message.createdAt);
    }
    for (const [memberId, at] of latest) {
      await prisma.hubRead.upsert({
        where: { userId_memberId: { userId: guideId, memberId } },
        create: { userId: guideId, memberId, lastReadAt: new Date(at) },
        update: { lastReadAt: new Date(at) },
      });
    }
  }
  if (sessions.length > 0) {
    await prisma.sessionSummary.deleteMany({ where: { id: { in: sessions.map((session) => session.id) } } });
    await prisma.sessionSummary.createMany({
      data: sessions.map((session) => ({
        id: session.id,
        memberId: session.memberId,
        guideId,
        summary: session.summary,
        nextSteps: session.nextSteps,
        heldAt: new Date(session.heldAt),
        createdAt: new Date(session.createdAt),
      })),
    });
  }
  if (notes.length > 0) {
    await prisma.coachingNote.deleteMany({ where: { id: { in: notes.map((note) => note.id) } } });
    await prisma.coachingNote.createMany({
      data: notes.map((note) => ({
        id: note.id,
        memberId: note.memberId,
        guideId,
        body: note.body,
        createdAt: new Date(note.createdAt),
      })),
    });
  }
}

async function seedCoachUsage(members: SeedMember[]): Promise<void> {
  const wanted = new Set(members.map((member) => member.id));
  const threads = coachThreads.filter((thread) => wanted.has(thread.memberId));
  if (threads.length === 0) return;
  await prisma.coachThread.deleteMany({ where: { id: { in: threads.map((thread) => thread.id) } } });
  for (const thread of threads) {
    await prisma.coachThread.create({
      data: {
        id: thread.id,
        memberId: thread.memberId,
        createdAt: new Date(thread.messages[0].at),
        messages: {
          create: thread.messages.map((message) => ({
            id: message.id,
            role: message.role,
            body: message.body,
            createdAt: new Date(message.at),
          })),
        },
      },
    });
  }
}

async function seedChallenges(members: SeedMember[]): Promise<void> {
  await ensureChallengeCatalog();
  const wanted = new Set(members.map((member) => member.id));
  const plans = new Map(members.map((member) => [member.id, member]));
  const specs = challengeSpecs.filter((spec) => wanted.has(spec.memberId));
  if (specs.length === 0) return;
  await prisma.challengeEnrollment.deleteMany({
    where: { OR: specs.map((spec) => ({ memberId: spec.memberId, challengeId: spec.challengeId })) },
  });
  for (const spec of specs) {
    const definition = challengeById(spec.challengeId);
    const member = plans.get(spec.memberId);
    if (!definition || !member) continue;
    const metrics = totalsFromLines(member.plan);
    const checkIns = await prisma.weeklyCheckIn.findMany({
      where: { memberId: spec.memberId },
      select: { weekKey: true },
    });
    const startedAt = new Date(spec.startedAt);
    const evidence = spec.evidence(metrics.freedomScore, metrics.totalLiabilities);
    const measured = measureProgress({
      definition,
      status: "active",
      startedAt,
      evidence,
      facts: {
        freedomScore: metrics.freedomScore,
        totalLiabilities: metrics.totalLiabilities,
        checkInWeeks: checkIns.map((row) => row.weekKey),
        completedLessonKeys: [],
        now: new Date(),
      },
    });
    await prisma.challengeEnrollment.create({
      data: {
        id: spec.id,
        challengeId: spec.challengeId,
        memberId: spec.memberId,
        status: measured.status,
        progress: measured.progress,
        evidence: encodeEvidence(evidence),
        startedAt,
        endsAt: windowEnd(startedAt, definition.durationDays),
      },
    });
  }
}

const learningRows: {
  id: string;
  memberId: string;
  lessonId: string;
  status: "completed" | "inProgress";
  completedAt: string | null;
  exerciseDone: boolean;
  updatedAt: string;
}[] = [
  {
    id: "lead-learn-elena-meaning",
    memberId: "elena",
    lessonId: "lesson-freedom-meaning",
    status: "completed",
    completedAt: "2026-10-12T15:00:00.000Z",
    exerciseDone: true,
    updatedAt: "2026-10-12T15:00:00.000Z",
  },
  {
    id: "lead-learn-elena-plan",
    memberId: "elena",
    lessonId: "lesson-spending-plan",
    status: "inProgress",
    completedAt: null,
    exerciseDone: false,
    updatedAt: "2026-10-20T15:00:00.000Z",
  },
  {
    id: "lead-learn-amina-meaning",
    memberId: "amina",
    lessonId: "lesson-freedom-meaning",
    status: "completed",
    completedAt: "2026-10-08T15:00:00.000Z",
    exerciseDone: true,
    updatedAt: "2026-10-08T15:00:00.000Z",
  },
  {
    id: "lead-learn-amina-plan",
    memberId: "amina",
    lessonId: "lesson-spending-plan",
    status: "completed",
    completedAt: "2026-10-14T15:00:00.000Z",
    exerciseDone: true,
    updatedAt: "2026-10-14T15:00:00.000Z",
  },
  {
    id: "lead-learn-amina-score",
    memberId: "amina",
    lessonId: "lesson-freedom-score",
    status: "completed",
    completedAt: "2026-10-18T15:00:00.000Z",
    exerciseDone: true,
    updatedAt: "2026-10-18T15:00:00.000Z",
  },
  {
    id: "lead-learn-priya-passive",
    memberId: "priya",
    lessonId: "lesson-passive-types",
    status: "completed",
    completedAt: "2026-10-16T15:00:00.000Z",
    exerciseDone: true,
    updatedAt: "2026-10-16T15:00:00.000Z",
  },
  {
    id: "lead-learn-marcus-meaning",
    memberId: "marcus",
    lessonId: "lesson-freedom-meaning",
    status: "completed",
    completedAt: "2026-10-09T15:00:00.000Z",
    exerciseDone: true,
    updatedAt: "2026-10-09T15:00:00.000Z",
  },
  {
    id: "lead-learn-marcus-rhythm",
    memberId: "marcus",
    lessonId: "lesson-monthly-rhythm",
    status: "inProgress",
    completedAt: null,
    exerciseDone: false,
    updatedAt: "2026-10-22T15:00:00.000Z",
  },
  {
    id: "lead-learn-sam-meaning",
    memberId: "sam",
    lessonId: "lesson-freedom-meaning",
    status: "inProgress",
    completedAt: null,
    exerciseDone: false,
    updatedAt: "2026-09-18T15:00:00.000Z",
  },
];

const workspaceMessages: {
  id: string;
  memberId: string;
  authorId: "member" | "guide";
  body: string;
  createdAt: string;
}[] = [
  {
    id: "lead-hub-elena-1",
    memberId: "elena",
    authorId: "member",
    body: "Can we walk through the rental line on the plan? I want to understand it. I am not asking what to buy.",
    createdAt: "2026-10-20T15:00:00.000Z",
  },
  {
    id: "lead-hub-elena-2",
    memberId: "elena",
    authorId: "guide",
    body: "Yes. Bring the plan line. We will stay on the definitions.",
    createdAt: "2026-10-20T21:00:00.000Z",
  },
  {
    id: "lead-hub-drew-1",
    memberId: "drew",
    authorId: "member",
    body: "The score slipped and most of this year's steps are still open. I want help deciding which stream to understand first.",
    createdAt: "2026-10-10T15:00:00.000Z",
  },
  {
    id: "lead-hub-drew-2",
    memberId: "drew",
    authorId: "guide",
    body: "Bring the dividend and interest list from last quarter. We will name one stream in the meeting. I will not recommend a product.",
    createdAt: "2026-10-12T17:00:00.000Z",
  },
  {
    id: "lead-hub-sam-1",
    memberId: "sam",
    authorId: "member",
    body: "The plan is written. I still need to name one stream that counts. I would like a time to do that with you.",
    createdAt: "2026-10-18T15:00:00.000Z",
  },
];

const workspaceSessions = [
  {
    id: "lead-session-elena",
    memberId: "elena",
    summary:
      "We stayed on the rental line in the spending plan. Elena wanted to understand the figure, not choose an investment. No product was discussed.",
    nextSteps: "Elena brings one question about the plan line to the next check-in.",
    heldAt: "2026-10-15T18:00:00.000Z",
    createdAt: "2026-10-15T19:00:00.000Z",
  },
  {
    id: "lead-session-amina",
    memberId: "amina",
    summary:
      "We named the next Freedom Score band and agreed the spending plan stays flat this quarter. The bonus month was left out of passive income.",
    nextSteps: "Amina writes the monthly dollars to the next band and brings that page.",
    heldAt: "2026-10-21T18:00:00.000Z",
    createdAt: "2026-10-21T19:00:00.000Z",
  },
];

const workspaceNotes = [
  {
    id: "lead-note-amina",
    memberId: "amina",
    body: "The plan is close to the next band. The open work is keeping spending flat. This is pace, not a ranking.",
    createdAt: "2026-10-21T19:30:00.000Z",
  },
];

const coachThreads: {
  id: string;
  memberId: string;
  messages: { id: string; role: "user" | "assistant"; body: string; at: string }[];
}[] = [
  {
    id: "lead-coach-amina",
    memberId: "amina",
    messages: [
      {
        id: "lead-coach-amina-1",
        role: "user",
        body: "I finished the Freedom Score lesson. I want to keep the spending plan flat while I name the next band.",
        at: "2026-10-18T15:00:00.000Z",
      },
      {
        id: "lead-coach-amina-2",
        role: "assistant",
        body: "Keeping the plan flat is already one of your steps. Write the gap to the next band from that plan. This is a measurement, not a product recommendation.",
        at: "2026-10-18T15:01:00.000Z",
      },
      {
        id: "lead-coach-amina-3",
        role: "user",
        body: "I will bring that number to my Guide and leave the bonus out of passive income.",
        at: "2026-10-19T15:00:00.000Z",
      },
    ],
  },
  {
    id: "lead-coach-priya",
    memberId: "priya",
    messages: [
      {
        id: "lead-coach-priya-1",
        role: "user",
        body: "I am close to the line. What should I watch so a larger plan does not erase the gain?",
        at: "2026-10-24T16:00:00.000Z",
      },
      {
        id: "lead-coach-priya-2",
        role: "assistant",
        body: "Watch the spending plan itself. The score falls when that denominator grows, even if income stays the same. This is educational, not a recommendation to buy or sell anything.",
        at: "2026-10-24T16:01:00.000Z",
      },
    ],
  },
];

const challengeSpecs: {
  id: string;
  memberId: string;
  challengeId: string;
  startedAt: string;
  evidence: (freedomScore: number | null, totalLiabilities: number) => ChallengeEvidence;
}[] = [
  {
    id: "lead-challenge-elena",
    memberId: "elena",
    challengeId: "score-up",
    startedAt: "2026-10-01T18:00:00.000Z",
    evidence: (freedomScore) => ({
      baselineScore: freedomScore == null ? null : round1(freedomScore - 3),
      baselineLiabilities: null,
      checks: {},
    }),
  },
  {
    id: "lead-challenge-amina",
    memberId: "amina",
    challengeId: "spend-under-plan",
    startedAt: "2026-10-01T18:00:00.000Z",
    evidence: () => ({
      baselineScore: null,
      baselineLiabilities: null,
      checks: { "week-1": true, "week-2": true, "week-3": true, "week-4": true },
    }),
  },
  {
    id: "lead-challenge-marcus",
    memberId: "marcus",
    challengeId: "no-new-debt",
    startedAt: "2026-09-20T18:00:00.000Z",
    evidence: (_score, totalLiabilities) => ({
      baselineScore: null,
      baselineLiabilities: totalLiabilities,
      checks: {},
    }),
  },
  {
    id: "lead-challenge-priya",
    memberId: "priya",
    challengeId: "check-in-streak",
    startedAt: "2026-10-20T18:00:00.000Z",
    evidence: () => ({ baselineScore: null, baselineLiabilities: null, checks: {} }),
  },
];

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
