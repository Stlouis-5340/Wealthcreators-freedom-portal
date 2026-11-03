"use server";

import { revalidatePath } from "next/cache";
import { accessFromMemberToggles, serializeGuideAccess } from "@/lib/access";
import { writeAudit } from "@/lib/audit";
import { requireMember } from "@/lib/permissions";
import { prisma } from "@/lib/db";

export interface GrantFormState {
  error: string;
  saved: boolean;
}

export async function updateGuideAccessAction(
  _previous: GrantFormState,
  formData: FormData,
): Promise<GrantFormState> {
  const member = await requireMember();
  if (!member) return { error: "Sign in as a member to choose what your Guide can see.", saved: false };
  const guideId = String(formData.get("guideId") ?? "");
  const assignment = await prisma.guideAssignment.findUnique({
    where: { guideId_memberId: { guideId, memberId: member.id } },
    include: { guide: { select: { name: true, role: true } } },
  });
  if (!assignment || assignment.guide.role !== "guide") {
    return { error: "That Wealth Guide is not assigned to you.", saved: false };
  }
  const access = accessFromMemberToggles({
    score: formData.get("score") === "on",
    totals: formData.get("totals") === "on",
    goals: formData.get("goals") === "on",
    checkIns: formData.get("checkIns") === "on",
  });
  const scopes = serializeGuideAccess(access);
  const current = await prisma.guideAccessGrant.findFirst({
    where: { guideId, memberId: member.id, revokedAt: null },
    orderBy: { grantedAt: "desc" },
  });
  if (current) {
    await prisma.guideAccessGrant.update({ where: { id: current.id }, data: { scopes } });
  } else {
    await prisma.guideAccessGrant.create({
      data: { guideId, memberId: member.id, scopes },
    });
  }
  await writeAudit({
    actorUserId: member.id,
    action: "member.update_grant",
    targetType: "grant",
    targetId: guideId,
    meta: { guideId, memberId: member.id, scopes: access },
  });
  revalidatePath("/guide");
  revalidatePath("/settings");
  return { error: "", saved: true };
}
