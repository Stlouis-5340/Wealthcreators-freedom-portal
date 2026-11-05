import type { Metadata } from "next";
import { connection } from "next/server";
import { AuthFrame } from "@/components/auth/auth-frame";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { mailIsConfigured } from "@/lib/mail-config";

export const metadata: Metadata = {
  title: "Forgot password",
  robots: { index: false, follow: false },
};

export const instant = false;

export default async function ForgotPasswordPage() {
  await connection();
  const emailConfigured = mailIsConfigured();

  return (
    <AuthFrame
      title="Forgot password"
      lede={
        emailConfigured
          ? "We email a one-time link if this address has an active account. The link expires in one hour. This page does not say whether the account exists."
          : "Password reset email is not set up on this portal. Ask your Wealth Guide or an admin if you need a new password."
      }
      alternateHref="/login"
      alternateLabel="Back to sign in"
    >
      <ForgotPasswordForm emailConfigured={emailConfigured} />
    </AuthFrame>
  );
}
