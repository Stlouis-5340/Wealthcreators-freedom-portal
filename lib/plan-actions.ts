"use server";

import { auth, isPortalRole } from "@/auth";
import {
  loadPortalSnapshot,
  resetSeededPlans,
  setMemberStep,
  updateMemberAmount,
} from "@/lib/plan-store";
import { nonNegative } from "@/lib/plans";
import { prisma } from "@/lib/db";

async function memberSession() {
  const session = await auth();
  const user = session?.user;
  if (!user || !isPortalRole(user.role) || user.role !== "member" || !user.id) return null;
  return user;
}

export async function updateExpenseAction(lineId: string, monthly: number) {
  const user = await memberSession();
  if (!user) return;
  await updateMemberAmount({
    memberId: user.id,
    kind: "expense",
    lineId,
    amount: nonNegative(monthly),
  });
}

export async function updateStreamAction(lineId: string, monthly: number) {
  const user = await memberSession();
  if (!user) return;
  await updateMemberAmount({
    memberId: user.id,
    kind: "stream",
    lineId,
    amount: nonNegative(monthly),
  });
}

export async function updateAssetAction(lineId: string, balance: number) {
  const user = await memberSession();
  if (!user) return;
  await updateMemberAmount({
    memberId: user.id,
    kind: "asset",
    lineId,
    amount: nonNegative(balance),
  });
}

export async function updateLiabilityAction(lineId: string, balance: number) {
  const user = await memberSession();
  if (!user) return;
  await updateMemberAmount({
    memberId: user.id,
    kind: "liability",
    lineId,
    amount: nonNegative(balance),
  });
}

export async function toggleStepAction(stepId: string, done: boolean) {
  const user = await memberSession();
  if (!user) return;
  await setMemberStep({ memberId: user.id, stepId, done });
}

export async function resetPlanAction() {
  const session = await auth();
  const user = session?.user;
  if (!user || !isPortalRole(user.role) || !user.id) return null;
  if (user.role === "member") {
    await resetSeededPlans([user.id]);
  } else {
    const assignments = await prisma.guideAssignment.findMany({
      where: { guideId: user.id },
      select: { memberId: true },
    });
    await resetSeededPlans(assignments.map((assignment) => assignment.memberId));
  }
  return loadPortalSnapshot({ id: user.id, role: user.role });
}
