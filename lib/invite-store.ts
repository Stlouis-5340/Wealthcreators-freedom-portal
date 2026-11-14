import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { fullGuideAccess, serializeGuideAccess } from "@/lib/access";
import { prisma } from "@/lib/db";
import {
  canManageInvite,
  hashInviteToken,
  INVITE_ROLES,
  type InviteRole,
  inviteMessages,
  inviteStatus,
  isInviteTokenShape,
  messageForStatus,
  newInviteToken,
  normalizeDisplayName,
  normalizeEmail,
  passwordError,
  INVITE_TTL_MS,
  type InviteStatus,
} from "@/lib/invite-token";
import { blankMemberPlan, NEW_MEMBER_NOTE } from "@/lib/member-plan";
import { hashPassword } from "@/lib/passwords";
import { chicagoDateISO } from "@/lib/week";

export interface StoredInvite {
  id: string;
  email: string;
  name: string;
  tokenHash: string;
  status: InviteStatus;
  expiresAt: Date;
  createdAt: Date;
  guideName: string;
  createdByName: string;
  createdById: string;
  guideId: string | null;
  role: InviteRole;
}

type InviteResult<T> = { ok: true } & T | { ok: false; error: string };

const inviteInclude = {
  createdBy: { select: { name: true } },
  guide: { select: { name: true } },
} satisfies Prisma.MemberInviteInclude;

function scopeWhere(actor: { id: string; role: string }): Prisma.MemberInviteWhereInput {
  if (actor.role === "admin") return {};
  return { OR: [{ createdById: actor.id }, { guideId: actor.id }] };
}

function toStored(
  row: Prisma.MemberInviteGetPayload<{ include: typeof inviteInclude }>,
  now: Date,
): StoredInvite {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    tokenHash: row.tokenHash,
    status: inviteStatus(row, now),
    expiresAt: row.expiresAt,
    createdAt: row.createdAt,
    guideName: row.guide?.name ?? "",
    createdByName: row.createdBy.name,
    createdById: row.createdById,
    guideId: row.guideId,
    role: INVITE_ROLES.includes(row.role as InviteRole) ? (row.role as InviteRole) : "member",
  };
}

export async function listMemberInvites(actor: { id: string; role: string }): Promise<StoredInvite[]> {
  if (actor.role !== "admin" && actor.role !== "guide") return [];
  const now = new Date();
  const scope = scopeWhere(actor);
  const open = await prisma.memberInvite.findMany({
    where: { AND: [scope, { acceptedAt: null, revokedAt: null }] },
    orderBy: { expiresAt: "asc" },
    take: 50,
    include: inviteInclude,
  });
  const recent = await prisma.memberInvite.findMany({
    where: {
      AND: [scope, open.length > 0 ? { id: { notIn: open.map((row) => row.id) } } : {}],
    },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: inviteInclude,
  });
  return [...open, ...recent].map((row) => toStored(row, now));
}

