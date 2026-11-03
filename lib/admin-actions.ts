"use server";

import { revalidatePath } from "next/cache";
import { isPortalRole } from "@/auth";
import { writeAudit } from "@/lib/audit";
import { fullGuideAccess } from "@/lib/access";
import { ensureDefaultGrant } from "@/lib/grants";
import { requireAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import type { Role } from "@/lib/types";

export interface AdminFormState {
  error: string;
}

export async function adminPeopleAction(
  _previous: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const actor = await requireAdmin();
  if (!actor) return { error: "Sign in as an admin to change people." };
  const intent = String(formData.get("intent") ?? "");
  const userId = String(formData.get("userId") ?? "");
  if (intent === "role") return setRole(actor.id, userId, String(formData.get("role") ?? ""));
  if (intent === "active") return setActive(actor.id, userId, formData.get("active") === "true");
  if (intent === "assign") {
    return assignGuide(actor.id, String(formData.get("memberId") ?? ""), String(formData.get("guideId") ?? ""));
  }
  if (intent === "unassign") {
    return unassignGuide(actor.id, String(formData.get("memberId") ?? ""), String(formData.get("guideId") ?? ""));
  }
  return { error: "That admin action is not available." };
}

async function setRole(actorId: string, userId: string, role: string): Promise<AdminFormState> {
  if (!isPortalRole(role)) return { error: "Choose Member, Guide, or Admin." };
  if (userId === actorId) return { error: "You cannot change your own role." };
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target || !isPortalRole(target.role)) return { error: "That person is not on the portal." };
  if (target.role === role) return { error: "" };
  if (target.role === "admin" && role !== "admin") {
    const others = await prisma.user.count({
      where: { role: "admin", isActive: true, id: { not: target.id } },
    });
    if (others < 1) return { error: "Keep at least one active admin." };
  }
  const next = role as Role;
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: target.id }, data: { role: next } });
    if (next !== "guide") {
      await tx.guideAssignment.deleteMany({ where: { guideId: target.id } });
      await tx.guideAccessGrant.updateMany({
        where: { guideId: target.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    if (next !== "member") {
      await tx.guideAssignment.deleteMany({ where: { memberId: target.id } });
      await tx.guideAccessGrant.updateMany({
        where: { memberId: target.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
  });
  await writeAudit({
    actorUserId: actorId,
    action: "admin.change_role",
    targetType: "user",
    targetId: target.id,
    meta: { from: target.role, to: next, email: target.email },
  });
  revalidatePath("/admin");
  return { error: "" };
}

async function setActive(actorId: string, userId: string, active: boolean): Promise<AdminFormState> {
  if (userId === actorId) return { error: "You cannot pause your own admin account." };
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target || !isPortalRole(target.role)) return { error: "That person is not on the portal." };
  if (target.isActive === active) return { error: "" };
  if (target.role === "admin" && target.isActive && !active) {
    const others = await prisma.user.count({
      where: { role: "admin", isActive: true, id: { not: target.id } },
    });
    if (others < 1) return { error: "Keep at least one active admin." };
  }
  await prisma.user.update({ where: { id: target.id }, data: { isActive: active } });
  await writeAudit({
    actorUserId: actorId,
    action: active ? "admin.reactivate" : "admin.deactivate",
    targetType: "user",
    targetId: target.id,
    meta: { email: target.email, role: target.role },
  });
  revalidatePath("/admin");
  return { error: "" };
}

async function assignGuide(actorId: string, memberId: string, guideId: string): Promise<AdminFormState> {
  const [member, guide] = await Promise.all([
    prisma.user.findUnique({ where: { id: memberId } }),
    prisma.user.findUnique({ where: { id: guideId } }),
  ]);
  if (!member || member.role !== "member") return { error: "Choose a member." };
  if (!guide || guide.role !== "guide") return { error: "Choose a Wealth Guide." };
  const existing = await prisma.guideAssignment.findUnique({
    where: { guideId_memberId: { guideId, memberId } },
  });
  if (!existing) {
    const sort = await prisma.guideAssignment.count({ where: { guideId } });
    await prisma.guideAssignment.create({ data: { guideId, memberId, sort } });
  }
  await ensureDefaultGrant(guideId, memberId);
  await writeAudit({
    actorUserId: actorId,
    action: "admin.assign_guide",
    targetType: "assignment",
    targetId: memberId,
    meta: { guideId, memberId, scopes: fullGuideAccess },
  });
  revalidatePath("/admin");
  revalidatePath("/guide");
  return { error: "" };
}

async function unassignGuide(actorId: string, memberId: string, guideId: string): Promise<AdminFormState> {
  await prisma.guideAssignment.deleteMany({ where: { guideId, memberId } });
  await prisma.guideAccessGrant.updateMany({
    where: { guideId, memberId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  await writeAudit({
    actorUserId: actorId,
    action: "admin.unassign_guide",
    targetType: "assignment",
    targetId: memberId,
    meta: { guideId, memberId },
  });
  revalidatePath("/admin");
  revalidatePath("/guide");
  return { error: "" };
}
