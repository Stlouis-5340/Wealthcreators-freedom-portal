import { redirect } from "next/navigation";
import { InviteManager, type InviteListItem } from "@/components/invites/invite-manager";
import { DEMO_INVITE } from "@/lib/demo-invite";
import { hashInviteToken, inviteUrl } from "@/lib/invite-token";
import { listActiveGuides, listMemberInvites } from "@/lib/invite-store";
import { mailIsConfigured } from "@/lib/mail-config";
import { requireActor } from "@/lib/permissions";
import { portalOrigin } from "@/lib/portal-origin";
import { STAFF_MFA_ENROLL_PATH, staffNeedsEnrollment } from "@/lib/staff-mfa";
import { formatChicagoDateTime } from "@/lib/week";

export async function InvitePanel({ audience }: { audience: "guide" | "admin" }) {
  const actor = await requireActor();
  if (!actor || actor.role !== audience) return null;
  if (staffNeedsEnrollment(actor.role, actor.mfaEnabled)) redirect(STAFF_MFA_ENROLL_PATH);
  const [stored, guides, origin] = await Promise.all([
    listMemberInvites(actor),
    audience === "admin" ? listActiveGuides() : Promise.resolve([]),
    portalOrigin(),
  ]);
  const demoHash = hashInviteToken(DEMO_INVITE.token);
  const invites: InviteListItem[] = stored.map((invite) => ({
    id: invite.id,
    email: invite.email,
    name: invite.name,
    status: invite.status,
    expiresAt: formatChicagoDateTime(invite.expiresAt.toISOString()),
    guideName: invite.guideName,
    createdByName: invite.createdByName,
    copyUrl:
      invite.status === "pending" && invite.tokenHash === demoHash
        ? inviteUrl(origin, DEMO_INVITE.token)
        : "",
  }));

  return <InviteManager role={actor.role} invites={invites} guides={guides} emailConfigured={mailIsConfigured()} />;
}
