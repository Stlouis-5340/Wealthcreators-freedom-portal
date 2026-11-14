import { mailIsConfigured } from "@/lib/mail-config";
import { sendPortalEmail, type MailSender } from "@/lib/mail";
import { inviteEmail } from "@/lib/mail-templates";

export const inviteEmailNotes = {
  skipped: "Email was left off. Copy the link and send it yourself.",
  unconfigured: "Email is not configured. Copy the link and send it yourself.",
  failed: "The invite was created, but the email could not be sent. Copy the link and send it yourself.",
} as const;

export function inviteSentNote(email: string): string {
  return `Emailed the invite to ${email}. The link is below if you also want to copy it.`;
}

export type InviteEmailStatus = "yes" | "no" | "failed" | "unconfigured";

export async function deliverMemberInvite(input: {
  requested: boolean;
  to: string;
  recipientName: string;
  inviterName: string;
  url: string;
  expiresAt: Date;
  role?: "member" | "guide" | "admin";
  send?: MailSender;
}): Promise<{ emailed: InviteEmailStatus; note: string }> {
  if (!mailIsConfigured()) {
    return { emailed: "unconfigured", note: inviteEmailNotes.unconfigured };
  }
  if (!input.requested) {
    return { emailed: "no", note: inviteEmailNotes.skipped };
  }
  const message = inviteEmail({
    to: input.to,
    recipientName: input.recipientName,
    inviterName: input.inviterName,
    url: input.url,
    expiresAt: input.expiresAt,
    role: input.role,
  });
  const sent = await sendPortalEmail(message, input.send);
  if (!sent.ok) return { emailed: "failed", note: inviteEmailNotes.failed };
  return { emailed: "yes", note: inviteSentNote(input.to) };
}
