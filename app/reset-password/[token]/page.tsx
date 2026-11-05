import type { Metadata } from "next";
import { AuthFrame } from "@/components/auth/auth-frame";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { auth, isPortalRole } from "@/auth";
import { previewPasswordReset } from "@/lib/password-reset-store";

export const metadata: Metadata = {
  title: "Reset password",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export const instant = false;

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const reset = await previewPasswordReset(token);
  if (!reset.ok) {
    return (
      <AuthFrame
        title="Reset link unavailable"
        lede={reset.error}
        alternateHref="/forgot-password"
        alternateLabel="Request a new link"
      >
        <p className="text-sm leading-6 text-muted">
          Reset links work once and expire after one hour. Request another from the sign-in page.
        </p>
      </AuthFrame>
    );
  }

  const session = await auth();
  const signedIn = isPortalRole(session?.user?.role);

  return (
    <AuthFrame
      title="Choose a new password"
      lede="This link works once. After you save, sign in with the new password."
      alternateHref="/login"
      alternateLabel="Back to sign in"
    >
      <ResetPasswordForm token={token} email={reset.email} signedIn={signedIn} />
    </AuthFrame>
  );
}
