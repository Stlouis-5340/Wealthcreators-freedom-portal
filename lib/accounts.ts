import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/passwords";
import type { Role } from "@/lib/types";

export async function verifyLogin(email: string, password: string) {
  const normalized = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalized } });
  if (!user || (user.role !== "member" && user.role !== "guide")) return null;
  if (!verifyPassword(password, user.passwordHash)) return null;
  const role: Role = user.role;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role,
  };
}
