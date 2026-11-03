import { auth, isPortalRole } from "@/auth";
import { prisma } from "@/lib/db";
import type { Role } from "@/lib/types";

export interface Actor {
  id: string;
  email: string;
  name: string;
  role: Role;
  mfaEnabled: boolean;
}

/** Signed-in account, re-read from the database so a role change or pause applies immediately. */
export async function requireActor(): Promise<Actor | null> {
  const session = await auth();
  const sessionUser = session?.user;
  if (!sessionUser?.id) return null;
  const user = await prisma.user.findUnique({ where: { id: sessionUser.id } });
  if (!user || !user.isActive || !isPortalRole(user.role)) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    mfaEnabled: user.mfaEnabled,
  };
}

export async function requireMember(): Promise<Actor | null> {
  const actor = await requireActor();
  if (!actor || actor.role !== "member") return null;
  return actor;
}

export async function requireGuide(): Promise<Actor | null> {
  const actor = await requireActor();
  if (!actor || actor.role !== "guide") return null;
  return actor;
}

export async function requireAdmin(): Promise<Actor | null> {
  const actor = await requireActor();
  if (!actor || actor.role !== "admin") return null;
  return actor;
}
