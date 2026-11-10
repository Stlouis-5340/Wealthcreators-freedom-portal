"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { writeAudit } from "@/lib/audit";
import { deliverMemberInvite } from "@/lib/invite-mail";
import { acceptMemberInvite, createMemberInvite, revokeMemberInvite } from "@/lib/invite-store";
import { inviteMessages, inviteUrl, normalizeDisplayName } from "@/lib/invite-token";
import { requireActor } from "@/lib/permissions";
import { portalOrigin } from "@/lib/portal-origin";
import { STAFF_MFA_ENROLL_PATH, staffNeedsEnrollment } from "@/lib/staff-mfa";

export interface InviteFormState {
  error: string;
  inviteUrl: string;
  emailNote: string;
}

export interface AcceptInviteState {
  error: string;
  done: boolean;
}

const idleInvite: InviteFormState = { error: "", inviteUrl: "", emailNote: "" };

export async function inviteAction(
  _previous: InviteFormState,
  formData: FormData,
): Promise<InviteFormState> {
  const actor = await requireActor();
  if (!actor || (actor.role !== "guide" && actor.role !== "admin")) {
    return { error: inviteMessages.staffOnly, inviteUrl: "", emailNote: "" };
  }
  if (staffNeedsEnrollment(actor.role, actor.mfaEnabled)) redirect(STAFF_MFA_ENROLL_PATH);
  const intent = String(formData.get("intent") ?? "");
  if (intent === "revoke") return revokeFromForm(actor, formData);
  if (intent === "create") return createFromForm(actor, formData);
  return { error: inviteMessages.unknownAction, inviteUrl: "", emailNote: "" };
}

async function createFromForm(
  actor: { id: string; role: string; name: string },
  formData: FormData,
): Promise<InviteFormState> {
  const requestedGuide = String(formData.get("guideId") ?? "").trim();
  const guideId = actor.role === "guide" ? actor.id : requestedGuide || null;
  const created = await createMemberInvite({
    email: String(formData.get("email") ?? ""),
    name: String(formData.get("name") ?? ""),
    createdById: actor.id,
    guideId,
  });
  if (!created.ok) return { error: created.error, inviteUrl: "", emailNote: "" };
  const url = inviteUrl(await portalOrigin(), created.token);
  const delivery = await deliverMemberInvite({
    requested: formData.get("sendEmail") === "yes",
    to: created.email,
    recipientName: normalizeDisplayName(String(formData.get("name") ?? "")) ?? "",
    inviterName: actor.name,
    url,
    expiresAt: created.expiresAt,
  });
  await writeAudit({
    actorUserId: actor.id,
    action: "invite.create",
    targetType: "invite",
    targetId: created.id,
    meta: { email: created.email, guideId: guideId ?? "", emailed: delivery.emailed },
  });
  revalidatePath("/guide");
  revalidatePath("/admin");
  return { error: "", inviteUrl: url, emailNote: delivery.note };
}

async function revokeFromForm(
  actor: { id: string; role: string },
  formData: FormData,
): Promise<InviteFormState> {
  const revoked = await revokeMemberInvite(String(formData.get("inviteId") ?? ""), actor);
  if (!revoked.ok) return { error: revoked.error, inviteUrl: "", emailNote: "" };
  await writeAudit({
    actorUserId: actor.id,
    action: "invite.revoke",
    targetType: "invite",
    targetId: revoked.id,
    meta: { email: revoked.email },
  });
  revalidatePath("/guide");
  revalidatePath("/admin");
  return idleInvite;
}

export async function acceptInviteAction(
  _previous: AcceptInviteState,
  formData: FormData,
): Promise<AcceptInviteState> {
  const accepted = await acceptMemberInvite(String(formData.get("token") ?? ""), {
    name: String(formData.get("name") ?? ""),
    password: String(formData.get("password") ?? ""),
    confirm: String(formData.get("confirm") ?? ""),
  });
  if (!accepted.ok) return { error: accepted.error, done: false };
  await writeAudit({
    actorUserId: accepted.userId,
    action: "invite.accept",
    targetType: "invite",
    targetId: accepted.inviteId,
    meta: { email: accepted.email, guideId: accepted.guideId ?? "", assigned: accepted.assigned },
  });
  revalidatePath("/guide");
  revalidatePath("/admin");
  return { error: "", done: true };
}
