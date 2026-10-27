"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";
import { findDemoAccount, homeForRole, passwordsMatch } from "@/lib/demo-accounts";

export interface AuthFormState {
  error: string;
  message: string;
}

const idle: AuthFormState = { error: "", message: "" };

export async function loginAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const account = findDemoAccount(email);
  if (!account || !passwordsMatch(password, account.password)) {
    return {
      error: "That email and password do not match a Freedom Portal account.",
      message: "",
    };
  }

  try {
    await signIn("credentials", {
      email: account.email,
      password,
      redirectTo: homeForRole(account.role),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        error: "That email and password do not match a Freedom Portal account.",
        message: "",
      };
    }
    throw error;
  }

  return idle;
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
      "Wealth Creators issues member and guide accounts. Self-serve sign-up opens when those accounts live in the database. Use a demo login for this preview.",
  };
}

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}
