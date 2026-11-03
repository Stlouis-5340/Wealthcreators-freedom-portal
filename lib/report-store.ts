import { fullGuideAccess, type GuideAccess } from "@/lib/access";
import { educationSnapshot } from "@/lib/education-store";
import { hiddenEducationProgress, type EducationProgressView } from "@/lib/education";
import { guideAssigned } from "@/lib/activity-store";
import { writeAudit } from "@/lib/audit";
import { activeGuideAccess } from "@/lib/grants";
import { actionLabel, toCheckInView, type WeeklyCheckInView } from "@/lib/check-in";
import { prisma } from "@/lib/db";
import {
  chicagoMonthKey,
  formatMonthLabel,
  formatMonthName,
  isMonthKey,
  previousMonthKey,
  weekInMonth,
} from "@/lib/month";
import { storedPlanForMember } from "@/lib/plan-store";
import {
  buildMonthlyReportDraft,
  deltasFor,
  EDUCATIONAL_LABEL,
  encodeReportJson,
  parseActions,
  parseGoalsSummary,
  parseMilestones,
  resolveBaseline,
  type GoalSummaryItem,
  type MetricDelta,
  type MilestonesPayload,
  type MonthlyReportDraft,
  type ReportAction,
  type ReportBaseline,
  type ReportNumbers,
} from "@/lib/report";
import type { Role } from "@/lib/types";
import { formatWeekSpan } from "@/lib/week";

export interface MonthLink {
  monthKey: string;
  label: string;
  href: string;
}

export interface CheckInHighlight {
  weekLabel: string;
  inThisMonth: boolean;
  win: string;
  challenge: string;
  commitment: string;
  actionStatus: string;
  needsSupport: boolean;
  supportNote: string;
}

export interface CoachingHighlights {
  latest: CheckInHighlight | null;
  openTaskCount: number;
  noteCount: number;
}

export interface FreedomReportModel {
  memberId: string;
  memberName: string;
  monthKey: string;
  monthLabel: string;
  monthName: string;
  generatedAt: string;
  numbers: ReportNumbers;
  baseline: ReportBaseline;
  deltas: Record<keyof ReportNumbers, MetricDelta>;
  goals: GoalSummaryItem[];
  milestones: MilestonesPayload;
  actions: ReportAction[];
  education: EducationProgressView;
  guidance: string;
  months: MonthLink[];
  isCurrent: boolean;
  sharePath: string;
  audience: "member" | "guide";
  coaching: CoachingHighlights | null;
  /** Guides only receive the parts the member has turned on. Members always have the full set. */
  access: GuideAccess;
}

export type ReportPageResult =
  | { status: "ready"; model: FreedomReportModel }
  | {
      status: "missing";
      memberId: string;
      memberName: string;
      monthKey: string;
      monthLabel: string;
      months: MonthLink[];
      audience: "member" | "guide";
    }
  | { status: "forbidden" }
  | { status: "invalid" };

type ReportRow = {
  monthKey: string;
  freedomScore: number | null;
  gap: number | null;
  quality: number | null;
  passive: number | null;
  expenses: number | null;
  netWorth: number | null;
  yieldOnAssets: number | null;
  goalsSummary: string;
  milestones: string;
  actions: string;
  generatedAt: Date;
};

export function reportPath(memberId: string, monthKey: string): string {
  return `/reports/${memberId}/${monthKey}`;
}

export async function ensureCurrentMonthlyReport(
  memberId: string,
  now = new Date(),
): Promise<MonthlyReportDraft | null> {
  const plan = await storedPlanForMember(memberId);
  if (!plan) return null;
  const monthKey = chicagoMonthKey(now);
  const priorKey = previousMonthKey(monthKey);
  const [checkInRows, priorRow] = await Promise.all([
    prisma.weeklyCheckIn.findMany({ where: { memberId }, orderBy: { weekKey: "desc" } }),
    prisma.monthlyReport.findUnique({
      where: { memberId_monthKey: { memberId, monthKey: priorKey } },
    }),
  ]);
  const draft = buildMonthlyReportDraft({
    plan,
    monthKey,
    checkIns: checkInRows.map(toCheckInView),
    prior: priorRow ? snapshotOf(priorRow) : null,
    generatedAt: now,
  });
  const encoded = encodeReportJson(draft);
  const data = {
    freedomScore: draft.freedomScore,
    gap: draft.gap,
    quality: draft.quality,
    passive: draft.passive,
    expenses: draft.expenses,
    netWorth: draft.netWorth,
    yieldOnAssets: draft.yieldOnAssets,
    goalsSummary: encoded.goalsSummary,
    milestones: encoded.milestones,
    actions: encoded.actions,
    generatedAt: now,
  };
  await prisma.monthlyReport.upsert({
    where: { memberId_monthKey: { memberId, monthKey } },
    create: { memberId, monthKey, ...data },
    update: data,
  });
  return draft;
}

