import { buildCoachContext, type CoachPriorReport } from "@/lib/coach-context";
import {
  encodeFreedomActions,
  parseFreedomActions,
  type FreedomAction,
  type FreedomActionPlanView,
} from "@/lib/coach-plan";
import { toCheckInView } from "@/lib/check-in";
import { prisma } from "@/lib/db";
import { educationSnapshot } from "@/lib/education-store";
import { formatMonthLabel, previousMonthKey } from "@/lib/month";
import { storedPlanForMember } from "@/lib/plan-store";
import { alexCoachMessages, alexCoachPlans, ALEX_COACH_THREAD_ID, encodeSeedPlan } from "@/lib/sample-coach";

export interface CoachMessageView {
  id: string;
  role: "user" | "assistant";
  body: string;
  createdAt: string;
}

export interface MemberCoachRecord {
  threadId: string | null;
  messages: CoachMessageView[];
  plan: FreedomActionPlanView | null;
}

const MESSAGE_CAP = 8000;

export async function loadMemberCoach(memberId: string, monthKey: string): Promise<MemberCoachRecord> {
  const [thread, plan] = await Promise.all([
    prisma.coachThread.findFirst({
      where: { memberId },
      orderBy: { createdAt: "asc" },
      include: { messages: { orderBy: { createdAt: "asc" }, take: 100 } },
    }),
    prisma.freedomActionPlan.findUnique({
      where: { memberId_monthKey: { memberId, monthKey } },
    }),
  ]);
  return {
    threadId: thread?.id ?? null,
    messages: (thread?.messages ?? []).flatMap((message) => {
      const view = toMessageView(message);
      return view ? [view] : [];
    }),
    plan: plan ? toPlanView(plan) : null,
  };
}

