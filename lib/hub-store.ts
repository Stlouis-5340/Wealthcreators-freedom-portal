import { guideAssigned } from "@/lib/activity-store";
import { toTaskView, type TaskStatus } from "@/lib/coaching";
import { prisma } from "@/lib/db";
import { activeGuideAccess } from "@/lib/grants";
import {
  resolveSchedulingUrl,
  taskSource,
  type AgendaItemView,
  type HubMessageView,
  type HubModel,
  type HubTaskView,
  type SessionSummaryView,
} from "@/lib/hub";
import { chicagoDateISO } from "@/lib/week";

export async function assignedGuide(memberId: string): Promise<{
  id: string;
  name: string;
  schedulingUrl: string;
} | null> {
  const assignment = await prisma.guideAssignment.findFirst({
    where: { memberId, guide: { role: "guide", isActive: true } },
    orderBy: { sort: "asc" },
    include: { guide: { select: { id: true, name: true, schedulingUrl: true, role: true } } },
  });
  if (!assignment || assignment.guide.role !== "guide") return null;
  return {
    id: assignment.guide.id,
    name: assignment.guide.name,
    schedulingUrl: assignment.guide.schedulingUrl,
  };
}

export async function unreadHubCount(userId: string, memberId: string): Promise<number> {
  const read = await prisma.hubRead.findUnique({
    where: { userId_memberId: { userId, memberId } },
    select: { lastReadAt: true },
  });
  return prisma.hubMessage.count({
    where: {
      memberId,
      authorId: { not: userId },
      ...(read ? { createdAt: { gt: read.lastReadAt } } : {}),
    },
  });
}

export async function markHubRead(userId: string, memberId: string): Promise<void> {
  await prisma.hubRead.upsert({
    where: { userId_memberId: { userId, memberId } },
    create: { userId, memberId, lastReadAt: new Date() },
    update: { lastReadAt: new Date() },
  });
}

export async function loadHubForMember(memberId: string, memberName: string): Promise<HubModel> {
  const guide = await assignedGuide(memberId);
  const [tasks, messages, sessions, agenda] = await Promise.all([
    prisma.coachingTask.findMany({ where: { memberId }, orderBy: { createdAt: "asc" } }),
    prisma.hubMessage.findMany({
      where: { memberId },
      orderBy: { createdAt: "asc" },
      include: { author: { select: { id: true, name: true, role: true } } },
    }),
    prisma.sessionSummary.findMany({
      where: { memberId },
      orderBy: { heldAt: "desc" },
      include: { guide: { select: { name: true } } },
    }),
    prisma.agendaItem.findMany({ where: { memberId }, orderBy: { createdAt: "desc" } }),
  ]);
  return {
    memberId,
    memberName,
    guideName: guide?.name ?? null,
    schedulingUrl: resolveSchedulingUrl(guide?.schedulingUrl ?? ""),
    viewerRole: "member",
    tasksShared: true,
    tasks: tasks.map(toHubTask),
    messages: messages.map(toMessage),
    sessions: sessions.map(toSession),
    agenda: agenda.map(toAgenda),
  };
}

export async function loadHubForGuide(guideId: string, memberId: string): Promise<HubModel | null> {
  if (!(await guideAssigned(guideId, memberId))) return null;
  const access = await activeGuideAccess(guideId, memberId);
  if (!access) return null;
  const [member, guide, tasks, messages, sessions, agenda] = await Promise.all([
    prisma.user.findUnique({ where: { id: memberId }, select: { name: true, role: true } }),
    prisma.user.findUnique({ where: { id: guideId }, select: { name: true, schedulingUrl: true } }),
    access.tasks
      ? prisma.coachingTask.findMany({ where: { memberId }, orderBy: { createdAt: "asc" } })
      : Promise.resolve([]),
    prisma.hubMessage.findMany({
      where: { memberId },
      orderBy: { createdAt: "asc" },
      include: { author: { select: { id: true, name: true, role: true } } },
    }),
    prisma.sessionSummary.findMany({
      where: { memberId },
      orderBy: { heldAt: "desc" },
      include: { guide: { select: { name: true } } },
    }),
    prisma.agendaItem.findMany({ where: { memberId }, orderBy: { createdAt: "desc" } }),
  ]);
  if (!member || member.role !== "member" || !guide) return null;
  return {
    memberId,
    memberName: member.name,
    guideName: guide.name,
    schedulingUrl: resolveSchedulingUrl(guide.schedulingUrl),
    viewerRole: "guide",
    tasksShared: access.tasks,
    tasks: tasks.map(toHubTask),
    messages: messages.map(toMessage),
    sessions: sessions.map(toSession),
    agenda: agenda.map(toAgenda),
  };
}

