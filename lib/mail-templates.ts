import { formatChicagoDateTime } from "@/lib/week";

export interface PortalEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function message(input: {
  to: string;
  subject: string;
  preheader: string;
  greeting: string;
  lines: string[];
  url: string;
  linkLabel: string;
}): PortalEmail {
  const text = [input.greeting, "", ...input.lines, "", input.url, "", "Wealth Creators Freedom Portal"].join("\n");
  const paragraphs = [input.greeting, ...input.lines]
    .map(
      (line) =>
        `<p style="margin:0 0 16px;font-family:Georgia,'Iowan Old Style',Palatino,serif;font-size:16px;line-height:1.5;color:#0B3312;">${escapeHtml(line)}</p>`,
    )
    .join("");
  const href = escapeHtml(input.url);
  const html = `<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:0;background:#F4EFE4;">
  <div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(input.preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4EFE4;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFCF7;border:1px solid #E3D4B4;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="background:#0B3312;padding:18px 28px;">
              <p style="margin:0;font-family:Georgia,'Iowan Old Style',Palatino,serif;font-size:13px;letter-spacing:0.18em;color:#FFCD55;">WEALTH CREATORS</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <h1 style="margin:0 0 16px;font-family:Georgia,'Iowan Old Style',Palatino,serif;font-size:28px;line-height:1.2;font-weight:600;color:#0B3312;">${escapeHtml(input.subject)}</h1>
              ${paragraphs}
              <p style="margin:8px 0 20px;">
                <a href="${href}" style="display:inline-block;background:#FFCD55;color:#0B3312;text-decoration:none;font-family:Georgia,'Iowan Old Style',Palatino,serif;font-size:16px;font-weight:600;padding:12px 18px;border-radius:999px;">${escapeHtml(input.linkLabel)}</a>
              </p>
              <p style="margin:0 0 8px;font-family:ui-sans-serif,system-ui,sans-serif;font-size:13px;line-height:1.5;color:#3E5A44;">Or copy this link:</p>
              <p style="margin:0;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:13px;line-height:1.5;color:#0B3312;word-break:break-all;">${href}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 24px;">
              <p style="margin:0;font-family:ui-sans-serif,system-ui,sans-serif;font-size:12px;line-height:1.5;color:#3E5A44;">Wealth Creators Freedom Portal</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  return { to: input.to, subject: input.subject, html, text };
}

export function inviteEmail(input: {
  to: string;
  recipientName: string;
  inviterName: string;
  url: string;
  expiresAt: Date;
}): PortalEmail {
  const who = input.recipientName.trim();
  const inviter = input.inviterName.trim();
  const greeting = who ? `Hello ${who},` : "Hello,";
  const invited = inviter
    ? `${inviter} invited you to the Wealth Creators Freedom Portal.`
    : "You are invited to the Wealth Creators Freedom Portal.";
  const expires = formatChicagoDateTime(input.expiresAt.toISOString());
  return message({
    to: input.to,
    subject: "Your Freedom Portal invite",
    preheader: "A one-time link to create your member sign-in.",
    greeting,
    lines: [
      invited,
      `Use the link below to choose a password and open your member account. The link works once and expires on ${expires}.`,
      "If you were not expecting this invite, you can ignore this email.",
    ],
    url: input.url,
    linkLabel: "Create your sign-in",
  });
}

export function passwordResetEmail(input: {
  to: string;
  recipientName: string;
  url: string;
  expiresAt: Date;
}): PortalEmail {
  const who = input.recipientName.trim();
  const greeting = who ? `Hello ${who},` : "Hello,";
  const expires = formatChicagoDateTime(input.expiresAt.toISOString());
  return message({
    to: input.to,
    subject: "Reset your Freedom Portal password",
    preheader: "A one-time link to choose a new password.",
    greeting,
    lines: [
      `We received a request to reset the password for ${input.to}.`,
      `The link works once and expires in one hour, at ${expires}.`,
      "If you did not ask for this, you can ignore the email. Your password stays the same.",
    ],
    url: input.url,
    linkLabel: "Choose a new password",
  });
}
