import { mailIsConfigured } from "@/lib/mail-config";
import { sendPortalEmail, type MailSender } from "@/lib/mail";
import { passwordResetEmail } from "@/lib/mail-templates";
import { prisma } from "@/lib/db";
import {
  hashResetToken,
  isResetTokenShape,
  newResetToken,
  normalizeResetEmail,
  RESET_MAX_PER_HOUR,
  RESET_TTL_MS,
  RESET_WINDOW_MS,
  resetMessages,
  resetPasswordError,
  resetUrl,
  type ResetRequestResult,
} from "@/lib/password-reset";
import { hashPassword } from "@/lib/passwords";

function isAccountRole(role: string): boolean {
  return role === "member" || role === "guide" || role === "admin";
}

export async function requestPasswordReset(input: {
  email: string;
  origin: string;
  now?: Date;
  send?: MailSender;
}): Promise<ResetRequestResult> {
  if (!mailIsConfigured()) return { status: "unconfigured" };
  const email = normalizeResetEmail(input.email);
  if (!email) return { status: "invalid-email" };

  const now = input.now ?? new Date();
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, isActive: true, role: true },
  });
  if (!user || !user.isActive || !isAccountRole(user.role)) {
    return { status: "accepted", sent: false };
  }

  const windowStart = new Date(now.getTime() - RESET_WINDOW_MS);
  const created = await prisma.$transaction(async (tx) => {
    const recent = await tx.passwordReset.count({
      where: { userId: user.id, createdAt: { gt: windowStart } },
    });
    if (recent >= RESET_MAX_PER_HOUR) return null;
    await tx.passwordReset.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: now },
    });
    const token = newResetToken();
    const expiresAt = new Date(now.getTime() + RESET_TTL_MS);
    const row = await tx.passwordReset.create({
      data: {
        userId: user.id,
        tokenHash: hashResetToken(token),
        expiresAt,
        createdAt: now,
      },
      select: { id: true },
    });
    return { id: row.id, token, expiresAt };
  });
  if (!created) return { status: "accepted", sent: false };

  const message = passwordResetEmail({
    to: user.email,
    recipientName: user.name,
    url: resetUrl(input.origin, created.token),
    expiresAt: created.expiresAt,
  });
  let delivered = false;
  try {
    const sent = await (input.send ?? sendPortalEmail)(message);
    delivered = sent.ok;
  } catch (error) {
    console.error("portal email failed", error instanceof Error ? error.name : "error");
    delivered = false;
  }
  if (!delivered) {
    await prisma.passwordReset.deleteMany({ where: { id: created.id } });
    return { status: "accepted", sent: false };
  }
  return { status: "accepted", sent: true, userId: user.id, email: user.email };
}

export async function previewPasswordReset(
  token: string,
  now = new Date(),
): Promise<{ ok: true; email: string } | { ok: false; error: string }> {
  if (!isResetTokenShape(token)) return { ok: false, error: resetMessages.invalid };
  const row = await prisma.passwordReset.findUnique({
    where: { tokenHash: hashResetToken(token) },
    select: {
      usedAt: true,
      expiresAt: true,
      user: { select: { email: true, isActive: true, role: true } },
    },
  });
  if (!row || row.usedAt || row.expiresAt.getTime() <= now.getTime()) {
    return { ok: false, error: resetMessages.invalid };
  }
  if (!row.user.isActive || !isAccountRole(row.user.role)) {
    return { ok: false, error: resetMessages.invalid };
  }
  return { ok: true, email: row.user.email };
}

export async function resetPasswordWithToken(
  token: string,
  input: { password: string; confirm: string; now?: Date },
): Promise<
  { ok: true; userId: string; email: string; mfaEnabled: boolean } | { ok: false; error: string }
> {
  if (!isResetTokenShape(token)) return { ok: false, error: resetMessages.invalid };
  const passwordProblem = resetPasswordError(input.password, input.confirm);
  if (passwordProblem) return { ok: false, error: passwordProblem };

  const now = input.now ?? new Date();
  const tokenHash = hashResetToken(token);
  const passwordHash = hashPassword(input.password);

  try {
    return await prisma.$transaction(async (tx) => {
      const row = await tx.passwordReset.findUnique({
        where: { tokenHash },
        select: {
          id: true,
          userId: true,
          usedAt: true,
          expiresAt: true,
          user: { select: { id: true, email: true, isActive: true, role: true, mfaEnabled: true } },
        },
      });
      if (!row || row.usedAt || row.expiresAt.getTime() <= now.getTime()) {
        return { ok: false as const, error: resetMessages.invalid };
      }
      if (!row.user.isActive || !isAccountRole(row.user.role)) {
        return { ok: false as const, error: resetMessages.invalid };
      }
      await tx.user.update({
        where: { id: row.userId },
        data: { passwordHash, passwordVersion: { increment: 1 } },
      });
      const claimed = await tx.passwordReset.updateMany({
        where: { id: row.id, usedAt: null, expiresAt: { gt: now } },
        data: { usedAt: now },
      });
      if (claimed.count !== 1) throw new Error("reset-claim-failed");
      await tx.passwordReset.updateMany({
        where: { userId: row.userId, usedAt: null },
        data: { usedAt: now },
      });
      return {
        ok: true as const,
        userId: row.user.id,
        email: row.user.email,
        mfaEnabled: row.user.mfaEnabled,
      };
    });
  } catch (error) {
    if (error instanceof Error && error.message === "reset-claim-failed") {
      return { ok: false, error: resetMessages.invalid };
    }
    throw error;
  }
}
