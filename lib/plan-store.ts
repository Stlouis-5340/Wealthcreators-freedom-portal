import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { memberRow } from "@/lib/roster";
import { memberSeeds, type SeedPlan } from "@/lib/sample-plans";
import {
  planSignature,
  toClient,
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

function snapshotFor(
  viewer: PortalViewer,
  plan: StoredMemberPlan | null,
  rosterPlans: StoredMemberPlan[],
): PortalSnapshot {
  return toClient({
    viewer,
    plan,
    roster: rosterPlans.map(memberRow),
    signature: planSignature(rosterPlans),
  });
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
  );
}

export async function replaceMemberPlan(memberId: string, plan: SeedPlan): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.goalStep.deleteMany({ where: { goal: { memberId } } });
    await tx.checkpoint.deleteMany({ where: { goal: { memberId } } });
    await tx.goal.deleteMany({ where: { memberId } });
    await tx.expenseLine.deleteMany({ where: { memberId } });
    await tx.passiveStream.deleteMany({ where: { memberId } });
    await tx.assetLine.deleteMany({ where: { memberId } });
    await tx.liabilityLine.deleteMany({ where: { memberId } });

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
