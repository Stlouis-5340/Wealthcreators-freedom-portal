import { hashInviteToken, isInviteTokenShape, newInviteToken, normalizeEmail, passwordError } from "@/lib/invite-token";

export const RESET_TTL_MS = 60 * 60 * 1000;
export const RESET_WINDOW_MS = 60 * 60 * 1000;
export const RESET_MAX_PER_HOUR = 3;

export const resetMessages = {
  sent: "If that email has an active Freedom Portal account, we sent a link to reset the password. The link works once and expires in one hour.",
  unconfigured:
    "Password reset email is not set up on this portal. Ask your Wealth Guide or an admin for help.",
  badEmail: "Enter a valid email address.",
  invalid: "This reset link is not valid or has expired. Request a new one from the sign-in page.",
  updated: "Your password is updated. Sign in with the new password.",
} as const;

export type ResetRequestResult =
  | { status: "unconfigured" }
  | { status: "invalid-email" }
  | { status: "accepted"; sent: false }
  | { status: "accepted"; sent: true; userId: string; email: string };

export function resetRequestMessage(result: ResetRequestResult): { error: string; message: string } {
  if (result.status === "invalid-email") return { error: resetMessages.badEmail, message: "" };
  if (result.status === "unconfigured") return { error: "", message: resetMessages.unconfigured };
  return { error: "", message: resetMessages.sent };
}

export function resetUrl(origin: string, token: string): string {
  const base = origin.replace(/\/$/, "");
  return `${base}/reset-password/${encodeURIComponent(token)}`;
}

export function newResetToken(): string {
  return newInviteToken();
}

export function hashResetToken(token: string): string {
  return hashInviteToken(token);
}

export function isResetTokenShape(token: string): boolean {
  return isInviteTokenShape(token);
}

export function normalizeResetEmail(value: string): string | null {
  return normalizeEmail(value);
}

export function resetPasswordError(password: string, confirm: string): string {
  return passwordError(password, confirm);
}
