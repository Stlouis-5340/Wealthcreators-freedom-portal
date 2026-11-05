import "./load-local-env";
import fs from "node:fs";
import { randomBytes } from "node:crypto";
import { writeAudit } from "../lib/audit";
import { prisma } from "../lib/db";
import { deliverMemberInvite, inviteEmailNotes, inviteSentNote } from "../lib/invite-mail";
import { hashInviteToken } from "../lib/invite-token";
import { mailIsConfigured, parseFromAddress } from "../lib/mail-config";
import { sendPortalEmail, type MailSender } from "../lib/mail";
import { inviteEmail, passwordResetEmail, type PortalEmail } from "../lib/mail-templates";
import {
  hashResetToken,
  RESET_MAX_PER_HOUR,
  RESET_TTL_MS,
  resetMessages,
  resetRequestMessage,
  resetUrl,
} from "../lib/password-reset";
import { requestPasswordReset, resetPasswordWithToken } from "../lib/password-reset-store";
import { lookupLogin } from "../lib/accounts";
import { hashPassword } from "../lib/passwords";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const origin = "http://localhost:3000";
const savedKey = process.env.RESEND_API_KEY;
const savedFrom = process.env.EMAIL_FROM;

function clearMailEnv(): void {
  delete process.env.RESEND_API_KEY;
  delete process.env.EMAIL_FROM;
}

function configureMailEnv(): void {
  process.env.RESEND_API_KEY = "re_check_not_a_real_key";
  process.env.EMAIL_FROM = "Wealth Creators <noreply@wealthdomination.com>";
}

function tokenFrom(email: PortalEmail, marker: string): string {
  const found = email.text.split(/\s+/).find((part) => part.startsWith(marker));
  assert(found, "email is missing the link");
  return decodeURIComponent(found.slice(marker.length));
}

clearMailEnv();
assert(parseFromAddress("") === null, "a blank from address is rejected");
assert(parseFromAddress("Wealth Creators <bad>") === null, "a broken from address is rejected");
assert(parseFromAddress("noreply@wealthdomination.com\nBcc: x") === null, "a from address with a newline is rejected");
assert(
  parseFromAddress("Wealth Creators <noreply@wealthdomination.com>") ===
    "Wealth Creators <noreply@wealthdomination.com>",
  "a named from address is accepted",
);
assert(!mailIsConfigured(), "mail is off when the key and from address are blank");

const unsafe = inviteEmail({
  to: "casey@wealthcreators.test",
  recipientName: "<script>",
  inviterName: "Jordan Lee",
  url: `${origin}/invite/example-token`,
  expiresAt: new Date("2026-11-12T18:00:00.000Z"),
});
assert(!unsafe.html.includes("<script>"), "invite html escapes a name");
assert(unsafe.html.includes("&lt;script&gt;"), "invite html keeps the escaped name");
assert(unsafe.text.includes(`${origin}/invite/example-token`), "invite text includes the link");
assert(unsafe.text.includes("Jordan Lee invited you"), "invite text names the guide");
assert(!unsafe.text.toLowerCase().includes("guaranteed"), "invite copy stays plain");
assert(!unsafe.html.toLowerCase().includes("guaranteed"), "invite html stays plain");

const resetCopy = passwordResetEmail({
  to: "alex@wealthcreators.test",
  recipientName: "Alex Rivera",
  url: `${origin}/reset-password/example-token`,
  expiresAt: new Date("2026-11-05T18:00:00.000Z"),
});
assert(resetCopy.text.includes(`${origin}/reset-password/example-token`), "reset text includes the link");
assert(resetCopy.text.includes("alex@wealthcreators.test"), "reset text names the account email");
assert(resetCopy.text.includes("Your password stays the same"), "reset text says an ignored link changes nothing");
assert(!resetCopy.text.includes("Freedom-Alex-2026"), "reset email does not include a password");

const calls: PortalEmail[] = [];
const capture: MailSender = async (email) => {
  calls.push(email);
  return { ok: true };
};
const refuse: MailSender = async () => {
  throw new Error("send should not run");
};

function mailCount(): number {
  return calls.length;
}

