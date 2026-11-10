import type { Prisma } from "@prisma/client";
import { fullGuideAccess, parseGuideAccess, type GuideAccess } from "@/lib/access";
import { isCapitalRole } from "@/lib/efficiency";
import { toCheckInView, type WeeklyCheckInView } from "@/lib/check-in";
import { toNoteView, toTaskView, type CoachingNoteView, type CoachingTaskView } from "@/lib/coaching";
import { prisma } from "@/lib/db";
import { staffNeedsEnrollment } from "@/lib/staff-mfa";
import { isPlaidConfigured } from "@/lib/plaid-config";
import { applyGuideAccess, memberRow, type RosterRow } from "@/lib/roster";
import { resetMemberScenarios } from "@/lib/scenario-store";
import { memberSeeds, type SeedPlan } from "@/lib/sample-plans";
import {
  planSignature,
  toClient,
  type ConnectedItem,
  type PortalSnapshot,
  type PortalViewer,
  type StoredMemberPlan,
} from "@/lib/plans";
import type { Role } from "@/lib/types";

interface PortalActivity {
  checkIns: WeeklyCheckInView[];
  notes: CoachingNoteView[];
  tasks: CoachingTaskView[];
}

const planInclude = {
  expenses: { orderBy: { sort: "asc" } },
  streams: { orderBy: { sort: "asc" } },
  assets: { orderBy: { sort: "asc" } },
  liabilities: { orderBy: { sort: "asc" } },
  goals: {
    orderBy: { sort: "asc" },
    include: {
      checkpoints: { orderBy: { sort: "asc" } },
      steps: { orderBy: { sort: "asc" } },
    },
  },
  plaidItems: {
    select: {
      refreshedAt: true,
      accounts: {
        select: { assetLineId: true, liabilityLineId: true },
      },
    },
  },
} satisfies Prisma.UserInclude;

type PlanUser = Prisma.UserGetPayload<{ include: typeof planInclude }>;

const assetGroups = new Set(["Cash", "Investments", "Property", "Retirement"]);
const goalKinds = new Set(["wealth", "personal"]);
const progressSources = new Set(["freedom", "netWorth", "journey"]);

function asYear(value: number): 1 | 2 | 3 | 4 | 5 | 6 {
  if (value === 1 || value === 2 || value === 3 || value === 4 || value === 5 || value === 6) {
    return value;
  }
  throw new Error(`Checkpoint year must be 1 through 6, received ${value}.`);
}

function refreshMaps(user: PlanUser): {
  assets: Map<string, string>;
  liabilities: Map<string, string>;
} {
  const assets = new Map<string, string>();
  const liabilities = new Map<string, string>();
  for (const item of user.plaidItems) {
    const iso = item.refreshedAt.toISOString();
    for (const account of item.accounts) {
      if (account.assetLineId) assets.set(account.assetLineId, iso);
      if (account.liabilityLineId) liabilities.set(account.liabilityLineId, iso);
    }
  }
  return { assets, liabilities };
}

export function toStoredPlan(user: PlanUser): StoredMemberPlan {
  const refreshed = refreshMaps(user);
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    lastActive: user.lastActive,
    coachingNote: user.coachingNote,
    expenses: user.expenses.map((line) => ({
      id: line.id,
      name: line.name,
      monthly: line.monthly,
      note: line.note,
    })),
    streams: user.streams.map((line) => ({
      id: line.id,
      name: line.name,
      monthly: line.monthly,
      source: line.source,
    })),
    assets: user.assets.map((line) => {
      if (!assetGroups.has(line.group)) {
        throw new Error(`Unknown asset group ${line.group} on ${line.id}.`);
      }
      return {
        id: line.id,
        name: line.name,
        institution: line.institution,
        group: line.group as StoredMemberPlan["assets"][number]["group"],
        balance: line.balance,
        valuation: line.valuation === "verified" ? "verified" : "estimated",
        confirmedAt: line.confirmedAt ? line.confirmedAt.toISOString() : null,
        refreshedAt: refreshed.assets.get(line.id) ?? null,
        capitalRole: isCapitalRole(line.capitalRole) ? line.capitalRole : "",
      };
    }),
    liabilities: user.liabilities.map((line) => ({
      id: line.id,
      name: line.name,
      balance: line.balance,
      note: line.note,
      refreshedAt: refreshed.liabilities.get(line.id) ?? null,
    })),
    goals: user.goals.map((goal) => {
      if (!goalKinds.has(goal.kind) || !progressSources.has(goal.progressSource)) {
        throw new Error(`Goal ${goal.id} has an unknown kind or progress source.`);
      }
      return {
        id: goal.id,
        kind: goal.kind as StoredMemberPlan["goals"][number]["kind"],
        title: goal.title,
        summary: goal.summary,
        progressSource: goal.progressSource as StoredMemberPlan["goals"][number]["progressSource"],
        ...(goal.baseline == null ? {} : { baseline: goal.baseline }),
        ...(goal.baselineLabel ? { baselineLabel: goal.baselineLabel } : {}),
        ...(goal.target == null ? {} : { target: goal.target }),
        targetLabel: goal.targetLabel,
        checkpoints: goal.checkpoints.map((checkpoint) => ({
          year: asYear(checkpoint.year),
          calendarYear: checkpoint.calendarYear,
          label: checkpoint.label,
          ...(checkpoint.targetValue == null ? {} : { targetValue: checkpoint.targetValue }),
        })),
        steps: goal.steps.map((step) => ({
          id: step.id,
          title: step.title,
          detail: step.detail,
          done: step.done,
        })),
      };
    }),
  };
}

