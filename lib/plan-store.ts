import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { isPlaidConfigured } from "@/lib/plaid-config";
import { memberRow } from "@/lib/roster";
import { memberSeeds, type SeedPlan } from "@/lib/sample-plans";
import {
  guideSignature,
  planSignature,
  toClient,
  type ConnectedItem,
  type PortalSnapshot,
  type PortalViewer,
  type StoredMemberPlan,
} from "@/lib/plans";
import type { Role } from "@/lib/types";

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

export function toStoredPlan(user: PlanUser): StoredMemberPlan {
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
      };
    }),
    liabilities: user.liabilities.map((line) => ({
      id: line.id,
      name: line.name,
      balance: line.balance,
      note: line.note,
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
        `${item.id}:${item.accounts
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
): PortalSnapshot {
  const signatureBase = viewer.role === "guide" ? guideSignature(rosterPlans) : planSignature(rosterPlans);
  const snapshot = toClient({
    viewer,
    plan,
    roster: rosterPlans.map(memberRow),
    plaidConfigured: isPlaidConfigured(),
    connectedItems,
    signature: `${signatureBase}#${viewer.role === "guide" ? "" : connectionSignature(connectedItems)}`,
  });
  assertSnapshotPrivacy(snapshot);
  return snapshot;
}

function assertSnapshotPrivacy(snapshot: PortalSnapshot): void {
  const json = JSON.stringify(snapshot);
  if (json.includes("accessToken") || json.includes("access_token") || json.includes("passwordHash")) {
    throw new Error("Portal snapshot included a secret field.");
  }
  if (snapshot.viewer.role !== "guide") return;
  if (snapshot.plan !== null || snapshot.connectedItems.length > 0) {
    throw new Error("Guide snapshot included member account detail.");
  }
  for (const word of ["Vanguard", "Fidelity", "TreasuryDirect"]) {
    if (json.includes(word)) throw new Error("Guide snapshot included an institution name.");
  }
}

async function connectedItemsFor(memberId: string): Promise<ConnectedItem[]> {
  const items = await prisma.plaidItem.findMany({
    where: { memberId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      institutionName: true,
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

export async function loadPortalSnapshot(input: {
  id: string;
  role: Role;
}): Promise<PortalSnapshot | null> {
  if (input.role === "member") {
    const user = await prisma.user.findUnique({
      where: { id: input.id },
      include: planInclude,
    });
    if (!user || user.role !== "member") return null;
    const plan = toStoredPlan(user);
    return snapshotFor(
      { id: user.id, name: user.name, email: user.email, role: "member" },
      plan,
      [plan],
      await connectedItemsFor(user.id),
    );
  }

  const guide = await prisma.user.findUnique({ where: { id: input.id } });
  if (!guide || guide.role !== "guide") return null;
  const assignments = await prisma.guideAssignment.findMany({
    where: { guideId: guide.id },
    orderBy: { sort: "asc" },
    include: { member: { include: planInclude } },
  });
  const plans = assignments
    .map((assignment) => assignment.member)
    .filter((member) => member.role === "member")
    .map(toStoredPlan);
  return snapshotFor(
    { id: guide.id, name: guide.name, email: guide.email, role: "guide" },
    null,
    plans,
    [],
  );
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
        data: plan.assets.map((line) => ({ ...line, memberId })),
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
    const result = await prisma.assetLine.updateMany({ where, data: { balance: amount } });
    return result.count === 1;
  }
  const result = await prisma.liabilityLine.updateMany({ where, data: { balance: amount } });
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
}
