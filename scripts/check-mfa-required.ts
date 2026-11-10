import "./load-local-env";
import fs from "node:fs";
import { randomBytes } from "node:crypto";
import { prisma } from "../lib/db";
import { hashPassword } from "../lib/passwords";
import { beginMfaSetup, completeMfaEnrollment } from "../lib/mfa";
import { loadPortalSnapshot } from "../lib/plan-store";
import { authorizePortalUser } from "../lib/sign-in-access";
import { staffApiBlock, staffMfaGate, staffMfaRejection } from "../lib/staff-mfa";
import { currentTotpCode } from "../lib/totp";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const rejection = staffMfaRejection();
assert(rejection.enrollPath === "/security", "the API rejection points at enrollment");
assert(rejection.error.includes("/security"), "the API rejection names the enrollment page");

function gate(role: "guide" | "admin" | "member" | undefined, mfaEnabled: boolean, pathname: string) {
  return staffMfaGate({ role, mfaEnabled, pathname });
}

const blockedPages = [
  "/guide",
  "/guide/alex",
  "/admin",
  "/admin/analytics",
  "/admin/audit",
  "/reports/alex/2026-10",
  "/",
  "/settings",
  "/login",
  "/forgot-password",
];
for (const role of ["guide", "admin"] as const) {
  for (const pathname of blockedPages) {
    const decision = gate(role, false, pathname);
    assert(decision.kind === "redirect" && decision.pathname === "/security", `${role} without MFA is sent to enrollment from ${pathname}`);
  }
  const api = gate(role, false, "/api/coach/chat");
  assert(
    api.kind === "reject" && api.status === 403 && api.body.enrollPath === "/security",
    `${role} without MFA is rejected from the coach API`,
  );
  assert(gate(role, false, "/security").kind === "allow", `${role} without MFA can open enrollment`);
  assert(gate(role, false, "/api/auth/session").kind === "allow", `${role} without MFA can still read the Auth.js session`);
  assert(gate(role, false, "/api/auth/signout").kind === "allow", `${role} without MFA can sign out`);
  assert(gate(role, true, "/guide").kind === "allow", `enrolled ${role} is not kept on the enrollment page`);
  assert(gate(role, true, "/api/coach/chat").kind === "allow", `enrolled ${role} is not rejected by the MFA API gate`);
}

for (const pathname of ["/", "/settings", "/coach", "/api/coach/chat", "/security", "/guide"]) {
  assert(gate("member", false, pathname).kind === "allow", `a member without MFA is not forced through ${pathname}`);
  assert(gate("member", true, pathname).kind === "allow", `a member with MFA is not forced onto enrollment at ${pathname}`);
}

const guideBlock = staffApiBlock({ role: "guide", mfaEnabled: false });
assert(guideBlock?.status === 403 && guideBlock.body.enrollPath === "/security", "the coach route helper blocks an unenrolled guide");
assert(staffApiBlock({ role: "admin", mfaEnabled: false })?.status === 403, "the coach route helper blocks an unenrolled admin");
assert(staffApiBlock({ role: "guide", mfaEnabled: true }) === null, "an enrolled guide is not blocked by the API helper");
assert(staffApiBlock({ role: "member", mfaEnabled: false }) === null, "a member is not blocked by the API helper");
assert(staffApiBlock(null) === null, "an anonymous caller is not given the staff MFA rejection");

const proxy = fs.readFileSync(new URL("../proxy.ts", import.meta.url), "utf8");
assert(proxy.includes("staffMfaGate"), "proxy uses the staff MFA gate");
assert(proxy.includes("NextResponse.redirect(destination, 303)"), "blocked page posts are redirected without replaying them");
const coachRoute = fs.readFileSync(new URL("../app/api/coach/chat/route.ts", import.meta.url), "utf8");
assert(coachRoute.includes("staffApiBlock"), "the coach API checks the staff MFA block");
const authSource = fs.readFileSync(new URL("../auth.ts", import.meta.url), "utf8");
assert(authSource.includes("authorizePortalUser"), "sign-in grants a session only through the MFA check");
const loginSource = fs.readFileSync(new URL("../lib/auth-actions.ts", import.meta.url), "utf8");
assert(loginSource.includes("recordMfaChallenge"), "a rejected code on the sign-in form is audited");
const shell = fs.readFileSync(new URL("../components/app-shell.tsx", import.meta.url), "utf8");
assert(shell.includes("Authenticator app is required."), "the banner says MFA is required");
assert(!shell.includes("asked to turn on"), "the banner no longer asks staff to enroll");
const securityPage = fs.readFileSync(new URL("../app/(portal)/security/page.tsx", import.meta.url), "utf8");
assert(securityPage.includes("is required for Guide and Admin"), "the security page says MFA is required");
assert(!securityPage.includes("demo password still"), "the security page no longer says the demo password is enough");
const panel = fs.readFileSync(new URL("../components/security/mfa-panel.tsx", import.meta.url), "utf8");
assert(panel.includes("must enroll"), "the setup panel says guides and admins must enroll");
assert(!panel.includes("asked to enroll"), "the setup panel no longer says enrollment is optional for staff");
const qr = fs.readFileSync(new URL("../lib/mfa.ts", import.meta.url), "utf8");
assert(!qr.includes("#0A0A0A") && !qr.includes("#000000"), "the authenticator QR does not use black");

