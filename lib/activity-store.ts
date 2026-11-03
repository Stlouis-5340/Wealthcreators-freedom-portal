import { buildCheckInSummary, toCheckInView, type NormalizedCheckIn, type WeeklyCheckInView } from "@/lib/check-in";
import { toNoteView, toTaskView, type CoachingNoteView, type CoachingTaskView, type TaskStatus } from "@/lib/coaching";
import { prisma } from "@/lib/db";
import { totalsFromLines } from "@/lib/metrics";
import { storedPlanForMember } from "@/lib/plan-store";
import { assessFreedomQuality } from "@/lib/quality";
import { chicagoWeekKey } from "@/lib/week";

export async function saveMemberCheckIn(
  memberId: string,
  input: NormalizedCheckIn,
): Promise<WeeklyCheckInView | null> {
  const plan = await storedPlanForMember(memberId);
  if (!plan) return null;
  const weekKey = chicagoWeekKey();
  const metrics = totalsFromLines(plan);
  const quality = assessFreedomQuality(plan);
  const summary = buildCheckInSummary({
    weekKey,
    win: input.win,
    challenge: input.challenge,
    actionStatus: input.actionStatus,
    commitment: input.commitment,
    needsSupport: input.needsSupport,
    freedomScore: metrics.freedomScore,
    monthlyFreedomGap: metrics.monthlyFreedomGap,
    qualityScore: quality.score,
  });
  const saved = await prisma.weeklyCheckIn.upsert({
    where: { memberId_weekKey: { memberId, weekKey } },
    create: {
      memberId,
      weekKey,
      win: input.win,
      challenge: input.challenge,
      actionStatus: input.actionStatus,
      commitment: input.commitment,
      needsSupport: input.needsSupport,
      supportNote: input.supportNote,
      summary,
      freedomScore: metrics.freedomScore,
      monthlyFreedomGap: metrics.monthlyFreedomGap,
      qualityScore: quality.score,
    },
    update: {
      win: input.win,
      challenge: input.challenge,
      actionStatus: input.actionStatus,
      commitment: input.commitment,
      needsSupport: input.needsSupport,
      supportNote: input.supportNote,
      summary,
      freedomScore: metrics.freedomScore,
      monthlyFreedomGap: metrics.monthlyFreedomGap,
      qualityScore: quality.score,
    },
  });
  return toCheckInView(saved);
}

export async function guideAssigned(guideId: string, memberId: string): Promise<boolean> {
  const row = await prisma.guideAssignment.findUnique({
    where: { guideId_memberId: { guideId, memberId } },
    select: { memberId: true },
  });
  return row != null;
}

export async function addCoachingNote(input: {
  guideId: string;
  guideName: string;
  memberId: string;
  body: string;
}): Promise<CoachingNoteView | null> {
  if (!(await guideAssigned(input.guideId, input.memberId))) return null;
  const note = await prisma.coachingNote.create({
    data: {
      memberId: input.memberId,
      guideId: input.guideId,
      body: input.body,
    },
  });
  return toNoteView(note, input.guideName);
}

export async function addCoachingTask(input: {
  guideId: string;
  memberId: string;
  title: string;
  dueDate: string;
}): Promise<CoachingTaskView | null> {
  if (!(await guideAssigned(input.guideId, input.memberId))) return null;
  const task = await prisma.coachingTask.create({
    data: {
      memberId: input.memberId,
      guideId: input.guideId,
      title: input.title,
      dueDate: input.dueDate,
      status: "open",
    },
  });
  return toTaskView(task);
}

export async function setCoachingTaskStatus(input: {
  guideId: string;
  taskId: string;
  status: TaskStatus;
}): Promise<boolean> {
  const task = await prisma.coachingTask.findFirst({
    where: { id: input.taskId, guideId: input.guideId },
    select: { id: true, memberId: true },
  });
  if (!task || !(await guideAssigned(input.guideId, task.memberId))) return false;
  await prisma.coachingTask.update({
    where: { id: task.id },
    data: { status: input.status },
  });
  return true;
}
