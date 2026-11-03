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
 * Demo logins seeded into the database.
 * Passwords are preview credentials, documented in the README, not production secrets.
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
  {
    id: "admin",
    name: "Morgan Hale",
    email: "admin@wealthcreators.test",
    password: "Freedom-Admin-2026",
    role: "admin",
    title: "Admin",
  },
];

export function homeForRole(role: Role): "/" | "/guide" | "/admin" {
  if (role === "guide") return "/guide";
  if (role === "admin") return "/admin";
  return "/";
}

export function roleTitle(role: Role): string {
  if (role === "admin") return "Admin";
  if (role === "guide") return "Wealth Guide";
  return "Member";
}