const databaseUrl = process.env.DATABASE_URL ?? "";
if (!databaseUrl) throw new Error("DATABASE_URL is required. Use the local SQLite database.");
if (/^postgres(ql)?:/i.test(databaseUrl) && process.env.CHECK_MFA_ALLOW_POSTGRES !== "1") {
  throw new Error("Refusing to run MFA checks against Postgres. Use the local SQLite database.");
}
if (!process.env.AUTH_SECRET) {
  throw new Error("AUTH_SECRET must already be set. This check does not rotate it.");
}

const suffix = randomBytes(4).toString("hex");
const guideId = `mfa-guide-${suffix}`;
const adminId = `mfa-admin-${suffix}`;
const memberId = `mfa-member-${suffix}`;
const enrolledMemberId = `mfa-opt-in-${suffix}`;
const guideEmail = `mfa-guide-${suffix}@wealthcreators.test`;
const adminEmail = `mfa-admin-${suffix}@wealthcreators.test`;
const memberEmail = `mfa-member-${suffix}@wealthcreators.test`;
const enrolledMemberEmail = `mfa-opt-in-${suffix}@wealthcreators.test`;
const password = "Freedom-Check-Mfa-2026";
const sentinel = 918273.64;
const institution = `Gate Credit Union ${suffix}`;

async function cleanup(): Promise<void> {
  const ids = [guideId, adminId, memberId, enrolledMemberId];
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
}

async function challengeRows(userId: string) {
  return prisma.auditLog.findMany({
    where: {
      actorUserId: userId,
      action: { in: ["mfa.challenge_success", "mfa.challenge_failure", "mfa.enroll"] },
    },
    orderBy: { createdAt: "asc" },
  });
}

