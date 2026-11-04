import { prisma } from "@/lib/db";
import {
  buildLeadershipAnalytics,
  type HubTurn,
  type LeadershipAnalytics,
  type LeadershipMemberInput,
  type ScoreSnapshot,
} from "@/lib/leadership";
import { resolveGoals, stepTotals, totalsFromLines } from "@/lib/metrics";
import type { Goal, GoalKind, ProgressSource } from "@/lib/types";
import { formatWeekSpan } from "@/lib/week";

const goalKinds = new Set<GoalKind>(["wealth", "personal"]);
const progressSources = new Set<ProgressSource>(["freedom", "netWorth", "journey"]);

/** Aggregate program outcomes for an admin. Note text, support notes, and bank fields are not selected. */
export async function loadLeadershipAnalytics(now = new Date()): Promise<LeadershipAnalytics> {
  const [people, guides, messages, lessonCatalog] = await Promise.all([
    prisma.user.findMany({
      where: { role: "member" },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        cohort: true,
        isActive: true,
        lastActive: true,
        guides: { select: { guide: { select: { id: true, name: true, role: true } } } },
        expenses: { select: { monthly: true } },
        streams: { select: { monthly: true } },
        assets: { select: { name: true, group: true, balance: true, capitalRole: true } },
        liabilities: { select: { balance: true } },
        goals: {
          orderBy: { sort: "asc" },
          select: {
            id: true,
            kind: true,
            title: true,
            summary: true,
            progressSource: true,
            baseline: true,
            baselineLabel: true,
            target: true,
            targetLabel: true,
            checkpoints: {
              orderBy: { sort: "asc" },
              select: { year: true, calendarYear: true, label: true, targetValue: true },
            },
            steps: {
              orderBy: { sort: "asc" },
              select: { id: true, title: true, detail: true, done: true },
            },
          },
        },
        checkIns: { select: { weekKey: true, freedomScore: true, submittedAt: true } },
        reports: { select: { monthKey: true, freedomScore: true, generatedAt: true } },
        lessonProgress: { select: { status: true } },
        enrollments: { select: { status: true } },
        coachThreads: { select: { messages: { select: { role: true } } } },
        notesAbout: { select: { guideId: true } },
        sessionsAbout: { select: { guideId: true } },
        tasksAbout: { select: { guideId: true, status: true } },
      },
    }),
    prisma.user.findMany({
      where: { role: "guide", isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.hubMessage.findMany({
      select: {
        memberId: true,
        createdAt: true,
        author: { select: { id: true, role: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.lesson.count(),
  ]);

  const assignedGuide = new Map(
    people.map((member) => [
      member.id,
      member.guides.find((assignment) => assignment.guide.role === "guide")?.guide.id ?? "",
    ]),
  );

  const members: LeadershipMemberInput[] = people.map((member) => {
    const goals = member.goals.flatMap((goal) => {
      const mapped = toGoal(goal);
      return mapped ? [mapped] : [];
    });
    const metrics = totalsFromLines({
      expenses: member.expenses,
      streams: member.streams,
      assets: member.assets,
      liabilities: member.liabilities,
    });
    const resolved = resolveGoals(goals, metrics);
    const steps = stepTotals(resolved);
    const freedomGoal = goals.find((goal) => goal.progressSource === "freedom");
    const snapshots: ScoreSnapshot[] = [
      ...member.checkIns.flatMap((checkIn) => {
        if (checkIn.freedomScore == null) return [];
        return [
          {
            at: checkIn.submittedAt.toISOString(),
            score: checkIn.freedomScore,
            label: `check-in for ${formatWeekSpan(checkIn.weekKey)}`,
          },
        ];
      }),
      ...member.reports.flatMap((report) => {
        if (report.freedomScore == null) return [];
        return [
          {
            at: report.generatedAt.toISOString(),
            score: report.freedomScore,
            label: `${reportLabel(report.monthKey)} report`,
          },
        ];
      }),
    ];
    return {
      id: member.id,
      name: member.name,
      cohort: member.cohort,
      guides: member.guides
        .filter((assignment) => assignment.guide.role === "guide")
        .map((assignment) => ({ id: assignment.guide.id, name: assignment.guide.name })),
      isActive: member.isActive,
      lastActive: member.lastActive,
      liveScore: metrics.freedomScore,
      goalBaseline: freedomGoal?.baseline ?? null,
      snapshots,
      stepsDone: steps.done,
      stepsTotal: steps.total,
      goalsFinished: resolved.filter((goal) => goal.progress >= 100).length,
      goalsTotal: resolved.length,
      checkIns: member.checkIns.map((checkIn) => ({
        weekKey: checkIn.weekKey,
        score: checkIn.freedomScore,
        submittedAt: checkIn.submittedAt.toISOString(),
      })),
      coachThread: member.coachThreads.length > 0,
      coachMemberMessages: member.coachThreads.reduce(
        (total, thread) => total + thread.messages.filter((message) => message.role === "user").length,
        0,
      ),
      lessonsCompleted: member.lessonProgress.filter((row) => row.status === "completed").length,
      lessonsInProgress: member.lessonProgress.filter((row) => row.status === "inProgress").length,
      challengesActive: member.enrollments.filter((row) => row.status === "active").length,
      challengesCompleted: member.enrollments.filter((row) => row.status === "completed").length,
      notes: member.notesAbout.map((note) => ({ guideId: note.guideId })),
      sessions: member.sessionsAbout.map((session) => ({ guideId: session.guideId })),
      tasksDone: member.tasksAbout.filter((task) => task.status === "done").length,
      tasksOpen: member.tasksAbout.filter((task) => task.status !== "done").length,
    };
  });

  const turns: HubTurn[] = messages.map((message) => {
    const fromGuide = message.author.role === "guide";
    return {
      memberId: message.memberId,
      at: message.createdAt.toISOString(),
      author: fromGuide ? "guide" : "member",
      guideId: fromGuide ? message.author.id : (assignedGuide.get(message.memberId) ?? ""),
    };
  });

  return buildLeadershipAnalytics({
    now,
    lessonCatalog,
    members,
    guides,
    turns,
  });
}

function reportLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  if (!year || !month) return "Monthly";
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function toGoal(goal: {
  id: string;
  kind: string;
  title: string;
  summary: string;
  progressSource: string;
  baseline: number | null;
  baselineLabel: string | null;
  target: number | null;
  targetLabel: string;
  checkpoints: { year: number; calendarYear: number; label: string; targetValue: number | null }[];
  steps: { id: string; title: string; detail: string; done: boolean }[];
}): Goal | null {
  if (!goalKinds.has(goal.kind as GoalKind) || !progressSources.has(goal.progressSource as ProgressSource)) {
    return null;
  }
  return {
    id: goal.id,
    kind: goal.kind as GoalKind,
    title: goal.title,
    summary: goal.summary,
    progressSource: goal.progressSource as ProgressSource,
    ...(goal.baseline == null ? {} : { baseline: goal.baseline }),
    ...(goal.baselineLabel ? { baselineLabel: goal.baselineLabel } : {}),
    ...(goal.target == null ? {} : { target: goal.target }),
    targetLabel: goal.targetLabel,
    checkpoints: goal.checkpoints.flatMap((checkpoint) => {
      const year = asYear(checkpoint.year);
      if (year == null) return [];
      return [
        {
          year,
          calendarYear: checkpoint.calendarYear,
          label: checkpoint.label,
          ...(checkpoint.targetValue == null ? {} : { targetValue: checkpoint.targetValue }),
        },
      ];
    }),
    steps: goal.steps.map((step) => ({
      id: step.id,
      title: step.title,
      detail: step.detail,
      done: step.done,
    })),
  };
}

function asYear(year: number): Goal["checkpoints"][number]["year"] | null {
  if (year === 1 || year === 2 || year === 3 || year === 4 || year === 5 || year === 6) return year;
  return null;
}
