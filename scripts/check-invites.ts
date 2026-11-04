import fs from "node:fs";
import { randomBytes } from "node:crypto";
import { signupAction, type AuthFormState } from "../lib/auth-actions";
import { DEMO_INVITE } from "../lib/demo-invite";
import { writeAudit } from "../lib/audit";
import { prisma } from "../lib/db";
import { isPublicInvitePath } from "../lib/invite-path";
import {
  acceptMemberInvite,
  createMemberInvite,
  revokeMemberInvite,
} from "../lib/invite-store";
import {
  canManageInvite,
  hashInviteToken,
  inviteMessages,
  inviteStatus,
  isInviteTokenShape,
  INVITE_TTL_MS,
  normalizeEmail,
  passwordError,
} from "../lib/invite-token";
import { blankMemberPlan } from "../lib/member-plan";
import { lookupLogin } from "../lib/accounts";
import { hashPassword } from "../lib/passwords";
import { alexExpenses } from "../lib/sample-data";
import { demoAccounts } from "../lib/demo-accounts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const token = "Freedom-Invite-Casey-2026";
const hashed = hashInviteToken(token);
assert(hashed.length === 64 && /^[0-9a-f]+$/.test(hashed), "invite token hash is sha256 hex");
assert(hashed !== token, "raw invite token is not the stored hash");
assert(hashInviteToken(token) === hashed, "invite token hash is stable");
assert(isInviteTokenShape(token), "demo invite token is an acceptable link shape");
assert(!isInviteTokenShape("short"), "short tokens are rejected");
assert(!isInviteTokenShape("has/slash-and-more-characters"), "tokens with a slash are rejected");
assert(isPublicInvitePath("/invite/abc"), "invite links are public paths");
assert(!isPublicInvitePath("/login"), "login is not treated as an invite path");
assert(INVITE_TTL_MS === 7 * 24 * 60 * 60 * 1000, "invites last 7 days");

const now = new Date("2026-11-04T18:00:00.000Z");
assert(
  inviteStatus({ acceptedAt: null, revokedAt: null, expiresAt: new Date(now.getTime() + 1000) }, now) === "pending",
  "an open invite is pending",
);
assert(
  inviteStatus({ acceptedAt: now, revokedAt: null, expiresAt: new Date(now.getTime() - 1000) }, now) === "accepted",
  "accepted wins over expiry",
);
assert(
  inviteStatus({ acceptedAt: null, revokedAt: now, expiresAt: new Date(now.getTime() - 1000) }, now) === "revoked",
  "revoked wins over expiry",
);
assert(
  inviteStatus({ acceptedAt: null, revokedAt: null, expiresAt: now }, now) === "expired",
  "a link at its expiry time is expired",
);

assert(normalizeEmail("  Casey@WealthCreators.Test ") === "casey@wealthcreators.test", "email is trimmed and lowercased");
assert(normalizeEmail("not-an-email") === null, "a bad email is rejected");
assert(passwordError("short", "short") === inviteMessages.shortPassword, "short passwords are rejected");
assert(passwordError("long-enough", "different") === inviteMessages.passwordMismatch, "mismatched passwords are rejected");
assert(passwordError("long-enough", "long-enough") === "", "a matching password is allowed");

assert(canManageInvite({ id: "admin", role: "admin" }, { createdById: "jordan", guideId: "jordan" }), "admin manages any invite");
assert(canManageInvite({ id: "jordan", role: "guide" }, { createdById: "morgan", guideId: "jordan" }), "guide manages an invite assigned to them");
assert(!canManageInvite({ id: "jordan", role: "guide" }, { createdById: "morgan", guideId: "other" }), "guide does not manage another guide's invite");
assert(!canManageInvite({ id: "alex", role: "member" }, { createdById: "alex", guideId: null }), "a member cannot manage invites");

const blank = blankMemberPlan("member-1");
assert(blank.expenses.length === alexExpenses.length, "a new member gets the spending categories");
assert(blank.expenses.every((line) => line.monthly === 0 && line.id.startsWith("member-1-")), "spending lines start at zero");
assert(blank.streams.length === 1 && blank.streams[0]?.monthly === 0, "passive income starts at zero");
assert(blank.assets.length === 0 && blank.liabilities.length === 0 && blank.goals.length === 0, "assets, liabilities, and goals start empty");
assert(!JSON.stringify(blank).includes("2400"), "the blank plan does not copy Alex's housing amount");

const proxy = fs.readFileSync(new URL("../proxy.ts", import.meta.url), "utf8");
assert(proxy.includes("isPublicInvitePath"), "proxy allows invite links");
const signupPage = fs.readFileSync(new URL("../app/signup/page.tsx", import.meta.url), "utf8");
assert(signupPage.includes('redirect("/login?notice=invite")'), "public signup redirects to sign-in");
assert(!signupPage.includes("password"), "public signup has no password field");

const databaseUrl = process.env.DATABASE_URL ?? "";
if (/^postgres(ql)?:/i.test(databaseUrl) && process.env.CHECK_INVITES_ALLOW_POSTGRES !== "1") {
  throw new Error("Refusing to run invite checks against Postgres. Use the local SQLite database.");
}

const suffix = randomBytes(4).toString("hex");
const guideId = `check-guide-${suffix}`;
const guideEmail = `check-guide-${suffix}@wealthcreators.test`;
const memberEmail = `check-member-${suffix}@wealthcreators.test`;
const otherEmail = `check-other-${suffix}@wealthcreators.test`;
const expiredEmail = `check-expired-${suffix}@wealthcreators.test`;
const password = "Freedom-Check-2026";

