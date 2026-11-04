"use server";

import { resetCommunityForMembers } from "@/lib/community-store";
import { resetLegacyForMembers } from "@/lib/legacy-store";
import {
  loadPortalSnapshot,
  resetSeededPlans,
  setAssetCapitalRole,
  setMemberStep,
  setAssetValuation,
  updateMemberAmount,
} from "@/lib/plan-store";
import { nonNegative } from "@/lib/plans";
import { requireActor, requireMember } from "@/lib/permissions";
import { prisma } from "@/lib/db";

async function memberSession() {
  return requireMember();
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

export async function setCapitalRoleAction(
  lineId: string,
  capitalRole: "income" | "appreciation" | "lifestyle",
) {
  const user = await memberSession();
  if (!user) return;
  await setAssetCapitalRole({ memberId: user.id, lineId, capitalRole });
}

export async function setAssetValuationAction(
  lineId: string,
  valuation: "estimated" | "verified",
) {
  const user = await memberSession();
  if (!user) return;
  await setAssetValuation({ memberId: user.id, lineId, valuation });
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
  const user = await requireActor();
  if (!user) return null;
  if (user.role === "member") {
    await resetSeededPlans([user.id]);
    await resetCommunityForMembers([user.id]);
    await resetLegacyForMembers([user.id]);
  } else if (user.role === "guide") {
    const assignments = await prisma.guideAssignment.findMany({
      where: { guideId: user.id },
      select: { memberId: true },
    });
    const memberIds = assignments.map((assignment) => assignment.memberId);
    await resetSeededPlans(memberIds);
    await resetCommunityForMembers(memberIds);
    await resetLegacyForMembers(memberIds);
  }
  return loadPortalSnapshot({ id: user.id, role: user.role });
}