function connectionSignature(items: ConnectedItem[]): string {
  return items
    .map(
      (item) =>
        `${item.id}:${item.refreshedAt}:${item.accounts
          .map((account) => `${account.id}:${account.balance}:${account.mask}`)
          .join(",")}`,
    )
    .join(";");
}

function snapshotFor(
  viewer: PortalViewer,
  plan: StoredMemberPlan | null,
  rosterPlans: StoredMemberPlan[],
  connectedItems: ConnectedItem[],
  activity: PortalActivity,
  accessByMember?: Map<string, GuideAccess>,
): PortalSnapshot {
  let roster = rosterPlans.map(memberRow).map((row) =>
    withActivity(row, activity, viewer.role === "guide" || viewer.role === "admin"),
  );
  if (viewer.role === "guide") {
    roster = roster.map((row) => applyGuideAccess(row, accessByMember?.get(row.id) ?? fullGuideAccess));
  }
  const signatureBase = viewer.role === "member" ? planSignature(rosterPlans) : sharedSignature(roster);
  const snapshot = toClient({
    viewer,
    plan,
    roster,
    plaidConfigured: isPlaidConfigured(),
    connectedItems,
    signature: `${signatureBase}#${viewer.role === "member" ? connectionSignature(connectedItems) : ""}#${activitySignature(roster)}`,
  });
  assertSnapshotPrivacy(snapshot);
  return snapshot;
}

function sharedSignature(rows: RosterRow[]): string {
  return rows
    .map((row) =>
      [
        row.id,
        row.access.score ? String(row.metrics.freedomScore) : "score-hidden",
        row.access.totals ? String(row.metrics.netWorth) : "totals-hidden",
        row.access.totals ? String(row.metrics.yieldOnIncomeAssets) : "income-yield-hidden",
        row.access.goals ? String(row.stepsDone) : "goals-hidden",
        row.access.checkIns ? String(row.checkIns.length) : "checkins-hidden",
        row.access.tasks ? row.tasks.map((task) => task.id).join(",") : "tasks-hidden",
      ].join("|"),
    )
    .join("||");
}

function withActivity(row: RosterRow, activity: PortalActivity, includeCoaching: boolean): RosterRow {
  return {
    ...row,
    checkIns: activity.checkIns.filter((checkIn) => checkIn.memberId === row.id),
    notes: includeCoaching ? activity.notes.filter((note) => note.memberId === row.id) : [],
    tasks: includeCoaching ? activity.tasks.filter((task) => task.memberId === row.id) : [],
  };
}

function activitySignature(rows: RosterRow[]): string {
  return rows
    .map((row) =>
      [
        row.id,
        row.checkIns
          .map((checkIn) => `${checkIn.id}:${checkIn.weekKey}:${checkIn.updatedAt}:${checkIn.actionStatus}:${checkIn.needsSupport}`)
          .join(","),
        row.notes.map((note) => note.id).join(","),
        row.tasks.map((task) => `${task.id}:${task.status}:${task.dueDate}:${task.title}`).join(","),
      ].join("|"),
    )
    .join("||");
}

