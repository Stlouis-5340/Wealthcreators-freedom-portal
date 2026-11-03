"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn, signOut } from "@/auth";
import { lookupLogin } from "@/lib/accounts";
import { homeForRole } from "@/lib/demo-accounts";
import { mfaCodeMatches } from "@/lib/mfa";
import { clearMfaPassword, readMfaPassword, stashMfaPassword } from "@/lib/mfa-step";

export interface AuthFormState {
  error: string;
  message: string;
  mfaEmail: string;
}

const idle: AuthFormState = { error: "", message: "", mfaEmail: "" };

export async function loginAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const totp = String(formData.get("totp") ?? "").trim();
  const stashed = totp ? await readMfaPassword() : null;
  const email = String(formData.get("email") ?? stashed?.email ?? "");
  const password = String(formData.get("password") ?? stashed?.password ?? "");
  const account = await lookupLogin(email, password);
  if (account.status === "inactive") {
    return {
      error: "This account is paused. An admin can turn it back on.",
      message: "",
      mfaEmail: "",
    };
  }
  if (account.status !== "ok") {
    return {
      error: "That email and password do not match a Freedom Portal account.",
      message: "",
      mfaEmail: "",
    };
  }

  if (account.user.mfaEnabled) {
    if (!totp) {
      await stashMfaPassword(account.user.email, password);
      return {
        error: "",
        message: "Enter the 6-digit code from your authenticator app, or a one-time recovery code.",
        mfaEmail: account.user.email,
      };
    }
    const matched = await mfaCodeMatches(account.user.id, totp, false);
    if (!matched) {
      return {
        error: "That authenticator code or recovery code did not match.",
        message: "",
        mfaEmail: account.user.email,
      };
    }
  }

  try {
    await clearMfaPassword();
    await signIn("credentials", {
      email: account.user.email,
      password,
      totp,
      redirectTo: homeForRole(account.user.role),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        error: account.user.mfaEnabled
          ? "That authenticator code or recovery code did not match."
          : "That email and password do not match a Freedom Portal account.",
        message: "",
        mfaEmail: account.user.mfaEnabled ? account.user.email : "",
      };
    }
    throw error;
  }

  return idle;
}

export async function cancelMfaAction(): Promise<void> {
  await clearMfaPassword();
  redirect("/login");
}

export async function signupAction(
  previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  void previous;
  void formData;
  return {
    error: "",
    message:
      "Wealth Creators issues member, guide, and admin accounts. This form does not create a login. Use a demo login for this preview.",
    mfaEmail: "",
  };
}

export async function signOutAction() {
  await clearMfaPassword();
  await signOut({ redirectTo: "/login" });
}
