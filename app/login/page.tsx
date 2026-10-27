import type { Metadata } from "next";
import { AuthFrame } from "@/components/auth/auth-frame";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function LoginPage() {
  return (
    <AuthFrame
      title="Sign in"
      lede="Members land on their Freedom Score. Wealth Guides land on the roster of people they are assigned to."
      alternateHref="/signup"
      alternateLabel="Need an account? Request access"
    >
      <LoginForm />
    </AuthFrame>
  );
}
