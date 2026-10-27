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
      },
      authorize: async (credentials) => {
        const { verifyLogin } = await import("@/lib/accounts");
        const email = String(credentials.email ?? "");
        const password = String(credentials.password ?? "");
        return verifyLogin(email, password);
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