async function main(): Promise<void> {
  await cleanup();
  await prisma.user.create({
    data: {
      id: guideId,
      email: guideEmail,
      passwordHash: hashPassword(password),
      name: "MFA Check Guide",
      role: "guide",
    },
  });
  await prisma.user.create({
    data: {
      id: adminId,
      email: adminEmail,
      passwordHash: hashPassword(password),
      name: "MFA Check Admin",
      role: "admin",
    },
  });
  await prisma.user.create({
    data: {
      id: memberId,
      email: memberEmail,
      passwordHash: hashPassword(password),
      name: "MFA Check Member",
      role: "member",
    },
  });
  await prisma.assetLine.create({
    data: {
      id: `asset-${suffix}`,
      memberId,
      name: "Checking",
      institution,
      group: "Cash",
      balance: sentinel,
      sort: 0,
    },
  });
  await prisma.guideAssignment.create({
    data: { guideId, memberId, sort: 0 },
  });

  const wrongPassword = await authorizePortalUser(guideEmail, "not-the-password", "");
  assert(wrongPassword === null, "a bad password does not sign a guide in");
  assert((await challengeRows(guideId)).length === 0, "a bad password is not an MFA challenge");

  const guideSession = await authorizePortalUser(guideEmail, password, "");
  assert(guideSession?.role === "guide", "a guide without MFA can sign in with a password");
  assert((await challengeRows(guideId)).length === 0, "password sign-in before enrollment is not a challenge");

  const hidden = await loadPortalSnapshot({ id: guideId, role: "guide" });
  const hiddenPayload = JSON.stringify(hidden);
  assert(hidden?.viewer.mfaEnabled === false && hidden.roster.length === 0, "an unenrolled guide snapshot has no roster");
  assert(!hiddenPayload.includes(String(sentinel)), "an unenrolled guide snapshot omits the member balance");
  assert(!hiddenPayload.includes("MFA Check Member"), "an unenrolled guide snapshot omits the member name");
  assert(!hiddenPayload.includes(institution), "an unenrolled guide snapshot omits the institution");

  const adminSession = await authorizePortalUser(adminEmail, password, "");
  assert(adminSession?.role === "admin", "an admin without MFA can sign in with a password");
  const adminSnapshot = await loadPortalSnapshot({ id: adminId, role: "admin" });
  assert(
    adminSnapshot?.roster.length === 0 && !JSON.stringify(adminSnapshot).includes(String(sentinel)),
    "an unenrolled admin snapshot has no member balances",
  );

  const memberSession = await authorizePortalUser(memberEmail, password, "");
  assert(memberSession?.role === "member", "a member still signs in with a password only");
  assert((await challengeRows(memberId)).length === 0, "a member password sign-in does not write an MFA challenge");

  const setup = await beginMfaSetup(guideId, guideEmail);
  const secret = setup.manualKey.replace(/\s+/g, "");
  const enrollCode = currentTotpCode(secret);
  const enrolled = await completeMfaEnrollment(guideId, "guide", enrollCode);
  assert(enrolled.ok, "the guide can enroll with the current authenticator code");
  const enrollAudit = await prisma.auditLog.findFirst({
    where: { actorUserId: guideId, action: "mfa.enroll" },
  });
  assert(enrollAudit?.meta.includes('"role":"guide"'), "enrollment is written to the audit log");
  assert(!enrollAudit?.meta.includes(secret), "the enrollment audit does not store the secret");

  const missingCode = await authorizePortalUser(guideEmail, password, "");
  assert(missingCode === null, "an enrolled guide gets no session without a code");
  const signInCode = currentTotpCode(secret);
  const wrongCode = signInCode === "000000" ? "111111" : "000000";
  const rejected = await authorizePortalUser(guideEmail, password, wrongCode);
  assert(rejected === null, "an enrolled guide gets no session with the wrong code");
  const accepted = await authorizePortalUser(guideEmail, password, signInCode);
  assert(accepted?.id === guideId, "an enrolled guide gets a session after the right code");
  if (!enrolled.ok) throw new Error("enrollment should have succeeded");
  const recovery = enrolled.recoveryCodes[0];
  assert(recovery, "enrollment returns a recovery code");
  const recovered = await authorizePortalUser(guideEmail, password, recovery);
  assert(recovered?.id === guideId, "a recovery code can still finish sign-in");
  const reused = await authorizePortalUser(guideEmail, password, recovery);
  assert(reused === null, "a recovery code works once");

  const audits = await challengeRows(guideId);
  const failures = audits.filter((row) => row.action === "mfa.challenge_failure");
  const successes = audits.filter((row) => row.action === "mfa.challenge_success");
  assert(failures.length === 3, "missing, wrong, and reused codes are failed challenges");
  assert(successes.length === 2, "the authenticator code and the recovery code are successful challenges");
  const auditText = JSON.stringify(audits);
  assert(!auditText.includes(wrongCode), "a failed challenge does not store the submitted code");
  assert(!auditText.includes(signInCode), "a successful challenge does not store the 6-digit code");
  assert(!auditText.includes(recovery.replace(/-/g, "")), "a successful challenge does not store the recovery code");
  assert(successes.some((row) => row.meta.includes('"factor":"totp"')), "a code sign-in records the authenticator factor");
  assert(successes.some((row) => row.meta.includes('"factor":"recovery"')), "a recovery sign-in records the recovery factor");

  const visible = await loadPortalSnapshot({ id: guideId, role: "guide" });
  const visiblePayload = JSON.stringify(visible);
  assert(visiblePayload.includes(String(sentinel)), "after enrollment the guide snapshot can include the assigned balance again");
  assert(visiblePayload.includes("MFA Check Member"), "after enrollment the guide snapshot includes the assigned member");

  await prisma.user.create({
    data: {
      id: enrolledMemberId,
      email: enrolledMemberEmail,
      passwordHash: hashPassword(password),
      name: "MFA Opt In Member",
      role: "member",
    },
  });
  const memberSetup = await beginMfaSetup(enrolledMemberId, enrolledMemberEmail);
  const memberSecret = memberSetup.manualKey.replace(/\s+/g, "");
  const memberEnrolled = await completeMfaEnrollment(enrolledMemberId, "member", currentTotpCode(memberSecret));
  assert(memberEnrolled.ok, "a member can still opt in");
  assert(
    (await authorizePortalUser(enrolledMemberEmail, password, "")) === null,
    "a member who opted in still has to pass the code step",
  );
  assert(
    (await authorizePortalUser(enrolledMemberEmail, password, currentTotpCode(memberSecret)))?.role === "member",
    "a member who opted in signs in after the code",
  );
  assert(gate("member", true, "/").kind === "allow", "opting in does not put a member behind the staff enrollment wall");
}

main()
  .then(async () => {
    await cleanup();
    await prisma.$disconnect();
    console.log("mfa required checks passed");
  })
  .catch(async (error: unknown) => {
    await cleanup().catch(() => undefined);
    await prisma.$disconnect().catch(() => undefined);
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