function assertSnapshotPrivacy(snapshot: PortalSnapshot): void {
  const structural = JSON.stringify({
    plan: snapshot.plan,
    connectedItems: snapshot.connectedItems,
    roster: snapshot.roster.map((row) => ({
      id: row.id,
      name: row.name,
      coachingNote: row.coachingNote,
      metrics: row.metrics,
      goals: row.goals,
      integrity: row.integrity,
      quality: row.quality,
      statuses: row.statuses,
    })),
  });
  if (
    structural.includes("accessToken") ||
    structural.includes("access_token") ||
    structural.includes("passwordHash")
  ) {
    throw new Error("Portal snapshot included a secret field.");
  }
  if (snapshot.viewer.role === "admin") {
    if (snapshot.plan !== null || snapshot.connectedItems.length > 0 || snapshot.roster.length > 0) {
      throw new Error("Admin snapshot included member financial detail.");
    }
    return;
  }
  if (snapshot.viewer.role !== "guide") return;
  if (snapshot.plan !== null || snapshot.connectedItems.length > 0) {
    throw new Error("Guide snapshot included member account detail.");
  }
  for (const row of snapshot.roster) {
    if (!row.access.score && (row.metrics.freedomScore != null || row.quality.score != null)) {
      throw new Error("Guide snapshot included a hidden Freedom Score.");
    }
    if (!row.access.totals && row.metrics.netWorth != null) {
      throw new Error("Guide snapshot included a hidden total.");
    }
    if (
      !row.access.totals &&
      (row.metrics.yieldOnIncomeAssets != null || row.metrics.incomeProducingAssets != null)
    ) {
      throw new Error("Guide snapshot included a hidden wealth-efficiency figure.");
    }
    if (!row.access.goals && row.goals.length > 0) {
      throw new Error("Guide snapshot included hidden goals.");
    }
    if (!row.access.checkIns && row.checkIns.length > 0) {
      throw new Error("Guide snapshot included hidden check-ins.");
    }
    if (!row.access.tasks && row.tasks.length > 0) {
      throw new Error("Guide snapshot included hidden tasks.");
    }
  }
  for (const word of ["Vanguard", "Fidelity", "TreasuryDirect"]) {
    if (structural.includes(word)) throw new Error("Guide snapshot included an institution name.");
  }
  const prose = JSON.stringify(snapshot.roster.map((row) => [row.checkIns, row.notes, row.tasks]));
  if (prose.includes("accessToken") || prose.includes("access_token") || prose.includes("passwordHash")) {
    throw new Error("Guide snapshot included a secret field.");
  }
}

