import { fullGuideAccess, parseGuideAccess, serializeGuideAccess, type GuideAccess } from "@/lib/access";
import { guideAssigned } from "@/lib/activity-store";
import { prisma } from "@/lib/db";

/** Active visibility for an assigned Guide. Missing grant rows use the coaching defaults. */
export async function activeGuideAccess(guideId: string, memberId: string): Promise<GuideAccess | null> {
  if (!(await guideAssigned(guideId, memberId))) return null;
  const grant = await prisma.guideAccessGrant.findFirst({
    where: { guideId, memberId, revokedAt: null },
    orderBy: { grantedAt: "desc" },
  });
  return grant ? parseGuideAccess(grant.scopes) : { ...fullGuideAccess };
}

export async function ensureDefaultGrant(guideId: string, memberId: string): Promise<void> {
  const existing = await prisma.guideAccessGrant.findFirst({
    where: { guideId, memberId, revokedAt: null },
    select: { id: true },
  });
  if (existing) return;
  await prisma.guideAccessGrant.create({
    data: {
      guideId,
      memberId,
      scopes: serializeGuideAccess(fullGuideAccess),
    },
  });
}
