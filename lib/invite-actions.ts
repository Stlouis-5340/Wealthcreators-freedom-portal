"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { writeAudit } from "@/lib/audit";
import { acceptMemberInvite, createMemberInvite, revokeMemberInvite } from "@/lib/invite-store";
import { inviteMessages, inviteUrl } from "@/lib/invite-token";
import { requireActor } from "@/lib/permissions";

export interface InviteFormState {
  error: string;
  inviteUrl: string;
}

export interface AcceptInviteState {
  error: string;
  done: boolean;
}

const idleInvite: InviteFormState = { error: "", inviteUrl: "" };

async function portalOrigin(): Promise<string> {
  const configured = process.env.AUTH_URL?.trim();
  if (configured) {
    try {
      const url = new URL(configured);
      if (url.protocol === "http:" || url.protocol === "https:") return url.origin;
    } catch {
      // Fall through to the request host.
    }
  }
  try {
    const headerList = await headers();
    const host = (headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "").split(",")[0]?.trim() ?? "";
    const proto = (headerList.get("x-forwarded-proto") ?? "https").split(",")[0]?.trim();
    if (/^[A-Za-z0-9.:-]+$/.test(host) && (proto === "http" || proto === "https")) {
      return `${proto}://${host}`;
    }
  } catch {
    // Seed and scripts have no request.
  }
  return "http://localhost:3000";
}

export async function inviteAction(
  _previous: InviteFormState,
  formData: FormData,
): Promise<InviteFormState> {
  const actor = await requireActor();
  if (!actor || (actor.role !== "guide" && actor.role !== "admin")) {
    return { error: inviteMessages.staffOnly, inviteUrl: "" };
  }
  const intent = String(formData.get("intent") ?? "");
  if (intent === "revoke") return revokeFromForm(actor, formData);
  if (intent === "create") return createFromForm(actor, formData);
  return { error: inviteMessages.unknownAction, inviteUrl: "" };
}

async function createFromForm(
  actor: { id: string; role: string },
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
  if (!created.ok) return { error: created.error, inviteUrl: "" };
  await writeAudit({
    actorUserId: actor.id,
    action: "invite.create",
    targetType: "invite",
    targetId: created.id,
    meta: { email: created.email, guideId: guideId ?? "" },
  });
  revalidatePath("/guide");
  revalidatePath("/admin");
  return { error: "", inviteUrl: inviteUrl(await portalOrigin(), created.token) };
}

async function revokeFromForm(
  actor: { id: string; role: string },
  formData: FormData,
): Promise<InviteFormState> {
  const revoked = await revokeMemberInvite(String(formData.get("inviteId") ?? ""), actor);
  if (!revoked.ok) return { error: revoked.error, inviteUrl: "" };
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