async function loadActivity(memberIds: string[], role: Role): Promise<PortalActivity> {
  if (memberIds.length === 0) return { checkIns: [], notes: [], tasks: [] };
  const checkIns = await prisma.weeklyCheckIn.findMany({
    where: { memberId: { in: memberIds } },
    orderBy: [{ weekKey: "desc" }, { updatedAt: "desc" }],
  });
  if (role !== "guide") {
    return { checkIns: checkIns.map(toCheckInView), notes: [], tasks: [] };
  }
  const [notes, tasks] = await Promise.all([
    prisma.coachingNote.findMany({
      where: { memberId: { in: memberIds } },
      orderBy: { createdAt: "desc" },
      include: { guide: { select: { name: true } } },
    }),
    prisma.coachingTask.findMany({
      where: { memberId: { in: memberIds } },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  return {
    checkIns: checkIns.map(toCheckInView),
    notes: notes.map((note) => toNoteView(note, note.guide.name)),
    tasks: tasks.map(toTaskView),
  };
}

async function connectedItemsFor(memberId: string): Promise<ConnectedItem[]> {
  const items = await prisma.plaidItem.findMany({
    where: { memberId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      institutionName: true,
      refreshedAt: true,
      accounts: {
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          type: true,
          subtype: true,
          mask: true,
          balance: true,
          liabilityLineId: true,
        },
      },
    },
  });
  return items.map((item) => ({
    id: item.id,
    institutionName: item.institutionName,
    refreshedAt: item.refreshedAt.toISOString(),
    accounts: item.accounts.map((account) => ({
      id: account.id,
      name: account.name,
      type: account.type,
      subtype: account.subtype,
      mask: account.mask,
      balance: account.balance,
      bucket: account.liabilityLineId ? ("liability" as const) : ("asset" as const),
    })),
  }));
}

export async function storedPlanForMember(memberId: string): Promise<StoredMemberPlan | null> {
  const user = await prisma.user.findUnique({
    where: { id: memberId },
    include: planInclude,
  });
  if (!user || user.role !== "member") return null;
  return toStoredPlan(user);
}

export async function loadPortalSnapshot(input: {
  id: string;
  role: Role;
}): Promise<PortalSnapshot | null> {
  if (input.role === "member") {
    const user = await prisma.user.findUnique({
      where: { id: input.id },
      include: planInclude,
    });
    if (!user || user.role !== "member" || !user.isActive) return null;
    const plan = toStoredPlan(user);
    return snapshotFor(
      { id: user.id, name: user.name, email: user.email, role: "member", mfaEnabled: user.mfaEnabled },
      plan,
      [plan],
      await connectedItemsFor(user.id),
      await loadActivity([user.id], "member"),
    );
  }

  const viewer = await prisma.user.findUnique({ where: { id: input.id } });
  if (!viewer || !viewer.isActive) return null;
  if (staffNeedsEnrollment(viewer.role, viewer.mfaEnabled)) {
    return snapshotFor(
      {
        id: viewer.id,
        name: viewer.name,
        email: viewer.email,
        role: viewer.role === "admin" ? "admin" : "guide",
        mfaEnabled: false,
      },
      null,
      [],
      [],
      { checkIns: [], notes: [], tasks: [] },
    );
  }
  if (viewer.role === "admin") {
    return snapshotFor(
      {
        id: viewer.id,
        name: viewer.name,
        email: viewer.email,
        role: "admin",
        mfaEnabled: viewer.mfaEnabled,
      },
      null,
      [],
      [],
      { checkIns: [], notes: [], tasks: [] },
    );
  }
  if (viewer.role !== "guide") return null;
  const assignments = await prisma.guideAssignment.findMany({
    where: { guideId: viewer.id },
    orderBy: { sort: "asc" },
    include: { member: { include: planInclude } },
  });
  const plans = assignments
    .map((assignment) => assignment.member)
    .filter((member) => member.role === "member")
    .map(toStoredPlan);
  const grants = await prisma.guideAccessGrant.findMany({
    where: {
      guideId: viewer.id,
      revokedAt: null,
      memberId: { in: plans.map((plan) => plan.id) },
    },
    orderBy: { grantedAt: "desc" },
  });
  const accessByMember = new Map<string, GuideAccess>();
  for (const grant of grants) {
    if (!accessByMember.has(grant.memberId)) {
      accessByMember.set(grant.memberId, parseGuideAccess(grant.scopes));
    }
  }
  return snapshotFor(
    { id: viewer.id, name: viewer.name, email: viewer.email, role: "guide", mfaEnabled: viewer.mfaEnabled },
    null,
    plans,
    [],
    await loadActivity(plans.map((plan) => plan.id), "guide"),
    accessByMember,
  );
}

export async function integrityCensus(): Promise<{
  members: number;
  staleLabels: number;
  missingLabels: number;
  membersWithStale: number;
  membersWithMissing: number;
}> {
  const { assessPlanIntegrity } = await import("@/lib/integrity");
  const users = await prisma.user.findMany({
    where: { role: "member" },
    include: planInclude,
  });
  let staleLabels = 0;
  let missingLabels = 0;
  let membersWithStale = 0;
  let membersWithMissing = 0;
  for (const user of users) {
    const summary = assessPlanIntegrity(toStoredPlan(user)).summary;
    const labels = Object.values(summary);
    const stale = labels.filter((label) => label === "stale").length;
    const missing = labels.filter((label) => label === "missing").length;
    staleLabels += stale;
    missingLabels += missing;
    if (stale > 0) membersWithStale += 1;
    if (missing > 0) membersWithMissing += 1;
  }
  return { members: users.length, staleLabels, missingLabels, membersWithStale, membersWithMissing };
}

export async function replaceMemberPlan(memberId: string, plan: SeedPlan): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.goalStep.deleteMany({ where: { goal: { memberId } } });
    await tx.checkpoint.deleteMany({ where: { goal: { memberId } } });
    await tx.goal.deleteMany({ where: { memberId } });
    await tx.expenseLine.deleteMany({ where: { memberId } });
    await tx.passiveStream.deleteMany({ where: { memberId } });
    const linked = await tx.plaidAccount.findMany({
      where: { item: { memberId } },
      select: { assetLineId: true, liabilityLineId: true },
    });
    const keepAssets = linked.flatMap((row) => (row.assetLineId ? [row.assetLineId] : []));
    const keepLiabilities = linked.flatMap((row) => (row.liabilityLineId ? [row.liabilityLineId] : []));
    await tx.assetLine.deleteMany({
      where: keepAssets.length > 0 ? { memberId, id: { notIn: keepAssets } } : { memberId },
    });
    await tx.liabilityLine.deleteMany({
      where: keepLiabilities.length > 0 ? { memberId, id: { notIn: keepLiabilities } } : { memberId },
    });

    if (plan.expenses.length > 0) {
      await tx.expenseLine.createMany({
        data: plan.expenses.map((line) => ({ ...line, memberId })),
      });
    }
    if (plan.streams.length > 0) {
      await tx.passiveStream.createMany({
        data: plan.streams.map((line) => ({ ...line, memberId })),
      });
    }
    if (plan.assets.length > 0) {
      await tx.assetLine.createMany({
        data: plan.assets.map((line) => ({
          id: line.id,
          memberId,
          name: line.name,
          institution: line.institution,
          group: line.group,
          balance: line.balance,
          sort: line.sort,
          valuation: line.valuation === "verified" ? "verified" : "estimated",
          confirmedAt: line.confirmedAt,
          capitalRole: isCapitalRole(line.capitalRole ?? "") ? line.capitalRole : "",
        })),
      });
    }
    if (plan.liabilities.length > 0) {
      await tx.liabilityLine.createMany({
        data: plan.liabilities.map((line) => ({ ...line, memberId })),
      });
    }
    for (const goal of plan.goals) {
      await tx.goal.create({
        data: {
          id: goal.id,
          memberId,
          kind: goal.kind,
          title: goal.title,
          summary: goal.summary,
          progressSource: goal.progressSource,
          baseline: goal.baseline,
          baselineLabel: goal.baselineLabel,
          target: goal.target,
          targetLabel: goal.targetLabel,
          sort: goal.sort,
          checkpoints: { create: goal.checkpoints },
          steps: { create: goal.steps },
        },
      });
    }
  });
}