export async function listActiveGuides(): Promise<{ id: string; name: string }[]> {
  return prisma.user.findMany({
    where: { role: "guide", isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

export async function createMemberInvite(input: {
  email: string;
  name: string;
  createdById: string;
  guideId: string | null;
  role?: InviteRole;
  now?: Date;
  expiresAt?: Date;
}): Promise<InviteResult<{ id: string; token: string; expiresAt: Date; email: string; role: InviteRole }>> {
  const role: InviteRole = input.role ?? "member";
  if (!INVITE_ROLES.includes(role)) return { ok: false, error: inviteMessages.badRole };
  const email = normalizeEmail(input.email);
  if (!email) return { ok: false, error: inviteMessages.badEmail };
  const name = normalizeDisplayName(input.name);
  if (name == null) return { ok: false, error: inviteMessages.longName };

  const creator = await prisma.user.findUnique({ where: { id: input.createdById } });
  if (!creator || !creator.isActive || (creator.role !== "guide" && creator.role !== "admin")) {
    return { ok: false, error: inviteMessages.staffOnly };
  }
  if (role !== "member" && creator.role !== "admin") {
    return { ok: false, error: inviteMessages.staffInviteAdminOnly };
  }
  if (role !== "member" && input.guideId) {
    return { ok: false, error: inviteMessages.staffNoGuide };
  }
  if (creator.role === "guide" && input.guideId !== creator.id) {
    return { ok: false, error: inviteMessages.guideOwn };
  }
  if (input.guideId) {
    const guide = await prisma.user.findUnique({ where: { id: input.guideId } });
    if (!guide || guide.role !== "guide" || !guide.isActive) {
      return { ok: false, error: inviteMessages.badGuide };
    }
  }

  const now = input.now ?? new Date();
  const existingUser = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existingUser) return { ok: false, error: "That email already has a Freedom Portal account." };
  const pending = await prisma.memberInvite.findFirst({
    where: { email, acceptedAt: null, revokedAt: null, expiresAt: { gt: now } },
    select: { id: true },
  });
  if (pending) return { ok: false, error: inviteMessages.pendingExists };

  const token = newInviteToken();
  const expiresAt = input.expiresAt ?? new Date(now.getTime() + INVITE_TTL_MS);
  const created = await prisma.memberInvite.create({
    data: {
      email,
      name,
      tokenHash: hashInviteToken(token),
      createdById: creator.id,
      guideId: input.guideId,
      role,
      expiresAt,
    },
    select: { id: true },
  });
  return { ok: true, id: created.id, token, expiresAt, email, role };
}

export async function revokeMemberInvite(
  inviteId: string,
  actor: { id: string; role: string },
): Promise<InviteResult<{ id: string; email: string }>> {
  const invite = await prisma.memberInvite.findUnique({ where: { id: inviteId } });
  if (!invite || !canManageInvite(actor, invite)) return { ok: false, error: inviteMessages.unavailable };
  if (invite.acceptedAt || invite.revokedAt) return { ok: false, error: inviteMessages.notOpen };
  const updated = await prisma.memberInvite.updateMany({
    where: { id: invite.id, acceptedAt: null, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (updated.count !== 1) return { ok: false, error: inviteMessages.notOpen };
  return { ok: true, id: invite.id, email: invite.email };
}

export async function previewMemberInvite(
  token: string,
): Promise<InviteResult<{ email: string; name: string }>> {
  if (!isInviteTokenShape(token)) return { ok: false, error: inviteMessages.invalid };
  const invite = await prisma.memberInvite.findUnique({ where: { tokenHash: hashInviteToken(token) } });
  if (!invite) return { ok: false, error: inviteMessages.invalid };
  const status = inviteStatus(invite);
  if (status !== "pending") return { ok: false, error: messageForStatus(status) };
  return { ok: true, email: invite.email, name: invite.name };
}

async function writeBlankPlan(tx: Prisma.TransactionClient, memberId: string): Promise<void> {
  const plan = blankMemberPlan(memberId);
  if (plan.expenses.length > 0) {
    await tx.expenseLine.createMany({
      data: plan.expenses.map((line) => ({ ...line, memberId })),
    });
  }
  if (plan.streams.length > 0) {
    await tx.passiveStream.createMany({
      data: plan.streams.map((line) => ({ ...line, memberId })),
    });
  }
}

export async function acceptMemberInvite(
  token: string,
  input: { name: string; password: string; confirm: string },
): Promise<
  InviteResult<{
    email: string;
    userId: string;
    inviteId: string;
    guideId: string | null;
    assigned: boolean;
    role: InviteRole;
  }>
> {
  if (!isInviteTokenShape(token)) return { ok: false, error: inviteMessages.invalid };
  const name = normalizeDisplayName(input.name);
  if (name == null) return { ok: false, error: inviteMessages.longName };
  if (!name) return { ok: false, error: inviteMessages.needName };
  const passwordProblem = passwordError(input.password, input.confirm);
  if (passwordProblem) return { ok: false, error: passwordProblem };

  const tokenHash = hashInviteToken(token);
  const existing = await prisma.memberInvite.findUnique({ where: { tokenHash } });
  if (!existing) return { ok: false, error: inviteMessages.invalid };
  const earlyStatus = inviteStatus(existing);
  if (earlyStatus !== "pending") return { ok: false, error: messageForStatus(earlyStatus) };

  const passwordHash = hashPassword(input.password);
  const now = new Date();

  try {
    return await prisma.$transaction(async (tx) => {
      const invite = await tx.memberInvite.findUnique({ where: { tokenHash } });
      if (!invite) return { ok: false, error: inviteMessages.invalid };
      const status = inviteStatus(invite, now);
      if (status !== "pending") return { ok: false, error: messageForStatus(status) };

      const taken = await tx.user.findUnique({ where: { email: invite.email }, select: { id: true } });
      if (taken) return { ok: false, error: inviteMessages.exists };

      const role: InviteRole = INVITE_ROLES.includes(invite.role as InviteRole)
        ? (invite.role as InviteRole)
        : "member";
      const userId = randomUUID();
      await tx.user.create({
        data: {
          id: userId,
          email: invite.email,
          passwordHash,
          name,
          role,
          lastActive: chicagoDateISO(now),
          coachingNote: role === "member" ? NEW_MEMBER_NOTE : "",
          rosterSort: 0,
          cohort: "",
          isActive: true,
          mfaEnabled: false,
          mfaSecretEnc: "",
          mfaPendingSecretEnc: "",
          mfaRecoveryHashes: "[]",
          schedulingUrl: "",
        },
      });
      await writeBlankPlan(tx, userId);

      let assigned = false;
      let guideId: string | null = null;
      if (role === "member" && invite.guideId) {
        const guide = await tx.user.findUnique({
          where: { id: invite.guideId },
          select: { id: true, role: true, isActive: true },
        });
        if (guide && guide.role === "guide" && guide.isActive) {
          const sort = await tx.guideAssignment.count({ where: { guideId: guide.id } });
          await tx.guideAssignment.create({ data: { guideId: guide.id, memberId: userId, sort } });
          await tx.guideAccessGrant.create({
            data: {
              guideId: guide.id,
              memberId: userId,
              scopes: serializeGuideAccess(fullGuideAccess),
            },
          });
          assigned = true;
          guideId = guide.id;
        }
      }

      const claimed = await tx.memberInvite.updateMany({
        where: { id: invite.id, acceptedAt: null, revokedAt: null, expiresAt: { gt: now } },
        data: { acceptedAt: now },
      });
      if (claimed.count !== 1) {
        throw new Error("invite-claim-failed");
      }
      return { ok: true as const, email: invite.email, userId, inviteId: invite.id, guideId, assigned, role };
    });
  } catch (error) {
    if (error instanceof Error && error.message === "invite-claim-failed") {
      return { ok: false, error: inviteMessages.used };
    }
    if (isUniqueConflict(error)) return { ok: false, error: inviteMessages.exists };
    throw error;
  }
}

function isUniqueConflict(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code: string }).code === "P2002";
}