export async function postHubMessage(input: {
  memberId: string;
  authorId: string;
  body: string;
}): Promise<boolean> {
  const message = await prisma.hubMessage.create({
    data: {
      memberId: input.memberId,
      authorId: input.authorId,
      body: input.body,
    },
  });
  await markHubRead(input.authorId, input.memberId);
  return Boolean(message.id);
}

export async function addSessionSummary(input: {
  memberId: string;
  guideId: string;
  summary: string;
  nextSteps: string;
  heldAt: string;
}): Promise<boolean> {
  if (!(await guideAssigned(input.guideId, input.memberId))) return false;
  await prisma.sessionSummary.create({
    data: {
      memberId: input.memberId,
      guideId: input.guideId,
      summary: input.summary,
      nextSteps: input.nextSteps,
      heldAt: new Date(`${input.heldAt}T18:00:00.000Z`),
    },
  });
  return true;
}

export async function addAgendaItem(memberId: string, body: string): Promise<boolean> {
  await prisma.agendaItem.create({ data: { memberId, body } });
  return true;
}

export async function addMemberTask(input: {
  memberId: string;
  title: string;
  dueDate: string;
}): Promise<boolean> {
  const guide = await assignedGuide(input.memberId);
  if (!guide) return false;
  await prisma.coachingTask.create({
    data: {
      memberId: input.memberId,
      guideId: guide.id,
      title: input.title,
      dueDate: input.dueDate,
      status: "open",
      source: "member",
    },
  });
  return true;
}

export async function setMemberTaskStatus(input: {
  memberId: string;
  taskId: string;
  status: TaskStatus;
}): Promise<boolean> {
  const task = await prisma.coachingTask.findFirst({
    where: { id: input.taskId, memberId: input.memberId },
    select: { id: true },
  });
  if (!task) return false;
  await prisma.coachingTask.update({
    where: { id: task.id },
    data: { status: input.status },
  });
  return true;
}

export async function setGuideSchedulingUrl(guideId: string, url: string): Promise<boolean> {
  const guide = await prisma.user.findFirst({
    where: { id: guideId, role: "guide", isActive: true },
    select: { id: true },
  });
  if (!guide) return false;
  await prisma.user.update({ where: { id: guide.id }, data: { schedulingUrl: url } });
  return true;
}

function toHubTask(row: {
  id: string;
  memberId: string;
  guideId: string;
  title: string;
  dueDate: string;
  status: string;
  source: string;
  createdAt: Date;
  updatedAt: Date;
}): HubTaskView {
  const view = toTaskView(row);
  return {
    id: view.id,
    title: view.title,
    dueDate: view.dueDate,
    status: view.status,
    source: taskSource(row.source),
  };
}

function toMessage(row: {
  id: string;
  authorId: string;
  body: string;
  createdAt: Date;
  author: { name: string; role: string };
}): HubMessageView {
  return {
    id: row.id,
    authorId: row.authorId,
    authorName: row.author.name,
    authorRole: row.author.role === "guide" ? "guide" : "member",
    body: row.body,
    createdAt: row.createdAt.toISOString(),
  };
}

function toSession(row: {
  id: string;
  summary: string;
  nextSteps: string;
  heldAt: Date;
  guide: { name: string };
}): SessionSummaryView {
  return {
    id: row.id,
    guideName: row.guide.name,
    summary: row.summary,
    nextSteps: row.nextSteps,
    heldAt: chicagoDateISO(row.heldAt),
  };
}

function toAgenda(row: { id: string; body: string; createdAt: Date }): AgendaItemView {
  return { id: row.id, body: row.body, createdAt: row.createdAt.toISOString() };
}
