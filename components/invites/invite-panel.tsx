import { InviteManager, type InviteListItem } from "@/components/invites/invite-manager";
import { DEMO_INVITE } from "@/lib/demo-invite";
import { hashInviteToken, inviteUrl } from "@/lib/invite-token";
import { listActiveGuides, listMemberInvites } from "@/lib/invite-store";
import { requireActor } from "@/lib/permissions";
import { formatChicagoDateTime } from "@/lib/week";

async function portalOrigin(): Promise<string> {
  const configured = process.env.AUTH_URL?.trim();
  if (!configured) return "http://localhost:3000";
  try {
    const url = new URL(configured);
    if (url.protocol === "http:" || url.protocol === "https:") return url.origin;
  } catch {
    return "http://localhost:3000";
  }
  return "http://localhost:3000";
}

export async function InvitePanel({ audience }: { audience: "guide" | "admin" }) {
  const actor = await requireActor();
  if (!actor || actor.role !== audience) return null;
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

  return <InviteManager role={actor.role} invites={invites} guides={guides} />;
}
