import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { findDemoAccount, passwordsMatch } from "@/lib/demo-accounts";
import type { Role } from "@/lib/types";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email = String(credentials.email ?? "");
        const password = String(credentials.password ?? "");
        const account = findDemoAccount(email);
        if (!account || !passwordsMatch(password, account.password)) return null;
        return {
          id: account.id,
          name: account.name,
          email: account.email,
          role: account.role,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id ?? "";
        if (token.role === "member" || token.role === "guide") {
          session.user.role = token.role;
        }
      }
      return session;
    },
  },
});

export function isPortalRole(role: unknown): role is Role {
  return role === "member" || role === "guide";
}