export async function updateMemberAmount(input: {
  memberId: string;
  kind: "expense" | "stream" | "asset" | "liability";
  lineId: string;
  amount: number;
}): Promise<boolean> {
  const amount = input.amount;
  const where = { id: input.lineId, memberId: input.memberId };
  if (input.kind === "asset" || input.kind === "liability") {
    const linked = await prisma.plaidAccount.findFirst({
      where:
        input.kind === "asset"
          ? { assetLineId: input.lineId, item: { memberId: input.memberId } }
          : { liabilityLineId: input.lineId, item: { memberId: input.memberId } },
      select: { id: true },
    });
    if (linked) return false;
  }
  if (input.kind === "expense") {
    const result = await prisma.expenseLine.updateMany({ where, data: { monthly: amount } });
    return result.count === 1;
  }
  if (input.kind === "stream") {
    const result = await prisma.passiveStream.updateMany({ where, data: { monthly: amount } });
    return result.count === 1;
  }
  if (input.kind === "asset") {
    const result = await prisma.assetLine.updateMany({
      where,
      data: { balance: amount, confirmedAt: new Date() },
    });
    return result.count === 1;
  }
  const result = await prisma.liabilityLine.updateMany({ where, data: { balance: amount } });
  return result.count === 1;
}

export async function setAssetCapitalRole(input: {
  memberId: string;
  lineId: string;
  capitalRole: "income" | "appreciation" | "lifestyle";
}): Promise<boolean> {
  const result = await prisma.assetLine.updateMany({
    where: { id: input.lineId, memberId: input.memberId },
    data: { capitalRole: input.capitalRole },
  });
  return result.count === 1;
}

export async function setAssetValuation(input: {
  memberId: string;
  lineId: string;
  valuation: "estimated" | "verified";
}): Promise<boolean> {
  const linked = await prisma.plaidAccount.findFirst({
    where: { assetLineId: input.lineId, item: { memberId: input.memberId } },
    select: { id: true },
  });
  if (linked) return false;
  const result = await prisma.assetLine.updateMany({
    where: { id: input.lineId, memberId: input.memberId },
    data: { valuation: input.valuation, confirmedAt: new Date() },
  });
  return result.count === 1;
}

export async function setMemberStep(input: {
  memberId: string;
  stepId: string;
  done: boolean;
}): Promise<boolean> {
  const step = await prisma.goalStep.findFirst({
    where: { id: input.stepId, goal: { memberId: input.memberId } },
    select: { id: true },
  });
  if (!step) return false;
  await prisma.goalStep.update({ where: { id: step.id }, data: { done: input.done } });
  return true;
}

export async function resetSeededPlans(memberIds: string[]): Promise<void> {
  const seeds = memberSeeds().filter((member) => memberIds.includes(member.id));
  for (const member of seeds) {
    await replaceMemberPlan(member.id, member.plan);
  }
  await resetMemberScenarios(seeds.map((member) => member.id));
}
