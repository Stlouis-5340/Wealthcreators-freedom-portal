import { createHash, timingSafeEqual } from "node:crypto";
import type { Role } from "@/lib/types";

export interface DemoAccount {
  id: string;
  name: string;
  email: string;
  password: string;
  role: Role;
  title: string;
}

/**
 * Seeded portal accounts until a database exists.
 * Passwords are demo credentials, documented in the README, not production secrets.
 * Jordan Lee is assigned to the full sample roster, including Alex Rivera.
 */
export const demoAccounts: readonly DemoAccount[] = [
  {
    id: "alex",
    name: "Alex Rivera",
    email: "alex@wealthcreators.test",
    password: "Freedom-Alex-2026",
    role: "member",
    title: "Member",
  },
  {
    id: "jordan",
    name: "Jordan Lee",
    email: "jordan@wealthcreators.test",
    password: "Freedom-Jordan-2026",
    role: "guide",
    title: "Wealth Guide",
  },
];

export function homeForRole(role: Role): "/" | "/guide" {
  return role === "guide" ? "/guide" : "/";
}

export function findDemoAccount(email: string): DemoAccount | undefined {
  const normalized = email.trim().toLowerCase();
  return demoAccounts.find((account) => account.email === normalized);
}

export function passwordsMatch(input: string, expected: string): boolean {
  const left = createHash("sha256").update(input).digest();
  const right = createHash("sha256").update(expected).digest();
  return timingSafeEqual(left, right);
}