export async function ensureCoachThread(memberId: string): Promise<string> {
  const existing = await prisma.coachThread.findFirst({
    where: { memberId },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (existing) return existing.id;
  const created = await prisma.coachThread.create({ data: { memberId }, select: { id: true } });
  return created.id;
}

export async function recentCoachUiMessages(threadId: string, limit = 20): Promise<CoachMessageView[]> {
  const rows = await prisma.coachMessage.findMany({
    where: { threadId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows
    .reverse()
    .flatMap((message) => {
      const view = toMessageView(message);
      return view ? [view] : [];
    });
}

export async function upsertCoachMessage(input: {
  id: string;
  threadId: string;
  role: "user" | "assistant";
  body: string;
}): Promise<void> {
  const body = input.body.trim().slice(0, MESSAGE_CAP);
  if (!body) return;
  await prisma.coachMessage.upsert({
    where: { id: input.id },
    create: {
      id: input.id,
      threadId: input.threadId,
      role: input.role,
      body,
    },
    update: { body },
  });
  await prisma.coachThread.update({
    where: { id: input.threadId },
    data: { updatedAt: new Date() },
  });
}

export async function loadCoachPrompt(memberId: string, monthKey: string): Promise<string | null> {
  const plan = await storedPlanForMember(memberId);
  if (!plan) return null;
  const priorKey = previousMonthKey(monthKey);
  const [checkIns, education, priorReport, plans, agenda, tasks, assignment] = await Promise.all([
    prisma.weeklyCheckIn.findMany({
      where: { memberId },
      orderBy: { weekKey: "desc" },
      take: 4,
    }),
    educationSnapshot(memberId),
    prisma.monthlyReport.findUnique({
      where: { memberId_monthKey: { memberId, monthKey: priorKey } },
    }),
    prisma.freedomActionPlan.findMany({
      where: { memberId, monthKey: { in: [monthKey, priorKey] } },
    }),
    prisma.agendaItem.findMany({
      where: { memberId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { body: true },
    }),
    prisma.coachingTask.findMany({
      where: { memberId, status: "open" },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { title: true },
    }),
    prisma.guideAssignment.findFirst({
      where: { memberId },
      include: { guide: { select: { name: true } } },
    }),
  ]);
  const current = plans.find((row) => row.monthKey === monthKey);
  const prior = plans.find((row) => row.monthKey === priorKey);
  const priorNumbers: CoachPriorReport | null = priorReport
    ? {
        monthKey: priorReport.monthKey,
        freedomScore: priorReport.freedomScore,
        gap: priorReport.gap,
        quality: priorReport.quality,
        passive: priorReport.passive,
        expenses: priorReport.expenses,
      }
    : null;
  return buildCoachContext({
    plan,
    checkIns: checkIns.map(toCheckInView),
    educationNote: education.note,
    priorReport: priorNumbers,
    priorPlan: prior ? actionsFromJson(prior.actions) : null,
    currentPlan: current ? actionsFromJson(current.actions) : null,
    agenda: agenda.map((item) => item.body),
    openTasks: tasks.map((task) => task.title),
    guideName: assignment?.guide.name ?? null,
  });
}

export async function saveFreedomPlan(input: {
  memberId: string;
  monthKey: string;
  actions: FreedomAction[];
  regenerate: boolean;
}): Promise<FreedomActionPlanView | null> {
  const parsed = parseFreedomActions(input.actions);
  if (!parsed) return null;
  const encoded = encodeFreedomActions(parsed);
  const existing = await prisma.freedomActionPlan.findUnique({
    where: { memberId_monthKey: { memberId: input.memberId, monthKey: input.monthKey } },
  });
  if (input.regenerate && existing?.regeneratedAt) return toPlanView(existing);
  const saved = existing
    ? await prisma.freedomActionPlan.update({
        where: { id: existing.id },
        data: {
          actions: encoded,
          previousActions: input.regenerate ? existing.actions : existing.previousActions,
          source: "generated",
          regeneratedAt: input.regenerate ? new Date() : existing.regeneratedAt,
          generatedAt: input.regenerate ? existing.generatedAt : new Date(),
        },
      })
    : await prisma.freedomActionPlan.create({
        data: {
          memberId: input.memberId,
          monthKey: input.monthKey,
          actions: encoded,
          source: "generated",
        },
      });
  return toPlanView(saved);
}

/** Demo conversation and action plans for Alex. Re-seed replaces those rows only. */
export async function seedAlexCoach(currentMonth: string): Promise<void> {
  await prisma.coachThread.deleteMany({ where: { memberId: "alex" } });
  await prisma.freedomActionPlan.deleteMany({ where: { memberId: "alex" } });
  await prisma.coachThread.create({
    data: {
      id: ALEX_COACH_THREAD_ID,
      memberId: "alex",
      createdAt: new Date("2026-11-02T15:00:00.000Z"),
      messages: {
        create: alexCoachMessages().map((message) => ({
          id: message.id,
          role: message.role,
          body: message.body,
          createdAt: new Date(message.createdAt),
        })),
      },
    },
  });
  const plans = alexCoachPlans(currentMonth);
  await prisma.freedomActionPlan.createMany({
    data: plans.map((plan) => ({
      id: plan.id,
      memberId: plan.memberId,
      monthKey: plan.monthKey,
      actions: encodeSeedPlan(plan.actions),
      source: plan.source,
      generatedAt: new Date(plan.generatedAt),
    })),
  });
}

function actionsFromJson(raw: string): FreedomAction[] | null {
  try {
    return parseFreedomActions(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

function toMessageView(row: { id: string; role: string; body: string; createdAt: Date }): CoachMessageView | null {
  if (row.role !== "user" && row.role !== "assistant") return null;
  return {
    id: row.id,
    role: row.role,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
  };
}

function toPlanView(row: {
  id: string;
  monthKey: string;
  actions: string;
  source: string;
  generatedAt: Date;
  regeneratedAt: Date | null;
}): FreedomActionPlanView | null {
  let parsed: FreedomAction[] | null = null;
  try {
    parsed = parseFreedomActions(JSON.parse(row.actions) as unknown);
  } catch {
    parsed = null;
  }
  if (!parsed) return null;
  return {
    id: row.id,
    monthKey: row.monthKey,
    monthLabel: formatMonthLabel(row.monthKey),
    actions: parsed,
    source: row.source === "seed" ? "seed" : "generated",
    generatedAt: row.generatedAt.toISOString(),
    regeneratedAt: row.regeneratedAt ? row.regeneratedAt.toISOString() : null,
  };
}
