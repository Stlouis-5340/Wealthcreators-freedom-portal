import { prisma } from "@/lib/db";
import { summaryKind, type MemberScenarioSummary } from "@/lib/scenarios";
import { demoScenarioRows } from "@/lib/sample-scenarios";

const MAX_SCENARIOS = 20;

export async function listMemberScenarios(memberId: string): Promise<MemberScenarioSummary[]> {
  const rows = await prisma.scenarioRun.findMany({
    where: { memberId },
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true, assumptions: true, sharedWithGuide: true, updatedAt: true },
  });
  return rows.map((row) => {
    const kind = summaryKind(row.assumptions);
    return {
      id: row.id,
      name: row.name,
      kind: kind.kind,
      presetId: kind.presetId,
      sharedWithGuide: row.sharedWithGuide,
      updatedAt: row.updatedAt.toISOString(),
    };
  });
}

export async function listSharedScenarios(memberId: string): Promise<
  { id: string; name: string; assumptions: string; outputs: string; updatedAt: string }[]
> {
  const rows = await prisma.scenarioRun.findMany({
    where: { memberId, sharedWithGuide: true },
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true, assumptions: true, outputs: true, updatedAt: true },
  });
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    assumptions: row.assumptions,
    outputs: row.outputs,
    updatedAt: row.updatedAt.toISOString(),
  }));
}

export async function countMemberScenarios(memberId: string): Promise<number> {
  return prisma.scenarioRun.count({ where: { memberId } });
}

export async function createMemberScenario(input: {
  memberId: string;
  name: string;
  assumptions: string;
  outputs: string;
  sharedWithGuide: boolean;
}): Promise<{ id: string } | { error: string }> {
  const count = await countMemberScenarios(input.memberId);
  if (count >= MAX_SCENARIOS) {
    return { error: "You already have 20 saved scenarios. Delete one to save another." };
  }
  const row = await prisma.scenarioRun.create({
    data: {
      memberId: input.memberId,
      name: input.name,
      assumptions: input.assumptions,
      outputs: input.outputs,
      sharedWithGuide: input.sharedWithGuide,
    },
    select: { id: true },
  });
  return { id: row.id };
}

export async function setScenarioShared(input: {
  memberId: string;
  scenarioId: string;
  sharedWithGuide: boolean;
}): Promise<boolean> {
  const result = await prisma.scenarioRun.updateMany({
    where: { id: input.scenarioId, memberId: input.memberId },
    data: { sharedWithGuide: input.sharedWithGuide },
  });
  return result.count === 1;
}

export async function deleteMemberScenario(memberId: string, scenarioId: string): Promise<boolean> {
  const result = await prisma.scenarioRun.deleteMany({
    where: { id: scenarioId, memberId },
  });
  return result.count === 1;
}

/** Puts the demo runs back. Private runs stay private. Other members have none. */
export async function resetMemberScenarios(memberIds: string[]): Promise<void> {
  if (memberIds.length === 0) return;
  await prisma.scenarioRun.deleteMany({ where: { memberId: { in: memberIds } } });
  const rows = demoScenarioRows().filter((row) => memberIds.includes(row.memberId));
  if (rows.length === 0) return;
  await prisma.scenarioRun.createMany({
    data: rows.map((row) => ({
      id: row.id,
      memberId: row.memberId,
      name: row.name,
      assumptions: row.assumptions,
      outputs: row.outputs,
      sharedWithGuide: row.sharedWithGuide,
    })),
  });
}