export async function loadMonthlyReport(input: {
  viewerId: string;
  viewerRole: Role;
  memberId: string;
  monthKey: string;
  now?: Date;
  hrefForMonth?: (monthKey: string) => string;
}): Promise<ReportPageResult> {
  const now = input.now ?? new Date();
  const currentKey = chicagoMonthKey(now);
  if (!isMonthKey(input.monthKey) || input.monthKey > currentKey) return { status: "invalid" };
  if (!(await canRead(input.viewerId, input.viewerRole, input.memberId))) return { status: "forbidden" };
  const audience: "member" | "guide" = input.viewerRole === "guide" ? "guide" : "member";

  const member = await prisma.user.findUnique({
    where: { id: input.memberId },
    select: { id: true, name: true, role: true },
  });
  if (!member || member.role !== "member") return { status: "forbidden" };

  const saved = await ensureCurrentMonthlyReport(input.memberId, now);
  if (!saved) return { status: "forbidden" };

  const hrefForMonth = input.hrefForMonth ?? ((monthKey: string) => reportPath(input.memberId, monthKey));
  const [row, savedMonths, checkInRows] = await Promise.all([
    prisma.monthlyReport.findUnique({
      where: { memberId_monthKey: { memberId: input.memberId, monthKey: input.monthKey } },
    }),
    prisma.monthlyReport.findMany({
      where: { memberId: input.memberId },
      select: { monthKey: true },
      orderBy: { monthKey: "desc" },
    }),
    prisma.weeklyCheckIn.findMany({
      where: { memberId: input.memberId },
      orderBy: { weekKey: "desc" },
    }),
  ]);
  const months = savedMonths.map((item) => ({
    monthKey: item.monthKey,
    label: formatMonthName(item.monthKey),
    href: hrefForMonth(item.monthKey),
  }));
  if (!row) {
    if (input.viewerRole === "guide") {
      await recordReportOpen(input.viewerId, member.id, input.monthKey, "missing");
    }
    return {
      status: "missing",
      memberId: member.id,
      memberName: member.name,
      monthKey: input.monthKey,
      monthLabel: formatMonthLabel(input.monthKey),
      months,
      audience,
    };
  }

  const priorKey = previousMonthKey(input.monthKey);
  const priorRow =
    savedMonths.some((item) => item.monthKey === priorKey)
      ? await prisma.monthlyReport.findUnique({
          where: { memberId_monthKey: { memberId: input.memberId, monthKey: priorKey } },
        })
      : null;
  const checkIns = checkInRows.map(toCheckInView);
  const numbers = numbersFromRow(row);
  const baseline = resolveBaseline({
    monthKey: input.monthKey,
    prior: priorRow ? snapshotOf(priorRow) : null,
    checkIns,
  });
  const coaching =
    input.viewerRole === "guide" ? await coachingFor(input.memberId, input.monthKey, checkIns) : null;

  const access =
    input.viewerRole === "guide"
      ? ((await activeGuideAccess(input.viewerId, input.memberId)) ?? fullGuideAccess)
      : fullGuideAccess;
  const model: FreedomReportModel = {
    memberId: member.id,
    memberName: member.name,
    monthKey: row.monthKey,
    monthLabel: formatMonthLabel(row.monthKey),
    monthName: formatMonthName(row.monthKey),
    generatedAt: row.generatedAt.toISOString(),
    numbers,
    baseline,
    deltas: deltasFor(numbers, baseline),
    goals: parseGoalsSummary(row.goalsSummary),
    milestones: parseMilestones(row.milestones),
    actions: parseActions(row.actions),
    education: await educationSnapshot(input.memberId),
    guidance: EDUCATIONAL_LABEL,
    months,
    isCurrent: row.monthKey === currentKey,
    sharePath: reportPath(member.id, row.monthKey),
    audience,
    coaching,
    access,
  };
  if (input.viewerRole === "guide") {
    await recordReportOpen(input.viewerId, member.id, input.monthKey, "ready");
    return { status: "ready", model: redactGuideReport(model, access) };
  }
  return { status: "ready", model };
}

