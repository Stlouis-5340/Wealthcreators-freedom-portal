import type { Metadata } from "next";
import { AuthFrame } from "@/components/auth/auth-frame";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata: Metadata = {
  title: "Request access",
};

export default function SignupPage() {
  return (
    <AuthFrame
      title="Request access"
      lede="Freedom Portal accounts are issued by Wealth Creators. This preview keeps two demo logins until plans live in a database."
      alternateHref="/login"
      alternateLabel="Already have a login? Sign in"
    >
      <SignupForm />
    </AuthFrame>
  );
}
