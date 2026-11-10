import type { Role } from "@/lib/types";

/** Guides and admins finish authenticator setup here before any other portal page. */
export const STAFF_MFA_ENROLL_PATH = "/security";

export function isStaffRole(role: string | undefined): role is "guide" | "admin" {
  return role === "guide" || role === "admin";
}

/** Staff without an authenticator may open enrollment only. Members are never forced. */
export function staffNeedsEnrollment(role: string | undefined, mfaEnabled: boolean): boolean {
  return isStaffRole(role) && !mfaEnabled;
}

export function staffMfaRejection(): { error: string; enrollPath: typeof STAFF_MFA_ENROLL_PATH } {
  return {
    error: "An authenticator app is required for this account. Finish setup at /security.",
    enrollPath: STAFF_MFA_ENROLL_PATH,
  };
}

export type StaffMfaDecision =
  | { kind: "allow" }
  | { kind: "redirect"; pathname: typeof STAFF_MFA_ENROLL_PATH }
  | { kind: "reject"; status: 403; body: ReturnType<typeof staffMfaRejection> };

function isEnrollmentPath(pathname: string): boolean {
  return pathname === STAFF_MFA_ENROLL_PATH || pathname.startsWith(`${STAFF_MFA_ENROLL_PATH}/`);
}

function isAuthApi(pathname: string): boolean {
  return pathname === "/api/auth" || pathname.startsWith("/api/auth/");
}

function isApiPath(pathname: string): boolean {
  return pathname === "/api" || pathname.startsWith("/api/");
}

/**
 * Signed-in staff who have not enrolled are kept on /security.
 * APIs other than Auth.js are rejected with a pointer to that page.
 * Members, and staff who already enrolled, are left to the normal role checks.
 * Enrolled staff still cannot receive a session until the sign-in code matches.
 */
export function staffMfaGate(input: {
  role: string | undefined;
  mfaEnabled: boolean;
  pathname: string;
}): StaffMfaDecision {
  if (!staffNeedsEnrollment(input.role, input.mfaEnabled)) return { kind: "allow" };
  if (isEnrollmentPath(input.pathname) || isAuthApi(input.pathname)) return { kind: "allow" };
  if (isApiPath(input.pathname)) {
    return { kind: "reject", status: 403, body: staffMfaRejection() };
  }
  return { kind: "redirect", pathname: STAFF_MFA_ENROLL_PATH };
}

/** Use on API routes that can see a signed-in user. Null means this check does not apply. */
export function staffApiBlock(
  user: { role: Role | string; mfaEnabled: boolean } | null,
): { status: 403; body: ReturnType<typeof staffMfaRejection> } | null {
  if (!user || !staffNeedsEnrollment(user.role, user.mfaEnabled)) return null;
  return { status: 403, body: staffMfaRejection() };
}
