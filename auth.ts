import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
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
        totp: { label: "Authenticator code", type: "text" },
      },
      authorize: async (credentials) => {
        const { lookupLogin } = await import("@/lib/accounts");
        const email = String(credentials?.email ?? "");
        const password = String(credentials?.password ?? "");
        const totp = String(credentials?.totp ?? "");
        const result = await lookupLogin(email, password);
        if (result.status !== "ok") return null;
        if (result.user.mfaEnabled) {
          const { mfaCodeMatches } = await import("@/lib/mfa");
          const matched = await mfaCodeMatches(result.user.id, totp, true);
          if (!matched) return null;
        }
        return {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
          role: result.user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      if (!token.id) return token;
      try {
        const { prisma } = await import("@/lib/db");
        const row = await prisma.user.findUnique({
          where: { id: token.id },
          select: { role: true, isActive: true, mfaEnabled: true },
        });
        if (!row || !row.isActive || !isPortalRole(row.role)) {
          token.id = "";
          token.role = undefined;
          token.mfaEnabled = false;
          return token;
        }
        token.role = row.role;
        token.mfaEnabled = row.mfaEnabled;
      } catch {
        return token;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id ?? "";
        session.user.mfaEnabled = token.mfaEnabled === true;
        if (isPortalRole(token.role)) {
          session.user.role = token.role;
        }
      }
      return session;
    },
  },
});

export function isPortalRole(role: unknown): role is Role {
  return role === "member" || role === "guide" || role === "admin";
}
