import { randomBytes } from "node:crypto";
import QRCode from "qrcode";
import { writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/passwords";
import { decryptPrivateValue, encryptPrivateValue } from "@/lib/token-crypto";
import { generateTotpSecret, totpAuthUrl, verifyTotp } from "@/lib/totp";
import type { Role } from "@/lib/types";

const RECOVERY_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export interface MfaSetup {
  qrDataUrl: string;
  manualKey: string;
}

export function generateRecoveryCodes(): string[] {
  return Array.from({ length: 8 }, () => recoveryCode());
}

export async function beginMfaSetup(userId: string, email: string): Promise<MfaSetup> {
  const secret = generateTotpSecret();
  await prisma.user.update({
    where: { id: userId },
    data: { mfaPendingSecretEnc: encryptPrivateValue("mfa", secret) },
  });
  const qrDataUrl = await QRCode.toDataURL(totpAuthUrl(email, secret), {
    margin: 1,
    width: 240,
    color: { dark: "#0B3312", light: "#F4EFE4" },
  });
  return { qrDataUrl, manualKey: groupSecret(secret) };
}

export async function confirmMfaSetup(
  userId: string,
  code: string,
): Promise<{ ok: true; recoveryCodes: string[] } | { ok: false }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { mfaPendingSecretEnc: true },
  });
  if (!user?.mfaPendingSecretEnc) return { ok: false };
  const secret = decryptPrivateValue("mfa", user.mfaPendingSecretEnc);
  if (!verifyTotp(secret, code)) return { ok: false };
  const recoveryCodes = generateRecoveryCodes();
  await prisma.user.update({
    where: { id: userId },
    data: {
      mfaEnabled: true,
      mfaSecretEnc: user.mfaPendingSecretEnc,
      mfaPendingSecretEnc: "",
      mfaRecoveryHashes: JSON.stringify(recoveryCodes.map((item) => hashPassword(normalizeRecovery(item)))),
    },
  });
  return { ok: true, recoveryCodes };
}

/** Confirm setup and write the enrollment audit. The secret stays off the log. */
export async function completeMfaEnrollment(
  userId: string,
  role: Role,
  code: string,
): Promise<{ ok: true; recoveryCodes: string[] } | { ok: false }> {
  const result = await confirmMfaSetup(userId, code);
  if (!result.ok) return result;
  await writeAudit({
    actorUserId: userId,
    action: "mfa.enroll",
    targetType: "user",
    targetId: userId,
    meta: { role },
  });
  return result;
}

export async function disableMfa(userId: string, code: string): Promise<boolean> {
  const matched = await mfaCodeMatches(userId, code, true);
  if (!matched) return false;
  await prisma.user.update({
    where: { id: userId },
    data: {
      mfaEnabled: false,
      mfaSecretEnc: "",
      mfaPendingSecretEnc: "",
      mfaRecoveryHashes: "[]",
    },
  });
  return true;
}

export type MfaFactor = "totp" | "recovery";

/** Check a TOTP or recovery code. Recovery codes are removed only when consume is true. */
export async function matchMfaCode(userId: string, code: string, consume: boolean): Promise<MfaFactor | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { mfaEnabled: true, mfaSecretEnc: true, mfaRecoveryHashes: true },
  });
  if (!user?.mfaEnabled || !user.mfaSecretEnc) return null;
  const trimmed = code.trim();
  if (/^\d{6}$/.test(trimmed.replace(/\s+/g, ""))) {
    try {
      const secret = decryptPrivateValue("mfa", user.mfaSecretEnc);
      if (verifyTotp(secret, trimmed)) return "totp";
    } catch {
      return null;
    }
  }
  const normalized = normalizeRecovery(trimmed);
  if (!/^[A-Z2-9]{8}$/.test(normalized)) return null;
  const hashes = parseHashes(user.mfaRecoveryHashes);
  const index = hashes.findIndex((hash) => verifyPassword(normalized, hash));
  if (index < 0) return null;
  if (consume) {
    const next = hashes.filter((_, item) => item !== index);
    await prisma.user.update({
      where: { id: userId },
      data: { mfaRecoveryHashes: JSON.stringify(next) },
    });
  }
  return "recovery";
}

/** Check a TOTP or recovery code. Recovery codes are removed only when consume is true. */
export async function mfaCodeMatches(userId: string, code: string, consume: boolean): Promise<boolean> {
  return (await matchMfaCode(userId, code, consume)) !== null;
}

function parseHashes(raw: string): string[] {
  try {
    const value = JSON.parse(raw) as unknown;
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

function recoveryCode(): string {
  const bytes = randomBytes(8);
  let out = "";
  for (const byte of bytes) out += RECOVERY_ALPHABET[byte % RECOVERY_ALPHABET.length];
  return `${out.slice(0, 4)}-${out.slice(4)}`;
}

function normalizeRecovery(code: string): string {
  return code.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

function groupSecret(secret: string): string {
  return secret.replace(/(.{4})/g, "$1 ").trim();
}
