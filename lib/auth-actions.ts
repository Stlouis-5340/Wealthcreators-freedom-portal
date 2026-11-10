"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn, signOut } from "@/auth";
import { lookupLogin } from "@/lib/accounts";
import { homeForRole } from "@/lib/demo-accounts";
import { matchMfaCode } from "@/lib/mfa";
import { clearMfaPassword, readMfaPassword, stashMfaPassword } from "@/lib/mfa-step";
import { recordMfaChallenge } from "@/lib/sign-in-access";
import { STAFF_MFA_ENROLL_PATH, staffNeedsEnrollment } from "@/lib/staff-mfa";

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
    const factor = await matchMfaCode(account.user.id, totp, false);
    if (!factor) {
      await recordMfaChallenge({
        userId: account.user.id,
        role: account.user.role,
        ok: false,
      });
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
      redirectTo: staffNeedsEnrollment(account.user.role, account.user.mfaEnabled)
        ? STAFF_MFA_ENROLL_PATH
        : homeForRole(account.user.role),
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
      "Freedom Portal accounts are issued by invite. This form does not create a login.",
    mfaEmail: "",
  };
}

export async function signOutAction() {
  await clearMfaPassword();
  await signOut({ redirectTo: "/login" });
}
