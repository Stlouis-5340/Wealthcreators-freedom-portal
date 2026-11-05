import { Resend } from "resend";
import { readMailConfig } from "@/lib/mail-config";
import { normalizeEmail } from "@/lib/invite-token";
import type { PortalEmail } from "@/lib/mail-templates";

export type MailSendResult = { ok: true } | { ok: false; error: string };
export type MailSender = (email: PortalEmail) => Promise<MailSendResult>;

export async function sendPortalEmail(email: PortalEmail, sender?: MailSender): Promise<MailSendResult> {
  const config = readMailConfig();
  if (!config) return { ok: false, error: "Email is not configured." };
  if (!normalizeEmail(email.to)) return { ok: false, error: "That email address cannot be used." };
  if (sender) return sender(email);
  try {
    const resend = new Resend(config.apiKey);
    const result = await resend.emails.send({
      from: config.from,
      to: email.to,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });
    if (result.error) {
      console.error("portal email failed", result.error.name);
      return { ok: false, error: "The email could not be sent." };
    }
    return { ok: true };
  } catch (error) {
    console.error("portal email failed", error instanceof Error ? error.name : "error");
    return { ok: false, error: "The email could not be sent." };
  }
}
