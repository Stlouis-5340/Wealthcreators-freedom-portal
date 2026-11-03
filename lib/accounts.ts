import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/passwords";
import type { Role } from "@/lib/types";

function isRole(role: string): role is Role {
  return role === "member" || role === "guide" || role === "admin";
}

export type LoginLookup =
  | {
      status: "ok";
      user: { id: string; name: string; email: string; role: Role; mfaEnabled: boolean };
    }
  | { status: "inactive" }
  | { status: "invalid" };

export async function lookupLogin(email: string, password: string): Promise<LoginLookup> {
  const normalized = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalized } });
  if (!user || !isRole(user.role)) return { status: "invalid" };
  if (!verifyPassword(password, user.passwordHash)) return { status: "invalid" };
  if (!user.isActive) return { status: "inactive" };
  return {
    status: "ok",
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      mfaEnabled: user.mfaEnabled,
    },
  };
}
