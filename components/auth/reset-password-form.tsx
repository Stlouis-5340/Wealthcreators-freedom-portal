"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signOutAction } from "@/lib/auth-actions";
import { resetPasswordAction, type ResetPasswordState } from "@/lib/password-reset-actions";

const initial: ResetPasswordState = { error: "", done: false, mfa: false };

export function ResetPasswordForm({ token, email, signedIn }: { token: string; email: string; signedIn: boolean }) {
  const [state, action, pending] = useActionState(resetPasswordAction, initial);

  if (state.done) {
    return (
      <div className="space-y-4">
        <p className="text-sm leading-6 text-ink" role="status">
          Your password is updated. Sign in with the new password.
        </p>
        {state.mfa ? (
          <p className="text-sm leading-6 text-muted">
            This account uses an authenticator app. The next sign-in still asks for a code.
          </p>
        ) : null}
        {signedIn ? (
          <form action={signOutAction}>
            <button type="submit" className="wc-btn wc-btn-primary w-full">
              Sign out
            </button>
          </form>
        ) : (
          <Link href="/login" className="wc-btn wc-btn-primary w-full">
            Sign in
          </Link>
        )}
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <p className="text-sm text-ink">
        Account <span className="font-medium">{email}</span>
      </p>
      <label className="block text-sm">
        <span className="text-muted">New password</span>
        <input
          className="wc-input mt-1.5"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </label>
      <label className="block text-sm">
        <span className="text-muted">Confirm password</span>
        <input
          className="wc-input mt-1.5"
          name="confirm"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </label>
      {state.error ? (
        <p className="text-sm text-danger" role="alert">
          {state.error}
        </p>
      ) : null}
      <button type="submit" className="wc-btn wc-btn-primary w-full" disabled={pending}>
        {pending ? "Saving…" : "Save password"}
      </button>
    </form>
  );
}
