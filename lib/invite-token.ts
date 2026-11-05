import { createHash, randomBytes } from "node:crypto";

/** Invite links stop working after this long. */
export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const inviteMessages = {
  invalid: "This invite link is not valid.",
  revoked: "This invite was revoked. Ask your Wealth Guide or an admin for a new link.",
  expired: "This invite has expired. Ask your Wealth Guide or an admin for a new link.",
  used: "This invite was already used. Sign in with that email if the account is yours.",
  exists:
    "An account with this email already exists. Sign in, or ask for a new invite to a different email.",
  staffOnly: "Sign in as a Wealth Guide or an admin to invite a member.",
  guideOwn: "A Wealth Guide can only invite a member assigned to them.",
  badEmail: "Enter a valid email address.",
  longName: "Use a shorter name.",
  needName: "Enter the name you want on the portal.",
  shortPassword: "Use at least 8 characters.",
  longPassword: "Use a shorter password.",
  passwordMismatch: "Those passwords do not match.",
  pendingExists: "An unused invite for this email is still open. Revoke it before creating another.",
  badGuide: "Choose an active Wealth Guide, or leave the assignment for later.",
  unavailable: "That invite is not available.",
  notOpen: "That invite is no longer open.",
  unknownAction: "That invite action is not available.",
} as const;

export type InviteStatus = "pending" | "accepted" | "revoked" | "expired";

export function newInviteToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashInviteToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function isInviteTokenShape(token: string): boolean {
  return /^[A-Za-z0-9_-]{20,200}$/.test(token);
}

export function inviteUrl(origin: string, token: string): string {
  const base = origin.replace(/\/$/, "");
  return `${base}/invite/${encodeURIComponent(token)}`;
}

export function inviteStatus(
  row: { acceptedAt: Date | null; revokedAt: Date | null; expiresAt: Date },
  now = new Date(),
): InviteStatus {
  if (row.acceptedAt) return "accepted";
  if (row.revokedAt) return "revoked";
  if (row.expiresAt.getTime() <= now.getTime()) return "expired";
  return "pending";
}

export function normalizeEmail(value: string): string | null {
  const email = value.trim().toLowerCase();
  if (email.length < 6 || email.length > 254) return null;
  if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(email)) return null;
  return email;
}

export function normalizeDisplayName(value: string): string | null {
  const name = value.trim().replace(/\s+/g, " ");
  if (name.length > 80) return null;
  if (/[\u0000-\u001F\u007F]/.test(name)) return null;
  return name;
}

export function passwordError(password: string, confirm: string): string {
  if (password.length < 8) return inviteMessages.shortPassword;
  if (password.length > 128) return inviteMessages.longPassword;
  if (password !== confirm) return inviteMessages.passwordMismatch;
  return "";
}

export function canManageInvite(
  actor: { id: string; role: string },
  invite: { createdById: string; guideId: string | null },
): boolean {
  if (actor.role === "admin") return true;
  if (actor.role !== "guide") return false;
  return invite.createdById === actor.id || invite.guideId === actor.id;
}

export function messageForStatus(status: InviteStatus): string {
  if (status === "accepted") return inviteMessages.used;
  if (status === "revoked") return inviteMessages.revoked;
  if (status === "expired") return inviteMessages.expired;
  return "";
}
