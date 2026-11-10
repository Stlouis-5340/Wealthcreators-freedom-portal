import { lookupLogin } from "@/lib/accounts";
import { writeAudit } from "@/lib/audit";
import { matchMfaCode, type MfaFactor } from "@/lib/mfa";
import type { Role } from "@/lib/types";

export interface PortalCredentialUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

/** Audit a sign-in authenticator check. The code itself is never stored. */
export async function recordMfaChallenge(input: {
  userId: string;
  role: Role;
  ok: boolean;
  factor?: MfaFactor;
}): Promise<void> {
  await writeAudit({
    actorUserId: input.userId,
    action: input.ok ? "mfa.challenge_success" : "mfa.challenge_failure",
    targetType: "user",
    targetId: input.userId,
    meta: {
      role: input.role,
      ...(input.factor ? { factor: input.factor } : {}),
    },
  });
}

/**
 * Password check, then the authenticator step when MFA is on.
 * A matching code is required before a session user is returned.
 * Staff who have not enrolled yet still receive a user so they can open setup.
 */
export async function authorizePortalUser(
  email: string,
  password: string,
  totp: string,
): Promise<PortalCredentialUser | null> {
  const result = await lookupLogin(email, password);
  if (result.status !== "ok") return null;
  if (result.user.mfaEnabled) {
    const factor = await matchMfaCode(result.user.id, totp, true);
    await recordMfaChallenge({
      userId: result.user.id,
      role: result.user.role,
      ok: factor !== null,
      ...(factor ? { factor } : {}),
    });
    if (!factor) return null;
  }
  return {
    id: result.user.id,
    name: result.user.name,
    email: result.user.email,
    role: result.user.role,
  };
}