async function checkInviteDelivery(): Promise<void> {
  const unconfiguredDelivery = await deliverMemberInvite({
    requested: true,
    to: "casey@wealthcreators.test",
    recipientName: "Casey",
    inviterName: "Jordan Lee",
    url: `${origin}/invite/token`,
    expiresAt: new Date("2026-11-12T18:00:00.000Z"),
    send: refuse,
  });
  assert(unconfiguredDelivery.emailed === "unconfigured", "invite email is skipped when mail is off");
  assert(unconfiguredDelivery.note === inviteEmailNotes.unconfigured, "staff see that email is not configured");
  assert(mailCount() === 0, "a disabled mailer is not called");

  const offSend = await sendPortalEmail(
    {
      to: "casey@wealthcreators.test",
      subject: "test",
      html: "<p>test</p>",
      text: "test",
    },
    capture,
  );
  assert(!offSend.ok, "sendPortalEmail refuses when mail is off");
  assert(mailCount() === 0, "the capture sender is not used when mail is off");

  configureMailEnv();
  assert(mailIsConfigured(), "mail is on when the key and from address are set");
  const skipped = await deliverMemberInvite({
    requested: false,
    to: "casey@wealthcreators.test",
    recipientName: "Casey",
    inviterName: "Jordan Lee",
    url: `${origin}/invite/token`,
    expiresAt: new Date("2026-11-12T18:00:00.000Z"),
    send: refuse,
  });
  assert(skipped.emailed === "no" && skipped.note === inviteEmailNotes.skipped, "an unchecked invite does not send");

  const sentInvite = await deliverMemberInvite({
    requested: true,
    to: "casey@wealthcreators.test",
    recipientName: "Casey Nguyen",
    inviterName: "Jordan Lee",
    url: `${origin}/invite/raw-token`,
    expiresAt: new Date("2026-11-12T18:00:00.000Z"),
    send: capture,
  });
  assert(sentInvite.emailed === "yes", "a requested invite is emailed");
  assert(sentInvite.note === inviteSentNote("casey@wealthcreators.test"), "staff see the address that was emailed");
  assert(mailCount() === 1 && calls[0]?.text.includes(`${origin}/invite/raw-token`), "the invite email carries the link");

  calls.length = 0;
  const failedInvite = await deliverMemberInvite({
    requested: true,
    to: "casey@wealthcreators.test",
    recipientName: "Casey",
    inviterName: "Jordan Lee",
    url: `${origin}/invite/raw-token`,
    expiresAt: new Date("2026-11-12T18:00:00.000Z"),
    send: async () => ({ ok: false, error: "nope" }),
  });
  assert(failedInvite.emailed === "failed" && failedInvite.note === inviteEmailNotes.failed, "a failed send keeps the invite copy path");
  calls.length = 0;
}

assert(RESET_TTL_MS === 60 * 60 * 1000, "reset links last one hour");
assert(hashResetToken("example-token").length === 64, "reset token hash is sha256 hex");
assert(hashResetToken("example-token") === hashInviteToken("example-token"), "reset tokens use the invite hash");
assert(resetUrl(origin, "example-token") === `${origin}/reset-password/example-token`, "reset links use the public path");

const proxy = fs.readFileSync(new URL("../proxy.ts", import.meta.url), "utf8");
assert(proxy.includes("isPublicResetPath"), "proxy allows password reset links");
const loginForm = fs.readFileSync(new URL("../components/auth/login-form.tsx", import.meta.url), "utf8");
assert(loginForm.includes('href="/forgot-password"'), "sign-in links to forgot password");
const inviteActions = fs.readFileSync(new URL("../lib/invite-actions.ts", import.meta.url), "utf8");
assert(inviteActions.includes('formData.get("sendEmail")'), "invite create reads the email checkbox");
const authSource = fs.readFileSync(new URL("../auth.ts", import.meta.url), "utf8");
assert(authSource.includes("passwordVersion"), "sessions check the password version");
const sqliteSchema = fs.readFileSync(new URL("../prisma/schema.prisma", import.meta.url), "utf8");
const postgresSchema = fs.readFileSync(new URL("../prisma/postgres/schema.prisma", import.meta.url), "utf8");
assert(sqliteSchema.includes("model PasswordReset") && postgresSchema.includes("model PasswordReset"), "both schemas have password reset");
assert(
  sqliteSchema.includes("passwordVersion") && postgresSchema.includes("passwordVersion"),
  "both schemas bump the password version",
);