async function cleanup(): Promise<void> {
  const emails = [memberEmail, otherEmail, expiredEmail, guideEmail];
  await prisma.user.deleteMany({ where: { email: { in: [memberEmail, otherEmail, expiredEmail] } } });
  await prisma.memberInvite.deleteMany({ where: { email: { in: emails } } });
  await prisma.user.deleteMany({ where: { id: guideId } });
}

async function main(): Promise<void> {
  try {
  const before = await prisma.user.count();
  const idle: AuthFormState = { error: "", message: "", mfaEmail: "" };
  const signup = await signupAction(idle, new FormData());
  assert(signup.message.includes("does not create a login"), "public signup explains that it does not create a login");
  assert((await prisma.user.count()) === before, "public signup does not create a user");

  await prisma.user.create({
    data: {
      id: guideId,
      email: guideEmail,
      passwordHash: hashPassword("Freedom-Check-Guide-2026"),
      name: "Check Guide",
      role: "guide",
    },
  });

  const wrongGuide = await createMemberInvite({
    email: memberEmail,
    name: "Check Member",
    createdById: guideId,
    guideId: "not-this-guide",
  });
  assert(!wrongGuide.ok && wrongGuide.error === inviteMessages.guideOwn, "a guide cannot invite for another guide");

  const created = await createMemberInvite({
    email: memberEmail,
    name: "Check Member",
    createdById: guideId,
    guideId,
  });
  if (!created.ok) throw new Error(`guide can create an invite: ${created.error}`);
  assert(created.token !== hashInviteToken(created.token), "create returns the raw token, not the hash");
  const duplicate = await createMemberInvite({
    email: memberEmail,
    name: "",
    createdById: guideId,
    guideId,
  });
  assert(!duplicate.ok && duplicate.error === inviteMessages.pendingExists, "a second open invite for the same email is refused");

  const accepted = await acceptMemberInvite(created.token, {
    name: "Check Member",
    password,
    confirm: password,
  });
  if (!accepted.ok) throw new Error(`invitee can accept: ${accepted.error}`);
  assert(accepted.assigned && accepted.guideId === guideId, "accept assigns the inviting guide");
  assert(accepted.email === memberEmail, "accept keeps the invited email");

  const login = await lookupLogin(memberEmail, password);
  assert(login.status === "ok" && login.user.role === "member" && !login.user.mfaEnabled, "the new member can sign in without MFA");
  const lines = await prisma.expenseLine.findMany({ where: { memberId: accepted.userId } });
  const streams = await prisma.passiveStream.findMany({ where: { memberId: accepted.userId } });
  const assets = await prisma.assetLine.count({ where: { memberId: accepted.userId } });
  assert(lines.length === alexExpenses.length && lines.every((line) => line.monthly === 0), "accepted member has a zero spending plan");
  assert(streams.length === 1 && streams[0]?.monthly === 0, "accepted member has a zero passive line");
  assert(assets === 0, "accepted member has no assets");
  const grant = await prisma.guideAccessGrant.findFirst({
    where: { guideId, memberId: accepted.userId, revokedAt: null },
  });
  assert(grant?.scopes.includes('"score":true'), "assignment starts with the default guide access");

  await writeAudit({
    actorUserId: accepted.userId,
    action: "invite.accept",
    targetType: "invite",
    targetId: accepted.inviteId,
    meta: { email: accepted.email, token: created.token, assigned: true },
  });
  const audit = await prisma.auditLog.findFirst({
    where: { actorUserId: accepted.userId, action: "invite.accept" },
  });
  assert(audit && !audit.meta.includes(created.token), "audit does not store the raw invite token");

  const again = await acceptMemberInvite(created.token, {
    name: "Check Member",
    password,
    confirm: password,
  });
  assert(!again.ok && again.error === inviteMessages.used, "an accepted invite cannot be used again");

  const revoked = await createMemberInvite({
    email: otherEmail,
    name: "",
    createdById: guideId,
    guideId,
  });
  if (!revoked.ok) throw new Error(`a second invite can be created: ${revoked.error}`);
  const didRevoke = await revokeMemberInvite(revoked.id, { id: guideId, role: "guide" });
  assert(didRevoke.ok, "the guide can revoke their unused invite");
  const afterRevoke = await acceptMemberInvite(revoked.token, {
    name: "Other Person",
    password,
    confirm: password,
  });
  assert(!afterRevoke.ok && afterRevoke.error === inviteMessages.revoked, "a revoked invite does not create a user");

  const expired = await createMemberInvite({
    email: expiredEmail,
    name: "Expired",
    createdById: guideId,
    guideId,
    expiresAt: new Date(Date.now() - 1000),
  });
  if (!expired.ok) throw new Error(`an already expired row can exist for the check: ${expired.error}`);
  const expiredAccept = await acceptMemberInvite(expired.token, {
    name: "Expired",
    password,
    confirm: password,
  });
  assert(!expiredAccept.ok && expiredAccept.error === inviteMessages.expired, "an expired invite does not create a user");

  assert(
    !demoAccounts.some((account) => account.email === DEMO_INVITE.email),
    "the sample invite does not reuse a demo login",
  );
  console.log("invite checks passed");
  } finally {
    await cleanup();
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
