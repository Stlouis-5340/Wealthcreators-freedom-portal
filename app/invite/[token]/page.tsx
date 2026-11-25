import type { Metadata } from "next";
import { AuthFrame } from "@/components/auth/auth-frame";
import { AcceptInviteForm } from "@/components/auth/accept-invite-form";
import { auth, isPortalRole } from "@/auth";
import { previewMemberInvite } from "@/lib/invite-store";
import { inviteMessages } from "@/lib/invite-token";

export const metadata: Metadata = {
  title: "Create your sign-in",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export const instant = false;

export default async function InviteAcceptPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invite = await previewMemberInvite(token);
  // Read-only: opening or prefetching this page never consumes the invite.
  // Only the Create sign-in form POST (acceptInviteAction) marks it accepted.
  if (!invite.ok) {
    const alreadyUsed = invite.error === inviteMessages.used;
    return (
      <AuthFrame
        title={alreadyUsed ? "Your sign-in is already set up" : "Invite unavailable"}
        lede={invite.error}
        alternateHref="/login"
        alternateLabel="Sign in"
      >
        {alreadyUsed ? null : (
          <p className="text-sm leading-6 text-muted">
            Freedom Portal accounts are issued by invite. Ask your Wealth Guide or an admin for a new link.
          </p>
        )}
      </AuthFrame>
    );
  }

  const session = await auth();
  const signedIn = isPortalRole(session?.user?.role);

  return (
    <AuthFrame
      title="Create your sign-in"
      lede="Set a password for this email. The link works once. After that, sign in at the portal."
      alternateHref="/login"
      alternateLabel="Already have a login? Sign in"
    >
      <AcceptInviteForm token={token} email={invite.email} name={invite.name} signedIn={signedIn} />
    </AuthFrame>
  );
}