const databaseUrl = process.env.DATABASE_URL ?? "";
if (/^postgres(ql)?:/i.test(databaseUrl) && process.env.CHECK_MAIL_ALLOW_POSTGRES !== "1") {
  throw new Error("Refusing to run mail checks against Postgres. Use the local SQLite database.");
}

const suffix = randomBytes(4).toString("hex");
const activeEmail = `check-reset-${suffix}@wealthcreators.test`;
const inactiveEmail = `check-inactive-${suffix}@wealthcreators.test`;
const unknownEmail = `check-missing-${suffix}@wealthcreators.test`;
const activeId = `check-reset-${suffix}`;
const inactiveId = `check-inactive-${suffix}`;
const originalPassword = "Freedom-Check-2026";
const nextPassword = "Freedom-Reset-2026";

async function cleanup(): Promise<void> {
  await prisma.auditLog.deleteMany({ where: { actorUserId: { in: [activeId, inactiveId] } } });
  await prisma.user.deleteMany({ where: { id: { in: [activeId, inactiveId] } } });
}

async function main(): Promise<void> {
  try {
    await checkInviteDelivery();
    await prisma.user.create({
      data: {
        id: activeId,
        email: activeEmail,
        passwordHash: hashPassword(originalPassword),
        name: "Check Reset",
        role: "member",
      },
    });
    await prisma.user.create({
      data: {
        id: inactiveId,
        email: inactiveEmail,
        passwordHash: hashPassword(originalPassword),
        name: "Paused Reset",
        role: "member",
        isActive: false,
      },
    });

    clearMailEnv();
    const offKnown = await requestPasswordReset({ email: activeEmail, origin, send: refuse });
    const offUnknown = await requestPasswordReset({ email: unknownEmail, origin, send: refuse });
    assert(offKnown.status === "unconfigured" && offUnknown.status === "unconfigured", "reset stays off when mail is off");
    assert(
      resetRequestMessage(offKnown).message === resetRequestMessage(offUnknown).message,
      "the unconfigured reset message does not depend on the account",
    );
    assert(
      (await prisma.passwordReset.count({ where: { userId: activeId } })) === 0,
      "a disabled mailer does not store a reset token",
    );

    configureMailEnv();
    const invalid = await requestPasswordReset({ email: "not-an-email", origin, send: refuse });
    assert(invalid.status === "invalid-email", "a bad reset email is rejected");
    assert(resetRequestMessage(invalid).error === resetMessages.badEmail, "a bad reset email gets a form error");

    const missing = await requestPasswordReset({ email: unknownEmail, origin, send: capture });
    const inactive = await requestPasswordReset({ email: inactiveEmail, origin, send: capture });
    assert(missing.status === "accepted" && missing.sent === false, "an unknown address is accepted without a send");
    assert(inactive.status === "accepted" && inactive.sent === false, "a paused account is accepted without a send");
    assert(mailCount() === 0, "unknown and paused addresses are not emailed");
    assert(
      resetRequestMessage(missing).message === resetRequestMessage({ status: "accepted", sent: true, userId: "x", email: "x@y.co" }).message,
      "a real send and a missing account share one confirmation",
    );
    assert(!resetMessages.sent.toLowerCase().includes("no account"), "the confirmation does not say the account is missing");
    assert(
      (await prisma.passwordReset.count({ where: { userId: { in: [activeId, inactiveId] } } })) === 0,
      "unknown and paused requests store no token",
    );

    const failed = await requestPasswordReset({
      email: activeEmail,
      origin,
      send: async () => ({ ok: false, error: "nope" }),
    });
    assert(failed.status === "accepted" && failed.sent === false, "a failed reset send still returns the generic result");
    assert((await prisma.passwordReset.count({ where: { userId: activeId } })) === 0, "a failed send does not leave a token");

    const now = new Date("2026-11-05T15:00:00.000Z");
    const issued: string[] = [];
    for (let index = 0; index < RESET_MAX_PER_HOUR; index += 1) {
      calls.length = 0;
      const result = await requestPasswordReset({ email: activeEmail, origin, now, send: capture });
      assert(result.status === "accepted" && result.sent === true, "an active account can be emailed a reset");
      assert(mailCount() === 1, "each open reset sends one email");
      issued.push(tokenFrom(calls[0] as PortalEmail, `${origin}/reset-password/`));
    }
    calls.length = 0;
    const limited = await requestPasswordReset({ email: activeEmail, origin, now, send: capture });
    assert(limited.status === "accepted" && limited.sent === false, "the hourly reset limit stays generic");
    assert(mailCount() === 0, "the hourly limit does not send another email");
    assert(
      (await prisma.passwordReset.count({ where: { userId: activeId } })) === RESET_MAX_PER_HOUR,
      "the hourly limit does not store another token",
    );

    const stored = await prisma.passwordReset.findMany({ where: { userId: activeId } });
    const latest = issued[issued.length - 1] ?? "";
    assert(stored.every((row) => row.tokenHash !== latest), "the raw reset token is not stored");
    assert(
      stored.some((row) => row.tokenHash === hashResetToken(latest)),
      "the stored reset value is the sha256 hash",
    );
    const retired = await resetPasswordWithToken(issued[0] ?? "", {
      password: nextPassword,
      confirm: nextPassword,
      now,
    });
    assert(!retired.ok, "an older reset link stops working when a newer one is issued");

    const mismatch = await resetPasswordWithToken(latest, {
      password: nextPassword,
      confirm: "different-password",
      now,
    });
    assert(!mismatch.ok, "mismatched passwords do not reset");
    assert((await lookupLogin(activeEmail, originalPassword)).status === "ok", "a rejected reset keeps the old password");

    const changed = await resetPasswordWithToken(latest, {
      password: nextPassword,
      confirm: nextPassword,
      now,
    });
    if (!changed.ok) throw new Error(`reset should succeed: ${changed.error}`);
    assert(!changed.mfaEnabled, "reset leaves the authenticator off");
    const again = await resetPasswordWithToken(latest, {
      password: "Freedom-Again-2026",
      confirm: "Freedom-Again-2026",
      now,
    });
    assert(!again.ok && again.error === resetMessages.invalid, "a used reset link does not work again");
    assert((await lookupLogin(activeEmail, originalPassword)).status === "invalid", "the old password stops working");
    assert((await lookupLogin(activeEmail, nextPassword)).status === "ok", "the new password signs in");
    const version = await prisma.user.findUnique({ where: { id: activeId }, select: { passwordVersion: true } });
    assert(version?.passwordVersion === 1, "a reset bumps the password version");

    await writeAudit({
      actorUserId: activeId,
      action: "password.reset",
      targetType: "user",
      targetId: activeId,
      meta: { email: activeEmail, token: latest },
    });
    const audit = await prisma.auditLog.findFirst({ where: { actorUserId: activeId, action: "password.reset" } });
    assert(audit && !audit.meta.includes(latest), "audit does not store the raw reset token");

    const later = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    calls.length = 0;
    const expiring = await requestPasswordReset({ email: activeEmail, origin, now: later, send: capture });
    assert(expiring.status === "accepted" && expiring.sent === true, "a later hour can send another reset");
    const expiringToken = tokenFrom(calls[0] as PortalEmail, `${origin}/reset-password/`);
    const expired = await resetPasswordWithToken(expiringToken, {
      password: "Freedom-Expired-2026",
      confirm: "Freedom-Expired-2026",
      now: new Date(later.getTime() + RESET_TTL_MS + 1000),
    });
    assert(!expired.ok, "an expired reset link does not change the password");
    assert((await lookupLogin(activeEmail, nextPassword)).status === "ok", "an expired link leaves the current password");
    const still = await prisma.user.findUnique({ where: { id: activeId }, select: { passwordVersion: true } });
    assert(still?.passwordVersion === 1, "an expired link does not bump the password version");

    console.log("mail checks passed");
  } finally {
    await cleanup();
    if (savedKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = savedKey;
    if (savedFrom === undefined) delete process.env.EMAIL_FROM;
    else process.env.EMAIL_FROM = savedFrom;
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