function numbersFromRow(row: ReportRow): ReportNumbers {
  return {
    freedomScore: row.freedomScore,
    gap: row.gap,
    quality: row.quality,
    passive: row.passive,
    expenses: row.expenses,
    netWorth: row.netWorth,
    yieldOnAssets: row.yieldOnAssets,
  };
}

function snapshotOf(row: ReportRow): { numbers: ReportNumbers; goals: GoalSummaryItem[] } {
  return {
    numbers: numbersFromRow(row),
    goals: parseGoalsSummary(row.goalsSummary),
  };
}

async function canRead(viewerId: string, role: Role, memberId: string): Promise<boolean> {
  if (role === "member") return viewerId === memberId;
  if (role === "guide") return guideAssigned(viewerId, memberId);
  return false;
}

function redactGuideReport(model: FreedomReportModel, access: GuideAccess): FreedomReportModel {
  const numbers = { ...model.numbers };
  const baselineNumbers = { ...model.baseline.numbers };
  if (!access.score) {
    numbers.freedomScore = null;
    numbers.gap = null;
    numbers.quality = null;
    baselineNumbers.freedomScore = null;
    baselineNumbers.gap = null;
    baselineNumbers.quality = null;
  }
  if (!access.totals) {
    numbers.passive = null;
    numbers.expenses = null;
    numbers.netWorth = null;
    numbers.yieldOnAssets = null;
    baselineNumbers.passive = null;
    baselineNumbers.expenses = null;
    baselineNumbers.netWorth = null;
    baselineNumbers.yieldOnAssets = null;
  }
  const baseline = {
    ...model.baseline,
    numbers: baselineNumbers,
    detail:
      access.score && access.totals
        ? model.baseline.detail
        : "Some figures on this report are not shared with you, so those cards stay blank.",
  };
  const shareActions = access.score && access.totals && access.goals;
  return {
    ...model,
    access,
    numbers,
    baseline,
    deltas: deltasFor(numbers, baseline),
    goals: access.goals ? model.goals : [],
    milestones: {
      ...model.milestones,
      bands: access.score ? model.milestones.bands : [],
      steps: access.goals ? model.milestones.steps : [],
      note:
        access.score || access.goals
          ? model.milestones.note
          : "Milestones that name a score or a goal are not shared.",
    },
    actions: shareActions ? model.actions : [],
    education: access.education ? model.education : hiddenEducationProgress(),
    coaching: model.coaching
      ? {
          latest: access.checkIns ? model.coaching.latest : null,
          openTaskCount: access.tasks ? model.coaching.openTaskCount : 0,
          noteCount: model.coaching.noteCount,
        }
      : null,
  };
}

async function recordReportOpen(
  guideId: string,
  memberId: string,
  monthKey: string,
  status: "ready" | "missing",
): Promise<void> {
  try {
    await writeAudit({
      actorUserId: guideId,
      action: "guide.open_report",
      targetType: "member",
      targetId: memberId,
      meta: { monthKey, status },
    });
  } catch {
    // The report still opens if the audit row cannot be written.
  }
}

async function coachingFor(
  memberId: string,
  monthKey: string,
  checkIns: WeeklyCheckInView[],
): Promise<CoachingHighlights> {
  const [openTaskCount, noteCount] = await Promise.all([
    prisma.coachingTask.count({ where: { memberId, status: "open" } }),
    prisma.coachingNote.count({ where: { memberId } }),
  ]);
  const latest = [...checkIns].sort(
    (a, b) => b.weekKey.localeCompare(a.weekKey) || b.updatedAt.localeCompare(a.updatedAt),
  )[0];
  return {
    openTaskCount,
    noteCount,
    latest: latest
      ? {
          weekLabel: formatWeekSpan(latest.weekKey),
          inThisMonth: weekInMonth(latest.weekKey, monthKey),
          win: latest.win,
          challenge: latest.challenge,
          commitment: latest.commitment,
          actionStatus: actionLabel(latest.actionStatus),
          needsSupport: latest.needsSupport,
          supportNote: latest.supportNote,
        }
      : null,
  };
}
