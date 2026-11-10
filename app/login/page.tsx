import type { Metadata } from "next";
import { AuthFrame } from "@/components/auth/auth-frame";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Sign in",
};

export const instant = false;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const { notice } = await searchParams;
  const invited = notice === "invite";

  return (
    <AuthFrame
      title="Sign in"
      lede={
        invited
          ? "Freedom Portal accounts are issued by invite. A Wealth Guide or an admin sends a one-time link. This page does not create an account."
          : "Members land on their Freedom Score. Guides and admins need an authenticator app before the command center or People."
      }
      alternateHref="/signup"
      alternateLabel="Need an account? Access is by invite"
    >
      <LoginForm />
    </AuthFrame>
  );
}
